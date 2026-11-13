#!/bin/sh
# Vergelijkt public.naam_sleutel / public.naam_schoon (database) met sleutel() / schoon()
# uit js/beheer.js (de app), voor ALLE Unicode-codepunten (1 t/m 10FFFF, zonder
# surrogaten) plus een reeks echte namen. Verwacht: "naamsleutel: OK".
# Nodig: node (de functies worden letterlijk uit beheer.js gelezen) en een database
# waarin schema.sql is geladen.
#   Gebruik: sh supabase/tests/naamsleutel_check.sh <database>   (PGHOST/PGPORT/PGUSER zoals run.sh)
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB=${1:-wpi_rls_test}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/namen.txt" <<'NAMEN'
Henk Voorbeeld
henk  voorbeeld
Henk-Voorbeeld
HenkVoorbeeld
Henk Voorbeeld.
 Henk Voorbeeld ,;
Hénk Voorbeeld
HENK VOORBEELD
Henk ·Voorbeeld·
Henk Voorbeeld (2)
Æsa Test
Østergaard Ł. Đorđević
Straße Þór Ħal
Jan-Willem van der Berg
O'Neill
D’Artagnan
Ἰωάννης Σωκράτης
Ольга Петрова
İsmail Yıldız
Zoë Brontë
Ruben Fictief
Kees Demo²
Ⅻ Test ½
NAMEN

# 1. de app (beheer.js): de vier regels ONZ/schoon/LOS/sleutel letterlijk overnemen
node - "$DIR/../js/beheer.js" "$TMP" <<'JS'
const fs = require("fs"), [bron, uit] = process.argv.slice(2);
const src = fs.readFileSync(bron, "utf8");
const regel = (naam) => { const m = src.match(new RegExp("^\\s*const " + naam + " = [\\s\\S]*?;$", "m")); if (!m) throw new Error("niet gevonden in beheer.js: " + naam); return m[0]; };
const { schoon, sleutel } = new Function([regel("ONZ"), regel("schoon"), regel("LOS"), regel("sleutel"), "return { schoon, sleutel };"].join("\n"))();
const r = [];
for (let cp = 1; cp <= 0x10FFFF; cp++) {
  if (cp >= 0xD800 && cp <= 0xDFFF) continue;
  const k = sleutel(String.fromCodePoint(cp));
  if (k) r.push(cp + "\t" + k);
}
fs.writeFileSync(uit + "/app_cp.txt", r.join("\n") + "\n");
const namen = fs.readFileSync(uit + "/namen.txt", "utf8").split("\n").filter((x) => x);
fs.writeFileSync(uit + "/app_namen.txt", namen.map((n) => JSON.stringify([sleutel(n), schoon(n), sleutel(schoon(n))])).join("\n") + "\n");
JS

# 2. de database
psql -X -q -At -F "$(printf '\t')" -d "$DB" -c "
  select cp, public.naam_sleutel(chr(cp)) from generate_series(1, 1114111) cp
  where cp not between 55296 and 57343 and public.naam_sleutel(chr(cp)) <> '' order by cp" > "$TMP/db_cp.txt"
python3 - "$TMP" "$DB" <<'PY'
import json, subprocess, sys
tmp, db = sys.argv[1], sys.argv[2]
namen = [n for n in open(tmp + "/namen.txt", encoding="utf-8").read().split("\n") if n]
uit = []
for n in namen:
    q = "select json_build_array(public.naam_sleutel(%s), public.naam_schoon(%s), public.naam_sleutel(public.naam_schoon(%s)))" % ((
        "'" + n.replace("'", "''") + "'",) * 3)
    r = subprocess.run(["psql", "-X", "-q", "-At", "-d", db, "-c", q], capture_output=True, text=True, check=True).stdout.strip()
    uit.append(json.dumps(json.loads(r), ensure_ascii=False))
open(tmp + "/db_namen.txt", "w", encoding="utf-8").write("\n".join(uit) + "\n")
PY

# 3. vergelijken
FOUT=0
python3 - "$TMP" <<'PY' || FOUT=1
import json, sys
tmp = sys.argv[1]
app = dict(l.split("\t", 1) for l in open(tmp + "/app_cp.txt", encoding="utf-8").read().splitlines() if l)
db = dict(l.split("\t", 1) for l in open(tmp + "/db_cp.txt", encoding="utf-8").read().splitlines() if l)
alle = sorted({k for k in set(app) | set(db) if app.get(k) != db.get(k)}, key=int)
# Tekens die in de Unicode-versie van de database (ICU van PostgreSQL) nog niet bestaan,
# tellen niet mee: daar kan geen naam mee zijn opgeslagen die de database anders ziet.
# Python's unicodedata dient als maat (zelfde of oudere versie dan de ICU van de database).
import unicodedata
nieuw = [k for k in alle if db.get(k) is None and unicodedata.category(chr(int(k))) == "Cn"]
verschil = [k for k in alle if k not in set(nieuw)]
print("Unicode: python %s; %d codepunten alleen in nieuwere Unicode (app) genegeerd" % (unicodedata.unidata_version, len(nieuw)))
for k in verschil[:40]:
    print("codepunt U+%04X: app=%r database=%r" % (int(k), app.get(k), db.get(k)))
an = [json.loads(l) for l in open(tmp + "/app_namen.txt", encoding="utf-8").read().splitlines() if l]
dn = [json.loads(l) for l in open(tmp + "/db_namen.txt", encoding="utf-8").read().splitlines() if l]
nv = 0
for i, (a, d) in enumerate(zip(an, dn)):
    if a != d:
        nv += 1
        print("naam %d: app=%r database=%r" % (i + 1, a, d))
print("codepunten met een sleutel: app %d, database %d; verschillen: %d; namen: %d, verschillen: %d"
      % (len(app), len(db), len(verschil), len(an), nv))
sys.exit(1 if verschil or nv or len(an) != len(dn) else 0)
PY
if [ "$FOUT" = 0 ]; then echo "naamsleutel: OK (gelijk aan beheer.js)"; else echo "naamsleutel: VERSCHIL met beheer.js"; exit 1; fi
