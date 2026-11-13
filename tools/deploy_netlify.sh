#!/usr/bin/env bash
# Werkplekinspectie — tools/deploy_netlify.sh
# Zet de app (webapp/) online op Netlify via de Netlify-API (file-digest-deploy), zonder Netlify-build.
#
#   tools/deploy_netlify.sh             productie-deploy van de GECOMMITTE stand (HEAD)
#   tools/deploy_netlify.sh --dry-run   alleen bouwen + controleren + bestandslijst tonen, niets uploaden
#   tools/deploy_netlify.sh --preview   concept-deploy (draft): eigen URL, de productiesite blijft zoals hij is
#   tools/deploy_netlify.sh --houd      de tijdelijke map niet opruimen (om de publicatiemap te bekijken)
#
# Wat het doet:
#   1. git archive HEAD webapp → tijdelijke map. Alleen wat gecommit is; niet-gecommitte of ongevolgde
#      bestanden in webapp/ gaan NOOIT mee (er komt wel een waarschuwing als die er zijn).
#   2. Publicatiemap opbouwen volgens een ALLOWLIST (zie ALLOW hieronder): index.html, styles.css, sw.js,
#      manifest, iconen, css/*.css, js/*.js, data/*.json, _headers (en _redirects / .well-known/ als die er zijn).
#      Al het andere (docs/, tests/, supabase/, tools/, *.md, *.sql, *.py, *.sh, netlify.toml, vercel.json,
#      interne html-pagina's, dotfiles) blijft achter.
#   3. Poort: weigert te deployen als
#        - er een bestand buiten de allowlist (of op de denylist) in de publicatiemap staat;
#        - de geheimenscan iets vindt (dezelfde regels als tools/secret_scan.sh, zonder uitzonderingslijst,
#          ook MIDDEL telt), of een JWT met een andere rol dan "anon" (service_role!), een sb_secret_-sleutel,
#          een niet-publieke supabaseAnonKey of debug: true in js/config.js;
#        - _headers ontbreekt of geen CSP voor /* heeft (bij een API-deploy past Netlify netlify.toml NIET toe);
#        - sw.js (precache-lijst), index.html of manifest.json verwijst naar een bestand dat niet meegaat.
#   4. Deploy via de API naar site werkplekinspectie-app (gecontroleerd op naam vóór het uploaden),
#      alleen ontbrekende bestanden worden geüpload, wachten tot de deploy "ready" is, daarna de
#      bestandslijst van Netlify vergelijken met de publicatiemap (pad + sha1). Faalt luid bij elke fout.
#   Opnieuw draaien is veilig: dezelfde inhoud levert een nieuwe deploy met dezelfde bestanden op.
#
# Sleutel: de Netlify-token komt uit NETLIFY_AUTH_TOKEN (wordt nooit getoond of opgeslagen). In de
# Claude-cloudomgeving voegt de netwerkproxy de token zelf toe; daar hoeft NETLIFY_AUTH_TOKEN niet gezet.
# Andere site: NETLIFY_SITE_ID en NETLIFY_SITE_NAME (de naam moet kloppen, anders weigert het script).
# Exitcode: 0 = gelukt, 1 = geweigerd of fout, 2 = gebruiksfout.
set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-68e5518e-49de-4c41-925c-d536a868cd48}"
SITE_NAME="${NETLIFY_SITE_NAME:-werkplekinspectie-app}"
API="https://api.netlify.com/api/v1"
DRY=0; PREVIEW=0; HOUD=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --preview) PREVIEW=1 ;;
    --houd) HOUD=1 ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 0 ;;
    *) echo "Onbekende optie: $1 (zie --help)" >&2; exit 2 ;;
  esac
  shift
done

fout() { echo "FOUT: $*" >&2; exit 1; }
stap() { printf '\n== %s\n' "$*"; }
for c in git python3 curl tar sed; do command -v "$c" >/dev/null || fout "$c ontbreekt"; done

SCRIPTMAP="$(cd "$(dirname "$0")" && pwd)"
REPO="$(git -C "$SCRIPTMAP" rev-parse --show-toplevel)"
cd "$REPO"
git cat-file -e HEAD:webapp 2>/dev/null || fout "webapp/ staat niet in HEAD"
[ -f "$SCRIPTMAP/secret_scan.sh" ] || fout "tools/secret_scan.sh ontbreekt (nodig voor de geheimenscan)"
COMMIT="$(git rev-parse HEAD)"; KORT="${COMMIT:0:7}"
ONDERWERP="$(git log -1 --format=%s HEAD | tr -cd '[:print:]' | cut -c1-80)"

