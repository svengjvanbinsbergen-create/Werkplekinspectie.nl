# Ronde 11b (data 11.1 + afspraak eenheid): tellingen = waarnemingen/regels; getoetst = x taken · y taakstappen. Bron = app.v11.js.
import json
base = '/home/claude/wpi/run/out/dashboard/'
src = open(base + 'app.v11.js').read()
P = []
def rep(old, new, alle=False): P.append((old, new, alle))

rep("'bovenaan', 'vooraf']);", "'bovenaan', 'vooraf', 'last', 'gebruikt']);")
rep("const SPO = (w) => w.ingang === 'spontaan';\n",
    "const SPO = (w) => w.ingang === 'spontaan';\n"
    "const TK = (w) => (+w.n_stappen || 0) - (+w.n_taakstap || 0), TS = (w) => +w.n_taakstap || 0;\n"
    "const GET = (tk, ts) => meer(tk, 'taak', 'taken') + ' · ' + meer(ts, 'taakstap', 'taakstappen');\n")
rep("zet('stappen', nst); zet('stap_ts', nts);", "zet('stappen', nst); zet('taken_n', nst - nts); zet('stap_ts', nts);")
rep("'regel gezien', 'regels gezien'", "'waarneming', 'waarnemingen'", True)
rep("      const ws = wpis.filter((x) => (x.soort === DIR) === (p === 'd')); zet(p + '_spw',",
    "      const ws = wpis.filter((x) => (x.soort === DIR) === (p === 'd')); zet(p + '_tk', d3.sum(ws, TK)); zet(p + '_ts', d3.sum(ws, TS)); zet(p + '_spw',")
rep("  t('waar', NL(waar), 'regels', 'Regels gezien (Conform, Afwijking, Verbeterpunt)', WAAR);",
    "  t('waar', NL(waar), 'regels', 'Waarnemingen (Conform, Afwijking, Verbeterpunt)', WAAR);\n"
    "  [['g_tra', 'TRA', 'Waarnemingen op TRA-regels'], ['g_alg', 'Algemeen', 'Waarnemingen op algemene onderwerpen'], ['g_bui', 'Buiten TRA', 'Waarnemingen buiten de TRA']].forEach(([k, so, ti]) => t(k, NL(N(s.rg, (r) => r.soort === so && WAAR(r))), 'regels', ti, (r) => r.soort === so && WAAR(r)));")
rep("  t('stappen', NL(d3.sum(s.wp, (w) => +w.n_stappen || 0)), 'wpis', 'WPI’s met de getoetste taken en taakstappen', () => true);\n"
    "  t('ts', NL(d3.sum(s.wp, (w) => +w.n_taakstap || 0)), 'wpis', 'WPI’s met getoetste taakstappen', (w) => +w.n_taakstap > 0);",
    "  t('getoetst', NL(d3.sum(s.wp, TK)) + ' · ' + NL(d3.sum(s.wp, TS)), 'wpis', 'WPI’s met de getoetste taken en taakstappen', () => true);")
rep("    t(k + '_mpw', per1(N(r, WAAR), w.length), 'regels', naam + ' – regels gezien', and(WAAR));\n"
    "    t(k + '_spw', per1(d3.sum(w, (x) => +x.n_stappen || 0), w.length), 'wpis', naam + ' – getoetste taken en taakstappen', f);",
    "    t(k + '_mpw', per1(N(r, WAAR), w.length), 'regels', naam + ' – waarnemingen', and(WAAR));\n"
    "    t(k + '_tk', NL(d3.sum(w, TK)), 'wpis', naam + ' – getoetste taken', f); t(k + '_ts', NL(d3.sum(w, TS)), 'wpis', naam + ' – getoetste taakstappen', and((x) => TS(x) > 0));")
rep("' afwijkingen en verbeterpunten per WPI; regels gezien per WPI ' + T.c_mpw[0]", "' afwijkingen en verbeterpunten per WPI; waarnemingen per WPI ' + T.c_mpw[0]")
rep("  M.mom = s.wp.length ? meer(s.wp.length, 'WPI toetste', 'WPI’s toetsten') + ' ' + meer(nst, 'taak of taakstap', 'taken en taakstappen') + ' (' + NL(nts) + ' op taakstapniveau); ' + meer(waar, 'regel', 'regels') + ' gezien; '",
    "  M.mom = s.wp.length ? meer(s.wp.length, 'WPI', 'WPI’s') + ' · getoetst: ' + GET(nst - nts, nts) + ' · ' + meer(waar, 'waarneming', 'waarnemingen') + ' · '")
rep("  waar: () => ['Regels gezien (Conform, Afwijking, Verbeterpunt)', 'regels', WAAR],", "  waar: () => ['Waarnemingen (Conform, Afwijking, Verbeterpunt)', 'regels', WAAR],")
rep("stap_ts: () => ['WPI’s met getoetste taakstappen', 'wpis', (w) => +w.n_taakstap > 0],",
    "stap_ts: () => ['WPI’s met getoetste taakstappen', 'wpis', (w) => +w.n_taakstap > 0], taken_n: () => ['WPI’s met taken getoetst op taakniveau', 'wpis', (w) => TK(w) > 0],")
rep("  g_alg: () => ['Algemene onderwerpen gezien', 'regels', (r) => r.soort === 'Algemeen' && WAAR(r)], g_tra: () => ['TRA-regels gezien', 'regels',",
    "  g_alg: () => ['Waarnemingen op algemene onderwerpen', 'regels', (r) => r.soort === 'Algemeen' && WAAR(r)], g_tra: () => ['Waarnemingen op TRA-regels', 'regels',")
rep("return ['Regels gezien – ' + c, 'regels',", "return ['Waarnemingen – ' + c, 'regels',")
rep("sectie('3. Bevindingen per klasse (regels gezien)', tabel(['Klasse', 'Gezien',", "sectie('3. Bevindingen per klasse (waarnemingen)', tabel(['Klasse', 'Waarnemingen',")
rep("sub: dat(w.datum) + ' · ' + meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen') + ': '", "sub: dat(w.datum) + ' · ' + GET(TK(w), TS(w)) + ': '")
rep("['Getoetst', (w) => h('span', null, meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen'), h('small'", "['Getoetst', (w) => h('span', null, GET(TK(w), TS(w)), h('small'")

out = src
for old, new, alle in P:
    n = out.count(old); assert n >= 1 and (alle or n == 1), (n, old[:90])
    out = out.replace(old, new)
for bad in ['regels gezien', 'regel gezien', 'Regels gezien', 'taak of taakstap', 'maatregelen gezien']:
    assert bad not in out, bad
assert '"' not in out and chr(92) not in out
open(base + 'app.js', 'w').write(out)
json.dump(P, open(base + 'test/edits11b_app.json', 'w'), ensure_ascii=False)
print(len(P), 'vervangingen')
