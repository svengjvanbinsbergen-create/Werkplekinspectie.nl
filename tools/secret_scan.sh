#!/usr/bin/env bash
# Werkplekinspectie — tools/secret_scan.sh
# Zoekt naar sleutels, tokens en wachtwoorden in:
#   1. de git-geschiedenis: git log -p --all --reflog --diff-merges=separate
#        --all     alle refs: branches, remote-tracking, notes (refs/notes/*) en refs/stash (bovenste stash)
#        --reflog  ook commits die alleen nog in een reflog staan: oudere stashes (stash@{1}, …),
#                  commits van na een reset/rebase en verwijderde branches (zolang de reflog bestaat)
#        --diff-merges=separate  ook de diff van elke merge-commit t.o.v. ELKE ouder (ook als de config
#                  log.diffMerges=first-parent zegt). Zonder dit worden gemist: (a) een geheim dat bij het
#                  oplossen van een merge is toegevoegd ("evil merge") en (b) het werkmap-deel van elke
#                  stash (een stash-commit IS een merge van HEAD en de index-commit).
#      Alleen toegevoegde regels ("+") worden gescand: een geheim dat ooit is toegevoegd en later weer
#      verwijderd, wordt dus ook gevonden. Ook de commitberichten en ALLE kopregels van elke commit
#      (auteur, committer, encoding, mergetag, gpgsig, extra kopregels; via --format=raw) worden gescand.
#      Wat de geschiedenis voor een gewone "git log" kan verbergen, staat uit: vervangende objecten
#      (git replace → --no-replace-objects), een grafts-bestand (GIT_GRAFT_FILE=/dev/null) en config
#      zoals log.showRoot=false (dan ontbreekt de diff van de eerste commit), log.abbrevCommit,
#      log.mailmap/mailmap.file, diff.noprefix/relative. Een shallow clone wordt gemeld (LET OP).
#   2. BINAIRE bestanden in de geschiedenis: git log -p toont daarvan alleen "Binary files … differ".
#      Elke zo'n blob wordt apart uitgelezen (git cat-file) en gescand: UTF-16-tekst wordt gedecodeerd,
#      zip-containers (.docx/.xlsx/.xltx/.pptx/.odt/.zip/.jar) worden uitgepakt (XML-tekst ook zonder tags,
#      zodat een token dat Word over meerdere "runs" heeft verdeeld weer aaneen staat), gzip en
#      PDF-streams worden uitgepakt, en uit overige binaire bestanden worden de leesbare tekenreeksen
#      (ASCII en UTF-16LE, ≥ 8 tekens) gehaald, zoals "strings" doet.
#   3. tag-objecten (de tekst van annotated tags; git log --all toont alleen de commit waar de tag naar
#      wijst, niet de tag zelf) en refs die direct naar een blob of tree wijzen.
#   4. .git/config (o.a. een token in een remote-URL of http.extraheader) en eigen .git/hooks.
#   5. sleutelBESTANDEN op naam (.p12, .pfx, .jks, .keystore, .key, .ppk, .kdbx, id_rsa, .htpasswd,
#      .netrc, .pgpass, .git-credentials, credentials.json, …), ook als ze binair of leeg zijn.
#   6. de werkmap (tenzij --alleen-git): niet-gecommitte wijzigingen (git diff HEAD), ongevolgde
#      bestanden én bestanden die door .gitignore genegeerd worden (zoals .env): die staan niet in
#      git, maar worden wél gepubliceerd als ze in webapp/ staan. Binaire bestanden ook hier uitgelezen.
#
#   tools/secret_scan.sh                 alles hierboven
#   tools/secret_scan.sh --alleen-git    zonder de werkmap (punt 6)
#   tools/secret_scan.sh --onbereikbaar  ook losse git-objecten (blobs, tags en commits die nergens meer
#                                        aan hangen, ook niet in een reflog), via git fsck
#   tools/secret_scan.sh --streng        exitcode 1 ook bij MIDDEL (bijv. als pre-commit/CI-poort)
#   tools/secret_scan.sh --toon          volledige waarde tonen i.p.v. gemaskeerd (alleen lokaal gebruiken!)
#   tools/secret_scan.sh --repo DIR      een andere repository scannen (standaard: de repo van dit script)
#
# Uitvoer per vondst: ernst, soort, commit (kort) + datum, bestand:regel, gemaskeerde waarde en een
# vingerafdruk (sha256 van de waarde, 16 tekens). Supabase-JWT's worden gedecodeerd:
# role=service_role = KRITIEK, role=anon = INFO (publiek bedoeld). Aan het eind: hoeveel binaire
# blobs zijn uitgelezen (per soort) en welke NIET (te groot / onleesbaar), zodat zichtbaar is wat
# de scan wel en niet heeft gezien.
# Ernst: KRITIEK (sleutel van een bekende dienst) · HOOG (o.a. wachtwoord/sleutel in .env-/config-stijl
# KEY=waarde, Bearer-token, URL met inloggegevens, willekeurig ogende waarde onder een geheim-achtige
# naam zoals secretKey/DB_PASS/apiKey, sleutelbestand) · MIDDEL (generiek "password: '…'" in code met
# een niet-willekeurige waarde) · LAAG (de WAARDE zelf is duidelijk een plaatshouder: <…>, ${…},
# EXAMPLE, your-…, of na het voorvoegsel hooguit 2 verschillende tekens zoals sk-or-v1-0000…) ·
# TOEGESTAAN (vingerafdruk staat in tools/secret_scan.allow, met reden) · INFO.
# Let op: de omringende regel verlaagt het oordeel NOOIT (spread-syntax, template-literals of HTML op
# dezelfde regel maken een echte sleutel niet onschuldig); alleen de gevonden waarde zelf telt.
# Grenzen (bewust): een geheim zonder herkenbaar voorvoegsel én zonder geheim-achtige naam ervoor
# (bijv. een los wachtwoord in een zin) wordt niet gevonden; versleutelde of met een wachtwoord
# beveiligde archieven worden niet geopend; blobs > 50 MB worden overgeslagen (en gemeld).
# Exitcode: 1 bij een KRITIEK/HOOG-vondst (met --streng ook MIDDEL), 2 bij een gebruiksfout, anders 0.
# Geen afhankelijkheden behalve git en python3. Zelftest: tools/secret_scan_selftest.sh
set -euo pipefail
REPO=""; WERKMAP=1; ONBEREIKBAAR=0; TOON=0; STRENG=0
while [ $# -gt 0 ]; do
  case "$1" in
    --alleen-git) WERKMAP=0 ;;
    --onbereikbaar) ONBEREIKBAAR=1 ;;
    --streng) STRENG=1 ;;
    --toon) TOON=1 ;;
    --repo) shift; REPO="${1:?--repo heeft een map nodig}" ;;
    -h|--help) sed -n '2,/^set -euo/p' "$0" | sed '$d'; exit 0 ;;
    *) echo "Onbekende optie: $1" >&2; exit 2 ;;
  esac
  shift
