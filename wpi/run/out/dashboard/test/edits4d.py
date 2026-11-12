p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
a=s.index("/* ---------- doorklikken ---------- */"); b=s.index("/* ---------- tabbladen en knoppen ---------- */")
new = r"""/* ---------- doorklikken ---------- */
const ACTIE_VELDEN = [['Bevinding', (a) => a.bevinding], ['Verbeteractie', (a) => a.verbeteractie], ['Direct genomen maatregel', (a) => a.direct_genomen_maatregel || 'geen'],
  ['Regel', (a) => a.ref + ' · ' + a.classificatie], ['Prioriteit en bron', (a) => a.prioriteit + ' · ' + a.bron], ['Actiehouder', (a) => a.actiehouder], ['Toetser', (a) => a.toetser],
  ['Termijn', (a) => dat(a.termijn)], ['Status', (a) => a.status === 'Afgerond' ? 'Afgerond op ' + dat(a.afgerond_op) + ', getoetst op ' + dat(a.getoetst_op) : 'Open']];
dash.draw('detail', (el) => {
  const d = W.drill, s = S();
  if (!d || d.slot !== el.dataset.slot || !s.ok) { el.classList.remove('w-open'); el.replaceChildren(); return; }
  const B = d.alle ? {wp: D('wpis').data, rg: D('regels').data, ac: D('acties').data, vp: vpAlle()} : {wp: s.wp, rg: s.rg, ac: s.ac, vp: s.vp};
  const wpiKnop = (nr) => clk(h('span', {text: nr}), nr, 'wpi', (r) => r.wpi === nr);
  const actKnoppen = (txt) => { const nrs = (txt || '').split(', ').filter(Boolean); return nrs.length ? h('span', null, nrs.map((n, i) => [i ? ', ' : '', clk(h('span', {text: n}), n, 'actie', (a) => a.actie === n)])) : '—'; };
  let rows, cols, kop = d.title, cls = '', extra = null;
  if (d.kind === 'wpis') {
    rows = B.wp.filter(d.pred);
    cols = [['WPI', (w) => wpiKnop(w.nr)], ['Datum', (w) => dat(w.datum)], ['Inspecteur', (w) => w.inspecteur], ['Project', (w) => PN(w.project || '—')], ['Product en fase', (w) => w.product + ' · ' + w.fase],
      ['Bevindingen', (w) => { const r = D('regels').data.filter((x) => x.wpi === w.nr); return '✓ ' + r.filter(is('Conform')).length + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length + ' · ○ ' + r.filter(ABV).length; }]];
    kop += ' — ' + meer(rows.length, 'WPI', 'WPI’s');
  } else if (d.kind === 'acties') {
    rows = B.ac.filter(d.pred); cols = OPEN_KOL(s); cls = 'w-actt';
    kop += ' — ' + meer(rows.length, 'actie', 'acties');
  } else if (d.kind === 'proj') {
    rows = B.vp.filter(d.pred).sort((x, y) => d3.ascending(x.p ? x.p.start : '9', y.p ? y.p.start : '9') || d3.ascending(x.project, y.project) || d3.ascending(x.maand, y.maand));
    cols = [['Project', (o) => h('span', null, h('b', {text: PN(o.project)}), o.p && h('small', {class: 'w-blok w-mut', text: o.p.product + ' · ' + o.p.locatie}))],
      ['Looptijd', (o) => o.p ? dat(o.p.start) + ' t/m ' + dat(o.p.eind) : o.q],
      ['Eis', (o) => CAT[o.cat] + (o.p && RISK(o.p) ? ' (' + RISKT(o.p) + ')' : '')], ['Maand', (o) => mnd(o.maand)],
      ['Uitkomst', (o) => o.ok ? h('span', null, h('span', {class: 'w-st ok', text: '✓ '}), o.wpis.map((n, i) => [i ? ', ' : '', wpiKnop(n)])) : !o.telt ? h('span', {class: 'w-mut', text: '◌ loopt nog, telt nog niet mee'}) : h('span', {class: 'w-st bad', text: '✕ geen WPI'})]];
    const t = telVp(rows); kop += ' — ' + meer(rows.length, 'verplichting', 'verplichtingen') + (t.y ? ', ' + t.x + ' van ' + t.y + ' uitgevoerd' : '');
    extra = h('p', {class: 'w-sm w-mut', text: 'Projectplanning is fictief. Opdrachtgever per project: ' + uniek(rows.filter((o) => o.p), (o) => o.p.opdrachtgever).join(', ') + '.'});
  } else if (d.kind === 'actie') {
    const a = D('acties').data.find(d.pred);
    rows = a ? [a] : []; kop = a ? a.actie + ' · ' + (a.status === 'Afgerond' ? '✓ Afgerond' : s.over(a) ? '✕ Over termijn' : '△ Open') : d.title;
    extra = a ? h('dl', {class: 'w-dl'}, ACTIE_VELDEN.map(([k, f]) => [h('dt', {text: k}), h('dd', {text: f(a)})]), h('dt', {text: 'WPI'}), h('dd', null, wpiKnop(a.wpi))) : null;
    rows = [];
  } else if (d.kind === 'wpi') {
    const w = D('wpis').data.find((x) => d.pred({wpi: x.nr})) || {};
    rows = D('regels').data.filter(d.pred);
    kop = (w.nr || '') + ' · ' + dat(w.datum) + ' · ' + (w.inspecteur || '') + ' — ' + meer(rows.length, 'regel', 'regels') + ' (zonder filters)';
    extra = h('dl', {class: 'w-dl w-dl2'}, [['Soort', w.soort], ['Opdrachtgever', w.opdrachtgever], ['Locatie', w.locatie], ['Project', PN(w.project || '—')], ['Product', w.product], ['Fase / taak', w.fase + (w.taken ? ' – ' + w.taken : '')], ['Monteurs', w.monteurs == null ? '—' : meer(w.monteurs, 'monteur', 'monteurs')]].map(([k, v]) => [h('dt', {text: k}), h('dd', {text: v || '—'})]));
    cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];
  } else {
    rows = B.rg.filter(d.pred);
    cols = [['WPI', (r) => wpiKnop(r.wpi)], ['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];
    kop += ' — ' + meer(rows.length, 'regel', 'regels');
  }
  const sluit = h('button', {type: 'button', class: 'w-btn', text: 'Sluiten'}); sluit.onclick = () => { W.drill = null; dash.draw('detail'); };
  const terug = d.terug && h('button', {type: 'button', class: 'w-btn', text: '← Terug'}); if (terug) terug.onclick = () => { W.drill = d.terug; dash.draw('detail'); };
  el.classList.add('w-open');
  el.replaceChildren(h('div', {class: 'w-dh'}, h('span', {text: kop}), h('span', {class: 'w-knoppen'}, terug, sluit)), extra,
    d.kind === 'actie' ? null : h('div', {class: 'w-scroll'}, rows.length ? tbl(cols, rows, cls) : h('p', {class: 'w-mut', text: 'Geen rijen binnen deze filters.'})));
});

"""
s=s[:a]+new+s[b:]
def R(x,y,n=1):
    global s
    assert s.count(x)==n,(s.count(x),x[:80]); s=s.replace(x,y)
R("""  namen.forEach((n) => dash.draw(n));
  if (link) dash.setLink(id);
};""","""  namen.forEach((n) => dash.draw(n));
  thema();
  if (link) dash.setLink(id);
};
document.querySelectorAll('.w-fold').forEach((f) => f.addEventListener('toggle', () => {
  const namen = new Set(); f.querySelectorAll('[data-draw]').forEach((e) => namen.add(e.dataset.draw)); namen.forEach((n) => dash.draw(n));
}));
document.querySelectorAll('[data-act=filters]').forEach((b) => b.addEventListener('click', () => {
  const bar = b.closest('.w-filterbar'), open = !bar.classList.contains('w-fopen');
  bar.classList.toggle('w-fopen', open); b.setAttribute('aria-expanded', String(open));
}));""")
# OORD alleen bevestigd: one coding
R("""['Geen afwijking waargenomen', 'o-gee', '○']""","""['Geen afwijking waargenomen', 'o-ab', '○']""")
open(p,'w').write(s); print('ok')
