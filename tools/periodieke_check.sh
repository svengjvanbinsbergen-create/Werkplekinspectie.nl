#!/usr/bin/env bash
# Werkplekinspectie — tools/periodieke_check.sh
# De maandelijkse/kwartaal-beveiligingscontrole in één opdracht (zie webapp/docs/beveiliging-periodiek.md).
#
#   tools/periodieke_check.sh                    alles hieronder, zonder netwerk
#   tools/periodieke_check.sh --url https://werkplekinspectie.nl   ook de gedeployde site (bereikbaarheid + headers)
#   tools/periodieke_check.sh --db               ook de databasetests (supabase/tests/run.sh) tegen een LOKALE
#                                                test-PostgreSQL, nooit de productiedatabase. Zonder PGHOST/PGUSER als
#                                                OS-gebruiker postgres (sudo/runuser); anders met jouw PGHOST/PGPORT/PGUSER.
#   tools/periodieke_check.sh --snel             zonder de (trage) geheimenscan over de git-geschiedenis
#
# Wat er gebeurt:
#   1. Geheimen: tools/secret_scan.sh --onbereikbaar --streng over de hele git-geschiedenis, tags, reflog,
#      losse objecten, binaire bestanden en de werkmap (ook genegeerde bestanden zoals .env).
#   2. Configuratie: js/config.js mag alleen de anon/publishable key bevatten (een JWT wordt gedecodeerd:
#      role moet "anon" zijn; sb_secret_/service_role = KRITIEK), supabaseUrl moet https zijn en in de CSP
#      van alle vier de bronnen staan, debug moet false zijn. Nergens in webapp/ "service_role"-sleutels.
#   3. Omgevingsvariabelen: namen (nooit waarden) van variabelen die op geheimen lijken in deze shell, en
#      .env-bestanden in de repo; een geheim met een publiek voorvoegsel (NEXT_PUBLIC_, VITE_, PUBLIC_) = FOUT.
#   4. Afhankelijkheden: de app heeft geen npm-pakketten (controle: geen package.json/node_modules in webapp/,
#      geen <script src> van een ander domein); externe bronnen in index.html; versies van PostgreSQL,
#      Supabase CLI, Node, Playwright en Python; niet-standaard Python-modules die tools/ gebruikt (met versie);
#      scripts in tools/ waar niets naar verwijst (kandidaat om op te ruimen).
#   5. Debug en CSP: debug-vlaggen, console.log/debugger in webapp/js, inline handlers (onclick= e.d.) of
#      inline <script> in index.html en de JS, 'unsafe-inline' in script-src.
#   6. Publicatie: node webapp/tests/exposed.js --config --strict (allowlist-build echt uitgevoerd, 404-regels,
#      CSP gelijk in index.html/_headers/netlify.toml/vercel.json). Met --url ook de live site.
# Uitvoer: per controle OK / LET OP / FOUT, en onderaan een samenvatting. Exitcode 1 bij een FOUT, anders 0.
# Geen afhankelijkheden behalve bash, git, python3 en node (node alleen voor stap 6).
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WEB="$ROOT/webapp"
URL=""; DB=0; SNEL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --url) URL="${2:-}"; shift ;;
    --db) DB=1 ;;
    --snel) SNEL=1 ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Onbekende optie: $1 (zie --help)"; exit 2 ;;
  esac
  shift
done
FOUT=0; LETOP=0
ok()    { printf '  OK      %s\n' "$*"; }
letop() { printf '  LET OP  %s\n' "$*"; LETOP=$((LETOP + 1)); }
fout()  { printf '  FOUT    %s\n' "$*"; FOUT=$((FOUT + 1)); }
kop()   { printf '\n== %s ==\n' "$*"; }

echo "Werkplekinspectie — periodieke beveiligingscontrole · $(date '+%Y-%m-%d %H:%M') · $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo 'geen git')"

# ---------------------------------------------------------------- 1. geheimen
kop "1. Geheimen in git-geschiedenis en werkmap"
if [ "$SNEL" = 1 ]; then
  letop "overgeslagen (--snel); draai minstens maandelijks zonder --snel"
