# Ronde 11 (koers2, momentopname): gerichte vervangingen in app.js. Bron = app.v10.js (gepubliceerde stand).
import json, sys
base = '/home/claude/wpi/run/out/dashboard/'
src = open(base + 'app.v10.js').read()
P = []  # (old, new, replace_all)
def rep(old, new, alle=False):
    P.append((old, new, alle))
def blok(start, eind):
    i = src.index(start); j = src.index(eind, i); return src[i:j]

rep("const ABV = (r) => r.waargenomen === 'Alleen bevestigd';\nconst NBN = (r) => !WAAR(r) && !ABV(r);\n",
    "const NVT = is('Niet van toepassing');\nconst STAP = (r) => r.taak ? r.taak + (r.taakstap ? ' › ' + r.taakstap : '') : '';\nconst SPO = (w) => w.ingang === 'spontaan';\n")
rep(blok("const OORD = [", "const topTies"),
    "const OORD = [['Conform', 'o-con', '✓'], ['Verbeterpunt', 'o-ver', '△'], ['Afwijking', 'o-afw', '✕'], ['Niet van toepassing', 'o-nvt', '–']];\n")
# kerncijfers: geen dekking/alleen bevestigd/niet beoordeeld meer; wel momentopname
rep("zet('neg', n(NEG)); zet('ab', n(ABV)); zet('ab_pct', pc(n(ABV), regels.length)); zet('nee', n(NBN));",
    "zet('neg', n(NEG)); zet('nvt', n(NVT));\n"
    "    const som = (f) => d3.sum(wpis, (w) => +w[f] || 0), nst = som('n_stappen'), nts = som('n_taakstap'), spo = wpis.filter(SPO);\n"
    "    zet('stappen', nst); zet('stap_ts', nts); zet('stap_pct', pc(nts, nst)); zet('stap_gem', wpis.length ? r1(nst / wpis.length) : 0, '', 1);\n"
    "    zet('stap_min', d3.min(wpis, (w) => +w.n_stappen) || 0); zet('stap_max', d3.max(wpis, (w) => +w.n_stappen) || 0); zet('een_taak', wpis.filter((w) => +w.n_taken === 1).length);\n"
    "    const tk = cnt(wpis.flatMap((w) => [...new Set((w.taken || '').split(' | ').filter(Boolean))]), (t) => t);\n"
    "    zet('taken_uniek', tk.length); zet('taak_top', tk[0] ? tk[0][1] : 0, topTies(tk, 1, (x) => x[1]).map((x) => x[0]).join(', ') || '—');\n"
    "    zet('ingepland', wpis.length - spo.length); zet('spontaan', spo.length, spo.map((w) => w.nr).join(', ') || 'geen');\n"
    "    [['g_alg', 'Algemeen'], ['g_tra', 'TRA'], ['g_bui', 'Buiten TRA']].forEach(([k, so]) => zet(k, n((r) => r.soort === so && WAAR(r))));")
rep("'waargenomen regel', 'waargenomen regels'", "'regel gezien', 'regels gezien'", True)
rep(blok("    const insp = d3.rollups(regels, (v) => pc(v.filter(WAAR)", "    const bt = regels.filter((r) => r.soort === 'Buiten TRA'), btop"), "")
rep("zet(p + '_ja', pc(rr.filter(WAAR).length, rr.length)); zet(p + '_ab', pc(rr.filter(ABV).length, rr.length));",
    "zet(p + '_mpw', w ? r1(rr.filter(WAAR).length / w) : 0, '', 1);\n"
    "      const ws = wpis.filter((x) => (x.soort === DIR) === (p === 'd')); zet(p + '_spw', ws.length ? r1(d3.sum(ws, (x) => +x.n_stappen || 0) / ws.length) : 0, '', 1);")
