const W = window.WPI = {drill: null, dim: 'product', traAll: false};
const D = (id) => dash.data(id);
const EOL = String.fromCharCode(10);
const NL = (v, d = 0) => v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('nl-NL', {minimumFractionDigits: d, maximumFractionDigits: d});
const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dat = (s) => s ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : '—';
const mnd = (m) => MND[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const kw = (m) => 'Q' + Math.ceil(+m.slice(5, 7) / 3) + ' ' + m.slice(0, 4);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const NEG = (r) => r.oordeel === 'Afwijking' || r.oordeel === 'Verbeterpunt';
const is = (x) => (r) => r.oordeel === x;
const cnt = (rows, key) => d3.rollups(rows, (v) => v.length, key).sort((a, b) => b[1] - a[1] || d3.ascending(a[0], b[0]));
const r1 = (x) => Math.round(x * 10) / 10;
const DIR = 'VGM-inspectie directie';
const OORD = [['Conform', 'o-con', '✓'], ['Geen afwijking waargenomen', 'o-gee', '○'], ['Verbeterpunt', 'o-ver', '△'], ['Afwijking', 'o-afw', '✕'], ['Niet beoordeeld', 'o-nb', '?'], ['Niet van toepassing', 'o-nvt', '–']];

dash.calc('kern', {
  title: 'Kerncijfers hele periode',
  description: `Tellingen en verhoudingen over alle voorbeeld-WPI's, zonder filters; bron van de conclusie bovenaan.`,
  inputs: ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum'],
  fn: (wpis, regels, acties, programma, kennisbank, peildatum) => {
    const uit = [], zet = (k, waarde, tekst = '', dec = 0) => uit.push({k, waarde, toon: NL(waarde, dec), tekst});
    const peil = peildatum[0] ? peildatum[0].peildatum : '';
    zet('peil', 0, dat(peil));
    const gepland = d3.sum(programma, (p) => +p.gepland), uitgevoerd = d3.sum(programma, (p) => +p.uitgevoerd);
    zet('wpis', wpis.length); zet('gepland', gepland); zet('uitgevoerd', uitgevoerd);
    zet('progr_pct', gepland ? Math.round(100 * uitgevoerd / gepland) : 0);
    const gemist = programma.filter((p) => +p.uitgevoerd < +p.gepland);
    zet('gemist', d3.sum(gemist, (p) => p.gepland - p.uitgevoerd), gemist.map((p) => mnd(p.maand) + ' – ' + p.inspecteur).join('; ') || 'geen');
    const maanden = [...new Set(wpis.map((w) => w.maand))].sort();
    const kwartalen = new Set(maanden.map(kw)); if (peil) kwartalen.add(kw(peil));
    const dirKw = new Set(wpis.filter((w) => w.soort === DIR).map((w) => kw(w.maand)));
    zet('dir_ok', [...kwartalen].filter((q) => dirKw.has(q)).length); zet('dir_tot', kwartalen.size);
    const n = (f) => regels.filter(f).length, neg = n(NEG);
    zet('regels', regels.length); zet('conform', n(is('Conform'))); zet('afw', n(is('Afwijking'))); zet('verb', n(is('Verbeterpunt')));
    zet('neg', neg); zet('nb', n(is('Niet beoordeeld'))); zet('ratio', neg ? r1(n(is('Conform')) / neg) : 0, '', 1);
    const perKw = d3.rollups(regels, (v) => r1(v.filter(NEG).length / new Set(v.map((r) => r.wpi)).size), (r) => kw(r.maand));
    const kwVolg = [...new Set([...regels].sort((a, b) => d3.ascending(a.maand, b.maand)).map((r) => kw(r.maand)))];
    const kwW = (q) => (perKw.find((x) => x[0] === q) || [0, 0])[1];
    zet('trend_eerste', kwW(kwVolg[0]), kwVolg[0] || '—', 1); zet('trend_laatste', kwW(kwVolg[kwVolg.length - 1]), kwVolg[kwVolg.length - 1] || '—', 1);
    const wg = (x) => (r) => r.waargenomen === x, pc = (a, b) => b ? Math.round(100 * a / b) : 0;
    zet('ja', n(wg('Ja'))); zet('ja_pct', pc(n(wg('Ja')), regels.length)); zet('ab', n(wg('Alleen bevestigd'))); zet('ab_pct', pc(n(wg('Alleen bevestigd')), regels.length)); zet('nee', n(wg('Nee')));
    const laag = d3.rollups(regels, (v) => pc(v.filter(wg('Ja')).length, v.length), (r) => r.inspecteur).sort((a, b) => a[1] - b[1] || d3.ascending(a[0], b[0]))[0];
    zet('ja_laag', laag ? laag[1] : 0, laag ? laag[0] : '—');
    const abt = cnt(regels.filter(wg('Alleen bevestigd')), (r) => r.soort === 'TRA' ? r.ref : r.omschrijving)[0];
    zet('ab_top', abt ? abt[1] : 0, abt ? abt[0] : '—');
    const top = cnt(regels.filter(NEG), (r) => r.classificatie);
    [0, 1, 2].forEach((i) => zet('top' + (i + 1), top[i] ? top[i][1] : 0, top[i] ? top[i][0] : '—'));
    const tra = regels.filter((r) => r.soort === 'TRA');
    zet('tra_getoetst', tra.filter((r) => r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing').length);
    zet('tra_neg', tra.filter(NEG).length);
    const rang = d3.rollups(tra.filter((r) => r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing'), (v) => [v.filter(NEG).length, v.length, v.filter(is('Afwijking')).length], (r) => r.ref)
      .filter((x) => x[1][0]).sort((a, b) => b[1][0] - a[1][0] || b[1][0] / b[1][1] - a[1][0] / a[1][1] || b[1][2] - a[1][2] || d3.ascending(a[0], b[0]));
    zet('tra_herhaald', rang.filter((x) => x[1][0] > 1).length);
    zet('tra_top', rang[0] ? rang[0][1][0] : 0, rang[0] ? rang[0][0] : '—'); zet('tra_top_y', rang[0] ? rang[0][1][1] : 0);
    const alg = cnt(regels.filter((r) => r.soort === 'Algemeen' && NEG(r)), (r) => r.omschrijving)[0];
    zet('alg_top', alg ? alg[1] : 0, alg ? alg[0] : '—');
    const nb = cnt(regels.filter(is('Niet beoordeeld')), (r) => r.soort === 'TRA' ? r.ref : r.omschrijving)[0];
    zet('nb_top', nb ? nb[1] : 0, nb ? nb[0] : '—');
    const prod = new Map(kennisbank.map((x) => [x.code, x.product])), gezien = new Set(wpis.map((w) => w.code));
    const niet = [...prod].filter(([c]) => !gezien.has(c)).map(([, p]) => p).sort(d3.ascending);
    zet('prod_tot', prod.size); zet('prod_niet', niet.length, niet.join(', ') || 'geen');
    const buiten = regels.filter((r) => r.soort === 'Buiten TRA'), bt = cnt(buiten, (r) => r.omschrijving)[0];
    zet('buiten', buiten.length); zet('buiten_top', bt ? bt[1] : 0, bt ? bt[0] : '—');
    const open = acties.filter((a) => a.status === 'Open'), klaar = acties.filter((a) => a.status === 'Afgerond');
    const over = open.filter((a) => a.termijn < peil).sort((a, b) => d3.ascending(a.termijn, b.termijn));
    zet('acties', acties.length); zet('open', open.length); zet('afgerond', klaar.length); zet('over', over.length);
    zet('over_oudste', over[0] ? days(over[0].termijn, peil) : 0, over[0] ? over[0].actie : '—');
    zet('telaat', klaar.filter((a) => a.afgerond_op > a.termijn).length);
    zet('doorloop', klaar.length ? r1(d3.mean(klaar, (a) => days(a.datum, a.afgerond_op))) : 0, '', 1);
    const direct = acties.filter((a) => a.direct_gecorrigeerd).length;
    zet('idee', acties.filter((a) => a.bron === 'Idee monteurs').length); zet('direct', direct); zet('direct_pct', acties.length ? Math.round(100 * direct / acties.length) : 0);
    [['c', (r) => r.soort_inspectie !== DIR], ['d', (r) => r.soort_inspectie === DIR]].forEach(([p, f]) => {
      const rr = regels.filter(f), w = new Set(rr.map((r) => r.wpi)).size;
      zet(p + '_neg', w ? r1(rr.filter(NEG).length / w) : 0, '', 1);
      zet(p + '_nb', rr.length ? Math.round(100 * rr.filter(is('Niet beoordeeld')).length / rr.length) : 0);
    });
    return uit;
  },
});

/* ---------- hulpjes ---------- */
const h = (tag, attrs, ...kids) => {
  const e = document.createElementNS(/^(svg|g|path|circle|line|rect|text)$/.test(tag) ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(9).filter((x) => x != null && x !== false));
  return e;
};
const clk = (e, title, kind, pred) => {
  e.classList.add('w-clk'); e.setAttribute('role', 'button'); e.tabIndex = 0;
  const go = () => {
    const sec = e.closest('section'), slot = sec ? sec.id : '';
    W.drill = {slot, title, kind, pred}; dash.draw('detail');
    setTimeout(() => { const d = document.querySelector('[data-draw=detail][data-slot=' + slot + ']'); if (d) d.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }, 60);
  };
  e.onclick = go; e.onkeydown = (v) => { if (v.key === 'Enter' || v.key === ' ') { v.preventDefault(); go(); } };
  return e;
};
const unclk = (e) => { e.classList.remove('w-clk'); e.removeAttribute('role'); e.removeAttribute('tabindex'); e.onclick = e.onkeydown = null; };
const tipper = (el) => {
  const t = h('div', {class: 'w-tip', role: 'status'}); el.append(t);
  return (node, text) => {
    const show = (ev) => {
      t.textContent = text; t.classList.add('w-on');
      const b = el.getBoundingClientRect(), nb = node.getBoundingClientRect();
      const x = (ev && ev.clientX != null && ev.clientX ? ev.clientX : nb.left + nb.width / 2) - b.left, y = nb.top - b.top;
      t.style.left = Math.max(0, Math.min(x - t.offsetWidth / 2, el.clientWidth - t.offsetWidth)) + 'px';
      t.style.top = Math.max(0, y - t.offsetHeight - 6) + 'px';
    };
    node.addEventListener('pointerenter', show); node.addEventListener('pointermove', show); node.addEventListener('focus', show);
    node.addEventListener('pointerleave', () => t.classList.remove('w-on')); node.addEventListener('blur', () => t.classList.remove('w-on'));
    return node;
  };
};
const badge = (o) => { const x = OORD.find((q) => q[0] === o) || [o, 'o-nvt', '·']; return h('span', {class: 'w-badge'}, h('i', {class: 'w-sw ' + x[1]}), x[2] + ' ' + o); };
const tbl = (cols, rows, cards) => h('table', {class: 'w-tbl' + (cards ? ' w-cards' : '')},
  h('thead', null, h('tr', null, cols.map((c) => h('th', {class: c[2] ? 'w-num' : null, text: c[0]})))),
  h('tbody', null, rows.map((r) => h('tr', null, cols.map((c) => { const v = c[1](r); return h('td', {class: c[2] ? 'w-num' : null, 'data-l': c[0]}, v instanceof Node ? v : String(v == null || v === '' ? '—' : v)); })))));
const leeg = (el, s) => { el.replaceChildren(h('p', {class: 'w-mut', text: s.ok ? 'Geen gegevens binnen deze filters.' : '—'})); };
const bars = (el, items, tip, max) => {
  const mx = max || d3.max(items, (i) => d3.sum(i.segs, (s) => s.n)) || 1;
  return h('div', {class: 'w-bars'}, items.map((i) => h('div', {class: 'w-bar'},
    h('div', {class: 'w-bl'}, h('span', {text: i.label}), i.sub && h('small', {text: i.sub})),
    h('div', {class: 'w-bt'}, i.segs.filter((s) => s.n > 0).map((s) => {
      const e = h('span', {class: 'w-seg ' + s.c, style: 'width:' + (100 * s.n / (i.tot || mx)) + '%', 'aria-label': i.label + ' – ' + s.t + ': ' + NL(s.n, s.d || 0)});
      if (s.pred) clk(e, i.label + ' – ' + s.t, s.kind || 'regels', s.pred);
      return tip(e, i.label + '' + EOL + '' + s.t + ': ' + NL(s.n, s.d || 0));
    })),
    h('div', {class: 'w-bv', text: i.val}))));
};

/* ---------- gefilterde gegevens ---------- */
let memo = {};
const S = () => {
  const p = dash.params() || {}, ids = ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum'];
  const key = JSON.stringify(p) + ids.map((i) => D(i).status + (D(i).data || []).length).join();
  if (memo.key === key) return memo.s;
  const per = (r) => (!p.van || r.maand >= p.van) && (!p.tot || r.maand <= p.tot), ins = (r) => !p.inspecteur || r.inspecteur === p.inspecteur;
  const prod = (r) => !p.product || r.product === p.product, cls = (r) => !p.classificatie || r.classificatie === p.classificatie;
  const s = {p, ok: ids.every((i) => D(i).status === 'ok')};
  const alle = (r) => per(r) && ins(r) && prod(r) && cls(r);
  s.peil = (D('peildatum').data[0] || {}).peildatum || '';
  s.wp0 = D('wpis').data.filter((r) => per(r) && ins(r)); s.wp = s.wp0.filter(prod);
  s.rg0 = D('regels').data.filter((r) => per(r) && ins(r));
  s.rg = D('regels').data.filter(alle); s.ac = D('acties').data.filter(alle);
  s.pr = D('programma').data.filter((r) => per(r) && ins(r)); s.kb = D('kennisbank').data;
  const open = (a) => a.status === 'Open', klaar = (a) => a.status === 'Afgerond';
  s.over = (a) => open(a) && a.termijn < s.peil;
  const laat = (a) => klaar(a) && a.afgerond_op > a.termijn, direct = (a) => !!a.direct_gecorrigeerd;
  const N = (a, f) => a.filter(f).length, pct = (a, b) => b ? NL(100 * a / b) + '%' : '—', per1 = (a, b) => b ? NL(a / b, 1) : '—';
  const T = s.t = {}, t = (k, txt, kind, title, pred) => { T[k] = [txt, kind, title, pred]; };
  const g = d3.sum(s.pr, (r) => +r.gepland), u = d3.sum(s.pr, (r) => +r.uitgevoerd);
  t('progr', p.product ? NL(s.wp.length) : NL(u) + ' / ' + NL(g), 'wpis', `Uitgevoerde WPI's`, () => true);
  t('regels', NL(s.rg.length), 'regels', 'Alle beoordeelde regels', () => true);
  const pos = N(s.rg, is('Conform')), neg = N(s.rg, NEG);
  t('pos', NL(pos), 'regels', 'Positieve bevindingen (Conform)', is('Conform'));
  t('afw', NL(N(s.rg, is('Afwijking'))), 'regels', 'Afwijkingen', is('Afwijking'));
  t('verb', NL(N(s.rg, is('Verbeterpunt'))), 'regels', 'Verbeterpunten', is('Verbeterpunt'));
  t('ratio', per1(pos, neg));
  const wg = (x) => (r) => r.waargenomen === x, idee = (a) => a.bron === 'Idee monteurs';
  t('ja', NL(N(s.rg, wg('Ja'))), 'regels', 'Waargenomen (eigen waarneming)', wg('Ja'));
  t('ja_pct', pct(N(s.rg, wg('Ja')), s.rg.length));
  t('ab', NL(N(s.rg, wg('Alleen bevestigd'))), 'regels', 'Alleen bevestigd via de afsluitvraag', wg('Alleen bevestigd'));
  t('nee', NL(N(s.rg, wg('Nee'))), 'regels', 'Niet beoordeeld of n.v.t.', wg('Nee'));
  t('idee', NL(N(s.ac, idee)), 'acties', 'Acties uit ideeën van monteurs', idee);
  t('acties', NL(s.ac.length), 'acties', 'Alle acties', () => true);
  t('open', NL(N(s.ac, open)), 'acties', 'Open acties', open);
  t('over', NL(N(s.ac, s.over)), 'acties', 'Open acties over de termijn', s.over);
  t('afgerond', NL(N(s.ac, klaar)), 'acties', 'Afgeronde acties', klaar);
  t('telaat', NL(N(s.ac, laat)), 'acties', 'Na de termijn afgeronde acties', laat);
  const dl = s.ac.filter(klaar).map((a) => days(a.datum, a.afgerond_op));
  t('doorloop', dl.length ? NL(d3.mean(dl), 1) : '—', 'acties', 'Afgeronde acties', klaar);
  t('mediaan', dl.length ? NL(d3.median(dl), 1) : '—');
  t('direct', NL(N(s.ac, direct)), 'acties', 'Direct gecorrigeerde acties', direct);
  t('direct_pct', pct(N(s.ac, direct), s.ac.length));
  [['c', (r) => (r.soort_inspectie || r.soort) !== DIR, 'WPI coördinator'], ['d', (r) => (r.soort_inspectie || r.soort) === DIR, DIR]].forEach(([k, f, naam]) => {
    const w = s.wp.filter(f), r = s.rg.filter(f), a = s.ac.filter(f), and = (q) => (x) => f(x) && q(x);
    t(k + '_wpis', NL(w.length), 'wpis', naam, f);
    t(k + '_rpw', per1(r.length, w.length), 'regels', naam + ' – alle regels', f);
    t(k + '_pos', pct(N(r, is('Conform')), r.length), 'regels', naam + ' – Conform', and(is('Conform')));
    t(k + '_afw', per1(N(r, is('Afwijking')), w.length), 'regels', naam + ' – afwijkingen', and(is('Afwijking')));
    t(k + '_verb', per1(N(r, is('Verbeterpunt')), w.length), 'regels', naam + ' – verbeterpunten', and(is('Verbeterpunt')));
    t(k + '_nb', pct(N(r, is('Niet beoordeeld')), r.length), 'regels', naam + ' – niet beoordeeld', and(is('Niet beoordeeld')));
    t(k + '_ja', pct(N(r, wg('Ja')), r.length), 'regels', naam + ' – waargenomen', and(wg('Ja')));
    t(k + '_buiten', NL(N(r, (x) => x.soort === 'Buiten TRA')), 'regels', naam + ' – Buiten TRA', and((x) => x.soort === 'Buiten TRA'));
    t(k + '_direct', pct(N(a, direct), a.length), 'acties', naam + ' – direct gecorrigeerd', and(direct));
  });
  memo = {key, s};
  return s;
};

/* ---------- tekeningen ---------- */
dash.draw('k', (el) => {
  const k = D('kern'), row = k.status === 'ok' && k.data ? k.data.find((r) => 'k=' + r.k === el.dataset.where) : null;
  el.textContent = !row ? '—' : el.dataset.field === 'tekst' ? row.tekst : row.toon;
});
dash.onData(() => {
  document.querySelectorAll('.w-page').forEach((e) => e.style.setProperty('--w-s1', dash.colors[0]));
  const k = D('kern'); if (k.status !== 'ok' || !k.data) return;
  document.querySelectorAll('[data-if]').forEach((li) => { const r = k.data.find((x) => x.k === li.dataset.if); li.hidden = !!r && !r.waarde; });
});
dash.draw('t', (el) => {
  const s = S(), d = s.ok && s.t[el.dataset.t];
  if (!d) { el.textContent = '—'; unclk(el); return; }
  el.textContent = d[0];
  if (d[1]) clk(el, d[2], d[1], d[3]); else unclk(el);
});

const kies = (naam, param, leegTekst, opties) => dash.draw(naam, (sel) => {
  const s = S(), o = s.ok ? opties(s) : [];
  sel.replaceChildren(new Option(leegTekst, ''), ...o.map((x) => Array.isArray(x) ? new Option(x[1], x[0]) : new Option(x)));
  sel.value = s.p[param] || '';
  sel.onchange = () => { W.drill = null; dash.setParams({[param]: sel.value}); };
});
const uniek = (rows, f) => [...new Set(rows.map(f))].sort(d3.ascending);
kies('f-van', 'van', 'Begin', () => uniek(D('wpis').data, (r) => r.maand).map((m) => [m, mnd(m)]));
kies('f-tot', 'tot', 'Einde', () => uniek(D('wpis').data, (r) => r.maand).map((m) => [m, mnd(m)]));
kies('f-product', 'product', 'Alle producten', () => uniek(D('wpis').data, (r) => r.product));
kies('f-inspecteur', 'inspecteur', 'Alle inspecteurs', () => uniek(D('wpis').data, (r) => r.inspecteur));
kies('f-classificatie', 'classificatie', 'Alle classificaties', () => uniek(D('regels').data, (r) => r.classificatie));
dash.draw('f-actief', (el) => {
  const s = S(); if (!s.ok) { el.textContent = '—'; return; }
  const p = s.p, f = [(p.van || p.tot) && (p.van ? mnd(p.van) : 'begin') + ' t/m ' + (p.tot ? mnd(p.tot) : 'einde'), p.product, p.inspecteur, p.classificatie].filter(Boolean);
  el.textContent = NL(s.wp.length) + ` WPI's, ` + NL(s.rg.length) + ' regels, ' + NL(s.ac.length) + ' acties' + (f.length ? ' (filter: ' + f.join(' · ') + ')' : ' (geen filter)');
});
document.querySelectorAll('[data-act=reset]').forEach((b) => b.addEventListener('click', () => { W.drill = null; dash.resetParams(); }));
document.querySelectorAll('[data-dim]').forEach((b) => b.addEventListener('click', () => {
  W.dim = b.dataset.dim;
  document.querySelectorAll('[data-dim]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  dash.draw('dim');
}));

dash.draw('progr', (el) => {
  const s = S(); if (!s.ok || !s.pr.length) return leeg(el, s);
  const ms = uniek(s.pr, (r) => r.maand), insp = uniek(s.pr, (r) => r.inspecteur);
  const cel = (rows, title, pred) => {
    const g = d3.sum(rows, (r) => +r.gepland), u = d3.sum(rows, (r) => +r.uitgevoerd);
    if (!g && !u) return h('span', {class: 'w-mut', text: '·'});
    return clk(h('span', {class: 'w-st ' + (u >= g ? 'ok' : 'bad'), text: (u >= g ? '✓ ' : '✕ ') + u + '/' + g}), title, 'wpis', pred);
  };
  el.replaceChildren(h('table', {class: 'w-tbl'},
    h('thead', null, h('tr', null, h('th', {text: 'Inspecteur'}), ms.map((m) => h('th', {class: 'w-num', text: mnd(m)})), h('th', {class: 'w-num', text: 'Totaal'}))),
    h('tbody', null, insp.map((i) => h('tr', null, h('td', {text: i}),
      ms.map((m) => h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.maand === m && r.inspecteur === i), i + ' – ' + mnd(m), (w) => w.maand === m && w.inspecteur === i))),
      h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.inspecteur === i), i, (w) => w.inspecteur === i)))),
    h('tr', null, h('td', null, h('b', {text: 'Totaal'})), ms.map((m) => h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.maand === m), mnd(m), (w) => w.maand === m))),
      h('td', {class: 'w-num'}, cel(s.pr, `Alle WPI's`, () => true))))));
});
dash.draw('kwart', (el) => {
  const s = S(); if (!s.ok) return leeg(el, s);
  const p = s.p, lo = p.van || d3.min(D('wpis').data, (r) => r.maand), hi = p.tot || s.peil.slice(0, 7), qs = [];
  for (let y = +lo.slice(0, 4), m = +lo.slice(5, 7); y * 12 + m <= +hi.slice(0, 4) * 12 + +hi.slice(5, 7); m === 12 ? (y++, m = 1) : m++) { const q = kw(y + '-' + String(m).padStart(2, '0')); if (!qs.includes(q)) qs.push(q); }
  const dir = D('wpis').data.filter((w) => w.soort === DIR && (!p.van || w.maand >= p.van) && (!p.tot || w.maand <= p.tot));
  el.replaceChildren(...qs.map((q) => {
    const n = dir.filter((w) => kw(w.maand) === q).length;
    const c = h('div', {class: 'w-chip' + (n ? '' : ' w-no')}, h('b', {text: q}), h('span', {class: 'w-st ' + (n ? 'ok' : 'bad'), text: (n ? '✓ ' : '✕ ') + n + ' directie-inspectie' + (n === 1 ? '' : 's')}), h('small', {text: 'norm: minimaal 1'}));
    return n ? clk(c, 'Directie-inspecties ' + q, 'wpis', (w) => w.soort === DIR && kw(w.maand) === q) : c;
  }));
});