else
  UIT=$(bash "$ROOT/tools/secret_scan.sh" --onbereikbaar --streng 2>&1); RC=$?
  echo "$UIT" | grep -E '^(KRITIEK|HOOG|MIDDEL)|Samenvatting|LET OP|commits|uitgelezen' | sed 's/^/    /' | head -40
  if [ $RC -eq 0 ]; then ok "secret_scan.sh --onbereikbaar --streng: geen KRITIEK/HOOG/MIDDEL"
  else fout "secret_scan.sh vond iets (exitcode $RC): eerst ROTEREN (zie beveiliging-periodiek.md §4), dan opschonen"; fi
fi

# ---------------------------------------------------------------- 2. configuratie
kop "2. Client-configuratie (webapp/js/config.js) en sleutels"
PYUIT=$(python3 - "$WEB" <<'PY'
import base64, json, re, sys, pathlib
web = pathlib.Path(sys.argv[1])
cfg = (web / "js/config.js").read_text(encoding="utf-8")
cfg = cfg[cfg.find("WPI_CONFIG ="):] if "WPI_CONFIG =" in cfg else cfg   # alleen het object, niet het commentaar
def veld(n):
    m = re.search(n + r'\s*:\s*("(?:[^"\\]|\\.)*"|true|false)', cfg)
    return json.loads(m.group(1)) if m else None
url, key, debug = veld("supabaseUrl"), veld("supabaseAnonKey"), veld("debug")
def say(s, t): print(("  %-7s " % s) + t)
if not url and not key:
    say("OK", "voorbeeldmodus: geen backend ingevuld (geen sleutels in de client)")
else:
    if not str(url).startswith("https://"): say("FOUT", "supabaseUrl is niet https: " + str(url))
    else: say("OK", "supabaseUrl is https")
    k = str(key or "")
    if k.startswith("sb_secret_"): say("FOUT", "KRITIEK: supabaseAnonKey is een GEHEIME sleutel (sb_secret_): direct roteren")
    elif k.startswith("sb_publishable_"): say("OK", "supabaseAnonKey is een publishable key (publiek bedoeld)")
    elif k.count(".") == 2:
        try:
            p = k.split(".")[1]; p += "=" * (-len(p) % 4)
            rol = json.loads(base64.urlsafe_b64decode(p)).get("role")
        except Exception: rol = None
        if rol == "anon": say("OK", "supabaseAnonKey is een JWT met role=anon (publiek bedoeld)")
        elif rol == "service_role": say("FOUT", "KRITIEK: supabaseAnonKey is een service_role-JWT: direct roteren (JWT-secret!)")
        else: say("FOUT", "supabaseAnonKey: JWT met onbekende rol " + repr(rol))
    else: say("LET OP", "supabaseAnonKey heeft een onbekend formaat")
    ref = re.sub(r"^https://|/.*$", "", str(url))
    for f in ["index.html", "_headers", "netlify.toml", "vercel.json"]:
        t = (web / f).read_text(encoding="utf-8")
        if "https://" + ref not in t: say("FOUT", f + ": connect-src noemt " + ref + " niet (de app kan de server dan niet bereiken)")
        if "project-ref.supabase.co" in t: say("LET OP", f + ": nog de plaatshouder project-ref.supabase.co in de CSP")
if debug is True: say("FOUT", "config.js: debug: true (ruwe servermeldingen in de console); zet op false")
else: say("OK", "config.js: debug staat uit")
# service_role-sleutels of geheime sleutels ergens in de publicatiebron
hits = []
for p in web.rglob("*"):
    if not p.is_file() or any(x in p.parts for x in ("docs", "tests", "supabase", "node_modules", "dist")) or p.suffix in (".png", ".jpg", ".md"): continue
    t = p.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r"sb_secret_[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", t):
        v = m.group(0)
        if v.startswith("eyJ"):
            try:
                pl = v.split(".")[1]; pl += "=" * (-len(pl) % 4)
                if json.loads(base64.urlsafe_b64decode(pl)).get("role") == "anon": continue
            except Exception: pass
        hits.append(str(p.relative_to(web)))