# gefilterde tegels
rep("  t('waar', NL(waar), 'regels', 'Regels met een eigen waarneming', WAAR);",
    "  t('waar', NL(waar), 'regels', 'Regels gezien (Conform, Afwijking, Verbeterpunt)', WAAR);\n"
    "  t('nvt', NL(N(s.rg, NVT)), 'regels', 'Regels expliciet niet van toepassing', NVT);\n"
    "  t('stappen', NL(d3.sum(s.wp, (w) => +w.n_stappen || 0)), 'wpis', 'WPI’s met de getoetste taken en taakstappen', () => true);\n"
    "  t('ts', NL(d3.sum(s.wp, (w) => +w.n_taakstap || 0)), 'wpis', 'WPI’s met getoetste taakstappen', (w) => +w.n_taakstap > 0);\n"
    "  t('ing', NL(N(s.wp, (w) => !SPO(w))), 'wpis', 'Ingeplande WPI’s', (w) => !SPO(w)); t('spo', NL(N(s.wp, SPO)), 'wpis', 'Spontane WPI’s', SPO);")
rep(blok("  t('zonder', NL(N(s.rg, (r) => !WAAR(r)))", "  const ov = s.ac.filter(s.over)"), "")
rep("    t(k + '_ja', pc(N(r, WAAR), r.length), 'regels', naam + ' – waargenomen', and(WAAR));\n    t(k + '_ab', pc(N(r, ABV), r.length), 'regels', naam + ' – alleen bevestigd', and(ABV));",
    "    t(k + '_mpw', per1(N(r, WAAR), w.length), 'regels', naam + ' – regels gezien', and(WAAR));\n"
    "    t(k + '_spw', per1(d3.sum(w, (x) => +x.n_stappen || 0), w.length), 'wpis', naam + ' – getoetste taken en taakstappen', f);\n"
    "    t(k + '_spo', NL(N(w, SPO)), 'wpis', naam + ' – spontane WPI’s', and(SPO));")
rep("' afwijkingen en verbeterpunten per WPI; eigen waarneming ' + T.c_ja[0] + ' tegenover ' + T.d_ja[0];",
    "' afwijkingen en verbeterpunten per WPI; regels gezien per WPI ' + T.c_mpw[0] + ' tegenover ' + T.d_mpw[0];")
rep(blok("  const inspP = d3.rollups(s.rg,", "  const herh = d3.rollups(s.rg.filter"),
    "  const nst = d3.sum(s.wp, (w) => +w.n_stappen || 0), nts = d3.sum(s.wp, (w) => +w.n_taakstap || 0), spW = s.wp.filter(SPO);\n"
    "  M.mom = s.wp.length ? meer(s.wp.length, 'WPI toetste', 'WPI’s toetsten') + ' ' + meer(nst, 'taak of taakstap', 'taken en taakstappen') + ' (' + NL(nts) + ' op taakstapniveau); ' + meer(waar, 'regel', 'regels') + ' gezien; ' + NL(s.wp.length - spW.length) + ' ingepland, ' + NL(spW.length) + ' spontaan' : 'geen WPI’s binnen deze filters';\n"
    "  const tkS = cnt(s.wp.flatMap((w) => [...new Set((w.taken || '').split(' | ').filter(Boolean))]), (x) => x);\n"
    "  M.taken = meer(tkS.length, 'taak', 'verschillende taken') + ' getoetst; ' + NL(N(s.wp, (w) => +w.n_taken === 1)) + ' van de ' + meer(s.wp.length, 'WPI', 'WPI’s') + ' toetsten één taak' + (tkS[0] ? '; vaakst: ' + tkS[0][0] + ' (' + meer(tkS[0][1], 'WPI', 'WPI’s') + ')' : '');\n"
    "  const spA = s.wp0.filter(SPO);\n"
    "  M.ingang = 'Ingang: ' + NL(s.wp0.length - spA.length) + ' ingepland (uit het programma), ' + NL(spA.length) + ' spontaan' + (spA.length ? ' (' + spA.map((w) => w.nr).join(', ') + ')' : '') + '. Een spontane WPI telt mee voor het programma als hij op een verplichte werkplek en maand valt.';\n")