done
SCRIPTMAP="$(cd "$(dirname "$0")" && pwd)"
[ -n "$REPO" ] || REPO="$SCRIPTMAP"
REPO="$(git -C "$REPO" rev-parse --show-toplevel)"
cd "$REPO"
ALLOW="${SECRET_SCAN_ALLOW:-$SCRIPTMAP/secret_scan.allow}"
GITDIR="$(git rev-parse --absolute-git-dir)"
GITCOMMON="$(cd "$(git rev-parse --git-common-dir)" && pwd)"

SCANNER="$(mktemp -t wpi-secretscan.XXXXXX.py)"
trap 'rm -f "$SCANNER"' EXIT
cat > "$SCANNER" <<'PY'
import sys, re, json, base64, hashlib, os, io, zipfile, gzip, zlib, math, subprocess, codecs
TOON, STRENG, ALLOWPAD = sys.argv[1] == "1", sys.argv[2] == "1", sys.argv[3]
MAX_BLOB = 50 * 1024 * 1024
REGELS = [
  # (soort, ernst, regex) — ernst: KRITIEK > HOOG > MIDDEL > LAAG > TOEGESTAAN > INFO
  ("OpenRouter API-key", "KRITIEK", r"sk-or-(?:v1-)?[A-Za-z0-9]{32,}"),
  ("Anthropic API-key", "KRITIEK", r"sk-ant-[A-Za-z0-9_-]{20,}"),
  ("OpenAI-/DeepSeek-achtige key (sk-)", "HOOG", r"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9]{32,}"),
  ("Supabase secret key", "KRITIEK", r"sb_secret_[A-Za-z0-9_-]{16,}"),
  ("Supabase publishable key", "INFO", r"sb_publishable_[A-Za-z0-9_-]{16,}"),
  ("JWT", "JWT", r"eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"),
  ("AWS access key id", "KRITIEK", r"(?<![A-Z0-9])(?:AKIA|ASIA|AGPA|AIDA|AROA)[0-9A-Z]{16}(?![A-Z0-9])"),
  ("AWS secret access key", "KRITIEK", r"(?i)aws_?secret_?access_?key\s*[:=]\s*['\"]?([A-Za-z0-9/+=]{40})"),
  ("Private key", "KRITIEK", r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----"),
  ("GitHub token", "KRITIEK", r"(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})"),
  ("GitLab token", "KRITIEK", r"glpat-[A-Za-z0-9_-]{20,}"),
  ("npm token", "KRITIEK", r"(?<![A-Za-z0-9])npm_[A-Za-z0-9]{36}(?![A-Za-z0-9])"),
  ("Google API-key", "HOOG", r"AIza[0-9A-Za-z_-]{35}"),
  ("Slack token", "HOOG", r"xox[abposr]-[A-Za-z0-9-]{10,}"),
  ("SendGrid API-key", "HOOG", r"SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}"),
  ("Stripe live key", "KRITIEK", r"(?:sk|rk)_live_[A-Za-z0-9]{20,}"),
  # elke URL-schema (https, postgres, redis, …) met gebruiker:wachtwoord@ — ook een token in een git-remote
  ("URL met inloggegevens (gebruiker:geheim@)", "HOOG", r"\b[A-Za-z][A-Za-z0-9+.-]{1,15}://[^:\s/'\"@<>]+:([^@\s'\"<>]{4,})@[^\s'\"<>]+"),
  # Authorization-headers: Bearer overal; Basic/token alleen na "authorization"
  ("Bearer-token (Authorization-header)", "HOOG", r"(?i)\bbearer\s+([A-Za-z0-9._~+/-]{20,}=*)"),
  ("Basic-/token-authorization", "HOOG", r"(?i)authorization[\"']?\s*[:=]\s*[\"'`]?\s*(?:basic|token)\s+([A-Za-z0-9._~+/-]{16,}=*)"),
]
REGELS = [(s, e, re.compile(r)) for s, e, r in REGELS]
# generiek: <naam> = "<waarde>" / <naam>: '<waarde>' (JS, JSON, Python, YAML met aanhalingstekens).
# Of de NAAM geheim-achtig is, wordt daarna per woorddeel bepaald (camelCase, snake_case, kebab-case).
GENERIEK = re.compile(r"(?<![A-Za-z0-9_$])([A-Za-z_$][A-Za-z0-9_$.-]{0,60})[\"']?\s*(?::=|=>|:|=)\s*[\"'`]([^\"'`\s]{8,})[\"'`]")
STERK_SAMEN = ("secret", "password", "passwd", "passphrase", "wachtwoord", "credential", "privatekey", "servicekey",
               "servicerolekey", "accesskey", "apikey", "clientsecret", "authtoken", "accesstoken", "refreshtoken", "signingkey", "encryptionkey")
STERK_DEEL = {"pass", "pwd", "pw", "ww"}
ZWAK_DEEL = {"key", "token", "auth", "sleutel", "jwt", "bearer"}
def woorddelen(naam):
    n = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", naam)
    return [d.lower() for d in re.split(r"[_.$\-]+", n) if d]
def naam_soort(naam):
    plat = re.sub(r"[^a-z0-9]", "", naam.lower()); delen = woorddelen(naam)
    if any(s in plat for s in STERK_SAMEN) or STERK_DEEL & set(delen): return "sterk"
    if ZWAK_DEEL & set(delen): return "zwak"
    return None
def entropie(s):
    n = len(s); return -sum(c / n * math.log2(c / n) for c in (s.count(x) for x in set(s))) if n else 0
def willekeurig(v):
    # ziet eruit als een gegenereerde sleutel: ≥ 16 tekens, letters én cijfers, hoge entropie; geen URL,
    # geen woorden-met-streepjes (Strict-Transport-Security, wpi_concept_v1) en geen pad
    if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*://", v) or re.fullmatch(r"[A-Za-z]+(?:[-_.][A-Za-z0-9]+)*", v): return False
    if re.fullmatch(r"(?:[A-Za-z]{2,}[-_./])+[A-Za-z0-9]{1,4}", v): return False
    return len(v) >= 16 and bool(re.search(r"[0-9]", v)) and bool(re.search(r"[A-Za-z]", v)) and entropie(v) >= 3.3
SLEUTELWOORD = r"(?:PASSWORD|PASSWD|PASSPHRASE|PASS|PWD|SECRET|TOKEN|KEY|WACHTWOORD|CREDENTIALS?)"
# .env-/shell-stijl: HOOFDLETTER_SLEUTEL=waarde, met of zonder aanhalingstekens (overal)
ENVREGEL = re.compile(r"^\s*(?:export\s+)?([A-Z][A-Z0-9_]*" + SLEUTELWOORD + r"[A-Z0-9_]*)\s*=\s*([\"']?)([^\s\"'#;`]{8,})\2\s*(?:#.*)?$")
# in .env-bestanden ook kleine letters
ENVREGEL_I = re.compile(r"(?i)^\s*(?:export\s+)?([A-Z0-9_.-]*" + SLEUTELWOORD + r"[A-Z0-9_.-]*)\s*=\s*([\"']?)([^\s\"'#;`]{8,})\2\s*(?:#.*)?$")
# config-bestanden (yaml/ini/toml/properties): sleutel: waarde of sleutel = waarde zonder aanhalingstekens
CFGREGEL = re.compile(r"(?i)^\s*[\w.-]*" + SLEUTELWOORD + r"[\w.-]*\s*[:=]\s*([\"']?)([^\s\"'#,{}\[\]]{8,})\1\s*(?:#.*)?$")
CFG_EXT = (".yml", ".yaml", ".ini", ".cfg", ".conf", ".toml", ".properties", ".npmrc", ".pgpass", ".netrc")
# sleutelbestanden op naam (ook binair of leeg); .pem/.asc/.gpg/.der kunnen ook publiek zijn → MIDDEL
SLEUTELBESTAND = re.compile(r"(?i)(?:^|/)(?:[^/]*\.(?:p12|pfx|jks|keystore|bks|key|ppk|kdbx|p8|ovpn)|id_(?:rsa|dsa|ecdsa|ed25519)|\.?htpasswd|\.pgpass|\.netrc|_netrc|\.git-credentials|credentials(?:\.json|\.csv)?|service[-_]?account[^/]*\.json|[^/]*-sa-key[^/]*\.json)$")
SLEUTELBESTAND_ZWAK = re.compile(r"(?i)(?:^|/)[^/]*\.(?:pem|asc|gpg|der|crt|cer)$")
def is_env_bestand(b):
    n = os.path.basename(b).lower()
    return n.startswith(".env") or n.endswith(".env") or n in ("env", ".envrc")
# de WAARDE zelf is een plaatshouder/verwijzing (niet de regel eromheen!)
PLAATS_WAARDE = re.compile(r"(?i)(^<.*>$|^\$\{|^\$\(|^\$[A-Za-z_]|^%\(|^\{\{|^@@|example|voorbeeld|placeholder|dummy|changeme|change[_-]me|^your[_-]|^jouw[_-]|redacted|\*{4,}|^(?:true|false|null|none|undefined)$)")
PREFIX = re.compile(r"^(?:sk-or-v1-|sk-or-|sk-ant-api\d\d-|sk-ant-|sk-proj-|sk-|gh[pousr]_|github_pat_|glpat-|npm_|AKIA|ASIA|AGPA|AIDA|AROA|sb_secret_|sb_publishable_|xox[a-z]-|[sr]k_live_)")
def plaatshouder(w):
    # alleen de waarde zelf telt: een verwijzing/plaatshouder, of na het bekende voorvoegsel hooguit
    # 2 verschillende tekens (sk-or-v1-000000…, xxxxxxxx…). Een echte sleutel heeft dat nooit.
    if PLAATS_WAARDE.search(w): return True
    rest = re.sub(r"[^A-Za-z0-9]", "", PREFIX.sub("", w))
    return len(rest) >= 8 and len(set(rest.lower())) <= 2
CODE_WAARDE = re.compile(r"^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$|[()]|^[~/]|^\./|^#[0-9A-Fa-f]{3,8}$")   # obj.veld, functie-aanroep, pad of kleur

def mask(v):
    if TOON: return v
    if len(v) <= 12: return v[:3] + "…"
    return v[:6] + "…" + v[-4:] + f" ({len(v)} tekens)"
def vinger(v): return hashlib.sha256(v.encode("utf-8", "surrogateescape")).hexdigest()[:16]
def jwt_info(tok):
    try:
        p = tok.split(".")[1]; p += "=" * (-len(p) % 4)
        return json.loads(base64.urlsafe_b64decode(p))
    except Exception:
        return None
TOEGESTAAN = {}
try:
    for r in open(ALLOWPAD, encoding="utf-8"):
        r = r.strip()
        if r and not r.startswith("#"):
            fp, _, reden = r.partition(" "); TOEGESTAAN[fp.strip()] = reden.strip(" #-") or "toegestaan"
except FileNotFoundError:
    pass

ORDE = {"KRITIEK": 0, "HOOG": 1, "MIDDEL": 2, "LAAG": 3, "TOEGESTAAN": 4, "INFO": 5}
vondsten, gezien = [], set()
def meld(soort2, e, waarde, extra, bron, commit, datum, bestand, regel, tekst):
    fp = vinger(waarde)
    if e != "INFO" and fp in TOEGESTAAN: e, extra = "TOEGESTAAN", extra + " (" + TOEGESTAAN[fp] + ")"
    elif e != "INFO" and plaatshouder(waarde): e, extra = "LAAG", extra + " (waarde is een plaatshouder)"
    sleutel = (soort2, waarde, bestand)
    if sleutel in gezien: return
    gezien.add(sleutel)
    br = bron + (" (WEL gepubliceerd: staat in webapp/)" if bron == "werkmap-genegeerd" and bestand.startswith("webapp/") else "")
    vondsten.append((ORDE[e], e, soort2, (commit[:10] or bron), datum, f"{bestand}:{regel}", mask(waarde) + extra, tekst.strip()[:110], fp, br))

def scan(tekst, bron, commit, datum, bestand, regel):
    if len(tekst) > 200000:   # zeer lange regel (bijv. geminificeerd of XML op één regel): in stukken met overlap
        for i in range(0, len(tekst), 100000): scan(tekst[i:i + 100200], bron, commit, datum, bestand, regel)
        return
    kandidaten = []   # (soort, ernst, waarde, extra)
    for soort, ernst, rx in REGELS:
        for mm in rx.finditer(tekst):
            waarde = mm.group(1) if mm.groups() and mm.group(1) else mm.group(0)
            e, extra, soort2 = ernst, "", soort
            if soort == "JWT":
                d = jwt_info(waarde) or {}
                rol = d.get("role", "?")
                if rol == "service_role": e, soort2 = "KRITIEK", "Supabase service_role JWT"
                elif rol == "anon": e, soort2 = "INFO", "Supabase anon JWT (publiek bedoeld)"
                elif rol == "authenticated": e, soort2 = "MIDDEL", "Gebruikers-JWT (sessietoken)"
                else: e, soort2 = "MIDDEL", "JWT (rol " + str(rol) + ")"
                extra = " iss=" + str(d.get("iss", "?"))[:40] + (" exp=" + str(d.get("exp")) if d.get("exp") else "")
            elif soort.startswith(("Bearer", "Basic")) and (waarde.startswith("eyJ") or CODE_WAARDE.search(waarde)):
                continue   # JWT: eigen regel hierboven; obj.veld: code, geen waarde
            kandidaten.append((soort2, e, waarde, extra))
    for mm in GENERIEK.finditer(tekst):
        naam, waarde = mm.group(1), mm.group(2)
        ns = naam_soort(naam)
        if not ns or CODE_WAARDE.search(waarde): continue
        rnd = willekeurig(waarde)
        if ns == "zwak" and not rnd: continue      # bijv. storageKey: "wpi_concept_v1"
        kandidaten.append(("Generiek geheim (" + naam[:24] + " = '…')", "HOOG" if rnd else "MIDDEL", waarde, ""))
    env = is_env_bestand(bestand)
    m = (ENVREGEL_I if env else ENVREGEL).match(tekst)
    if m and not CODE_WAARDE.search(m.group(3)):
        kandidaten.append(("Geheim in .env-/shell-stijl (" + m.group(1)[:30] + "=…)", "HOOG", m.group(3), ""))
    elif bestand.lower().endswith(CFG_EXT) or env:
        m = CFGREGEL.match(tekst)
        if m and not CODE_WAARDE.search(m.group(2)):
            kandidaten.append(("Geheim in configbestand (sleutel: waarde)", "HOOG", m.group(2), ""))
    # een waarde die al door een specifieke regel is gevonden, niet nog eens generiek melden
    # (ook een token in een URL/Bearer-header dat al als bijv. GitHub-token is herkend)
    ALG = ("Generiek", "Geheim in", "URL met", "Bearer", "Basic")
    specifiek = {w for s, e, w, x in kandidaten if not s.startswith(ALG)}
    generiek_al = set()
    for soort2, e, waarde, extra in kandidaten:
        if soort2.startswith(ALG):
            if any(waarde in w or w in waarde for w in specifiek) or waarde in generiek_al: continue
            generiek_al.add(waarde)
        meld(soort2, e, waarde, extra, bron, commit, datum, bestand, regel, tekst)

def bestandsnaam(pad, bron, commit, datum):
    if not pad or pad == "/dev/null": return
    if SLEUTELBESTAND.search(pad): meld("Sleutelbestand in repository (op naam)", "HOOG", pad, "", bron, commit, datum, pad, 0, "bestandsnaam " + pad)
    elif SLEUTELBESTAND_ZWAK.search(pad): meld("Sleutel-/certificaatbestand (op naam; kan publiek zijn)", "MIDDEL", pad, "", bron, commit, datum, pad, 0, "bestandsnaam " + pad)

# ---------- binaire inhoud ----------
binstat = {"gelezen": {}, "overgeslagen": []}
XML_BLOK = re.compile(r"</(?:w:p|a:p|text:p|text:h|si|row|c|p|div|tr|li)>|<w:br/>|<w:tab/>")
def scan_tekstblok(t, bron, commit, datum, label):
    for i, l in enumerate(t.splitlines(), 1): scan(l, bron, commit, datum, label, i)
    if "<" in t and ">" in t:   # XML/HTML: ook zonder tags (Word verdeelt tekst over "runs")
        kaal = re.sub(r"<[^>]+>", "", XML_BLOK.sub("\n", t))
        for l in kaal.splitlines():
            if l.strip(): scan(l, bron, commit, datum, label + " (tekst zonder XML-tags)", 0)
def soort_van(data):
    if data[:4] == b"PK\x03\x04": return "zip"
    if data[:2] == b"\x1f\x8b": return "gzip"
    if data[:5] == b"%PDF-": return "pdf"
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"): return "utf16"
    kop = data[:8000]
    if b"\x00" not in kop: return "tekst"
    if len(kop) >= 16:
        oneven = kop[1::2].count(0) / max(1, len(kop[1::2])); even = kop[0::2].count(0) / max(1, len(kop[0::2]))
        if oneven > 0.7 and even < 0.1: return "utf16le"
        if even > 0.7 and oneven < 0.1: return "utf16be"
    return "binair"
STR_ASCII = re.compile(rb"[\x20-\x7e\t]{8,}")
STR_U16 = re.compile(rb"(?:[\x20-\x7e]\x00){8,}")
def scan_bytes(data, bron, commit, datum, label, diepte=0):
    s = soort_van(data)
    binstat["gelezen"][s] = binstat["gelezen"].get(s, 0) + 1
    if s == "zip" and diepte < 4:
        try:
            z = zipfile.ZipFile(io.BytesIO(data))
            for info in z.infolist()[:5000]:
                if info.is_dir(): continue
                if info.file_size > MAX_BLOB or info.flag_bits & 0x1:
                    binstat["overgeslagen"].append(label + "!" + info.filename + (" (versleuteld)" if info.flag_bits & 0x1 else " (te groot)")); continue
                bestandsnaam(label + "!" + info.filename, bron, commit, datum)
                scan_bytes(z.read(info), bron, commit, datum, label + "!" + info.filename, diepte + 1)
            return
        except Exception as e:
            binstat["overgeslagen"].append(label + " (zip onleesbaar: " + str(e)[:40] + "; tekenreeksen gescand)")
            s = "binair"
    if s == "gzip" and diepte < 4:
        try: return scan_bytes(gzip.GzipFile(fileobj=io.BytesIO(data)).read(MAX_BLOB), bron, commit, datum, label + "!gunzip", diepte + 1)
        except Exception: s = "binair"
    if s == "pdf":
        for mm in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", data, re.S):
            try: scan_bytes(zlib.decompress(mm.group(1)), bron, commit, datum, label + "!pdf-stream", diepte + 1)
            except Exception: pass
        s = "binair"
    if s == "tekst": return scan_tekstblok(data.decode("utf-8", "surrogateescape"), bron, commit, datum, label)
    if s in ("utf16", "utf16le", "utf16be"):
        enc = {"utf16": "utf-16", "utf16le": "utf-16-le", "utf16be": "utf-16-be"}[s]
        return scan_tekstblok(data.decode(enc, "replace"), bron, commit, datum, label + " (UTF-16)")
    for mm in STR_ASCII.finditer(data): scan(mm.group(0).decode("ascii"), bron, commit, datum, label + " (binair, tekenreeks)", 0)
    for mm in STR_U16.finditer(data): scan(mm.group(0).decode("utf-16-le"), bron, commit, datum, label + " (binair, UTF-16-tekenreeks)", 0)
def lees_blob(sha):
    try:
        grootte = int(subprocess.run(["git", "cat-file", "-s", sha], capture_output=True, check=True).stdout)
        if grootte > MAX_BLOB: return None, "te groot (" + str(grootte // 1048576) + " MB)"
        return subprocess.run(["git", "cat-file", "blob", sha], capture_output=True, check=True).stdout, None
    except Exception:
        return None, "object ontbreekt"
uit_blobs = []         # (sha of None, bron, commit, datum, pad, schijfpad of None)
def unquote(p):
    p = p.strip()
    if p.startswith('"') and p.endswith('"'):
        try: return codecs.escape_decode(p[1:-1].encode("latin-1", "backslashreplace"))[0].decode("utf-8", "surrogateescape")
        except Exception: return p[1:-1]
    return p
def zonder_ab(p):
    p = unquote(p)
    return p[2:] if p[:2] in ("a/", "b/") else p

bron = commit = datum = bestand = ""; regel = 0; nieuw_blob = ""
hunk = None          # None = buiten een hunk; "ruw" = ruwe bestandsinhoud; [oud_over, nieuw_over] = diff-hunk
in_bericht = False
HUNK = re.compile(r"^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
for raw in sys.stdin.buffer:
    line = raw.decode("utf-8", "surrogateescape").rstrip("\n").rstrip("\r")
    if line.startswith("\x01WPI-BRON "): bron = line[10:]; commit = datum = bestand = ""; regel = 0; hunk = None; in_bericht = False; continue
    if line.startswith("\x01WPI-FILE "): bestand = line[10:]; regel = 0; hunk = "ruw"; bestandsnaam(bestand, bron, "", ""); continue
    if line.startswith("\x01WPI-BLOB "):   # \x01WPI-BLOB <sha> <label>: blob apart uitlezen (tekst of binair)
        sha, _, lab = line[10:].partition(" "); uit_blobs.append((sha, bron, "", "", lab, None)); bestandsnaam(lab, bron, "", ""); hunk = None; continue
    if line.startswith("\x01WPI-BINFILE "):   # binair bestand op schijf (werkmap)
        pad = line[13:]; uit_blobs.append((None, bron, "", "", pad, pad)); bestandsnaam(pad, bron, "", ""); hunk = None; continue
    if hunk == "ruw":
        if line.startswith("+"): regel += 1; scan(line[1:], bron, commit, datum, bestand, regel)
        continue
    if hunk is not None:
        # binnen een hunk bepalen de aantallen uit de @@-kop waar de hunk eindigt; een toegevoegde regel
        # die met "++ " begint ("+++ …") is dus gewoon inhoud, geen bestandskop
        c = line[:1]
        if c == "+": hunk[1] -= 1; regel += 1; scan(line[1:], bron, commit, datum, bestand, regel)
        elif c == "-": hunk[0] -= 1
        elif c == " ": hunk[0] -= 1; hunk[1] -= 1; regel += 1
        elif c == "\\": pass
        else: hunk = None            # onverwacht: hunk afsluiten en de regel hieronder als kop lezen
        if hunk is not None:
            if hunk[0] <= 0 and hunk[1] <= 0: hunk = None
            continue
    m = re.match(r"^commit ([0-9a-f]{40})", line)
    if m: commit = m.group(1); datum = ""; bestand = ""; in_bericht = "kop"; continue
    if in_bericht == "kop":
        # --format=raw: alle kopregels tot de eerste lege regel (tree, parent, author, committer, encoding,
        # mergetag, gpgsig, vervolgregels met één spatie en eventuele zelfgemaakte extra kopregels)
        if line == "": in_bericht = True; continue
        sleutel, _, rest = line.partition(" ")
        if sleutel in ("tree", "parent"): continue
        if sleutel in ("author", "committer"):
            mt = re.match(r"^(.*) (\d+) ([+-]\d{4})$", rest)
            if mt:
                rest = mt.group(1)
                if sleutel == "author" and not datum:
                    try:
                        import datetime as _dt
                        tz = int(mt.group(3)[:3]) * 3600 + (1 if mt.group(3)[0] == "+" else -1) * int(mt.group(3)[3:]) * 60
                        datum = _dt.datetime.fromtimestamp(int(mt.group(2)), _dt.timezone(_dt.timedelta(seconds=tz))).strftime("%Y-%m-%d %H:%M:%S %z")
                    except Exception: datum = mt.group(2)
            scan(rest, bron, commit, datum, "(" + ("auteur" if sleutel == "author" else "committer") + ")", 0); continue
        scan(line, bron, commit, datum, "(commitkop)", 0); continue
    if in_bericht:
        if line.startswith("    "): scan(line[4:], bron, commit, datum, "(commitbericht)", 0); continue
        if line.startswith("diff "): in_bericht = False
        else: continue
    if line.startswith("diff "):
        m = re.match(r'^diff --git (?:"?a/.*?"?) ("?b/.*"?)$', line)
        bestand = zonder_ab(m.group(1)) if m else ""; nieuw_blob = ""; continue
    if line.startswith("index "):
        m = re.match(r"^index [0-9a-f]+(?:,[0-9a-f]+)*\.\.([0-9a-f]+)", line)
        nieuw_blob = m.group(1) if m else ""
        if nieuw_blob and set(nieuw_blob) != {"0"}: bestandsnaam(bestand, bron, commit, datum)   # bestaat na deze wijziging
        continue
    if line.startswith("Binary files "):
        m = re.match(r"^Binary files (.+) and (.+) differ$", line)
        if m and m.group(2) != "/dev/null" and nieuw_blob and set(nieuw_blob) != {"0"}:
            pad = zonder_ab(m.group(2))
            uit_blobs.append((nieuw_blob, bron, commit, datum, pad, pad if bron.startswith("werkmap") else None))
        continue
    if line.startswith("+++ "):
        b = line[4:]
        if b != "/dev/null": bestand = zonder_ab(b)
        continue
    m = HUNK.match(line)
    if m:
        oud = int(m.group(1)) if m.group(1) is not None else 1
        nieuw = int(m.group(3)) if m.group(3) is not None else 1
        regel = int(m.group(2)) - 1          # de eerste "+"-regel krijgt nummer <start>
        hunk = [oud, nieuw] if (oud > 0 or nieuw > 0) else None
        continue

# binaire blobs (en losse blobs uit tags/fsck): elk uniek object één keer
gedaan = set()
for sha, br, c, d, pad, schijf in uit_blobs:
    sleutel = sha or ("schijf", schijf)
    if sleutel in gedaan: continue
    gedaan.add(sleutel)
    data, waarom = (lees_blob(sha) if sha else (None, "geen object"))
    if data is None and schijf and os.path.isfile(schijf):
        if os.path.getsize(schijf) > MAX_BLOB: waarom = "te groot"
        else: data, waarom = open(schijf, "rb").read(), None
    if data is None: binstat["overgeslagen"].append(pad + " (" + (sha or "")[:10] + ": " + str(waarom) + ")"); continue
    scan_bytes(data, br, c, d, pad)

vondsten.sort()
if not vondsten:
    print("Geen vondsten.")
for _, e, soort, c, d, plek, w, ctx, fp, br in vondsten:
    ctxt = ctx if TOON or e in ("INFO", "LAAG", "TOEGESTAAN") else re.sub(r"[A-Za-z0-9_/+=-]{12,}", lambda m: m.group(0)[:6] + "…", ctx)
    print(f"{e:10} {soort:44} {c:12} {d[:16]:16} {plek}\n           waarde: {w}   vingerafdruk: {fp}   bron: {br}\n           regel:  {ctxt}")
g = binstat["gelezen"]
print("\nBinaire/losse objecten uitgelezen: " + str(len(gedaan)) + " (inhoud per soort, incl. bestanden in zip-containers: " +
      (", ".join(f"{k} {g[k]}" for k in sorted(g)) or "geen") + ")")
if binstat["overgeslagen"]:
    print("NIET (volledig) gescand: " + str(len(binstat["overgeslagen"])))
    for x in binstat["overgeslagen"][:20]: print("  - " + x)
tel = {}
for v in vondsten: tel[v[1]] = tel.get(v[1], 0) + 1
print("\nSamenvatting: " + (", ".join(f"{k} {tel[k]}" for k in sorted(tel, key=lambda k: ORDE[k])) or "0 vondsten"))
grens = ("KRITIEK", "HOOG", "MIDDEL") if STRENG else ("KRITIEK", "HOOG")
sys.exit(1 if any(v[1] in grens for v in vondsten) else 0)
PY

tekstbestand() {   # $1 = pad; 0 als het een (niet te groot) tekstbestand is
  local f="$1"
  [ -f "$f" ] || return 1
  [ "$(wc -c < "$f")" -le 5000000 ] || return 1
  [ "$(head -c 8000 "$f" | tr -d '\000' | wc -c)" = "$(head -c 8000 "$f" | wc -c)" ]   # geen NUL = tekst
}
ruw() {   # $1 = pad, $2 = label
  printf '\001WPI-FILE %s\n' "$2"; sed 's/^/+/' "$1"; echo
}
werkbestand() {   # $1 = pad: tekst als ruwe regels, anders (binair/groot) door de blob-lezer in python
  if tekstbestand "$1"; then ruw "$1" "$1"; elif [ -f "$1" ]; then printf '\001WPI-BINFILE %s\n' "$1"; fi
}
# Configuratie of objecten in de repository mogen de geschiedenis NIET voor de scan verbergen:
#  - git replace (refs/replace/*) en een grafts-bestand (.git/info/grafts) kunnen een commit door een
#    "schone" vervangen of overslaan: --no-replace-objects / GIT_NO_REPLACE_OBJECTS=1 en
#    GIT_GRAFT_FILE=/dev/null zetten dat uit (ook voor git cat-file in de blob-lezer en voor git fsck);
#    de vervangende commits zelf worden via --all (refs/replace/*) ook gescand.
#  - config die de uitvoer verandert, wordt per aanroep overschreven: log.showRoot=false (de diff van de
#    eerste commit verdwijnt), log.abbrevCommit, log.mailmap/mailmap.file (auteur herschreven),
#    diff.noprefix/mnemonicPrefix/relative, log.showSignature, i18n.logOutputEncoding.
#  - --format=raw toont ALLE kopregels van een commit (author, committer, encoding, mergetag, gpgsig en
#    eventuele extra kopregels) en het bericht; die worden allemaal gescand (ook auteur/committer).
export GIT_NO_REPLACE_OBJECTS=1 GIT_GRAFT_FILE=/dev/null
unset GIT_EXTERNAL_DIFF GIT_DIFF_OPTS GIT_REPLACE_REF_BASE 2>/dev/null || true
GITC=(--no-replace-objects -c core.quotePath=false -c log.showRoot=true -c log.abbrevCommit=false -c log.mailmap=false
  -c log.showSignature=false -c log.decorate=false -c diff.noprefix=false -c diff.mnemonicPrefix=false -c diff.relative=false
  -c i18n.logOutputEncoding=UTF-8 -c advice.graftFileDeprecated=false)
LOGOPT=("${GITC[@]}" log -p --root --no-color --no-ext-diff --unified=0 --no-textconv --no-renames --full-index --format=raw
  --no-abbrev-commit --no-mailmap --no-decorate --src-prefix=a/ --dst-prefix=b/ --no-relative --encoding=UTF-8)
WAARSCHUW=()
[ -n "$(git "${GITC[@]}" for-each-ref refs/replace 2>/dev/null | head -1)" ] && WAARSCHUW+=("deze repository heeft vervangende objecten (refs/replace/*): de scan negeert ze en scant origineel en vervanging allebei")
[ -s "$GITCOMMON/info/grafts" ] && WAARSCHUW+=("deze repository heeft een grafts-bestand (.git/info/grafts): de scan negeert het")
[ -f "$GITCOMMON/shallow" ] && WAARSCHUW+=("ONVOLLEDIGE geschiedenis (shallow clone, .git/shallow): oudere commits zijn hier niet aanwezig en dus NIET gescand; scan een volledige clone")

for w in "${WAARSCHUW[@]}"; do echo "LET OP: $w"; done
{
  printf '\001WPI-BRON git-geschiedenis\n'
  # --diff-merges=separate: merges (en dus ook elke stash) met diff t.o.v. elke ouder, ook als de config
  # log.diffMerges anders zegt; --reflog: oudere stashes en losse commits
  if git "${GITC[@]}" log --diff-merges=separate -1 >/dev/null 2>&1; then MERGES=--diff-merges=separate; else MERGES=-m; fi
  git "${LOGOPT[@]}" "$MERGES" --all --reflog

  printf '\001WPI-BRON git-tags-en-refs\n'
  # annotated tags: de tagtekst zelf (git log --all toont alleen de commit erachter); refs naar een blob/tree
  git for-each-ref --format='%(objectname) %(objecttype) %(refname)' | while read -r sha type ref; do
    diepte=0
    while [ "$type" = tag ] && [ "$diepte" -lt 10 ]; do
      printf '\001WPI-FILE (tag-object %s %s)\n' "$ref" "${sha:0:10}"; git cat-file -p "$sha" | sed 's/^/+/'; echo
      sha="$(git cat-file -p "$sha" | awk 'NR==1 && $1=="object"{print $2}')"; type="$(git cat-file -t "$sha")"; diepte=$((diepte + 1))
    done
    case "$type" in
      blob) printf '\001WPI-BLOB %s (ref %s)\n' "$sha" "$ref" ;;
      tree) git ls-tree -r "$sha" | awk -F'\t' '{split($1,a," "); if (a[2]=="blob") print a[3]"\t"$2}' | while IFS=$'\t' read -r b p; do printf '\001WPI-BLOB %s %s (ref %s)\n' "$b" "$p" "$ref"; done ;;
    esac
  done

  printf '\001WPI-BRON git-config\n'
  # remote-URL's met token, http.extraheader, credential-instellingen; eigen hooks (geen .sample)
  for f in "$GITCOMMON/config" "$GITDIR/config.worktree"; do [ -f "$f" ] && ruw "$f" ".git/$(basename "$f")"; done
  for f in "$GITCOMMON"/hooks/*; do case "$f" in *.sample) ;; *) [ -f "$f" ] && tekstbestand "$f" && ruw "$f" ".git/hooks/$(basename "$f")" ;; esac; done

  if [ "$ONBEREIKBAAR" = 1 ]; then
    printf '\001WPI-BRON onbereikbare-objecten\n'
    COMMITS=()
    while read -r _ type sha; do
      case "$type" in
        blob) printf '\001WPI-BLOB %s (los blob %s)\n' "$sha" "$sha" ;;
        tag) printf '\001WPI-FILE (los tag-object %s)\n' "$sha"; git cat-file -p "$sha" | sed 's/^/+/'; echo ;;
        commit) COMMITS+=("$sha") ;;
      esac
    done < <(git "${GITC[@]}" fsck --unreachable --no-reflogs 2>/dev/null)
    if [ "${#COMMITS[@]}" -gt 0 ]; then git "${LOGOPT[@]}" "$MERGES" --no-walk "${COMMITS[@]}"; fi
  fi
  if [ "$WERKMAP" = 1 ]; then
    printf '\001WPI-BRON werkmap-diff\n'
    git "${GITC[@]}" diff HEAD --no-color --no-ext-diff --no-textconv --src-prefix=a/ --dst-prefix=b/ --no-relative --unified=0 --full-index 2>/dev/null || git "${GITC[@]}" diff --no-color --no-ext-diff --no-textconv --src-prefix=a/ --dst-prefix=b/ --no-relative --unified=0 --full-index || true
    printf '\001WPI-BRON werkmap-ongevolgd\n'
    git ls-files -o --exclude-standard -z | while IFS= read -r -d '' f; do werkbestand "$f"; done
    printf '\001WPI-BRON werkmap-genegeerd\n'
    # door .gitignore genegeerd: niet in git, maar wel op schijf (en mee gepubliceerd als het in webapp/ staat)
    git ls-files -o -i --exclude-standard -z | while IFS= read -r -d '' f; do
      case "/$f" in */node_modules/*|*/__pycache__/*|*/.venv/*|*/venv/*|*/dist/*|*/.cache/*) continue ;; esac
      werkbestand "$f"
    done
  fi
} | python3 -I "$SCANNER" "$TOON" "$STRENG" "$ALLOW"