if hits: say("FOUT", "geheime sleutel/JWT (niet-anon) in: " + ", ".join(sorted(set(hits))))
else: say("OK", "geen service_role-JWT of sb_secret_-sleutel in de app-bestanden van webapp/")
PY
); RC=$?
echo "$PYUIT"
[ $RC -ne 0 ] && fout "configuratiecontrole kon niet draaien"
FOUT=$((FOUT + $(echo "$PYUIT" | grep -c '^  FOUT'))); LETOP=$((LETOP + $(echo "$PYUIT" | grep -c '^  LET OP')))

# ---------------------------------------------------------------- 3. omgevingsvariabelen
kop "3. Omgevingsvariabelen en .env-bestanden (alleen namen, nooit waarden)"
GEHEIM_RE='(SECRET|PASSWORD|PASSWD|PWD|TOKEN|API_?KEY|SERVICE_?ROLE|PRIVATE|CREDENTIAL|JWT|SMTP_PASS|DB_PASS)'
NAMEN=$(env | cut -d= -f1 | grep -E "$GEHEIM_RE" | grep -vE '^(OLDPWD|PWD)$|TOKENS$' | sort || true)
if [ -n "$NAMEN" ]; then
  letop "geheim-achtige variabelen in deze shell (controleer of ze hier horen): $(echo "$NAMEN" | tr '\n' ' ')"
  if echo "$NAMEN" | grep -qE '^(NEXT_PUBLIC_|VITE_|PUBLIC_|REACT_APP_)'; then fout "een geheim met een PUBLIEK voorvoegsel (komt in de browser terecht)"; fi