# doorklikken vanaf kerncijfers
rep("  waar: () => ['Regels met een eigen waarneming', 'regels', WAAR],", "  waar: () => ['Regels gezien (Conform, Afwijking, Verbeterpunt)', 'regels', WAAR],")
rep("  ab: () => ['Alleen bevestigd via de afsluitvraag', 'regels', ABV], nee: () => ['Niet beoordeeld of n.v.t.', 'regels', NBN],",
    "  nvt: () => ['Regels expliciet niet van toepassing', 'regels', NVT], ingepland: () => ['Ingeplande WPI’s', 'wpis', (w) => !SPO(w)], spontaan: () => ['Spontane WPI’s', 'wpis', SPO],\n"
    "  stappen: () => ['WPI’s met de getoetste taken en taakstappen', 'wpis', () => true], stap_ts: () => ['WPI’s met getoetste taakstappen', 'wpis', (w) => +w.n_taakstap > 0], een_taak: () => ['WPI’s die één taak toetsten', 'wpis', (w) => +w.n_taken === 1],\n"
    "  taak_top: () => { const t = klasRij('taak_top'); return ['WPI’s met taak ' + t, 'wpis', (w) => (w.taken || '').split(' | ').includes(t)]; },\n"
    "  g_alg: () => ['Algemene onderwerpen gezien', 'regels', (r) => r.soort === 'Algemeen' && WAAR(r)], g_tra: () => ['TRA-regels gezien', 'regels', (r) => r.soort === 'TRA' && WAAR(r)], g_bui: () => ['Waarnemingen buiten de TRA', 'regels', (r) => r.soort === 'Buiten TRA' && WAAR(r)],")
rep("return ['Waargenomen regels – ' + c, 'regels', (r) => r.classificatie === c && WAAR(r)]; },", "return ['Regels gezien – ' + c, 'regels', (r) => r.classificatie === c && WAAR(r)]; },")
rep("  tra_toets: () => ['Waargenomen TRA-toetsingen', 'regels',", "  tra_toets: () => ['TRA-toetsingen (gezien)', 'regels',")
# vastgelegde versie
rep("sectie('3. Bevindingen per klasse (waargenomen regels)', tabel(['Klasse', 'Waargenomen',", "sectie('3. Bevindingen per klasse (regels gezien)', tabel(['Klasse', 'Gezien',")
# dekkingsgrafiek eruit, momentopname erin
rep(blok("dash.draw('diep', (el) => {", "/* ---------- TRA-toetsing ---------- */"),
    "dash.draw('mom', (el) => {\n"
    "  const s = S(); if (!s.ok || !s.wp.length) return leeg(el, s);\n"
    "  el.replaceChildren(); const tip = tipper(el);\n"
    "  el.prepend(bars(s.wp.slice().sort((a, b) => d3.ascending(a.datum, b.datum)).map((w) => {\n"
    "    const f = (x) => x.wpi === w.nr, r = s.rg.filter(f), c = r.filter(is('Conform')).length, nv = r.filter(NVT).length;\n"
    "    return {label: w.nr + (SPO(w) ? ' · spontaan' : ''), sub: dat(w.datum) + ' · ' + meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen') + ': ' + kort((w.taken || '—').split(' | ').join('; '), 90),\n"
    "      val: '✓ ' + c + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length + (nv ? ' · – ' + nv : ''),\n"
    "      segs: [{n: c, c: 'o-con', t: 'Conform', pred: (x) => f(x) && x.oordeel === 'Conform'}, ...negSegs(r, f), {n: nv, c: 'o-nvt', t: 'Niet van toepassing', pred: (x) => f(x) && NVT(x)}]};\n"
    "  }), tip));\n"
    "});\n"
    "dash.draw('taken', (el) => {\n"
    "  const s = S(); if (!s.ok || !s.wp.length) return leeg(el, s);\n"
    "  const st = s.wp.flatMap((w) => (w.stappen || '').split(' | ').filter(Boolean).map((x) => ({wpi: w.nr, taak: x.split(' › ')[0], stap: x.includes(' › ')})));\n"
    "  el.replaceChildren(); const tip = tipper(el);\n"
    "  el.prepend(bars(d3.groups(st, (x) => x.taak).map(([t, l]) => {\n"
    "    const nw = new Set(l.map((x) => x.wpi)), ns = l.filter((x) => x.stap).length, f = (r) => r.taak === t && nw.has(r.wpi), r = s.rg.filter(f), c = r.filter(is('Conform')).length;\n"
    "    return {label: t, n: nw.size, sub: meer(nw.size, 'WPI', 'WPI’s') + ' · ' + (ns ? meer(ns, 'taakstap', 'taakstappen') + ' getoetst' : 'op taakniveau (de TRA kent hier geen taakstap)'),\n"
    "      val: '✓ ' + c + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length,\n"
    "      segs: [{n: c, c: 'o-con', t: 'Conform', pred: (x) => f(x) && x.oordeel === 'Conform'}, ...negSegs(r, f)]};\n"
    "  }).sort((a, b) => b.n - a.n || d3.ascending(a.label, b.label)), tip));\n"
    "});\n\n")