WERK="$(mktemp -d "${TMPDIR:-/tmp}/wpi-deploy.XXXXXX")"
opruimen() { if [ "$HOUD" = 1 ]; then echo "Tijdelijke map bewaard: $WERK"; else rm -rf "$WERK"; fi; }
trap opruimen EXIT
BRON="$WERK/bron"; PUB="$WERK/publicatie"; mkdir -p "$BRON" "$PUB"

# ---------------------------------------------------------------------------------------------------
cat > "$WERK/hulp.py" <<'PY'
import sys, os, re, json, hashlib, base64, stat

# ALLOWLIST: paden relatief aan webapp/. Alleen deze gaan online.
ALLOW = [
    r"index\.html",
    r"styles\.css",
    r"sw\.js",
    r"manifest(\.[a-z0-9-]+)?\.(json|webmanifest)",
    r"_headers",
    r"_redirects",
    r"(icon|favicon|apple-touch-icon|maskable)[A-Za-z0-9_-]*(\.[A-Za-z0-9_-]+)*\.(png|svg|ico|webp)",
    r"js/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.(js|mjs)",
    r"css/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.css",
    r"data/[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.json",
    r"(icons|img|images|fonts)/([A-Za-z0-9_-]+/)*[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*\.(png|svg|ico|webp|jpe?g|gif|avif|woff2?|ttf|otf)",
    r"\.well-known/(security\.txt|assetlinks\.json|apple-app-site-association)",
]
ALLOW = [re.compile(r"\A" + a + r"\Z") for a in ALLOW]
# DENYLIST (vangnet, los van de allowlist): mag er nooit in staan, wat de allowlist ook zegt.
DENY_MAP = {"tests", "tools", "supabase", "docs", "node_modules", "handoff", "wpi", "dist", ".git"}
DENY_EXT = (".md", ".sql", ".py", ".pyc", ".sh", ".toml", ".env", ".bak", ".zip", ".log", ".map", ".ts", ".yml", ".yaml", ".lock")
DENY_NAAM = {"netlify.toml", "vercel.json", "package.json", "package-lock.json", ".env", ".npmrc", ".htpasswd"}

def mag(rel):
    return any(a.match(rel) for a in ALLOW)

def verboden(rel):
    delen = rel.split("/")
    waarom = []
    if any(d in DENY_MAP for d in delen[:-1]): waarom.append("interne map")
    if any(d.startswith(".") and d != ".well-known" for d in delen): waarom.append("dotfile/-map")
    if rel.lower().endswith(DENY_EXT): waarom.append("verboden extensie")
    if delen[-1] in DENY_NAAM: waarom.append("verboden bestandsnaam")
    if rel.lower().endswith((".html", ".htm")) and rel != "index.html": waarom.append("interne html-pagina")
    return waarom

def alle(map_):
    uit = []
    for wortel, mappen, bestanden in os.walk(map_):
        mappen.sort()
        for b in sorted(bestanden):
            p = os.path.join(wortel, b)
            uit.append((os.path.relpath(p, map_).replace(os.sep, "/"), p))
    return sorted(uit)

def sha1(p):
    h = hashlib.sha1()
    with open(p, "rb") as f:
        for blok in iter(lambda: f.read(65536), b""): h.update(blok)
    return h.hexdigest()

def kies(bron, doel):
    """Kopieer alleen allowlist-bestanden; meld wat achterblijft."""
    mee, weg = [], []
    for rel, p in alle(bron):
        if os.path.islink(p) or not stat.S_ISREG(os.lstat(p).st_mode):
            weg.append(rel + "  (geen gewoon bestand)"); continue
        if mag(rel) and not verboden(rel):
            d = os.path.join(doel, rel); os.makedirs(os.path.dirname(d), exist_ok=True)
            with open(p, "rb") as a, open(d, "wb") as b: b.write(a.read())
            mee.append(rel)
        else:
            weg.append(rel)
    print(f"Meegenomen: {len(mee)} bestanden. Achtergelaten: {len(weg)} bestanden, o.a.:")
    toon = sorted({r.split('/')[0] + ('/' if '/' in r else '') for r in weg})
    print("  " + ", ".join(toon))

