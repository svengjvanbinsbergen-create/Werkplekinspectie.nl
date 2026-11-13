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

# Verloop (actie_log.wat): public.verloop_tekens_ok en public.verloop_lijkt_serverregel (0008) = js/sync.js
# (schoonLog, zichtbaar, skelet, logTekst). Getoetst:
#   1. elk codepunt als 'a'+cp+'b' en los (ook "minstens één zichtbaar teken");
#   2. het skelet van elk codepunt (NFKD, kleine letters, lookalikes, alleen a–z);
#   3. de context-regels (ZWJ tussen emoji, VS15/VS16 na een emoji of in een toetsdop) op alle combinaties van
#      grens-codepunten van de emoji-tekenklasse, met en zonder VS16/VS15/VS1/U+20E3;
#   4. nagemaakte serverregels (o.a. VS16, VS1, Mongoolse kiezers, braillespatie, ∶, ꞉, Cyrillische S, spaties
#      tussen de letters): de database weigert ze, en wat de app ervan maakt (logTekst) accepteert de database.
node - "$DIR/../js/sync.js" "$TMP" <<'JS'
const fs = require("fs"), [bron, tmp] = process.argv.slice(2);
const src = fs.readFileSync(bron, "utf8");
const regel = (naam) => { const m = src.match(new RegExp("^\\s*const " + naam + " = [\\s\\S]*?;$", "m")); if (!m) throw new Error("niet gevonden in sync.js: " + naam); return m[0]; };
const fn = (naam) => { const m = src.match(new RegExp("^  function " + naam + "\\([\\s\\S]*?\\n  }$", "m")); if (!m) throw new Error("niet gevonden in sync.js: " + naam); return m[0]; };
const V = new Function([regel("ONZICHTBAAR"), regel("schoonTekst"), regel("EMOJI_ZWJ"), regel("LOSSE_ZWJ"), regel("VS_NOOIT"), regel("LOSSE_VS"),
  regel("schoonLog"), regel("ZICHTBAAR"), regel("zichtbaar"), regel("SKELET_VAN"), regel("SKELET_NAAR"), regel("SKELET"), regel("skelet"),
  regel("SERVERREGEL"), regel("lijktServerregel"), fn("logTekst"),
  "return { schoonLog, zichtbaar, skelet, lijktServerregel, logTekst };"].join("\n"))();
const ok = (t) => (V.schoonLog(t) === t && V.zichtbaar(t) ? 1 : 0);
// 1 en 2: per codepunt
const r1 = [], r2 = [], r3 = [];
for (let cp = 1; cp <= 0x10FFFF; cp++) {
  if (cp >= 0xD800 && cp <= 0xDFFF) continue;
  const c = String.fromCodePoint(cp);
  if (!ok("a" + c + "b")) r1.push(cp);
  if (!ok(c)) r2.push(cp);
  const k = V.skelet(c); if (k) r3.push(cp + " " + k);
}
fs.writeFileSync(tmp + "/v1-app.txt", r1.join("\n") + "\n");
fs.writeFileSync(tmp + "/v2-app.txt", r2.join("\n") + "\n");
fs.writeFileSync(tmp + "/v3-app.txt", r3.join("\n") + "\n");
// 3 en 4: gevallen
const cps = [0x41, 0x31, 0x23, 0x2A, 0x3A, 0x20, 0xA8, 0xA9, 0xAA, 0xAE, 0xAF, 0x203B, 0x203C, 0x203D, 0x2048, 0x2049, 0x204A, 0x2121, 0x2122, 0x2123,
  0x2138, 0x2139, 0x213A, 0x2193, 0x2194, 0x21AA, 0x21AB, 0x2319, 0x231A, 0x23FF, 0x2400, 0x24C1, 0x24C2, 0x24C3, 0x25A9, 0x25AA, 0x25FE,
  0x25FF, 0x2600, 0x2640, 0x27BF, 0x27C0, 0x2933, 0x2934, 0x2935, 0x2936, 0x2B04, 0x2B05, 0x2B1B, 0x2B55, 0x2B56, 0x302F, 0x3030, 0x3031,
  0x303C, 0x303D, 0x303E, 0x3296, 0x3297, 0x3298, 0x3299, 0x329A, 0x1EFFF, 0x1F000, 0x1F3FB, 0x1F477, 0x1FAFF, 0x1FB00, 0xFE0F, 0xFE0E, 0x200D, 0x20E3];
const Z = "‍", V16 = "️", V15 = "︎", V1 = "︀", K = "⃣";
const t = [Z, Z + Z, "a" + Z, Z + "a", "Status" + Z + ": Open", "👷" + Z + Z + "♀", V16, "ho" + V16 + "i", "1" + V16 + K, "#" + V16 + K, "1" + V15 + K,
  "1" + V16, "👷" + V16 + V16, "❤" + V16 + Z + "🔥", "👷" + Z + "♀" + V16, "↔" + V15];
for (const l of cps) for (const r of cps) {
  const L = String.fromCodePoint(l), R = String.fromCodePoint(r);
  t.push(L + Z + R, L + V16 + Z + R, "x" + L + Z + R + Z + L, "x" + L + V16 + R, "x" + L + V15 + R, "x" + L + V1 + R, "x" + L + V16 + K + R);
}
const spoof = ["Status️: Klaar voor toetsing → Afgerond", "Sta️tus: Open", "Status︀: Open", "Status᠋: Open", "Status᠏: Open",
  "Status⠀: Open", "Status∶ Open", "Status꞉ Open", "Ѕtatus: Open", "Aangemaakt️ met status Open",
  "Actiehouder️, toetser of plandatum gewijzigd", "Status: Open → Afgerond", "- Status : Open", "S t a t u s: Open", "Ｓtatus: Open",
  "Stätus: Open", "Ѕтатуѕ: Open", "Status" + Z + ": Open", "𝐒tatus: Open", "aangemaakt met status Afgerond",
  "ho" + V16 + "i", V1, "᠏", "⠀", "　", "   ", " ", Z, "Status․ Open", "5tatus: Open", "STATUS: OPEN"];