rep("h('b', {text: 'Taak: '}), x.k.taak || '—'),", "h('b', {text: 'Taak: '}), x.k.taak || '—', x.k.taakstap ? [h('br'), h('b', {text: 'Taakstap: '}), x.k.taakstap] : null),")
rep("text: meer(tra.length, 'waargenomen toetsing', 'waargenomen toetsingen') + ' van '", "text: meer(tra.length, 'toetsing', 'toetsingen') + ' van '")
rep(blok("dash.draw('nb', (el) => {", "/* ---------- Acties ---------- */"), "")
# doorklikken
rep("cols = [['WPI', (w) => wpiKnop(w.nr)], ['Datum', (w) => dat(w.datum)], ['Inspecteur', (w) => w.inspecteur], ['Project', (w) => PN(w.project || '—')], ['Product en fase', (w) => w.product + ' · ' + w.fase],",
    "cols = [['WPI', (w) => wpiKnop(w.nr)], ['Datum', (w) => dat(w.datum)], ['Inspecteur', (w) => w.inspecteur], ['Ingang', (w) => w.ingang || '—'], ['Project', (w) => PN(w.project || '—')], ['Product en fase', (w) => w.product + ' · ' + w.fase],\n"
    "      ['Getoetst', (w) => h('span', null, meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen'), h('small', {class: 'w-blok w-mut', text: kort((w.taken || '—').split(' | ').join('; '), 110)}))],")
rep(" + ' · △ ' + r.filter(is('Verbeterpunt')).length + ' · ○ ' + r.filter(ABV).length; }]];", " + ' · △ ' + r.filter(is('Verbeterpunt')).length; }]];")
rep("['Product', w.product], ['Fase / taak', w.fase + (w.taken ? ' – ' + w.taken : '')],",
    "['Product', w.product], ['Fase', w.fase], ['Ingang', w.ingang], ['Getoetst tijdens bezoek', (w.stappen || '').split(' | ').join('; ')],")
rep("cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => r.oordeel === 'Conform' ? h('span', null, badge(r.waargenomen, DEK), h('small', {class: 'w-blok w-mut', text: 'zie rapport ' + w.nr + ', h5'})) : badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];",
    "cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70), STAP(r) && h('small', {class: 'w-blok w-mut', text: 'Getoetst: ' + kort(STAP(r), 110)}))], ['Oordeel', (r) => r.oordeel === 'Conform' ? h('span', null, badge(r.oordeel), h('small', {class: 'w-blok w-mut', text: 'waarneming: rapport ' + w.nr + ', h5'})) : badge(r.oordeel)], ['Actie', (r) => actKnoppen(r.acties)]];")
rep("['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];",
    "['Oordeel', (r) => badge(r.oordeel)], ['Taak / taakstap', (r) => STAP(r) ? kort(STAP(r), 90) : r.soort === 'Algemeen' ? 'algemeen onderwerp' : r.soort], ['Actie', (r) => actKnoppen(r.acties)]];")

out = src
for old, new, alle in P:
    n = out.count(old); assert n >= 1 and (alle or n == 1), (n, old[:80])
    out = out.replace(old, new)
for bad in ['ABV', 'NBN', 'DEK', 'Alleen bevestigd', 'Niet beoordeeld', 'Geen afwijking waargenomen', 'eigen waarneming', '_ja', '_ab']:
    assert bad not in out, bad
assert '"' not in out and chr(92) not in out
open(base + 'app.js', 'w').write(out)
json.dump(P, open(base + 'test/edits11_app.json', 'w'), ensure_ascii=False)
print(len(P), 'vervangingen;', len(src), '->', len(out), 'tekens; oud-tekst totaal', sum(len(o) for o, _, _ in P), 'nieuw', sum(len(n) for _, n, _ in P))
