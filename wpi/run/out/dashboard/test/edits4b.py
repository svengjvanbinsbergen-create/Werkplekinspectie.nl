p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
R("""const clk = (e, title, kind, pred) => {
  e.classList.add('w-clk'); e.setAttribute('role', 'button'); e.tabIndex = 0;
  const go = () => {
    const host = e.closest('[data-host]'), slot = host ? host.id : '';
    W.drill = {slot, title, kind, pred}; dash.draw('detail');""","""const clk = (e, title, kind, pred, alle) => {
  e.classList.add('w-clk'); e.setAttribute('role', 'button'); e.tabIndex = 0;
  const go = () => {
    const host = e.closest('[data-host]'), slot = host ? host.id : '', binnen = !!e.closest('[data-draw=detail]');
    const terug = binnen ? W.drill : null;
    W.drill = {slot, title, kind, pred, alle: alle == null ? !!(terug && terug.alle) : alle, terug}; dash.draw('detail');""")
# bars: alle-flag per segment
R("""      if (s.pred) clk(e, i.label + ' – ' + s.t, s.kind || 'regels', s.pred);""","""      if (s.pred && s.n) clk(e, i.label + ' – ' + s.t, s.kind || 'regels', s.pred, s.alle);""")
# k draw with drills
R("""dash.draw('k', (el) => {
  const k = D('kern'), row = k.status === 'ok' && k.data ? k.data.find((r) => 'k=' + r.k === el.dataset.where) : null;
  el.textContent = !row ? '—' : el.dataset.field === 'tekst' ? row.tekst : row.toon;
});""","""const kernRij = (k) => { const x = D('kern'); return x.status === 'ok' && x.data ? x.data.find((r) => r.k === k) : null; };
const peilAlle = () => (D('peildatum').data[0] || {}).peildatum || '';
const vpAlle = () => verplicht(D('projecten').data || [], D('wpis').data, peilAlle());
const zonderPw = () => { const t = vpAlle().filter((o) => o.telt && o.p); return new Set(d3.groups(t, (o) => o.project).filter(([, l]) => !l.some((o) => o.ok)).map(([k]) => k)); };
const herhSet = () => new Set(d3.groups(D('acties').data, (a) => a.bevinding).filter(([, l]) => new Set(l.map((a) => a.wpi)).size > 1).map(([b]) => b));
const klasRij = (k) => { const r = kernRij(k); return r ? r.tekst : ''; };
/* doorklikken vanaf de kerncijfers (hele periode, zonder filters) */
const KD = {
  wpis: () => ['Alle WPI’s', 'wpis', () => true], regels: () => ['Alle beoordeelde regels', 'regels', () => true],
  waar: () => ['Regels met een eigen waarneming', 'regels', WAAR], conform: () => ['Positieve bevindingen (Conform)', 'regels', is('Conform')],
  afw: () => ['Afwijkingen', 'regels', is('Afwijking')], verb: () => ['Verbeterpunten', 'regels', is('Verbeterpunt')], neg: () => ['Afwijkingen en verbeterpunten', 'regels', NEG],
  ab: () => ['Alleen bevestigd via de afsluitvraag', 'regels', ABV], nee: () => ['Niet beoordeeld of n.v.t.', 'regels', NBN],
  uitgevoerd: () => ['Uitgevoerde WPI’s', 'wpis', () => true], dir_ok: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR], d_wpis: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR],
  pw_x: () => ['Uitgevoerde verplichte WPI’s per werkplek', 'proj', (o) => o.telt && o.ok], pw_y: () => ['Alle verplichte WPI’s per werkplek tot de peildatum', 'proj', (o) => o.telt],
  pw_mis: () => ['Gemiste verplichte WPI’s per werkplek', 'proj', (o) => o.telt && !o.ok],
  pw_lang_x: () => ['Projecten langer dan een maand – uitgevoerd', 'proj', (o) => o.telt && o.ok && o.cat === 'lang'], pw_lang_y: () => ['Projecten langer dan een maand – verplicht', 'proj', (o) => o.telt && o.cat === 'lang'],
  pw_risico_x: () => ['Korte projecten met risicokenmerk – uitgevoerd', 'proj', (o) => o.telt && o.ok && o.cat === 'risico'], pw_risico_y: () => ['Korte projecten met risicokenmerk – verplicht', 'proj', (o) => o.telt && o.cat === 'risico'],
  pw_nul: () => { const z = zonderPw(); return ['Projecten zonder enige verplichte WPI', 'proj', (o) => z.has(o.project) && o.telt]; },
  pw_lop: () => ['Verplichtingen die nog lopen (tellen nog niet mee)', 'proj', (o) => !o.telt && !o.info],
  risk_a: () => { const c = klasRij('risk_a'); return ['Afwijkingen en verbeterpunten – ' + c, 'regels', (r) => r.classificatie === c && NEG(r)]; },
  risk_a_y: () => { const c = klasRij('risk_a'); return ['Waargenomen regels – ' + c, 'regels', (r) => r.classificatie === c && WAAR(r)]; },
  risk_c: () => { const c = klasRij('risk_c'); return ['Afwijkingen en verbeterpunten – ' + c, 'regels', (r) => r.classificatie === c && NEG(r)]; },
  acties: () => ['Alle acties', 'acties', () => true], open: () => ['Open acties', 'acties', (a) => a.status === 'Open'],
  over: () => { const pl = peilAlle(); return ['Open acties over de termijn', 'acties', (a) => a.status === 'Open' && a.termijn < pl]; },
  afgerond: () => ['Afgeronde acties (na toetsing)', 'acties', (a) => a.status === 'Afgerond'], telaat: () => ['Na de termijn afgeronde acties', 'acties', (a) => a.status === 'Afgerond' && a.afgerond_op > a.termijn],
  bron_insp: () => ['Acties met bron Inspectie', 'acties', (a) => a.bron === 'Inspectie'], bron_buiten: () => ['Acties met bron Buiten TRA', 'acties', (a) => a.bron === 'Buiten TRA'], bron_idee: () => ['Acties met bron Idee monteurs', 'acties', (a) => a.bron === 'Idee monteurs'],
  herh_n: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.bevinding)]; }, herh_acties: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.bevinding)]; },
  buiten: () => ['Waarnemingen buiten de TRA', 'regels', (r) => r.soort === 'Buiten TRA'], tra_neg: () => ['TRA-toetsingen met afwijking of verbeterpunt', 'regels', (r) => r.soort === 'TRA' && NEG(r)],
  tra_toets: () => ['Waargenomen TRA-toetsingen', 'regels', (r) => r.soort === 'TRA' && WAAR(r)],
};
dash.draw('k', (el) => {
  const k = el.dataset.where.slice(2), row = kernRij(k), tekst = el.dataset.field === 'tekst';
  el.textContent = !row ? '—' : tekst ? row.tekst : row.toon;
  if (row && !tekst && KD[k] && row.waarde > 0 && el.closest('[data-host]')) { const [t, kind, pred] = KD[k](); clk(el, t + ' (hele periode, zonder filters)', kind, pred, true); } else unclk(el);
});""")
R("""dash.onData(() => {
  document.querySelectorAll('.w-page').forEach((e) => e.style.setProperty('--w-s1', dash.colors[0]));
});""","""/* donker thema: fel groen dempen (alleen style op .w-page) */
const thema = () => {
  const c = document.querySelector('.w-card'); if (!c) return;
  const m = (getComputedStyle(c).backgroundColor.match(/[0-9.]+/g) || ['255', '255', '255']).map(Number), donker = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255 < 0.5;
  document.querySelectorAll('.w-page').forEach((e) => { e.style.setProperty('--w-ok', donker ? 'color-mix(in srgb,var(--color-ok) 62%,var(--color-panel))' : 'var(--color-ok)'); e.style.setProperty('--w-s1', dash.colors[0]); });
};
dash.onData(thema);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', thema);""")
R("""  if (!d) { el.textContent = '—'; unclk(el); return; }
  el.textContent = d[0];
  if (d[1]) clk(el, d[2], d[1], d[3]); else unclk(el);""","""  if (!d) { el.textContent = '—'; unclk(el); return; }
  el.textContent = d[0];
  if (d[1] && d[0] !== '0' && d[0] !== '—') clk(el, d[2], d[1], d[3]); else unclk(el);""")