const gewoon = ["Ingesteld: actiehouder Bram Voorbeeld, toetser Carla Proef, plandatum 3 dec", "Getoetst en akkoord · afgerond",
  "Niet akkoord na toetsing: status is nog niet goed", "Voorstel vervallen: al opgelost", "Klaar voor toetsing gemeld, met na-foto",
  "Gedaan 👷‍♀️ ❤️‍🔥 1️⃣", "Besproken met de ploeg.\nVolgt morgen.", "Café naïef ↔︎"];
const alle = t.concat(spoof, gewoon);
fs.writeFileSync(tmp + "/v4.sql", "select case when public.verloop_tekens_ok(e) then 1 else 0 end || ' ' || case when public.verloop_lijkt_serverregel(e) then 1 else 0 end"
  + " from jsonb_array_elements_text($v$" + JSON.stringify(alle) + "$v$::jsonb) with ordinality x(e, n) order by n;\n");
fs.writeFileSync(tmp + "/v4-app.txt", alle.map((s) => ok(s) + " " + (V.lijktServerregel(s) ? 1 : 0)).join("\n") + "\n");
// wat de app verstuurt (logTekst, alleen als zichtbaar) moet de database altijd accepteren
const verstuurd = alle.map((s) => V.logTekst(s)).filter((s) => V.zichtbaar(s));
fs.writeFileSync(tmp + "/v5.sql", "select count(*) filter (where not public.verloop_tekens_ok(e) or public.verloop_lijkt_serverregel(e)) || ' ' || count(*)"
  + " from jsonb_array_elements_text($v$" + JSON.stringify(verstuurd) + "$v$::jsonb) e;\n");
fs.writeFileSync(tmp + "/v6.txt", spoof.map((s) => ok(s) && !V.lijktServerregel(s) ? s : "").filter(Boolean).join("\n"));
fs.writeFileSync(tmp + "/v7.txt", gewoon.map((s) => ok(s) && !V.lijktServerregel(s) ? "" : s).filter(Boolean).join("\n"));
fs.writeFileSync(tmp + "/vn.txt", String(alle.length));
JS
fout=0
psql -X -q -At -d "$DB" -c "
  select cp from generate_series(1, 1114111) cp
  where cp not between 55296 and 57343 and not public.verloop_tekens_ok('a' || chr(cp) || 'b') order by cp" > "$TMP/v1-db.txt"
psql -X -q -At -d "$DB" -c "
  select cp from generate_series(1, 1114111) cp
  where cp not between 55296 and 57343 and not public.verloop_tekens_ok(chr(cp)) order by cp" > "$TMP/v2-db.txt"
psql -X -q -At -d "$DB" -c "
  select cp || ' ' || public.verloop_skelet(chr(cp)) from generate_series(1, 1114111) cp
  where cp not between 55296 and 57343 and public.verloop_skelet(chr(cp)) <> '' order by cp" > "$TMP/v3-db.txt"
psql -X -q -At -d "$DB" -f "$TMP/v4.sql" > "$TMP/v4-db.txt"
# Deel 3: Node kan een nieuwere Unicode-versie hebben dan PostgreSQL (nieuwe tekens, bijv. U+1CCD6 "omlijnde
# letters" uit Unicode 16, die NFKD in Node wel naar a–z brengt). Alleen díe richting mag verschillen: de app is dan
# strenger (zet er "Toelichting: " voor), nooit soepeler. Elk skelet dat de database kent, moet de app gelijk kennen.
EXTRA=$(diff "$TMP/v3-app.txt" "$TMP/v3-db.txt" | grep -c '^<' || true)
if diff "$TMP/v3-app.txt" "$TMP/v3-db.txt" | grep -q '^>'; then
  echo "tekens (verloop, deel 3): FOUT (skelet in de database anders dan in js/sync.js)"
  diff "$TMP/v3-app.txt" "$TMP/v3-db.txt" | grep '^>' | head -10
  fout=1
fi
for n in 1 2 4; do
  if ! cmp -s "$TMP/v$n-app.txt" "$TMP/v$n-db.txt"; then
    echo "tekens (verloop, deel $n): FOUT (js/sync.js en de database lopen uit elkaar)"
    diff "$TMP/v$n-app.txt" "$TMP/v$n-db.txt" | head -10
    fout=1
  fi
done
V5=$(psql -X -q -At -d "$DB" -f "$TMP/v5.sql")
case "$V5" in
  "0 "*) ;;
  *) echo "tekens (verloop): FOUT: de database weigert $V5 regels zoals de app ze verstuurt (logTekst)"; fout=1 ;;
esac
if [ -s "$TMP/v6.txt" ]; then echo "tekens (verloop): FOUT: nagemaakte serverregel niet geweigerd:"; cat "$TMP/v6.txt"; fout=1; fi
if [ -s "$TMP/v7.txt" ]; then echo "tekens (verloop): FOUT: gewone regel van de app geweigerd:"; cat "$TMP/v7.txt"; fout=1; fi
[ "$fout" = 0 ] || exit 1
echo "tekens (verloop): OK (alle codepunten los en in tekst, skelet van alle codepunten (app strenger op $EXTRA tekens uit een nieuwere Unicode-versie), $(cat "$TMP/vn.txt") gevallen met ZWJ/variatiekiezers/nagemaakte serverregels gelijk aan js/sync.js; app-uitvoer altijd geaccepteerd)"