else ok "geen geheim-achtige omgevingsvariabelen in deze shell"; fi
ENVS=$(cd "$ROOT" && find . -path ./.git -prune -o \( -name '.env' -o -name '.env.*' -o -name '*.env' \) -type f -print 2>/dev/null | grep -v '.env.example' || true)
if [ -n "$ENVS" ]; then
  for f in $ENVS; do
    case "$f" in ./webapp/*) fout "$f staat in webapp/ (bron van de publicatie); de allowlist-build neemt hem niet mee, maar haal hem weg" ;; *) letop "$f gevonden; staat hij in .gitignore? $(git -C "$ROOT" check-ignore -q "$f" && echo ja || echo NEE)" ;; esac
  done
else ok "geen .env-bestanden in de repository"; fi
for f in netlify.toml vercel.json _headers; do
  if grep -qiE '(secret|service_role|password|api_?key)\s*[=:]\s*"[^"]{8,}' "$WEB/$f"; then fout "$f lijkt een geheim te bevatten"; fi
done
ok "hostingconfig (netlify.toml, vercel.json, _headers) bevat geen geheimen; geheimen alleen in het dashboard van de host/Supabase"

# ---------------------------------------------------------------- 4. afhankelijkheden
kop "4. Afhankelijkheden en versies"
if [ -e "$WEB/package.json" ] || [ -d "$WEB/node_modules" ]; then letop "webapp/ heeft een package.json of node_modules: de app hoort geen npm-pakketten te hebben; controleer met 'npm audit'"
else ok "de app heeft geen npm-pakketten (geen package.json/node_modules in webapp/): niets te updaten of te auditen"; fi
EXT=$(grep -oE '(src|href)="https?://[^"]+"' "$WEB/index.html" | sed 's/^[a-z]*="//; s/"$//' | sort -u)
if grep -qE '<script[^>]+src="https?://' "$WEB/index.html"; then fout "index.html laadt een script van een ander domein (supply-chain-risico)"; else ok "geen scripts van andere domeinen in index.html"; fi
[ -n "$EXT" ] && letop "externe bronnen in index.html (privacy/AVG: IP-adres naar die partij; overweeg zelf hosten): $(echo "$EXT" | tr '\n' ' ')"
printf '    %-18s %s\n' "PostgreSQL (lokaal)" "$( (psql --version 2>/dev/null || echo 'niet geïnstalleerd') | head -1)"
printf '    %-18s %s\n' "Supabase CLI" "$( (supabase --version 2>/dev/null || echo 'niet geïnstalleerd (Supabase-versie: Dashboard › Settings › Infrastructure)') | head -1)"
printf '    %-18s %s\n' "Node" "$(node --version 2>/dev/null || echo 'niet geïnstalleerd')"
printf '    %-18s %s\n' "Playwright (tests)" "$(node -e 'try{console.log(require("playwright/package.json").version)}catch(e){console.log("niet gevonden")}' 2>/dev/null)"
printf '    %-18s %s\n' "Python" "$(python3 --version 2>&1)"
python3 - "$ROOT/tools" <<'PY'
import ast, sys, pathlib, importlib.metadata as md
tools = pathlib.Path(sys.argv[1]); std = set(sys.stdlib_module_names); eigen = {p.stem for p in tools.glob("*.py")}
mods = {}
for p in sorted(tools.glob("*.py")):
    try: tree = ast.parse(p.read_text(encoding="utf-8"))
    except Exception: continue
    for n in ast.walk(tree):
        names = [a.name for a in n.names] if isinstance(n, ast.Import) else [n.module] if isinstance(n, ast.ImportFrom) and n.module and n.level == 0 else []
        for m in names:
            top = m.split(".")[0]
            if top not in std and top not in eigen: mods.setdefault(top, set()).add(p.name)
if not mods: print("    Python-tools gebruiken alleen de standaardbibliotheek")
for m, waar in sorted(mods.items()):
    try: v = md.version(m)
    except Exception: v = "niet geïnstalleerd"
    print(f"    Python-module {m:<12} {v:<18} (gebruikt door {', '.join(sorted(waar))}; alleen voor ontwikkeling, niet in de app)")
PY
ONGEBRUIKT=""
# De rapporten die de uitkomst van DEZE controle overnemen (beveiligingsrapport, periodieke checklist,
# kwaliteitsrapport) tellen niet als "gebruik": anders schakelt de controle zichzelf uit zodra een rapport de
# gevonden namen noemt. Alleen code, configuratie en de gewone documentatie (README/CONTEXT) tellen.
for f in "$ROOT"/tools/*.py "$ROOT"/tools/*.sh; do
  n=$(basename "$f"); s="${n%.*}"
  [ "$n" = "periodieke_check.sh" ] && continue
  if ! grep -rqs --exclude-dir=.git --exclude-dir=__pycache__ --exclude="$n" --exclude='beveiliging*.md' --exclude='kwaliteit-rapport.md' \
       -e "$n" -e "tools/$s\b" -e "from $s import" "$ROOT"; then ONGEBRUIKT="$ONGEBRUIKT $n"; fi
done
if [ -n "$ONGEBRUIKT" ]; then letop "scripts in tools/ waar niets naar verwijst (niet gepubliceerd; opruimen of documenteren):$ONGEBRUIKT"; else ok "alle scripts in tools/ worden ergens genoemd"; fi
echo "    Supabase (server): versie en beveiligingsupdates via Dashboard › Settings › Infrastructure; Security Advisor (Dashboard › Advisors) maandelijks bekijken."

# ---------------------------------------------------------------- 5. debug en CSP
kop "5. Debug-vlaggen, inline scripts en CSP"
JS="$WEB/js"
D=$(grep -nE '\bdebugger\s*;|console\.(log|debug|table|trace)\(|(^|[^.])\bDEBUG\s*=\s*true|debug\s*:\s*true|localStorage\.(getItem|setItem)\(\s*["'"'"']debug' "$JS"/*.js "$WEB/index.html" 2>/dev/null || true)
if [ -n "$D" ]; then fout "debug-uitvoer of -vlag gevonden:"; echo "$D" | sed 's/^/      /' | cut -c1-180 | head -20; else ok "geen debugger/console.log/debug: true in webapp/js en index.html"; fi
H=$(grep -noE '\son(click|change|input|submit|keydown|keyup|keypress|load|error|mouse[a-z]+|pointer[a-z]+|focus|blur|toggle|contextmenu)\s*=' "$JS"/*.js "$WEB/index.html" 2>/dev/null | grep -v '^\s*//' || true)
if [ -n "$H" ]; then fout "inline handler-attributen (verboden onder script-src-attr 'none'):"; echo "$H" | sed 's/^/      /' | head -20; else ok "geen inline handler-attributen in webapp/js en index.html"; fi
# WPI.esc() (js/kern.js) zet & < > " om, maar NIET de enkele quote: een waarde in een attribuut tussen enkele
# quotes (x='${...}') zou daar uit kunnen breken (bijv. een extra data-action). Alle attributen moeten dus dubbele quotes hebben.
Q=$(grep -nE "[a-zA-Z-]+='[^']*\\$\{" "$JS"/*.js 2>/dev/null || true)
if [ -n "$Q" ]; then fout "attribuut tussen enkele quotes met een \${…}-waarde (esc() beschermt daar niet):"; echo "$Q" | sed 's/^/      /' | cut -c1-180 | head -20; else ok "geen attributen tussen enkele quotes met \${…} in webapp/js (esc() is daar veilig)"; fi
# dynamische SQL (EXECUTE met een tekst) in de databasefuncties: zou SQL-injectie mogelijk maken; triggers
# ("execute function …") en rechten ("grant/revoke execute …") en commentaar tellen niet mee
X=$(grep -inE '\bexecute\b' "$WEB"/supabase/migrations/*.sql 2>/dev/null | grep -viE 'execute (function|procedure)|(grant|revoke)[^;]*execute|:[0-9]+:\s*--' || true)
if [ -n "$X" ]; then fout "dynamische SQL (EXECUTE) in de migraties; alleen met format(%I/%L) en na review:"; echo "$X" | sed 's/^/      /' | cut -c1-180 | head -20; else ok "geen dynamische SQL (EXECUTE met tekst) in supabase/migrations"; fi
# inline <script> en de CSP zelf (commentaar in index.html en _headers telt niet mee)
CSPUIT=$(python3 - "$WEB" <<'PY'
import re, sys, pathlib
web = pathlib.Path(sys.argv[1])
html = re.sub(r"<!--.*?-->", "", (web / "index.html").read_text(encoding="utf-8"), flags=re.S)
inl = [m.group(0)[:60] for m in re.finditer(r"<script\b([^>]*)>(.*?)</script>", html, flags=re.S) if "src=" not in m.group(1) or m.group(2).strip()]
print("  FOUT    inline <script> in index.html: " + "; ".join(inl) if inl else "  OK      geen inline <script> in index.html")
bron = {"index.html": (re.search(r'http-equiv="Content-Security-Policy" content="([^"]+)"', html) or [None, ""])[1]}
for f in ["_headers", "netlify.toml", "vercel.json"]:
    regels = [r for r in (web / f).read_text(encoding="utf-8").splitlines() if not r.lstrip().startswith("#")]
    bron[f] = " ".join(r for r in regels if "Content-Security-Policy" in r and "default-src 'self'" in r)
slecht = [f for f, c in bron.items() if not c or re.search(r"script-src[^;]*'unsafe-(inline|eval)'", c) or "script-src-attr 'none'" not in c]
print("  FOUT    CSP ontbreekt of is niet strikt (script-src 'unsafe-inline'/'unsafe-eval' of geen script-src-attr 'none') in: " + ", ".join(slecht) if slecht
      else "  OK      CSP in index.html, _headers, netlify.toml en vercel.json: script-src zonder 'unsafe-inline'/'unsafe-eval', script-src-attr 'none'")
PY
)
echo "$CSPUIT"; FOUT=$((FOUT + $(echo "$CSPUIT" | grep -c '^  FOUT')))
if grep -vE '^\s*#' "$WEB/_headers" | grep -qE "style-src[^;]*'unsafe-inline'"; then letop "style-src bevat nog 'unsafe-inline' (style=\"…\"-attributen; laag risico, open punt)"; fi

# ---------------------------------------------------------------- 6. publicatie
kop "6. Publicatie (wat komt er online) en headers"
if command -v node >/dev/null 2>&1; then
  if node "$WEB/tests/exposed.js" --config --strict > /tmp/wpi-periodiek-exposed.$$ 2>&1; then ok "exposed.js --config --strict: allowlist-build, 404-regels en CSP in orde"
  else fout "exposed.js --config --strict faalt:"; grep -E 'FOUT|BEREIKBAAR|AFWIJKEND|ONTBREEKT' /tmp/wpi-periodiek-exposed.$$ | sed 's/^/      /' | head -20; fi
  rm -f /tmp/wpi-periodiek-exposed.$$
  if [ -n "$URL" ]; then
    if node "$WEB/tests/exposed.js" --alles "$URL" --strict > /tmp/wpi-periodiek-live.$$ 2>&1; then ok "live: $URL — niets gevoeligs bereikbaar, verplichte headers aanwezig"
    else fout "live: $URL — zie hieronder"; grep -E 'BLOOTGESTELD|MAPLIJST|ONTBREEKT|ZWAK|AANDACHT|BEREIKBAAR' /tmp/wpi-periodiek-live.$$ | sed 's/^/      /' | head -30; fi
    rm -f /tmp/wpi-periodiek-live.$$
  else letop "live site niet gecontroleerd (geef --url https://… mee)"; fi
else letop "node niet gevonden: publicatiecontrole overgeslagen"; fi

# ---------------------------------------------------------------- 7. database (optioneel)
if [ "$DB" = 1 ]; then
  kop "7. Databasetests (lokale test-PostgreSQL)"
  # run.sh schrijft schema.sql opnieuw en leest ../js/beheer.js: draai op een kopie in /tmp. Zonder PGUSER/PGHOST
  # (standaard Debian/Ubuntu: peer-authenticatie, alleen de OS-gebruiker postgres mag als postgres inloggen) draait
  # het als de OS-gebruiker postgres (runuser als root, anders sudo -u postgres).
  KOPIE=$(mktemp -d /tmp/wpi-db.XXXXXX); cp -r "$WEB/supabase" "$WEB/js" "$KOPIE/"; chmod -R a+rwX "$KOPIE"; chmod a+rx "$KOPIE"
  if [ -z "${PGUSER:-}" ] && [ -z "${PGHOST:-}" ] && [ "$(id -un)" != postgres ]; then
    if [ "$(id -u)" = 0 ]; then ALS="runuser -u postgres --"; else ALS="sudo -u postgres"; fi
  else ALS=""; fi
  if (cd /tmp && $ALS sh "$KOPIE/supabase/tests/run.sh") > /tmp/wpi-periodiek-db.$$ 2>&1; then
    ok "supabase/tests/run.sh: $(grep -E '^ +[0-9]+ \| +[0-9]+ \| +0' /tmp/wpi-periodiek-db.$$ | tail -1 | awk -F'|' '{gsub(/ /,"");print $2" van "$1}') databasecontroles geslaagd, plus races en naamsleutel"
  else fout "supabase/tests/run.sh faalt:"; tail -15 /tmp/wpi-periodiek-db.$$ | sed 's/^/      /'; fi
  rm -rf /tmp/wpi-periodiek-db.$$ "$KOPIE"
fi

kop "Samenvatting"
echo "  $FOUT FOUT · $LETOP LET OP"
echo "  Handmatig (zie webapp/docs/beveiliging-periodiek.md): Supabase Security Advisor, Auth-logs en security_events/audit_log bekijken, MFA van het hoofd, gebruikerslijst (wie is nog actief?)."
[ "$FOUT" -gt 0 ] && exit 1
exit 0