dash.draw('maand', (el) => {
  const s = S(); if (!s.ok || !s.rg.length) return leeg(el, s);
  const ms = uniek(s.rg, (r) => r.maand), per = (m) => s.rg.filter((r) => r.maand === m), mx = d3.max(ms, (m) => per(m).length);
  const box = h('div', {class: 'w-cols', role: 'group', 'aria-label': 'Gestapelde kolommen: aantal regels per oordeel per maand'});
  el.replaceChildren(box, h('div', {class: 'w-colx'}, ms.map((m) => { const r = per(m); return h('div', null, mnd(m), h('small', {text: new Set(r.map((x) => x.wpi)).size + ' WPI · ✓' + r.filter(is('Conform')).length + ' ✕△' + r.filter(NEG).length})); })));
  const tip = tipper(el);
  ms.forEach((m) => {
    const r = per(m), col = h('div', {class: 'w-col'}, h('em', {text: r.length}));
    [...OORD].reverse().forEach(([o, c]) => {
      const n = r.filter(is(o)).length; if (!n) return;
      col.append(tip(clk(h('span', {class: 'w-seg ' + c, style: 'height:' + (88 * n / mx) + '%', 'aria-label': mnd(m) + ' ' + o + ': ' + n}), mnd(m) + ' – ' + o, 'regels', (x) => x.maand === m && x.oordeel === o), mnd(m) + '' + EOL + '' + o + ': ' + n + ' van ' + r.length));
    });
    box.append(col);
  });
});