def jwt_rol(tok):
    try:
        deel = tok.split(".")[1]; deel += "=" * (-len(deel) % 4)
        return json.loads(base64.urlsafe_b64decode(deel)).get("role", "(geen rol)")
    except Exception:
        return None

def poort(pub):
    """Allowlist/denylist, eigen geheimchecks, _headers en verwijzingen. Exit 1 bij elke weigering."""
    fouten, waarschuw = [], []
    bestanden = alle(pub)
    namen = {r for r, _ in bestanden}
    for rel, p in bestanden:
        if os.path.islink(p): fouten.append(f"{rel}: symbolische link"); continue
        if not mag(rel): fouten.append(f"{rel}: staat niet op de allowlist")
        for w in verboden(rel): fouten.append(f"{rel}: {w}")
        if os.path.getsize(p) > 10 * 1024 * 1024: fouten.append(f"{rel}: groter dan 10 MB")
        data = open(p, "rb").read()
        try: tekst = data.decode("utf-8")
        except UnicodeDecodeError: tekst = data.decode("latin-1")
        for m in re.finditer(r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}", tekst):
            rol = jwt_rol(m.group(0))
            if rol != "anon": fouten.append(f"{rel}: JWT met rol {rol!r} (alleen een anon-key mag publiek; service_role NOOIT)")
        if re.search(r"sb_secret_[A-Za-z0-9_-]{8,}", tekst): fouten.append(f"{rel}: Supabase secret key (sb_secret_…)")
        if re.search(r"""["']role["']\s*:\s*["']service_role["']""", tekst): fouten.append(f"{rel}: service_role-claim in platte tekst")
    # js/config.js: alleen een publieke sleutel, debug uit
    cfg = os.path.join(pub, "js", "config.js")
    if os.path.isfile(cfg):
        t = open(cfg, encoding="utf-8").read()
        m = re.search(r"""supabaseAnonKey\s*:\s*["'`]([^"'`]*)["'`]""", t)
        if m and m.group(1):
            k = m.group(1)
            if not (k.startswith("sb_publishable_") or jwt_rol(k) == "anon"):
                fouten.append("js/config.js: supabaseAnonKey is geen anon/publishable key")
        if re.search(r"\bdebug\s*:\s*true\b", t): fouten.append("js/config.js: debug: true (moet false zijn in productie)")
        u = re.search(r"""supabaseUrl\s*:\s*["'`]([^"'`]*)["'`]""", t)
        if u and u.group(1):
            for f in ("_headers", "index.html"):
                if f in namen and "project-ref.supabase.co" in open(os.path.join(pub, f), encoding="utf-8").read():
                    fouten.append(f"{f}: CSP noemt nog 'project-ref' terwijl js/config.js naar {u.group(1)} wijst (app kan de server niet bereiken)")
    # _headers: bij een API-deploy is dit de ENIGE bron van beveiligingsheaders
    if "_headers" not in namen:
        fouten.append("_headers ontbreekt: zonder dit bestand krijgt de site geen CSP/HSTS (netlify.toml telt niet bij een API-deploy)")
    else:
        h = open(os.path.join(pub, "_headers"), encoding="utf-8").read()
        blok = re.search(r"(?m)^/\*\s*\n((?:[ \t]+.*\n?)+)", h)
        if not blok or "Content-Security-Policy:" not in blok.group(1):
            fouten.append("_headers: geen Content-Security-Policy voor /*")
        else:
            for kop in ("Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"):
                if kop + ":" not in blok.group(1): fouten.append(f"_headers: {kop} ontbreekt voor /*")
            if "script-src 'self'" not in blok.group(1) or "unsafe-eval" in blok.group(1):
                fouten.append("_headers: CSP is niet strikt (script-src 'self' zonder unsafe-eval verwacht)")
    # verwijzingen: alles wat de app laadt, moet meegaan
    def bestaat(ref, bron):
        ref = ref.split("#")[0].split("?")[0]
        if not ref or re.match(r"^(https?:|//|data:|blob:|mailto:|tel:)", ref): return
        ref = re.sub(r"^\./", "", ref).lstrip("/")
        if ref == "": ref = "index.html"
        if ref not in namen: fouten.append(f"{bron} verwijst naar '{ref}', maar dat bestand gaat niet mee")
        return ref
    gebruikt = set()
    if "sw.js" in namen:
        sw = open(os.path.join(pub, "sw.js"), encoding="utf-8").read()
        m = re.search(r"(?s)const\s+SHELL\s*=\s*\[(.*?)\]", sw)
        if not m: fouten.append("sw.js: precache-lijst (const SHELL = [...]) niet gevonden")
        else:
            lijst = re.findall(r"""["'`]([^"'`]+)["'`]""", m.group(1))
            for r in lijst: gebruikt.add(bestaat(r, "sw.js (precache)"))
            print(f"sw.js precache: {len(lijst)} items, allemaal gecontroleerd")
    if "index.html" in namen:
        ih = re.sub(r"(?s)<!--.*?-->", "", open(os.path.join(pub, "index.html"), encoding="utf-8").read())   # zonder commentaar
        if re.search(r"<script(?![^>]*\bsrc=)[^>]*>\s*\S", ih): fouten.append("index.html: inline <script> (CSP script-src 'self' blokkeert dat)")
        for r in re.findall(r"""\b(?:src|href)\s*=\s*["']([^"']+)["']""", ih): gebruikt.add(bestaat(r, "index.html"))
    for mf in [n for n in namen if n.startswith("manifest")]:
        try:
            j = json.load(open(os.path.join(pub, mf), encoding="utf-8"))
            for ic in j.get("icons", []): gebruikt.add(bestaat(ic.get("src", ""), mf))
        except Exception as e: fouten.append(f"{mf}: geen geldige JSON ({e})")
    for js in [n for n in namen if n.startswith("js/")]:
        t = open(os.path.join(pub, js), encoding="utf-8").read()
        for r in re.findall(r"""fetch\(\s*["']([^"']+\.(?:json|png|svg|js|css))["']""", t): gebruikt.add(bestaat(r, js))
    stil = sorted(n for n in namen - gebruikt if n not in ("_headers", "_redirects", "sw.js") and not n.startswith(".well-known/"))
    for n in stil: waarschuw.append(f"{n}: wordt nergens in sw.js/index.html/manifest genoemd (toch nodig?)")
    for w in waarschuw: print("LET OP: " + w)
    if fouten:
        print("\nDEPLOY GEWEIGERD:")
        for f in fouten: print("  - " + f)
        sys.exit(1)
    print(f"Poort: {len(namen)} bestanden, allemaal op de allowlist; geen verboden bestanden; verwijzingen compleet.")