# S(): projecten, classificatie -> wpis with rows
R("""  const p = dash.params() || {}, ids = ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum'];""","""  const p = dash.params() || {}, ids = ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum', 'projecten'];""")
R("""  s.rg = D('regels').data.filter(alle); s.ac = D('acties').data.filter(alle);""","""  s.rg = D('regels').data.filter(alle); s.ac = D('acties').data.filter(alle);
  if (p.classificatie) { const metRegel = new Set(s.rg.map((r) => r.wpi)); s.wp = s.wp.filter((w) => metRegel.has(w.nr)); }
  s.pj = D('projecten').data.filter(prod);
  s.vp = s.fout ? [] : verplicht(s.pj, D('wpis').data, s.peil).filter((o) => (!p.van || o.maand >= p.van) && (!p.tot || o.maand <= p.tot));""")
R("""  M.progr = NL(u) + ' van ' + NL(g) + ' geplande WPI’s' + (gem.length ? '; niet uitgevoerd: ' + gem.map((r) => mnd(r.maand) + ' – ' + r.inspecteur).join('; ') : '');""","""  M.progr = NL(u) + ' van ' + NL(g) + ' geplande WPI’s' + (gem.length ? '; niet uitgevoerd: ' + gem.map((r) => mnd(r.maand) + ' – ' + r.inspecteur).join('; ') : '');
  const tv = telVp(s.vp), tc = (c) => telVp(s.vp.filter((o) => o.cat === c));
  M.pw = tv.y ? NL(tv.x) + ' van ' + NL(tv.y) + ' verplichte WPI’s uitgevoerd (' + pc(tv.x, tv.y) + ')' : 'geen verplichte WPI’s binnen deze filters';
  M.pwd = 'langer dan een maand ' + NL(tc('lang').x) + ' van ' + NL(tc('lang').y) + ' · kort met risicokenmerk ' + NL(tc('risico').x) + ' van ' + NL(tc('risico').y) + ' · overige korte projecten ' + NL(tc('overig').x) + ' van ' + NL(tc('overig').y);
  const hg = d3.groups(s.ac, (a) => a.bevinding).filter(([, l]) => new Set(l.map((a) => a.wpi)).size > 1).sort((a, b) => b[1].length - a[1].length || d3.ascending(a[0], b[0]));
  s.herh = hg;
  M.herh = hg.length ? meer(hg.length, 'bevinding kwam', 'bevindingen kwamen') + ' in meer dan één WPI terug; vaakst: ' + zp(hg[0][0]) + ' (' + hg[0][1].length + '×)' : 'geen bevinding kwam in meer dan één WPI terug';""")
open(p,'w').write(s); print('ok')