dash.draw('trend', (el) => {
  const s = S(), rg = s.rg.filter((r) => r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing');
  if (!s.ok || !rg.length) return leeg(el, s);
  const pts = uniek(rg, (r) => r.maand).map((m) => { const r = rg.filter((x) => x.maand === m); return {m, n: r.length, pos: 100 * r.filter(is('Conform')).length / r.length, neg: 100 * r.filter(NEG).length / r.length}; });
  const w = Math.max(260, el.clientWidth), ht = 230, mg = {t: 14, r: 50, b: 26, l: 46};
  const x = d3.scalePoint().domain(pts.map((d) => d.m)).range([mg.l, w - mg.r]).padding(0.3), y = d3.scaleLinear().domain([0, 100]).range([ht - mg.b, mg.t]);
  const svg = h('svg', {class: 'w-svg', viewBox: '0 0 ' + w + ' ' + ht, width: '100%', role: 'img', 'aria-label': 'Lijngrafiek: aandeel Conform en aandeel afwijking plus verbeterpunt per maand, in procenten'});
  [0, 25, 50, 75, 100].forEach((v) => svg.append(h('line', {x1: mg.l, x2: w - mg.r, y1: y(v), y2: y(v), stroke: 'var(--cds-chart-grid,var(--color-border-line))'}), h('text', {x: mg.l - 6, y: y(v) + 4, 'text-anchor': 'end', text: v + '%'})));
  const stap = Math.ceil(pts.length / Math.max(1, Math.floor((w - mg.l - mg.r) / 62)));
  pts.forEach((d, i) => { if (i % stap === 0) svg.append(h('text', {x: x(d.m), y: ht - 6, 'text-anchor': 'middle', text: mnd(d.m).slice(0, 3) + ' ’' + d.m.slice(2, 4)})); });
  const lijn = (k, kleur, dash_) => {
    svg.append(h('path', {d: d3.line().x((d) => x(d.m)).y((d) => y(d[k]))(pts), fill: 'none', stroke: kleur, 'stroke-width': 2, 'stroke-dasharray': dash_}));
    pts.forEach((d) => svg.append(h('circle', {cx: x(d.m), cy: y(d[k]), r: 4, fill: kleur, stroke: 'var(--color-panel)', 'stroke-width': 2})));
  };
  lijn('pos', 'var(--color-ok)', null); lijn('neg', 'var(--color-bad)', '6 4');
  const l = pts[pts.length - 1], dy = Math.abs(y(l.pos) - y(l.neg)) < 14 ? (l.pos >= l.neg ? -8 : 8) : 0;
  svg.append(h('text', {class: 'w-val', x: x(l.m) + 9, y: y(l.pos) + 4 + dy, text: '✓ ' + NL(l.pos) + '%'}), h('text', {class: 'w-val', x: x(l.m) + 9, y: y(l.neg) + 4 - dy, text: '✕ ' + NL(l.neg) + '%'}));
  el.replaceChildren(svg); const tip = tipper(el), bw = (w - mg.l - mg.r) / pts.length;
  pts.forEach((d) => svg.append(tip(clk(h('rect', {x: x(d.m) - bw / 2, y: mg.t, width: bw, height: ht - mg.t - mg.b, fill: 'transparent', 'aria-label': mnd(d.m)}), mnd(d.m) + ' – regels met een oordeel', 'regels', (r) => r.maand === d.m && r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing'),
    mnd(d.m) + '' + EOL + '✓ Conform: ' + NL(d.pos) + '%' + EOL + '✕ Afwijking + verbeterpunt: ' + NL(d.neg) + '%' + EOL + '' + d.n + ' regels met een oordeel')));
});

dash.draw('diep', (el) => {
  const s = S(); if (!s.ok || !s.rg.length) return leeg(el, s);
  const by = el.dataset.by, soorten = [['Ja', 'o-ja', 'Waargenomen'], ['Alleen bevestigd', 'o-ab', 'Alleen bevestigd'], ['Nee', 'o-nb', 'Niet beoordeeld of n.v.t.']];
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(el, d3.groups(s.rg, (r) => r[by]).sort((a, b) => d3.ascending(a[0], b[0])).map(([k, v]) => {
    const c = soorten.map(([w]) => v.filter((r) => r.waargenomen === w).length);
    return {label: by === 'maand' ? mnd(k) : k, sub: v.length + ' regels', tot: v.length, val: '● ' + NL(100 * c[0] / v.length) + '% · ◐ ' + NL(100 * c[1] / v.length) + '% · ? ' + NL(100 * c[2] / v.length) + '%',
      segs: soorten.map(([w, cl, t], i) => ({n: c[i], c: cl, t, pred: (r) => r[by] === k && r.waargenomen === w}))};
  }), tip));
});

const negSegs = (rows, pred) => [
  {n: rows.filter(is('Afwijking')).length, c: 'o-afw', t: 'Afwijking', pred: (r) => pred(r) && r.oordeel === 'Afwijking'},
  {n: rows.filter(is('Verbeterpunt')).length, c: 'o-ver', t: 'Verbeterpunt', pred: (r) => pred(r) && r.oordeel === 'Verbeterpunt'}];
dash.draw('class', (el) => {
  const s = S(); if (!s.ok || !s.rg.length) return leeg(el, s);
  el.replaceChildren(); const tip = tipper(el);
  const items = d3.groups(s.rg, (r) => r.classificatie).map(([c, rows]) => {
    const f = (r) => r.classificatie === c, a = rows.filter(is('Afwijking')).length, v = rows.filter(is('Verbeterpunt')).length, p = rows.filter(is('Conform')).length;
    return {label: c, sub: rows.length + ' regels beoordeeld', o: a + v, a, val: '✕ ' + a + ' · △ ' + v + ' · ✓ ' + p,
      segs: [...negSegs(rows, f), {n: p, c: 'o-con', t: 'Conform (positief)', pred: (r) => f(r) && r.oordeel === 'Conform'}]};
  }).sort((x, y) => y.o - x.o || y.a - x.a || d3.ascending(x.label, y.label));
  el.prepend(bars(el, items, tip));
});

dash.draw('tra', (el) => {
  const s = S(), tra = s.rg.filter((r) => r.soort === 'TRA');
  if (!s.ok || !tra.filter(NEG).length) return leeg(el, s);
  const kb = new Map(s.kb.map((k) => [k.id, k]));
  const lijst = d3.groups(tra.filter((r) => r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing'), (r) => r.ref).map(([id, rows]) => ({id, rows, a: rows.filter(is('Afwijking')).length, v: rows.filter(is('Verbeterpunt')).length, k: kb.get(id) || {}}))
    .filter((x) => x.a + x.v).sort((x, y) => (y.a + y.v) - (x.a + x.v) || (y.a + y.v) / y.rows.length - (x.a + x.v) / x.rows.length || y.a - x.a || d3.ascending(x.id, y.id));
  const mx = lijst[0].a + lijst[0].v, toon = W.traAll ? lijst : lijst.slice(0, 8);
  el.replaceChildren(
    h('p', {class: 'w-sm'}, h('b', {text: NL(lijst.length)}), ' TRA-regels met een afwijking of verbeterpunt; de vaakst afwijkende regel komt ', h('b', {text: NL(mx)}), ' keer voor.',
      mx === 1 && ` Elke TRA-regel is in deze gegevens hooguit één keer afgeweken, dus de volgorde is: eerst afwijkingen, dan verbeterpunten. Een echte ranglijst ontstaat pas bij meer WPI's op dezelfde taak.`),
    h('div', {class: 'w-items'}, toon.map((x) => h('details', {class: 'w-item'},
      h('summary', null, h('b', {text: x.id + ' · ' + (x.k.product || x.rows[0].product) + ' — ' + (x.a + x.v) + ' van ' + x.rows.length + ' keer'}),
        h('span', {class: 'w-sm', text: (x.a + x.v) + ' keer afwijkend of verbeterpunt (✕ ' + x.a + ' · △ ' + x.v + ') van ' + x.rows.length + ' keer getoetst · ' + x.rows[0].classificatie}),
        h('span', {class: 'w-sm w-mut', text: (x.k.risico || x.rows[0].omschrijving).slice(0, 140) + ((x.k.risico || '').length > 140 ? '…' : '')})),
      h('p', {class: 'w-sm'}, h('b', {text: 'Fase: '}), x.k.fase || '—', h('br'), h('b', {text: 'Taak: '}), x.k.taak || '—'),
      h('p', {class: 'w-sm'}, h('b', {text: 'Risico: '}), x.k.risico || x.rows[0].omschrijving),
      h('p', {class: 'w-sm'}, h('b', {text: 'Maatregelen uit de TRA:'})),
      h('ul', {class: 'w-sm'}, (x.k.maatregelen || '').split(' | ').filter(Boolean).map((m) => h('li', {text: m}))),
      clk(h('span', {class: 'w-sm', text: 'Toon de onderliggende regels'}), 'TRA-regel ' + x.id, 'regels', (r) => r.ref === x.id)))),
    lijst.length > 8 && (() => { const b = h('button', {type: 'button', class: 'w-btn', style: 'margin-top:.6em', text: W.traAll ? 'Toon alleen de eerste 8' : 'Toon alle ' + lijst.length}); b.onclick = () => { W.traAll = !W.traAll; dash.draw('tra'); }; return b; })());
});

dash.draw('dim', (el) => {
  const s = S(), neg = s.rg.filter(NEG); if (!s.ok || !neg.length) return leeg(el, s);
  const dim = W.dim, rows = dim === 'taak' ? neg.filter((r) => r.taak) : neg;
  const key = dim === 'product' ? (r) => r.product : dim === 'fase' ? (r) => r.product + ' – ' + r.fase : (r) => r.product + ' – ' + r.taak;
  el.replaceChildren(); const tip = tipper(el);
  const items = d3.groups(rows, key).map(([k, v]) => {
    const w = new Set(v.map((r) => r.wpi)).size, alle = s.rg.filter((r) => key(r) === k && (dim !== 'taak' || r.taak));
    return {label: k, sub: w + ' WPI' + (w === 1 ? '' : `'s`) + ' · ' + alle.length + ' regels beoordeeld', o: v.length, val: '✕ ' + v.filter(is('Afwijking')).length + ' · △ ' + v.filter(is('Verbeterpunt')).length, segs: negSegs(v, (r) => key(r) === k && (dim !== 'taak' || r.taak))};
  }).sort((x, y) => y.o - x.o || d3.ascending(x.label, y.label)).slice(0, 12);
  el.prepend(bars(el, items, tip));
  if (dim === 'taak') el.append(h('p', {class: 'w-sm w-mut', text: 'Alleen TRA-regels hebben een taak; algemene onderwerpen en Buiten TRA tellen hier niet mee. Maximaal 12 regels getoond.'}));
});

dash.draw('nb', (el) => {
  const ab = (r) => r.waargenomen === 'Alleen bevestigd', nbo = is('Niet beoordeeld');
  const s = S(), nb = s.rg.filter((r) => ab(r) || nbo(r)); if (!s.ok || !nb.length) return leeg(el, s);
  const key = (r) => r.soort === 'TRA' ? r.ref + ' · ' + r.product : r.ref + ' · ' + r.omschrijving;
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(el, cnt(nb, key).slice(0, 12).map(([k, n]) => {
    const alle = s.rg.filter((r) => key(r) === k);
    return {label: k, tot: alle.length, val: n + ' van ' + alle.length, segs: [
      {n: alle.filter(ab).length, c: 'o-ab', t: 'Alleen bevestigd', pred: (r) => key(r) === k && ab(r)},
      {n: alle.filter(nbo).length, c: 'o-nb', t: 'Niet beoordeeld', pred: (r) => key(r) === k && nbo(r)}]};
  }), tip));
});

dash.draw('prod', (el) => {
  const s = S(); if (!s.ok) return leeg(el, s);
  const tot = d3.rollup(s.kb, (v) => v.length, (k) => k.product), oord = (r) => r.soort === 'TRA' && r.waargenomen === 'Ja';
  el.replaceChildren(...[...tot].map(([p, n]) => ({p, n, w: s.wp0.filter((x) => x.product === p).length, g: new Set(s.rg0.filter((r) => r.product === p && oord(r)).map((r) => r.ref)).size}))
    .sort((a, b) => a.w - b.w || d3.ascending(a.p, b.p)).map((x) => {
      const c = h('div', {class: 'w-chip' + (x.w ? '' : ' w-no')}, h('b', {text: x.p}),
        h('span', {class: 'w-st ' + (x.w ? 'ok' : 'bad'), text: x.w ? '✓ ' + x.w + ' WPI' + (x.w === 1 ? '' : `'s`) : '✕ nog niet geïnspecteerd'}),
        h('small', {text: x.g + ' van ' + x.n + ' TRA-regels waargenomen'}));
      return x.w ? clk(c, `WPI's ` + x.p, 'wpis', (w) => w.product === x.p) : c;
    }));
});

dash.draw('buiten', (el) => {
  const s = S(), b = s.rg.filter((r) => r.soort === 'Buiten TRA'); if (!s.ok || !b.length) return leeg(el, s);
  el.replaceChildren(h('div', {class: 'w-items'}, cnt(b, (r) => r.omschrijving).map(([o, n]) => {
    const rows = b.filter((r) => r.omschrijving === o);
    return clk(h('div', {class: 'w-item'}, h('b', {text: n + '× ' + o}), h('br'), h('span', {class: 'w-sm w-mut', text: 'Product: ' + uniek(rows, (r) => r.product).join(', ') + ' · ' + rows.map((r) => r.wpi).join(', ')})), 'Buiten TRA – ' + o, 'regels', (r) => r.soort === 'Buiten TRA' && r.omschrijving === o);
  })));
});

dash.draw('act', (el) => {
  const s = S(); if (!s.ok || !s.ac.length) return leeg(el, s);
  const by = el.dataset.by, volg = ['direct', 'kort', 'planmatig'];
  el.replaceChildren(); const tip = tipper(el);
  const items = d3.groups(s.ac, (a) => a[by]).map(([k, v]) => {
    const f = (a) => a[by] === k, kl = v.filter((a) => a.status === 'Afgerond').length, ov = v.filter(s.over).length, op = v.length - kl - ov;
    return {label: k, n: v.length, val: '✓ ' + kl + ' · △ ' + op + ' · ✕ ' + ov, segs: [
      {n: kl, c: 'o-con', t: 'Afgerond', kind: 'acties', pred: (a) => f(a) && a.status === 'Afgerond'},
      {n: op, c: 'o-ver', t: 'Open, binnen termijn', kind: 'acties', pred: (a) => f(a) && a.status === 'Open' && !s.over(a)},
      {n: ov, c: 'o-afw', t: 'Open, over de termijn', kind: 'acties', pred: (a) => f(a) && s.over(a)}]};
  }).sort((x, y) => by === 'prioriteit' ? volg.indexOf(x.label) - volg.indexOf(y.label) : y.n - x.n || d3.ascending(x.label, y.label));
  el.prepend(bars(el, items, tip));
});

dash.draw('doorloop', (el) => {
  const s = S(), kl = s.ac.filter((a) => a.status === 'Afgerond'); if (!s.ok || !kl.length) return leeg(el, s);
  el.style.setProperty('--w-s1', dash.colors[0]);
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(el, ['direct', 'kort', 'planmatig'].filter((p) => kl.some((a) => a.prioriteit === p)).map((p) => {
    const d = kl.filter((a) => a.prioriteit === p).map((a) => days(a.datum, a.afgerond_op));
    return {label: p, sub: d.length + ' afgeronde acties', val: NL(d3.mean(d), 1) + ' dagen · mediaan ' + NL(d3.median(d), 1), segs: [{n: Math.max(d3.mean(d), 0.0001), d: 1, c: 'o-s1', t: 'Gemiddelde doorlooptijd (dagen)', kind: 'acties', pred: (a) => a.status === 'Afgerond' && a.prioriteit === p}]};
  }), tip));
});

const actieKol = (s) => [['Actienummer', (a) => a.actie], ['WPI-datum', (a) => dat(a.datum)], ['Onderwerp / TRA-regel', (a) => a.ref + ' · ' + a.omschrijving], ['Oordeel', (a) => badge(a.oordeel)], ['Classificatie', (a) => a.classificatie],
  ['Prioriteit', (a) => a.prioriteit], ['Actiehouder', (a) => a.actiehouder], ['Termijn', (a) => dat(a.termijn)],
  ['Status', (a) => a.status === 'Afgerond' ? h('span', {class: 'w-st ok', text: '✓ Afgerond ' + dat(a.afgerond_op) + (a.afgerond_op > a.termijn ? ' (na termijn)' : '')}) : s.over(a) ? h('span', {class: 'w-st bad', text: '✕ Open, ' + days(a.termijn, s.peil) + ' dagen over termijn'}) : h('span', {class: 'w-st warn', text: '△ Open, nog ' + days(s.peil, a.termijn) + ' dagen'})],
  ['Bron', (a) => a.bron], ['Direct gecorrigeerd', (a) => a.direct_gecorrigeerd ? 'ja' : 'nee']];
dash.draw('open', (el) => {
  const s = S(), open = s.ac.filter((a) => a.status === 'Open').sort((a, b) => d3.ascending(a.termijn, b.termijn) || d3.ascending(a.actie, b.actie));
  if (!s.ok || !open.length) return leeg(el, s);
  el.replaceChildren(tbl(actieKol(s).filter((c) => c[0] !== 'Direct gecorrigeerd'), open, true));
});

dash.draw('detail', (el) => {
  const d = W.drill, s = S();
  if (!d || d.slot !== el.dataset.slot || !s.ok) { el.classList.remove('w-open'); el.replaceChildren(); return; }
  const wpiKnop = (nr) => clk(h('span', {text: nr}), 'Alle regels van ' + nr, 'regels', (r) => r.wpi === nr);
  const rows = (d.kind === 'wpis' ? s.wp : d.kind === 'acties' ? s.ac : s.rg).filter(d.pred);
  const cols = d.kind === 'wpis' ? [['WPI-nummer', (w) => wpiKnop(w.nr)], ['Datum', (w) => dat(w.datum)], ['Inspecteur', (w) => w.inspecteur], ['Soort', (w) => w.soort], ['Product', (w) => w.product], ['Fase', (w) => w.fase], ['Taak', (w) => w.taken], ['Locatie', (w) => w.locatie],
    ['Bevindingen', (w) => { const r = s.rg.filter((x) => x.wpi === w.nr); return '✓ ' + r.filter(is('Conform')).length + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length; }]]
    : d.kind === 'acties' ? [['WPI', (a) => wpiKnop(a.wpi)], ...actieKol(s)]
    : [['WPI', (r) => wpiKnop(r.wpi)], ['Datum', (r) => dat(r.datum)], ['Regel', (r) => r.ref], ['Omschrijving', (r) => r.omschrijving], ['Oordeel', (r) => badge(r.oordeel)], ['Classificatie', (r) => r.classificatie], ['Waargenomen', (r) => r.waargenomen === 'Nee' ? 'Niet beoordeeld of n.v.t.' : r.waargenomen], ['Prioriteit', (r) => r.prioriteit], ['Actienummer', (r) => s.ac.filter((a) => a.wpi === r.wpi && a.ref === r.ref).map((a) => a.actie).join(', ')]];
  const sluit = h('button', {type: 'button', class: 'w-btn', text: 'Sluiten'}); sluit.onclick = () => { W.drill = null; dash.draw('detail'); };
  el.classList.add('w-open');
  el.replaceChildren(h('div', {class: 'w-dh'}, h('span', {text: d.title + ' — ' + NL(rows.length) + ' ' + (d.kind === 'wpis' ? `WPI's` : d.kind) + ' (binnen de filters)'}), sluit),
    h('div', {class: 'w-scroll'}, rows.length ? tbl(cols, rows, true) : h('p', {class: 'w-mut', text: 'Geen rijen.'})));
});