def scanstroom(pub):
    """Invoer voor de scanner uit tools/secret_scan.sh: tekst als '+'-regels, binair als BINFILE."""
    out = sys.stdout.buffer
    out.write(b"\x01WPI-BRON publicatiemap\n")
    for rel, p in alle(pub):
        data = open(p, "rb").read()
        if b"\x00" in data[:8000] or len(data) > 5_000_000:
            out.write(b"\x01WPI-BINFILE " + p.encode() + b"\n")
        else:
            out.write(b"\x01WPI-FILE " + rel.encode() + b"\n")
            for regel in data.split(b"\n"): out.write(b"+" + regel.rstrip(b"\r") + b"\n")
            out.write(b"\n")

def lijst(pub):
    tot = 0
    for rel, p in alle(pub):
        n = os.path.getsize(p); tot += n
        print(f"  {n:>9}  {sha1(p)}  /{rel}")
    print(f"  {tot:>9}  totaal, {len(alle(pub))} bestanden")

def payload(pub, draft):
    files = {"/" + rel: sha1(p) for rel, p in alle(pub)}
    json.dump({"files": files, "draft": draft == "1"}, sys.stdout)

def vereist(pub, antwoord):
    """Uit het antwoord van de API: id, state en per vereiste sha1 één pad om te uploaden."""
    a = json.load(open(antwoord))
    nodig = set(a.get("required") or [])
    print("ID", a["id"]); print("STATE", a.get("state", "?"))
    gehad = set()
    for rel, p in alle(pub):
        s = sha1(p)
        if s in nodig and s not in gehad:
            gehad.add(s); print("UP", "/" + rel)
    if nodig - gehad: print("MIST", " ".join(sorted(nodig - gehad)))

def veld(antwoord, *sleutels):
    a = json.load(open(antwoord))
    for k in sleutels:
        a = a.get(k) if isinstance(a, dict) else None
    print("" if a is None else a)

