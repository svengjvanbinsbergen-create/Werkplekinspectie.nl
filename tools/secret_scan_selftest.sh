#!/usr/bin/env bash
# Werkplekinspectie — tools/secret_scan_selftest.sh
# Bouwt een wegwerp-repository met geplante (willekeurig gegenereerde, dus nep) geheimen op alle
# lastige plekken en controleert dat tools/secret_scan.sh ze allemaal vindt, met de juiste ernst en
# het juiste regelnummer, en met exitcode 1. Draai dit na elke wijziging aan secret_scan.sh.
#
#   tools/secret_scan_selftest.sh            → eindigt met "fouten []" (exitcode 0) als alles klopt
#
# Geplant: geheim alleen in het werkmap-deel van een stash, in een oudere stash (stash@{1}), in een
# ongevolgd bestand van "git stash -u", in een "evil merge", op een regel die met "++ " begint, op
# regel 1, naast spread-syntax / template-literal / HTML, in .env-stijl zonder aanhalingstekens, in een
# door .gitignore genegeerd webapp/.env, in een commitbericht, toegevoegd en weer verwijderd, alleen in
# de reflog (na git reset --hard), in de tekst van een annotated tag, in een tag die direct naar een
# blob wijst, in een git note, in een UTF-16-bestand, in een .docx (over twee Word-"runs" verdeeld), in
# een .xlsx, als tekenreeks in een binair bestand, in een gzip, in .git/config (remote-URL), als
# "Authorization: Bearer …", onder camelCase-/snake_case-namen (secretKey, DB_PASS, client_secret), een
# sleutelbestand op naam (.p12, leeg .key) en met log.diffMerges=first-parent in de config; in een
# tweede repository: git replace, grafts, log.showRoot=false, log.abbrevCommit, mailmap.file,
# diff.noprefix, tokens in auteur/committer en in een extra commit-kopregel; plus
# plaatshouders en gewone configwaarden die NIET als HOOG/KRITIEK mogen tellen.
# De sleutels worden pas tijdens het draaien gemaakt; dit script bevat zelf geen sleutelpatroon.
set -euo pipefail
SCAN="$(cd "$(dirname "$0")" && pwd)/secret_scan.sh"
WERK="$(mktemp -d "${TMPDIR:-/tmp}/wpi-secretselftest.XXXXXX")"
trap 'rm -rf "$WERK"' EXIT
rnd() { head -c 400 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"; }
RNDUP() { head -c 400 /dev/urandom | base64 | tr -dc 'A-Z0-9' | head -c "$1"; }

ANT_STASH="sk-ant-api03-$(rnd 40)"        # 1 werkmap-deel van de bovenste stash
OR_STASH1="sk-or-v1-$(rnd 64)"            # 2 oudere stash (stash@{1})
GH_STASHU="ghp_$(rnd 36)"                 # 3 ongevolgd bestand in git stash -u
OR_MERGE="sk-or-v1-$(rnd 64)"             # 4 evil merge
GH_PLUS="ghp_$(rnd 36)"                   # 5 regel die met "++ " begint
ANT_R1="sk-ant-api03-$(rnd 40)"           # 6 regel 1 van n.txt
ANT_SPREAD="sk-ant-api03-$(rnd 40)"       # 7 naast spread-syntax
OR_TPL="sk-or-v1-$(rnd 64)"               # 8 naast ${host} en <b>
DBPW="Sup3r$(rnd 14)"                     # 9 .env zonder aanhalingstekens
SVCKEY="$(rnd 32)"                        # 10 SERVICE_KEY=…
IGN_KEY="$(rnd 40)"                       # 11 genegeerd webapp/.env
AWS_MSG="AKIA$(RNDUP 16)"                 # 12 commitbericht
AWS_WEG="AKIA$(RNDUP 16)"                 # 13 toegevoegd en weer verwijderd
PK_KOP="-----BEGIN RSA PRIVATE ""KEY-----" # 14 alleen in de reflog
GH_UNSTAGED="ghp_$(rnd 36)"               # 15 niet-gecommitte wijziging
OR_HERHAAL="sk-or-v1-TEST$(printf 'a%.0s' $(seq 40))"   # 16 testachtige sleutel met herhaling: blijft KRITIEK
OR_NUL="sk-or-v1-$(printf '0%.0s' $(seq 40))"           # 17 alleen nullen: plaatshouder (LAAG)
GH_TAG="ghp_$(rnd 36)"                    # 18 tekst van een annotated tag
GH_U16="ghp_$(rnd 36)"                    # 19 UTF-16-bestand (git: binair)
GH_DOCX_A="ghp_$(rnd 18)"; GH_DOCX_B="$(rnd 18)"   # 20 .docx, token over twee runs verdeeld
OR_XLSX="sk-or-v1-$(rnd 64)"              # 21 .xlsx (sharedStrings)
ANT_BIN="sk-ant-api03-$(rnd 40)"          # 22 tekenreeks in een binair bestand
GH_GZ="ghp_$(rnd 36)"                     # 23 gzip
GH_REMOTE="ghp_$(rnd 36)"                 # 24 .git/config remote-URL
BEARER="$(rnd 40)"                        # 25 Authorization: Bearer
SECKEY="$(rnd 12)7$(rnd 11)"              # 26 camelCase secretKey (met cijfer)
DBPASS="$(rnd 8)4$(rnd 7)"                # 27 const DB_PASS = "…"
CLSEC="$(rnd 15)2$(rnd 14)"               # 28 JSON client_secret
GH_NOTE="ghp_$(rnd 36)"                   # 29 git note
GH_TAGBLOB="ghp_$(rnd 36)"                # 30 tag die direct naar een blob wijst

cd "$WERK"; git init -q -b main r; cd r
git config user.email t@t; git config user.name t; git config commit.gpgsign false
echo "begin" > a.txt; printf 'regel1\nregel2\n' > m.txt; git add .; git commit -qm init

# 6 + 7 + 8 + 9 + 10
printf '%s\nregel2\n' "$ANT_R1" > n.txt
printf 'const cfg = {...base, key: "%s"};\n' "$ANT_SPREAD" > c.js
printf 'const u = `https://${host}/v1?k=%s`; el.innerHTML = "<b>x</b>";\n' "$OR_TPL" >> c.js
printf 'DB_PASSWORD=%s\nSERVICE_KEY=%s\n' "$DBPW" "$SVCKEY" > .env
# 5: inhoud "++ token …" wordt in de diff "+++ token …"
printf 'x\n++ token %s\n' "$GH_PLUS" > p.txt
# plaatshouders (mogen hooguit LAAG zijn)
printf 'OPENROUTER_API_KEY=<jouw-key-hier>\nSUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}\naws = "AKIAIOSFODNN7EXAMPLE"\nconst o = { password: "${ww}" };\n' > plaats.txt
printf 'const a = "%s";\nconst b = "%s";\n' "$OR_HERHAAL" "$OR_NUL" > herhaal.js
git add .; git commit -qm "feat"
# 13
echo "aws_key=$AWS_WEG" > weg.txt; git add weg.txt; git commit -qm "tijdelijk"; git rm -q weg.txt; git commit -qm "rm"
# 12
echo "x" >> a.txt; git commit -qam "deploy met sleutel $AWS_MSG"

# 4 evil merge
git checkout -qb zij; echo zij > z.txt; git add z.txt; git commit -qm zij
git checkout -q main; echo hoofd > h.txt; git add h.txt; git commit -qm hoofd
git merge -q --no-commit zij >/dev/null 2>&1 || true
echo "key=$OR_MERGE" > merge.txt; git add merge.txt; git commit -qm merge

# 14 alleen in de reflog
printf '%s\nabc\n' "$PK_KOP" > id_rsa; git add id_rsa; git commit -qm "oeps"; git reset -q --hard HEAD~1

# 2 oudere stash, 3 stash -u, 1 bovenste stash (alleen werkmap, niet gestaged)
echo "or=$OR_STASH1" >> m.txt; git stash -q
echo "$GH_STASHU" > ongevolgd.txt; git stash -q -u
echo "ant=$ANT_STASH" >> m.txt; git stash -q

# 15 niet-gecommitte wijziging, 11 genegeerd bestand in webapp/
echo "gh=$GH_UNSTAGED" >> a.txt
mkdir -p webapp; echo "webapp/.env" > .gitignore; echo "SUPABASE_SERVICE_KEY=$IGN_KEY" > webapp/.env
git add .gitignore; git commit -qm gitignore

# 18-30: tags, notes, binaire bestanden, config, camelCase-namen, sleutelbestanden
git config log.diffMerges first-parent
printf '%s\n' "$GH_U16" | iconv -f UTF-8 -t UTF-16 > u16.txt
python3 - "$GH_DOCX_A" "$GH_DOCX_B" "$OR_XLSX" "$ANT_BIN" <<'PYZ'
import sys, zipfile, os
a, b, x, binr = sys.argv[1:5]
with zipfile.ZipFile("rapport.docx", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", "<Types/>")
    z.writestr("word/document.xml", '<w:document><w:body><w:p><w:r><w:t>token </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>' + a + '</w:t></w:r><w:r><w:t>' + b + '</w:t></w:r></w:p></w:body></w:document>')
with zipfile.ZipFile("lijst.xlsx", "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("xl/sharedStrings.xml", '<sst><si><t>' + x + '</t></si></sst>')
open("blob.bin", "wb").write(os.urandom(300) + b"\x00\x01key=" + binr.encode() + b"\x00" + os.urandom(300))
open("cert.p12", "wb").write(os.urandom(64))
PYZ
echo "gz=$GH_GZ" | gzip > data.gz
: > server.key
printf 'fetch(u, { headers: { Authorization: "Bearer %s" } });\nconst cfg = { secretKey: "%s" };\nconst DB_PASS = "%s";\n' "$BEARER" "$SECKEY" "$DBPASS" > cfg.js
printf '{ "client_secret": "%s" }\n' "$CLSEC" > app.json
# gewone waarden onder sleutel-achtige namen: mogen NIET als HOOG/KRITIEK tellen
printf '{"key":"Strict-Transport-Security","value":"max-age=63072000"}\nconst storageKey = "wpi_concept_v1";\nAPI_URL = "https://openrouter.ai/api/v1/chat/completions"\n' > gewoon.js
git add .; git commit -qm "binair en config"
git tag -a v1 -m "release token $GH_TAG"
git notes add -m "note $GH_NOTE" HEAD
git tag blobtag "$(printf 'tb=%s\n' "$GH_TAGBLOB" | git hash-object -w --stdin)"
git remote add origin "https://u:$GH_REMOTE@github.com/x/y.git"

set +e
UIT="$(SECRET_SCAN_ALLOW=/dev/null "$SCAN" --repo "$WERK/r" --toon 2>&1)"; CODE=$?
set -e
echo "$UIT" > "$WERK/uitvoer.txt"
fouten=()
verwacht() {   # $1 = waarde, $2 = ernst (regex), $3 = extra regex op de kopregel (optioneel), $4 = naam
  local kop
  kop="$(echo "$UIT" | grep -B1 -F -- "waarde: $1" | head -1 || true)"
  if [ -z "$kop" ]; then fouten+=("$4: niet gevonden"); return; fi
  echo "$kop" | grep -Eq "^($2) " || fouten+=("$4: ernst fout: $kop")
  if [ -n "${3:-}" ]; then echo "$kop" | grep -Eq -- "$3" || fouten+=("$4: verwacht /$3/ in: $kop"); fi
}
verwacht "$ANT_STASH"   "KRITIEK" "m.txt:3"  "1 stash werkmap-deel"
verwacht "$OR_STASH1"   "KRITIEK" "m.txt:3"  "2 oudere stash"
verwacht "$GH_STASHU"   "KRITIEK" "ongevolgd.txt:1" "3 stash -u"
verwacht "$OR_MERGE"    "KRITIEK" "merge.txt:1" "4 evil merge"
verwacht "$GH_PLUS"     "KRITIEK" "p.txt:2"  "5 regel met ++"
verwacht "$ANT_R1"      "KRITIEK" "n.txt:1 *$" "6 regel 1"
verwacht "$ANT_SPREAD"  "KRITIEK" "c.js:1"   "7 spread-syntax"
verwacht "$OR_TPL"      "KRITIEK" "c.js:2"   "8 template/HTML"
verwacht "$DBPW"        "HOOG"    "\\.env:1" "9 .env wachtwoord"
verwacht "$SVCKEY"      "HOOG"    "\\.env:2" "10 SERVICE_KEY"
verwacht "$IGN_KEY"     "HOOG"    "webapp/\\.env:1" "11 genegeerd webapp/.env"
verwacht "$AWS_MSG"     "KRITIEK" "commitbericht" "12 commitbericht"
verwacht "$AWS_WEG"     "KRITIEK" "weg.txt:1" "13 verwijderd"
verwacht "$PK_KOP"      "KRITIEK" "id_rsa:1" "14 alleen reflog"
verwacht "$GH_UNSTAGED" "KRITIEK" "a.txt:"   "15 niet gecommit"
verwacht "$OR_HERHAAL"  "KRITIEK" "herhaal.js:1" "16 herhaling blijft kritiek"
verwacht "$OR_NUL"      "LAAG"    "herhaal.js:2" "17 nullen = plaatshouder"
verwacht "$GH_TAG"      "KRITIEK" "tag-object refs/tags/v1" "18 annotated tag"
verwacht "$GH_U16"      "KRITIEK" "u16.txt \\(UTF-16\\)" "19 UTF-16"
verwacht "$GH_DOCX_A$GH_DOCX_B" "KRITIEK" "rapport.docx!word/document.xml" "20 docx over twee runs"
verwacht "$OR_XLSX"     "KRITIEK" "lijst.xlsx!xl/sharedStrings.xml" "21 xlsx"
verwacht "$ANT_BIN"     "KRITIEK" "blob.bin \\(binair" "22 binair bestand"
verwacht "$GH_GZ"       "KRITIEK" "data.gz!gunzip" "23 gzip"
verwacht "$GH_REMOTE"   "KRITIEK" "\\.git/config" "24 .git/config remote"
verwacht "$BEARER"      "HOOG"    "cfg.js:1" "25 Bearer"
verwacht "$SECKEY"      "HOOG"    "cfg.js:2" "26 secretKey"
verwacht "$DBPASS"      "HOOG"    "cfg.js:3" "27 DB_PASS"
verwacht "$CLSEC"       "HOOG"    "app.json:1" "28 client_secret"
verwacht "$GH_NOTE"     "KRITIEK" "" "29 git note"
verwacht "$GH_TAGBLOB"  "KRITIEK" "ref refs/tags/blobtag" "30 tag naar blob"
verwacht "cert.p12"     "HOOG"    "cert.p12" "31 .p12 op naam"
verwacht "server.key"   "HOOG"    "server.key" "32 lege .key op naam"
for p in "Strict-Transport-Security" "wpi_concept_v1" "https://openrouter.ai/api/v1/chat/completions"; do
  kop="$(echo "$UIT" | grep -B1 -F -- "waarde: $p" | head -1 || true)"
  if [ -n "$kop" ] && ! echo "$kop" | grep -Eq "^(MIDDEL|LAAG|INFO) "; then fouten+=("gewone waarde $p te zwaar: $kop"); fi
done
echo "$UIT" | grep -q "^NIET (volledig) gescand" && fouten+=("binaire objecten overgeslagen: $(echo "$UIT" | grep -A3 '^NIET')")
echo "$UIT" | grep -q "WEL gepubliceerd" || fouten+=("11: geen melding 'WEL gepubliceerd'")
for p in "<jouw-key-hier>" '${SUPABASE_SERVICE_ROLE_KEY}' "AKIAIOSFODNN7EXAMPLE" '${ww}'; do
  kop="$(echo "$UIT" | grep -B1 -F -- "waarde: $p" | head -1 || true)"
  if [ -n "$kop" ] && ! echo "$kop" | grep -Eq "^(LAAG|INFO) "; then fouten+=("plaatshouder $p te zwaar: $kop"); fi
done
[ "$CODE" = 1 ] || fouten+=("exitcode $CODE, verwacht 1")
echo "$UIT" | tail -1

# ---------- tweede repository: dingen die een gewone "git log -p --all" verbergen ----------
# 33 geheim in de EERSTE commit + log.showRoot=false · 34 commit die een token toevoegt en de volgende die
# hem weer weghaalt, met "git replace" door een schone commit vervangen · 35 idem via .git/info/grafts
# overgeslagen (en reflog weg) · 36 token in de auteursnaam · 37 token in het committer-e-mailadres ·
# 38 token in het commitbericht met log.abbrevCommit=true · 39 auteursnaam via mailmap.file buiten de
# repo herschreven · 40 token in een zelfgemaakte extra commit-kopregel · 41 diff.noprefix=true
GH_ROOT="ghp_$(rnd 36)"; GH_REPL="ghp_$(rnd 36)"; GH_GRAFT="ghp_$(rnd 36)"; GH_AUTH="ghp_$(rnd 36)"
GH_CMAIL="ghp_$(rnd 36)"; GH_ABBR="ghp_$(rnd 36)"; GH_MMAP="ghp_$(rnd 36)"; GH_KOP="ghp_$(rnd 36)"; GH_NOPRE="ghp_$(rnd 36)"
cd "$WERK"; git init -q -b main r2; cd r2; git config advice.graftFileDeprecated false
git config user.email t@t; git config user.name t; git config commit.gpgsign false
echo "root=$GH_ROOT" > root.txt; git add .; git commit -qm init
echo "x" > a.txt; git add .; git commit -qm a
# 34 replace: B voegt token toe, C haalt hem weg; B wordt vervangen door een schone commit met dezelfde ouder
echo "tok=$GH_REPL" > repl.txt; git add .; git commit -qm "b"; B="$(git rev-parse HEAD)"
git rm -q repl.txt; git commit -qm "c"
SCHOON="$(git commit-tree "$(git rev-parse HEAD~2^{tree})" -p HEAD~2 -m b)"
git replace "$B" "$SCHOON"
# 35 grafts: D voegt token toe, E haalt hem weg; E wordt via grafts direct aan C gehangen
echo "g=$GH_GRAFT" > graft.txt; git add .; git commit -qm d; D="$(git rev-parse HEAD)"
git rm -q graft.txt; git commit -qm e; E="$(git rev-parse HEAD)"
echo "$E $(git rev-parse HEAD~2)" > .git/info/grafts
# 36 + 37 + 38
echo y >> a.txt; GIT_AUTHOR_NAME="dev $GH_AUTH" git commit -qam auteur
echo y >> a.txt; GIT_COMMITTER_EMAIL="$GH_CMAIL@x.nl" git commit -qam committer
echo y >> a.txt; git commit -qam "bericht $GH_ABBR"
# 39 mailmap buiten de repo
echo y >> a.txt; GIT_AUTHOR_NAME="mm $GH_MMAP" GIT_AUTHOR_EMAIL=mm@x.nl git commit -qam mailmap
printf 'Schone Naam <mm@x.nl>\n' > "$WERK/mailmap"
# 40 extra kopregel (alleen met hash-object te maken)
KOP="$(printf 'tree %s\nparent %s\nauthor t <t@t> 1700000000 +0000\ncommitter t <t@t> 1700000000 +0000\nx-extra %s\n\nextra kop\n' "$(git rev-parse HEAD^{tree})" "$(git rev-parse HEAD)" "$GH_KOP" | git hash-object -t commit -w --stdin --literally)"
git update-ref refs/heads/main "$KOP"
# 41
echo "np=$GH_NOPRE" > np.txt; git add .; git commit -qm np
# config die de geschiedenis verbergt/vervormt; reflog weg zodat alleen de echte geschiedenis telt
git config log.showRoot false; git config log.abbrevCommit true; git config log.mailmap true
git config mailmap.file "$WERK/mailmap"; git config diff.noprefix true
git reflog expire --expire=now --all
# controle dat de val echt staat: een gewone git log ziet deze tokens NIET
GEWOON="$(git -c advice.graftFileDeprecated=false log -p --all 2>/dev/null)"
for t in "$GH_ROOT" "$GH_REPL" "$GH_GRAFT" "$GH_MMAP"; do
  echo "$GEWOON" | grep -qF -- "$t" && fouten+=("opzet r2: gewone git log ziet ${t:0:8}… wél (val staat niet)")
done
set +e
UIT2="$(SECRET_SCAN_ALLOW=/dev/null "$SCAN" --repo "$WERK/r2" --alleen-git --toon 2>&1)"; CODE2=$?
set -e
UIT_ALLES="$UIT"; UIT="$UIT2"
verwacht "$GH_ROOT"  "KRITIEK" "root.txt:1"      "33 eerste commit met log.showRoot=false"
verwacht "$GH_REPL"  "KRITIEK" "repl.txt:1"      "34 git replace"
verwacht "$GH_GRAFT" "KRITIEK" "graft.txt:1"     "35 grafts"
verwacht "$GH_AUTH"  "KRITIEK" "\\(auteur\\)"     "36 auteursnaam"
verwacht "$GH_CMAIL" "KRITIEK" "\\(committer\\)"  "37 committer-e-mail"
verwacht "$GH_ABBR"  "KRITIEK" "commitbericht"   "38 bericht met log.abbrevCommit"
verwacht "$GH_MMAP"  "KRITIEK" "\\(auteur\\)"     "39 mailmap.file"
verwacht "$GH_KOP"   "KRITIEK" "\\(commitkop\\)"  "40 extra kopregel"
verwacht "$GH_NOPRE" "KRITIEK" "np.txt:1"        "41 diff.noprefix"
echo "$UIT" | grep -q "LET OP: deze repository heeft vervangende objecten" || fouten+=("r2: geen LET OP over refs/replace")
echo "$UIT" | grep -q "LET OP: deze repository heeft een grafts-bestand" || fouten+=("r2: geen LET OP over grafts")
[ "$CODE2" = 1 ] || fouten+=("r2: exitcode $CODE2, verwacht 1")
echo "$UIT2" | tail -1
UIT="$UIT_ALLES
--- r2 ---
$UIT2"
if [ ${#fouten[@]} -eq 0 ]; then echo "fouten []"; exit 0; fi
printf 'fouten [\n'; printf '  %s\n' "${fouten[@]}"; printf ']\n'
echo "--- volledige uitvoer ---"; echo "$UIT"
exit 1
