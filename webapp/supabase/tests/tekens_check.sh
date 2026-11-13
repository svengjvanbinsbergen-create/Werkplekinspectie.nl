#!/bin/sh
# Vergelijkt public.tekst_tekens_ok (database) met ONZICHTBAAR/schoonTekst uit js/sync.js (de app), voor ALLE
# Unicode-codepunten (1 t/m 10FFFF, zonder surrogaten). Elk teken dat de database in vrije tekst weigert, moet de app
# vóór het versturen weghalen (anders blijft een geplakte tekst blijvend geweigerd), en de app mag niets weghalen wat
# de database toestaat. Uitzondering: U+2028/2029 maakt de app een regeleinde (de database weigert ze).
# Verwacht: "tekens: OK".
#   Gebruik: sh supabase/tests/tekens_check.sh <database>   (PGHOST/PGPORT/PGUSER zoals run.sh)
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB=${1:-wpi_rls_test}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node - "$DIR/../js/sync.js" "$TMP/app.txt" <<'JS'
const fs = require("fs"), [bron, uit] = process.argv.slice(2);
const src = fs.readFileSync(bron, "utf8");
const regel = (naam) => { const m = src.match(new RegExp("^\\s*const " + naam + " = [\\s\\S]*?;$", "m")); if (!m) throw new Error("niet gevonden in sync.js: " + naam); return m[0]; };
const { schoonTekst } = new Function([regel("ONZICHTBAAR"), regel("schoonTekst"), "return { schoonTekst };"].join("\n"))();
const r = [];
for (let cp = 1; cp <= 0x10FFFF; cp++) {
  if (cp >= 0xD800 && cp <= 0xDFFF) continue;
  const t = "a" + String.fromCodePoint(cp) + "b";
  if (schoonTekst(t) !== t) r.push(cp);
}
fs.writeFileSync(uit, r.join("\n") + "\n");
JS

psql -X -q -At -d "$DB" -c "
  select cp from generate_series(1, 1114111) cp
  where cp not between 55296 and 57343 and not public.tekst_tekens_ok('a' || chr(cp) || 'b') order by cp" > "$TMP/db.txt"

APP=$(wc -l < "$TMP/app.txt"); DBN=$(wc -l < "$TMP/db.txt")
VERSCHIL=$(diff "$TMP/app.txt" "$TMP/db.txt" | grep -c '^[<>]' || true)
echo "tekens: app haalt $APP codepunten weg, database weigert er $DBN; verschillen: $VERSCHIL"
if [ "$VERSCHIL" != "0" ]; then
  diff "$TMP/app.txt" "$TMP/db.txt" | head -20
  echo "tekens: FOUT (js/sync.js ONZICHTBAAR en tekst_tekens_ok lopen uit elkaar)"
  exit 1
fi
echo "tekens: OK (gelijk aan js/sync.js)"