def vergelijk(pub, antwoord):
    """Bestandslijst van Netlify (GET /deploys/:id/files) tegen de publicatiemap."""
    lokaal = {"/" + rel: sha1(p) for rel, p in alle(pub)}
    netlify = {f["id"] if f.get("id", "").startswith("/") else "/" + f["path"].lstrip("/"): f.get("sha") for f in json.load(open(antwoord))}
    fout = False
    verwerkt = {"/_headers", "/_redirects"}   # Netlify verwerkt deze tot regels; ze staan soms niet in de lijst
    for pad, s in sorted(lokaal.items()):
        if pad not in netlify:
            if pad in verwerkt: print(f"  (ok)  {pad}: door Netlify verwerkt tot header-/redirectregels, niet als bestand gepubliceerd")
            else: print(f"  MIST  {pad}"); fout = True
        elif netlify[pad] != s: print(f"  ANDERS {pad}: lokaal {s}, Netlify {netlify[pad]}"); fout = True
    for pad in sorted(set(netlify) - set(lokaal)): print(f"  EXTRA {pad} (staat online maar niet in de publicatiemap)"); fout = True
    gelijk = sum(1 for p in lokaal if netlify.get(p) == lokaal[p])
    print(f"Online {len(netlify)} bestanden; {gelijk} identiek aan de publicatiemap (pad + sha1).")
    sys.exit(1 if fout else 0)

{"kies": kies, "poort": poort, "scanstroom": scanstroom, "lijst": lijst, "payload": payload,
 "vereist": vereist, "veld": veld, "vergelijk": vergelijk}[sys.argv[1]](*sys.argv[2:])
PY
hulp() { python3 -I "$WERK/hulp.py" "$@"; }

# --- 1. bouwen uit de gecommitte stand --------------------------------------------------------------
stap "Bouwen uit commit $KORT ($ONDERWERP)"
if [ -n "$(git status --porcelain --untracked-files=all -- webapp 2>/dev/null)" ]; then
  echo "LET OP: webapp/ heeft niet-gecommitte of ongevolgde wijzigingen; die gaan NIET mee (alleen HEAD wordt gepubliceerd)."
fi
git archive --format=tar HEAD webapp | tar -x -C "$BRON"
[ -f "$BRON/webapp/index.html" ] || fout "webapp/index.html ontbreekt in HEAD"
hulp kies "$BRON/webapp" "$PUB"

# --- 2. poort: allowlist, verwijzingen, headers, geheimen ---------------------------------------------
stap "Poort: allowlist, verwijzingen, _headers en sleutels"
hulp poort "$PUB" || fout "deploy geweigerd door de poort (zie hierboven)"

stap "Geheimenscan (regels van tools/secret_scan.sh, streng, zonder uitzonderingslijst)"
sed -n "/^cat > \"\$SCANNER\" <<'PY'\$/,/^PY\$/p" "$SCRIPTMAP/secret_scan.sh" | sed '1d;$d' > "$WERK/scanner.py"
grep -q '^REGELS = \[' "$WERK/scanner.py" && grep -q 'WPI-BINFILE' "$WERK/scanner.py" \
  || fout "kon de scanner niet uit tools/secret_scan.sh halen (is dat script veranderd?)"
: > "$WERK/leeg.allow"
if ! hulp scanstroom "$PUB" | python3 -I "$WERK/scanner.py" 0 1 "$WERK/leeg.allow" > "$WERK/scan.txt" 2>&1; then
  cat "$WERK/scan.txt"; fout "DEPLOY GEWEIGERD: de geheimenscan vond iets in de publicatiemap (of liep vast)"
fi
grep -E '^(Geen vondsten|Samenvatting)' "$WERK/scan.txt" || true

stap "Publicatiemap (grootte, sha1, pad)"
hulp lijst "$PUB"

if [ "$DRY" = 1 ]; then
  echo; echo "Dry-run: niets geüpload."; exit 0
fi

# --- 3. deploy via de Netlify-API -------------------------------------------------------------------
TOKEN="${NETLIFY_AUTH_TOKEN:-proxy-injected}"
api() {   # api METHODE PAD UITVOERBESTAND [extra curl-opties]; faalt bij netwerkfout of niet-2xx
  local m="$1" p="$2" uit="$3"; shift 3
  local code
  code="$(curl -sS --connect-timeout 20 --max-time 300 -X "$m" -o "$uit" -w '%{http_code}' \
    -H @<(printf 'Authorization: Bearer %s\n' "$TOKEN") -H 'User-Agent: wpi-deploy-script' "$@" "$API$p")" \
    || fout "netwerkfout bij $m $p"
  if [[ "$code" != 2* ]]; then
    echo "Netlify-API antwoordde $code op $m $p:" >&2; head -c 1500 "$uit" >&2; echo >&2
    fout "API-aanroep mislukt"
  fi
}

stap "Site controleren"
api GET "/sites/$SITE_ID" "$WERK/site.json"
NAAM="$(hulp veld "$WERK/site.json" name)"
[ "$NAAM" = "$SITE_NAME" ] || fout "site $SITE_ID heet '$NAAM', verwacht '$SITE_NAME' — gestopt, er is niets gedeployed"
echo "Site: $NAAM ($SITE_ID) $(hulp veld "$WERK/site.json" ssl_url)"

stap "Deploy aanmaken ($([ "$PREVIEW" = 1 ] && echo 'concept/preview' || echo productie))"
hulp payload "$PUB" "$PREVIEW" > "$WERK/payload.json"
TITEL="$(python3 -I -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "git $KORT: $ONDERWERP")"
api POST "/sites/$SITE_ID/deploys?title=$TITEL" "$WERK/deploy.json" -H 'Content-Type: application/json' --data-binary @"$WERK/payload.json"
hulp vereist "$PUB" "$WERK/deploy.json" > "$WERK/vereist.txt"
DEPLOY_ID="$(sed -n 's/^ID //p' "$WERK/vereist.txt")"
[ -n "$DEPLOY_ID" ] || fout "geen deploy-id ontvangen"
! grep -q '^MIST' "$WERK/vereist.txt" || fout "Netlify vraagt om bestanden die niet in de publicatiemap staan: $(grep '^MIST' "$WERK/vereist.txt")"
echo "Deploy-id: $DEPLOY_ID (status: $(sed -n 's/^STATE //p' "$WERK/vereist.txt"))"

AANTAL="$(grep -c '^UP ' "$WERK/vereist.txt" || true)"
echo "Te uploaden (nieuw voor Netlify): $AANTAL bestand(en)"
while read -r _ pad; do
  enc="$(python3 -I -c 'import sys,urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$pad")"
  api PUT "/deploys/$DEPLOY_ID/files$enc" "$WERK/up.json" --retry 3 -H 'Content-Type: application/octet-stream' --data-binary @"$PUB$pad"
  echo "  geüpload: $pad"
done < <(grep '^UP ' "$WERK/vereist.txt")

stap "Wachten tot de deploy klaar is"
STATE=""
for _ in $(seq 1 90); do
  api GET "/deploys/$DEPLOY_ID" "$WERK/status.json" --retry 3
  STATE="$(hulp veld "$WERK/status.json" state)"
  case "$STATE" in
    ready) break ;;
    error|rejected) fout "deploy $DEPLOY_ID: status $STATE — $(hulp veld "$WERK/status.json" error_message)" ;;
  esac
  sleep 2
done
[ "$STATE" = ready ] || fout "deploy $DEPLOY_ID is na 3 minuten nog niet klaar (status: $STATE)"
echo "Status: $STATE"

stap "Controle: bestandslijst op Netlify tegen de publicatiemap"
api GET "/deploys/$DEPLOY_ID/files?per_page=1000" "$WERK/files.json" --retry 3
hulp vergelijk "$PUB" "$WERK/files.json" || fout "de online bestandslijst wijkt af van de publicatiemap"

stap "Resultaat"
api GET "/sites/$SITE_ID" "$WERK/site.json" --retry 3
GEPUBLICEERD="$(hulp veld "$WERK/site.json" published_deploy id)"
echo "Deploy-id:   $DEPLOY_ID"
echo "Status:      $STATE ($(hulp veld "$WERK/status.json" context))"
echo "Commit:      $COMMIT"
echo "Deploy-URL:  $(hulp veld "$WERK/status.json" deploy_ssl_url)"
if [ "$PREVIEW" = 1 ]; then
  echo "Preview: de productiesite is NIET gewijzigd."
elif [ "$GEPUBLICEERD" = "$DEPLOY_ID" ]; then
  echo "Productie:   $(hulp veld "$WERK/site.json" ssl_url) (deze deploy is nu live)"
else
  fout "deploy is klaar maar NIET live (gepubliceerde deploy: ${GEPUBLICEERD:-geen}); staat auto-publishing op slot?"
fi
