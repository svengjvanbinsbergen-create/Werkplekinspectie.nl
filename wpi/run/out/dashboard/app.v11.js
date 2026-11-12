const W = window.WPI = {drill: null, dim: 'product', traAll: false};
const D = (id) => dash.data(id);
const EOL = String.fromCharCode(10);
const NL = (v, d = 0) => v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('nl-NL', {minimumFractionDigits: d, maximumFractionDigits: d});
const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const dat = (s) => s ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : '—';
const dk = (s) => +s.slice(8, 10) + ' ' + ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][+s.slice(5, 7) - 1];
const mnd = (m) => MND[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const kw = (m) => 'Q' + Math.ceil(+m.slice(5, 7) / 3) + ' ' + m.slice(0, 4);
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const NEG = (r) => r.oordeel === 'Afwijking' || r.oordeel === 'Verbeterpunt';
const is = (x) => (r) => r.oordeel === x;
const WAAR = (r) => r.waargenomen === 'Waargenomen';
const NVT = is('Niet van toepassing');
const STAP = (r) => r.taak ? r.taak + (r.taakstap ? ' › ' + r.taakstap : '') : '';
const SPO = (w) => w.ingang === 'spontaan';
const cnt = (rows, key) => d3.rollups(rows, (v) => v.length, key).sort((a, b) => b[1] - a[1] || d3.ascending(a[0], b[0]));
const r1 = (x) => Math.round(x * 10) / 10;
const meer = (n, enk, mv) => NL(n) + ' ' + (n === 1 ? enk : mv);
const DIR = 'VGM-inspectie directie';
const NORM = {direct: 0, kort: 14};
const MIN_N = 5;
const KLASSEN = ['Arbeidsmiddelen en keuring', 'Besloten ruimte en gas', 'Documenten en voorbereiding', 'Fysieke belasting', 'Gedrag en werkwijze', 'Gevaarlijke stoffen en hygiëne', 'Hijsen', 'Milieu', 'Noodvoorzieningen', 'Omgeving en afzetting', 'Orde en netheid', 'PBM', 'Veiligstellen-LOTOTO', 'Werken op hoogte of bij water'];
const OORD = [['Conform', 'o-con', '✓'], ['Verbeterpunt', 'o-ver', '△'], ['Afwijking', 'o-afw', '✕'], ['Niet van toepassing', 'o-nvt', '–']];
const topTies = (lijst, k, waarde) => lijst.filter((x, i) => i < k || (lijst[k - 1] && waarde(x) === waarde(lijst[k - 1])));
const maandagNa = (iso) => { const d = new Date(iso + 'T00:00:00Z'); do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() !== 1); return d.toISOString().slice(0, 10); };
const kwMaanden = (q) => { const y = q.slice(3), n = +q[1]; return [1, 2, 3].map((i) => y + '-' + String((n - 1) * 3 + i).padStart(2, '0')); };
const kwLijst = (van, peil) => { const uit = []; let y = +van.slice(0, 4), m = +van.slice(5, 7); const eind = +peil.slice(0, 4) * 12 + +peil.slice(5, 7);
  while (y * 12 + m <= eind) { const q = kw(y + '-' + String(m).padStart(2, '0')); if (!uit.includes(q)) uit.push(q); if (m === 12) { y++; m = 1; } else m++; } return uit; };
const kwVol = (q, van, peil) => { const ms = kwMaanden(q); return ms[0] >= van && ms[2] < peil.slice(0, 7); };
const kwNaam = (q, van, peil) => { if (kwVol(q, van, peil)) return q; const ms = kwMaanden(q).filter((m) => m >= van && m <= peil.slice(0, 7));
  const a = ms[0], b = ms[ms.length - 1], eind = b === peil.slice(0, 7) ? peil : b + '-' + String(new Date(Date.UTC(+b.slice(0, 4), +b.slice(5, 7), 0)).getUTCDate());
  return q + ' (' + dat(a + '-01').slice(0, 5) + ' t/m ' + dat(eind).slice(0, 5) + ', onvolledig)'; };
const zp = (t) => t && t.endsWith('.') ? t.slice(0, -1) : t;
const PN = (x) => x.replace(' (fictief)', '');

/* ---------- programma per operationele werkplek (VCA 7.1 + voetnoot 10; invulling: voorstel procedure 5.5) ---------- */
const RISK = (p) => !!(p.hijsen_mobiele_kraan || p.besloten_ruimte_vergunning || p.open_water);
const RISKT = (p) => [p.hijsen_mobiele_kraan && 'hijsen', p.besloten_ruimte_vergunning && 'besloten ruimte', p.open_water && 'open water'].filter(Boolean).join(', ');
const mEind = (m) => m + '-' + String(new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate()).padStart(2, '0');
const mVolg = (m) => { const y = +m.slice(0, 4), n = +m.slice(5, 7); return n === 12 ? (y + 1) + '-01' : y + '-' + String(n + 1).padStart(2, '0'); };
const LANG = (p) => days(p.start, p.eind) > 31;
const MIN_WD = 10;
const werkdagen = (a, b) => { let n = 0; for (let d = new Date(a + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= b; d.setUTCDate(d.getUTCDate() + 1)) { const g = d.getUTCDay(); if (g > 0 && g < 6) n++; } return n; };
const pnorm = (x) => (x || '').toLowerCase().split(' (')[0];
/* koppeling WPI -> project: projectnummer, en locatie en product moeten passen */
const past = (w, p) => !!p && w.locatie === p.locatie && (pnorm(p.product).startsWith(pnorm(w.product)) || pnorm(w.product).startsWith(pnorm(p.product)));
const koppelFout = (wpis, projecten) => { const m = new Map(projecten.map((p) => [p.project, p])); return wpis.filter((w) => !past(w, m.get(w.project))); };
const geenWpi = (projecten, wpis, peil) => projecten.filter((p) => p.start <= peil && !wpis.some((w) => w.project === p.project && past(w, p)));
const CAT = {lang: 'langer dan een maand: een WPI in elke kalendermaand met minstens 10 werkdagen projectduur', risico: 'kort, met risicokenmerk: ten minste één WPI', overig: 'kort, zonder risicokenmerk: één op de vier per kwartaal'};
const CATK = {lang: '> 1 maand', risico: 'kort · risico', overig: 'kort'};
/* Eén verplichting = één WPI die volgens de regel nodig is. telt = de periode van de verplichting is voorbij (maand om, of project afgelopen);
   een verplichting in de lopende maand of van een nog lopend kort project telt pas mee als die periode voorbij is. */
const verplicht = (projecten, wpis, peil) => {
  const uit = [], overig = [];
  projecten.forEach((p) => {
    const ws = wpis.filter((w) => w.project === p.project && past(w, p)).sort((a, b) => d3.ascending(a.datum, b.datum)), nrs = (l) => l.map((w) => w.nr);
    const b = {project: p.project, p, product: p.product};
    if (p.start > peil) return;
    if (LANG(p)) {
      const tot = (p.eind < peil ? p.eind : peil).slice(0, 7);
      for (let m = p.start.slice(0, 7); m <= tot; m = mVolg(m)) {
        const w = ws.filter((x) => x.maand === m), begin = m + '-01' > p.start ? m + '-01' : p.start, einde = mEind(m) < p.eind ? mEind(m) : p.eind, wd = werkdagen(begin, einde);
        if (wd >= MIN_WD) uit.push({...b, cat: 'lang', maand: m, wd, telt: w.length > 0 || einde <= peil, ok: w.length > 0, wpis: nrs(w)});
        else uit.push({...b, cat: 'lang', maand: m, wd, telt: false, ok: w.length > 0, wpis: nrs(w), info: true, nv: true});
      }
    } else if (RISK(p)) {
      uit.push({...b, cat: 'risico', maand: ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7), telt: ws.length > 0 || p.eind <= peil, ok: ws.length > 0, wpis: nrs(ws)});
    } else overig.push({...b, cat: 'overig', maand: (ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7)), telt: false, ok: ws.length > 0, wpis: nrs(ws), info: true});
  });
  /* overige korte projecten: per kwartaal (op einddatum, afgelopen projecten) is één op de vier verplicht, naar boven afgerond */
  d3.groups(overig.filter((o) => o.p.eind <= peil), (o) => kw(o.p.eind.slice(0, 7))).forEach(([q, l]) => {
    const nodig = Math.ceil(l.length / 4), gedaan = l.filter((o) => o.ok);
    for (let i = 0; i < nodig; i++) uit.push({project: '1 op 4 · ' + q, p: null, product: '', cat: 'overig', maand: d3.max(l, (o) => o.p.eind).slice(0, 7), telt: true, ok: i < gedaan.length, wpis: i < gedaan.length ? gedaan[i].wpis : [], q});
  });
  return uit.concat(overig);
};
/* terugkerende bevindingen: zelfde klasse en (minstens 2 gedeelde kernwoorden, of zelfde TRA-regel/onderwerp en 1 gedeeld kernwoord) */
const STOP = new Set(['geen', 'niet', 'door', 'voor', 'werd', 'zijn', 'staat', 'stond', 'hing', 'tijdens', 'binnen', 'daarom', 'alleen', 'blijft', 'wordt', 'naar', 'over', 'onder', 'zonder', 'bovenaan', 'vooraf']);
const kern6 = (t) => new Set(((t || '').toLowerCase().match(/[a-zà-ÿ]+/g) || []).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.slice(0, 6)));
const groepeer = (acties) => {
  const k = acties.map((a) => kern6(a.bevinding)), par = acties.map((_, i) => i), f = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < acties.length; i++) for (let j = i + 1; j < acties.length; j++) {
    if (acties[i].classificatie !== acties[j].classificatie) continue;
    const n = [...k[i]].filter((x) => k[j].has(x)).length;
    if (n >= 2 || (n >= 1 && acties[i].ref === acties[j].ref)) par[f(i)] = f(j);
  }
  return d3.groups(acties.map((a, i) => [f(i), a]), (x) => x[0]).map(([, l]) => {
    const g = l.map((x) => x[1]), tk = d3.rollups(g, (v) => v.length, (a) => zp(a.bevinding)).sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || d3.ascending(a[0], b[0]));
    return {label: tk[0][0], teksten: tk.map((x) => x[0]), l: g, w: new Set(g.map((a) => a.wpi)).size, klasse: g[0].classificatie,
      terug: g.some((a) => a.afgerond_op && g.some((y) => a.afgerond_op < y.datum)), ids: new Set(g.map((a) => a.actie))};
  }).filter((x) => x.w > 1).sort((a, b) => b.l.length - a.l.length || b.w - a.w || d3.ascending(a.label, b.label));
};
const telVp = (vp) => { const t = vp.filter((o) => o.telt), x = t.filter((o) => o.ok).length; return {x, y: t.length}; };

/* ---------- kerncijfers hele periode ---------- */
dash.calc('kern', {
  title: 'Kerncijfers hele periode',
  description: 'Tellingen en verhoudingen over de hele periode, zonder filters; bron van de drie boodschappen en de conclusie.',
  inputs: ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum', 'trendacties', 'projecten'],
  fn: (wpis, regels, acties, programma, kennisbank, peildatum, trendacties, projecten) => {
    const uit = [], zet = (k, waarde, tekst = '', dec = 0) => uit.push({k, waarde, toon: NL(waarde, dec), tekst});
    const pc = (a, b) => b ? Math.round(100 * a / b) : 0, n = (f) => regels.filter(f).length;
    const peil = peildatum[0] ? peildatum[0].peildatum : '';
    const maanden = [...new Set(wpis.map((w) => w.maand))].sort(), van = maanden[0] || peil.slice(0, 7);
    zet('peil', 0, dat(peil)); zet('per_van', 0, maanden.length ? mnd(van) : '—'); zet('per_tot', 0, maanden.length ? mnd(maanden[maanden.length - 1]) : '—');
    zet('overleg', 0, dat(maandagNa(peil))); zet('norm_kort', NORM.kort);
    const wpm = maanden.map((m) => wpis.filter((w) => w.maand === m).length);
    zet('wpis', wpis.length); zet('maanden', maanden.length); zet('wpm_min', d3.min(wpm) || 0); zet('wpm_max', d3.max(wpm) || 0);
    const gepland = d3.sum(programma, (p) => +p.gepland), uitgevoerd = d3.sum(programma, (p) => +p.uitgevoerd);
    zet('gepland', gepland); zet('uitgevoerd', uitgevoerd);
    const dirNamen = new Set(wpis.filter((w) => w.soort === DIR).map((w) => w.inspecteur)), isDir = (p) => dirNamen.has(p.inspecteur);
    zet('c_gepl', d3.sum(programma.filter((p) => !isDir(p)), (p) => +p.gepland)); zet('c_uitg', d3.sum(programma.filter((p) => !isDir(p)), (p) => +p.uitgevoerd));
    zet('d_gepl', d3.sum(programma.filter(isDir), (p) => +p.gepland)); zet('d_uitg', d3.sum(programma.filter(isDir), (p) => +p.uitgevoerd));
    const gemist = programma.filter((p) => +p.uitgevoerd < +p.gepland);
    zet('gemist', d3.sum(gemist, (p) => p.gepland - p.uitgevoerd), gemist.map((p) => mnd(p.maand) + ' – ' + p.inspecteur).join('; ') || 'geen');
    const qs = kwLijst(van, peil), dirKw = new Set(wpis.filter((w) => w.soort === DIR).map((w) => kw(w.maand)));
    zet('dir_ok', qs.filter((q) => dirKw.has(q)).length); zet('dir_tot', qs.length);
    const waar = n(WAAR), conform = n(is('Conform'));
    zet('regels', regels.length); zet('waar', waar); zet('waar_pct', pc(waar, regels.length)); zet('conform', conform); zet('conf_pct', pc(conform, waar));
    zet('afw', n(is('Afwijking'))); zet('verb', n(is('Verbeterpunt'))); zet('neg', n(NEG)); zet('nvt', n(NVT));
    const som = (f) => d3.sum(wpis, (w) => +w[f] || 0), nst = som('n_stappen'), nts = som('n_taakstap'), spo = wpis.filter(SPO);
    zet('stappen', nst); zet('stap_ts', nts); zet('stap_pct', pc(nts, nst)); zet('stap_gem', wpis.length ? r1(nst / wpis.length) : 0, '', 1);
    zet('stap_min', d3.min(wpis, (w) => +w.n_stappen) || 0); zet('stap_max', d3.max(wpis, (w) => +w.n_stappen) || 0); zet('een_taak', wpis.filter((w) => +w.n_taken === 1).length);
    const tk = cnt(wpis.flatMap((w) => [...new Set((w.taken || '').split(' | ').filter(Boolean))]), (t) => t);
    zet('taken_uniek', tk.length); zet('taak_top', tk[0] ? tk[0][1] : 0, topTies(tk, 1, (x) => x[1]).map((x) => x[0]).join(', ') || '—');
    zet('ingepland', wpis.length - spo.length); zet('spontaan', spo.length, spo.map((w) => w.nr).join(', ') || 'geen');
    [['g_alg', 'Algemeen'], ['g_tra', 'TRA'], ['g_bui', 'Buiten TRA']].forEach(([k, so]) => zet(k, n((r) => r.soort === so && WAAR(r))));
    const kwTekst = qs.map((q) => { const rr = regels.filter((r) => kw(r.maand) === q), w = new Set(rr.map((r) => r.wpi)).size;
      return kwNaam(q, van, peil) + ': ' + (w ? NL(rr.filter(NEG).length / w, 1) : '—') + ' per WPI (' + meer(w, 'WPI', 'WPI’s') + ')'; });
    const vol = qs.filter((q) => kwVol(q, van, peil));
    zet('kw_lijst', qs.length, kwTekst.join(' · ')); zet('kw_vol', vol.length);
    zet('richting', vol.length, vol.length < 4 ? 'Met ' + meer(vol.length, 'volledig kwartaal', 'volledige kwartalen') + ' is er nog geen richting vast te stellen; dat kan pas vanaf vier volledige kwartalen.'
      : 'Over de laatste vier volledige kwartalen is het verloop hierboven te lezen; vergelijk het met dezelfde kwartalen van vorig jaar.');
    const kl = [...new Set([...KLASSEN, ...regels.map((r) => r.classificatie)])].map((c) => { const rr = regels.filter((r) => r.classificatie === c); return {c, neg: rr.filter(NEG).length, w: rr.filter(WAAR).length}; });
    const opAantal = kl.filter((x) => x.neg).sort((a, b) => b.neg - a.neg || d3.ascending(a.c, b.c));
    const opAandeel = kl.filter((x) => x.neg && x.w >= MIN_N).sort((a, b) => b.neg / b.w - a.neg / a.w || b.neg - a.neg || d3.ascending(a.c, b.c));
    const klein = kl.filter((x) => x.w > 0 && x.w < MIN_N);
    zet('top_aantal', opAantal.length, topTies(opAantal, 3, (x) => x.neg).map((x) => x.c + ' (' + x.neg + ')').join(', ') || 'geen');
    zet('top_aandeel', opAandeel.length, topTies(opAandeel, 3, (x) => x.neg / x.w).map((x) => x.c + ' ' + pc(x.neg, x.w) + '% (' + x.neg + ' van ' + x.w + ')').join(', ') || 'geen');
    zet('klein', klein.length, klein.map((x) => x.c + ' (' + meer(x.w, 'regel gezien', 'regels gezien') + ')').join(', ') || 'geen');
    zet('min_n', MIN_N);
    const ra = opAandeel[0] || {c: '—', neg: 0, w: 0}, rc = opAantal[0] || {c: '—', neg: 0};
    zet('risk_a', ra.neg, ra.c); zet('risk_a_y', ra.w); zet('risk_c', rc.neg, rc.c);
    const tra = regels.filter((r) => r.soort === 'TRA'), wt = tra.filter(WAAR), nt = tra.filter(NEG);
    zet('tra_toets', wt.length); zet('tra_uniek', new Set(wt.map((r) => r.ref)).size); zet('tra_neg', nt.length); zet('tra_neg_uniek', new Set(nt.map((r) => r.ref)).size);
    const rang = d3.rollups(wt, (v) => [v.filter(NEG).length, v.length], (r) => r.ref).filter((x) => x[1][0] > 1).sort((a, b) => b[1][0] - a[1][0] || d3.ascending(a[0], b[0]));
    zet('tra_herh', rang.length, rang.map((x) => x[0] + ' (' + x[1][0] + ' van ' + x[1][1] + ')').join(', ') || 'geen');
    const bt = regels.filter((r) => r.soort === 'Buiten TRA'), btop = cnt(bt, (r) => r.omschrijving);
    zet('buiten', bt.length); zet('buiten_ond', btop.length); zet('buiten_top', btop[0] ? btop[0][1] : 0, btop[0] ? btop[0][0] : '—');
    const open = acties.filter((a) => a.status === 'Open'), klaar = acties.filter((a) => a.status === 'Afgerond');
    const over = open.filter((a) => a.termijn < peil).sort((a, b) => d3.ascending(a.termijn, b.termijn));
    zet('acties', acties.length); zet('open', open.length); zet('afgerond', klaar.length); zet('over', over.length);
    zet('over_oudste', over[0] ? days(over[0].termijn, peil) : 0, over[0] ? over[0].actie : '—');
    zet('telaat', klaar.filter((a) => a.afgerond_op > a.termijn).length);
    const duur = (a) => days(a.datum, a.afgerond_op), pr = (p) => klaar.filter((a) => a.prioriteit === p);
    zet('dir_norm_ok', pr('direct').filter((a) => duur(a) <= NORM.direct).length); zet('dir_norm_n', pr('direct').length);
    zet('kort_gem', pr('kort').length ? r1(d3.mean(pr('kort'), duur)) : 0, '', 1); zet('kort_ok', pr('kort').filter((a) => duur(a) <= NORM.kort).length); zet('kort_n', pr('kort').length);
    zet('plan_ok', pr('planmatig').filter((a) => a.afgerond_op <= a.termijn).length); zet('plan_n', pr('planmatig').length);
    ['Inspectie', 'Buiten TRA', 'Idee monteurs'].forEach((b, i) => zet(['bron_insp', 'bron_buiten', 'bron_idee'][i], acties.filter((a) => a.bron === b).length));
    [['c', (r) => r.soort_inspectie !== DIR], ['d', (r) => r.soort_inspectie === DIR]].forEach(([p, f]) => {
      const rr = regels.filter(f), w = new Set(rr.map((r) => r.wpi)).size;
      zet(p + '_wpis', w); zet(p + '_neg', w ? r1(rr.filter(NEG).length / w) : 0, '', 1); zet(p + '_mpw', w ? r1(rr.filter(WAAR).length / w) : 0, '', 1);
      const ws = wpis.filter((x) => (x.soort === DIR) === (p === 'd')); zet(p + '_spw', ws.length ? r1(d3.sum(ws, (x) => +x.n_stappen || 0) / ws.length) : 0, '', 1);
    });
    const vp = verplicht(projecten, wpis, peil), tv = telVp(vp), tel = vp.filter((o) => o.telt);
    zet('pw_x', tv.x); zet('pw_y', tv.y); zet('pw_pct', pc(tv.x, tv.y)); zet('pw_mis', tv.y - tv.x); zet('pw_proj', projecten.length);
    ['lang', 'risico', 'overig'].forEach((c) => { const t = telVp(vp.filter((o) => o.cat === c)); zet('pw_' + c + '_x', t.x); zet('pw_' + c + '_y', t.y); });
    zet('pw_overig_n', projecten.filter((p) => !LANG(p) && !RISK(p)).length);
    const geen = geenWpi(projecten, wpis, peil), kf = koppelFout(wpis, projecten);
    zet('pw_geen', geen.length, geen.map((p) => PN(p.project)).join(', ') || 'geen');
    zet('pw_lop', vp.filter((o) => !o.telt && !o.info).length); zet('pw_koppel', kf.length, kf.map((w) => w.nr).join(', ') || 'geen');
    const lm = peil.slice(0, 7), inLm = vp.filter((o) => o.maand === lm && !o.info);
    zet('pw_lm_ok', inLm.filter((o) => o.ok).length, mnd(lm)); zet('pw_lm_lop', inLm.filter((o) => !o.telt).length);
    const herh = groepeer(acties);
    zet('herh_n', herh.length); zet('herh_acties', d3.sum(herh, (x) => x.l.length));
    zet('herh_top', herh.length, topTies(herh, 3, (x) => x.l.length).map((x) => x.label + ' (' + x.l.length + '× in ' + meer(x.w, 'WPI', 'WPI’s') + ')').join('; ') || 'geen');
    zet('herh_terug', herh.filter((x) => x.terug).length);
    const opn = (p) => open.filter((a) => a.prioriteit === p).map((a) => days(a.datum, peil));
    zet('open_kort_n', opn('kort').length); zet('open_kort_gem', opn('kort').length ? r1(d3.mean(opn('kort'))) : 0, '', 1); zet('open_kort_max', d3.max(opn('kort')) || 0);
    const tpw = trendacties.find((t) => (t.onderwerp || '').toLowerCase().includes('programma'));
    zet('trend_pw', 0, tpw ? tpw.nr : '—');
    zet('trend_n', trendacties.length); zet('trend_eerste', 0, trendacties[0] ? trendacties[0].nr : '—'); zet('trend_laatste', 0, trendacties.length ? trendacties[trendacties.length - 1].nr : '—');
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
  e.append(...kids.flat(9).filter((x) => x != null && x !== false && x !== ''));
  return e;
};
const clk = (e, title, kind, pred, alle) => {
  e.classList.add('w-clk'); e.setAttribute('role', 'button'); e.tabIndex = 0;
  const go = () => {
    const host = e.closest('[data-host]'), slot = host ? host.id : '', binnen = !!e.closest('[data-draw=detail]');
    const terug = binnen ? W.drill : null;
    W.drill = {slot, title, kind, pred, alle: alle == null ? !!(terug && terug.alle) : alle, terug}; dash.draw('detail');
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
      const x = (ev && ev.clientX ? ev.clientX : nb.left + nb.width / 2) - b.left, y = nb.top - b.top;
      t.style.left = Math.max(0, Math.min(x - t.offsetWidth / 2, el.clientWidth - t.offsetWidth)) + 'px';
      t.style.top = Math.max(0, y - t.offsetHeight - 6) + 'px';
    };
    node.addEventListener('pointerenter', show); node.addEventListener('pointermove', show); node.addEventListener('focus', show);
    node.addEventListener('pointerleave', () => t.classList.remove('w-on')); node.addEventListener('blur', () => t.classList.remove('w-on'));
    return node;
  };
};
const badge = (o, lijst = OORD) => { const x = lijst.find((q) => q[0] === o) || [o, 'o-nvt', '·']; return h('span', {class: 'w-badge'}, h('i', {class: 'w-sw ' + x[1]}), x[2] + ' ' + o); };
const cellen = (cols, r) => cols.map((c) => { const v = c[1](r); return h('td', {class: c[2] || null, 'data-l': c[0]}, v instanceof Node ? v : String(v == null || v === '' ? '—' : v)); });
const tbl = (cols, rows, cls) => h('table', {class: 'w-tbl w-cards ' + (cls || '')},
  h('thead', null, h('tr', null, cols.map((c) => h('th', {class: c[2] || null, text: c[0]})))),
  h('tbody', null, rows.map((r) => h('tr', null, cellen(cols, r)))));
/* lege grafiek: bij een fout of een helemaal lege selectie staat de melding één keer in de filterbalk; anders kort per grafiek */
const leeg = (el, s) => { const alles = !s.ok || s.fout || (!s.rg.length && !s.ac.length); el.replaceChildren(...(alles ? [] : [h('p', {class: 'w-mut w-sm', text: 'Geen gegevens binnen deze filters.'})])); };
const bars = (items, tip, full) => {
  const mx = d3.max(items, (i) => d3.sum(i.segs, (s) => s.n)) || 1;
  return h('div', {class: 'w-bars' + (full ? ' w-full' : '')}, items.map((i) => h('div', {class: 'w-bar'},
    h('div', {class: 'w-bl'}, h('span', {text: i.label}), i.sub && h('small', {text: i.sub})),
    h('div', {class: 'w-bt' + (i.tot ? ' w-trk' : '')}, i.segs.filter((s) => s.n > 0).map((s) => {
      const e = h('span', {class: 'w-seg ' + s.c, style: 'width:' + (100 * s.n / (i.tot || mx)) + '%', 'aria-label': i.label + ' – ' + s.t + ': ' + NL(s.n)});
      if (s.pred && s.n) clk(e, i.label + ' – ' + s.t, s.kind || 'regels', s.pred, s.alle);
      return tip(e, i.label + EOL + s.t + ': ' + NL(s.n) + (i.tot ? ' van ' + NL(i.tot) : ''));
    })),
    h('div', {class: 'w-bv', text: i.val}))));
};
const uniek = (rows, f) => [...new Set(rows.map(f))].sort(d3.ascending);
const kort = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

/* ---------- gefilterde gegevens ---------- */
let memo = {};
const S = () => {
  const p = dash.params() || {}, ids = ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum', 'projecten'];
  const key = JSON.stringify(p) + ids.map((i) => D(i).status + (D(i).data || []).length).join();
  if (memo.key === key) return memo.s;
  const s = {p, ok: ids.every((i) => D(i).status === 'ok'), fout: !!(p.van && p.tot && p.van > p.tot)};
  const per = (r) => !s.fout && (!p.van || r.maand >= p.van) && (!p.tot || r.maand <= p.tot), ins = (r) => !p.inspecteur || r.inspecteur === p.inspecteur;
  const prod = (r) => !p.product || r.product === p.product, cls = (r) => !p.classificatie || r.classificatie === p.classificatie;
  const alle = (r) => per(r) && ins(r) && prod(r) && cls(r);
  s.peil = (D('peildatum').data[0] || {}).peildatum || '';
  s.wp0 = D('wpis').data.filter((r) => per(r) && ins(r)); s.wp = s.wp0.filter(prod);
  s.rg0 = D('regels').data.filter((r) => per(r) && ins(r));
  s.rg = D('regels').data.filter(alle); s.ac = D('acties').data.filter(alle);
  if (p.classificatie) { const metRegel = new Set(s.rg.map((r) => r.wpi)); s.wp = s.wp.filter((w) => metRegel.has(w.nr)); }
  s.pj = D('projecten').data.filter(prod);
  s.vp = s.fout ? [] : verplicht(s.pj, D('wpis').data, s.peil).filter((o) => (!p.van || o.maand >= p.van) && (!p.tot || o.maand <= p.tot));
  s.pr = D('programma').data.filter((r) => per(r) && ins(r)); s.kb = D('kennisbank').data;
  const open = (a) => a.status === 'Open', klaar = (a) => a.status === 'Afgerond';
  s.over = (a) => open(a) && a.termijn < s.peil;
  const laat = (a) => klaar(a) && a.afgerond_op > a.termijn, direct = (a) => !!a.direct_gecorrigeerd;
  const N = (a, f) => a.filter(f).length, pc = (a, b) => b ? NL(100 * a / b) + '%' : '—', per1 = (a, b) => b ? NL(a / b, 1) : '—';
  const T = s.t = {}, t = (k, txt, kind, title, pred) => { T[k] = [txt, kind, title, pred]; };
  const M = s.m = {};
  const g = d3.sum(s.pr, (r) => +r.gepland), u = d3.sum(s.pr, (r) => +r.uitgevoerd), alleR = () => true;
  const waar = N(s.rg, WAAR), pos = N(s.rg, is('Conform')), neg = N(s.rg, NEG);
  t('regels', NL(s.rg.length), 'regels', 'Alle regels in de WPI’s', alleR);
  t('waar', NL(waar), 'regels', 'Regels gezien (Conform, Afwijking, Verbeterpunt)', WAAR);
  t('nvt', NL(N(s.rg, NVT)), 'regels', 'Regels expliciet niet van toepassing', NVT);
  t('stappen', NL(d3.sum(s.wp, (w) => +w.n_stappen || 0)), 'wpis', 'WPI’s met de getoetste taken en taakstappen', () => true);
  t('ts', NL(d3.sum(s.wp, (w) => +w.n_taakstap || 0)), 'wpis', 'WPI’s met getoetste taakstappen', (w) => +w.n_taakstap > 0);
  t('ing', NL(N(s.wp, (w) => !SPO(w))), 'wpis', 'Ingeplande WPI’s', (w) => !SPO(w)); t('spo', NL(N(s.wp, SPO)), 'wpis', 'Spontane WPI’s', SPO);
  t('pos', NL(pos), 'regels', 'Positieve bevindingen (Conform)', is('Conform'));
  t('pos_pct', pc(pos, waar));
  t('neg', NL(neg), 'regels', 'Afwijkingen en verbeterpunten', NEG);
  t('afw', NL(N(s.rg, is('Afwijking'))), 'regels', 'Afwijkingen', is('Afwijking'));
  t('verb', NL(N(s.rg, is('Verbeterpunt'))), 'regels', 'Verbeterpunten', is('Verbeterpunt'));
  const ov = s.ac.filter(s.over).sort((a, b) => d3.ascending(a.termijn, b.termijn));
  t('open', NL(N(s.ac, open)), 'acties', 'Open acties', open);
  t('over', NL(ov.length), 'acties', 'Open acties over de termijn', s.over);
  t('oudste', ov.length ? NL(days(ov[0].termijn, s.peil)) : '0');
  t('afgerond', NL(N(s.ac, klaar)), 'acties', 'Afgeronde acties (na toetsing)', klaar);
  t('telaat', NL(N(s.ac, laat)), 'acties', 'Na de termijn afgeronde acties', laat);
  const duur = (a) => days(a.datum, a.afgerond_op), kortA = s.ac.filter((a) => klaar(a) && a.prioriteit === 'kort');
  t('kort_gem', kortA.length ? NL(d3.mean(kortA, duur), 1) : '—', 'acties', 'Afgeronde acties met prioriteit kort', (a) => klaar(a) && a.prioriteit === 'kort');
  t('kort_ok', NL(kortA.filter((a) => duur(a) <= NORM.kort).length)); t('kort_n', NL(kortA.length)); t('norm_kort', NL(NORM.kort));
  [['bron_insp', 'Inspectie'], ['bron_buiten', 'Buiten TRA'], ['bron_idee', 'Idee monteurs']].forEach(([k, b]) => t(k, NL(N(s.ac, (a) => a.bron === b)), 'acties', 'Acties met bron ' + b, (a) => a.bron === b));
  [['c', (r) => (r.soort_inspectie || r.soort) !== DIR, 'WPI coördinator'], ['d', (r) => (r.soort_inspectie || r.soort) === DIR, DIR]].forEach(([k, f, naam]) => {
    const w = s.wp.filter(f), r = s.rg.filter(f), a = s.ac.filter(f), and = (q) => (x) => f(x) && q(x);
    t(k + '_wpis', NL(w.length), 'wpis', naam, f);
    t(k + '_rpw', per1(r.length, w.length), 'regels', naam + ' – alle regels', f);
    t(k + '_mpw', per1(N(r, WAAR), w.length), 'regels', naam + ' – regels gezien', and(WAAR));
    t(k + '_spw', per1(d3.sum(w, (x) => +x.n_stappen || 0), w.length), 'wpis', naam + ' – getoetste taken en taakstappen', f);
    t(k + '_spo', NL(N(w, SPO)), 'wpis', naam + ' – spontane WPI’s', and(SPO));
    t(k + '_neg', per1(N(r, NEG), w.length), 'regels', naam + ' – afwijkingen en verbeterpunten', and(NEG));
    t(k + '_buiten', NL(N(r, (x) => x.soort === 'Buiten TRA')), 'regels', naam + ' – Buiten TRA', and((x) => x.soort === 'Buiten TRA'));
    t(k + '_direct', NL(N(a, direct)), 'acties', naam + ' – direct gecorrigeerd', and(direct));
  });
  const gem = s.pr.filter((r) => +r.uitgevoerd < +r.gepland);
  M.progr = NL(u) + ' van ' + NL(g) + ' geplande WPI’s' + (gem.length ? '; niet uitgevoerd: ' + gem.map((r) => mnd(r.maand) + ' – ' + r.inspecteur).join('; ') : '');
  const tv = telVp(s.vp), tc = (c) => telVp(s.vp.filter((o) => o.cat === c));
  M.pw = tv.y ? NL(tv.x) + ' van ' + NL(tv.y) + ' verplichte WPI’s uitgevoerd (' + pc(tv.x, tv.y) + ')' : 'geen verplichte WPI’s binnen deze filters';
  M.pwd = 'langer dan een maand ' + NL(tc('lang').x) + ' van ' + NL(tc('lang').y) + ' · kort met risicokenmerk ' + NL(tc('risico').x) + ' van ' + NL(tc('risico').y) + ' · overige korte projecten ' + (s.pj.some((x) => !LANG(x) && !RISK(x)) ? NL(tc('overig').x) + ' van ' + NL(tc('overig').y) : 'geen in de planning');
  const hg = groepeer(s.ac);
  s.herh = hg;
  M.herh = hg.length ? meer(hg.length, 'bevinding kwam', 'bevindingen kwamen') + ' in meer dan één WPI terug; vaakst: ' + hg[0].label + ' (' + hg[0].l.length + '×)' : 'geen bevinding kwam in meer dan één WPI terug';
  const kf = koppelFout(D('wpis').data, D('projecten').data), lop = s.vp.filter((o) => !o.telt && !o.info), lm = s.peil.slice(0, 7), lmOk = s.vp.filter((o) => o.maand === lm && o.ok && !o.info).length;
  M.koppel = kf.length ? 'Let op: ' + meer(kf.length, 'WPI past', 'WPI’s passen') + ' niet bij de locatie of het product van het opgegeven project (' + kf.map((w) => w.nr).join(', ') + '); die tellen niet mee.' : 'Koppelcontrole: alle ' + NL(D('wpis').data.length) + ' WPI’s passen op projectnummer, locatie en product bij een project in de planning.';
  M.lopend = lop.length || lmOk ? mnd(lm) + ' (lopende maand): ' + NL(lmOk) + ' gehaald, ' + NL(lop.length) + ' loopt nog' : '';
  const vanM = d3.min(D('wpis').data, (r) => r.maand) || '', qs = s.fout || !vanM ? [] : kwLijst(p.van || vanM, p.tot ? p.tot + '-28' : s.peil);
  const dirW = s.wp0.filter((w) => w.soort === DIR), metDir = qs.filter((q) => dirW.some((w) => kw(w.maand) === q));
  s.qs = qs; s.dirW = dirW;
  M.dir = 'in ' + NL(metDir.length) + ' van de ' + NL(qs.length) + ' kwartalen' + (qs.some((q) => !kwVol(q, vanM, s.peil)) ? ', waarvan niet alle volledig' : '');
  const cw = s.wp.filter((w) => w.soort !== DIR).length, dw = dirW.filter(prod).length;
  M.cvd = per1(N(s.rg, (r) => r.soort_inspectie !== DIR && NEG(r)), cw) + ' tegenover ' + per1(N(s.rg, (r) => r.soort_inspectie === DIR && NEG(r)), dw) + ' afwijkingen en verbeterpunten per WPI; regels gezien per WPI ' + T.c_mpw[0] + ' tegenover ' + T.d_mpw[0];
  const ms = uniek(s.rg, (r) => r.maand), wpm = ms.map((m) => new Set(s.rg.filter((r) => r.maand === m).map((r) => r.wpi)).size);
  M.maand = meer(s.rg.length, 'regel', 'regels') + ' in ' + meer(ms.length, 'maand', 'maanden') + ', ' + (ms.length ? NL(d3.min(wpm)) + ' tot ' + NL(d3.max(wpm)) + ' WPI’s per maand: te weinig voor een maandtrend' : 'geen WPI’s');
  const kls = KLASSEN.concat(uniek(s.rg, (r) => r.classificatie).filter((c) => !KLASSEN.includes(c))).map((c) => { const rr = s.rg.filter((r) => r.classificatie === c); return {c, neg: N(rr, NEG), w: N(rr, WAAR)}; });
  const ka = kls.filter((x) => x.neg).sort((a, b) => b.neg - a.neg || d3.ascending(a.c, b.c)), kp = kls.filter((x) => x.neg && x.w >= MIN_N).sort((a, b) => b.neg / b.w - a.neg / a.w || b.neg - a.neg);
  M.klasse = ka.length ? 'meeste in aantal: ' + topTies(ka, 1, (x) => x.neg).map((x) => x.c + ' (' + x.neg + ')').join(', ') + (kp.length ? '; hoogste aandeel: ' + topTies(kp, 1, (x) => x.neg / x.w).map((x) => x.c + ' (' + x.neg + ' van ' + x.w + ')').join(', ') : '') : 'geen afwijkingen of verbeterpunten';
  const nst = d3.sum(s.wp, (w) => +w.n_stappen || 0), nts = d3.sum(s.wp, (w) => +w.n_taakstap || 0), spW = s.wp.filter(SPO);
  M.mom = s.wp.length ? meer(s.wp.length, 'WPI toetste', 'WPI’s toetsten') + ' ' + meer(nst, 'taak of taakstap', 'taken en taakstappen') + ' (' + NL(nts) + ' op taakstapniveau); ' + meer(waar, 'regel', 'regels') + ' gezien; ' + NL(s.wp.length - spW.length) + ' ingepland, ' + NL(spW.length) + ' spontaan' : 'geen WPI’s binnen deze filters';
  const tkS = cnt(s.wp.flatMap((w) => [...new Set((w.taken || '').split(' | ').filter(Boolean))]), (x) => x);
  M.taken = meer(tkS.length, 'taak', 'verschillende taken') + ' getoetst; ' + NL(N(s.wp, (w) => +w.n_taken === 1)) + ' van de ' + meer(s.wp.length, 'WPI', 'WPI’s') + ' toetsten één taak' + (tkS[0] ? '; vaakst: ' + tkS[0][0] + ' (' + meer(tkS[0][1], 'WPI', 'WPI’s') + ')' : '');
  const spA = s.wp0.filter(SPO);
  M.ingang = 'Ingang: ' + NL(s.wp0.length - spA.length) + ' ingepland (uit het programma), ' + NL(spA.length) + ' spontaan' + (spA.length ? ' (' + spA.map((w) => w.nr).join(', ') + ')' : '') + '. Een spontane WPI telt mee voor het programma als hij op een verplichte werkplek en maand valt.';
  const herh = d3.rollups(s.rg.filter((r) => r.soort === 'TRA' && WAAR(r)), (v) => N(v, NEG), (r) => r.ref).filter((x) => x[1] > 1);
  M.tra = herh.length ? meer(herh.length, 'TRA-regel', 'TRA-regels') + ' met een afwijking of verbeterpunt in meer dan één WPI' : 'geen TRA-regel met een afwijking of verbeterpunt in meer dan één WPI';
  const bt = s.rg.filter((r) => r.soort === 'Buiten TRA'), bo = cnt(bt, (r) => r.omschrijving);
  M.buiten = meer(bt.length, 'waarneming', 'waarnemingen') + ' over ' + meer(bo.length, 'onderwerp', 'onderwerpen') + (bo[0] ? '; vaakst: ' + bo[0][0] + ' (' + bo[0][1] + ')' : '');
  const ac = N(s.ac, open);
  M.open = meer(ac, 'open actie', 'open acties') + ', waarvan ' + NL(ov.length) + ' over de termijn';
  const kortO = s.ac.filter((a) => open(a) && a.prioriteit === 'kort').map((a) => days(a.datum, s.peil));
  M.prio = (kortA.length ? 'kort duurt gemiddeld ' + NL(d3.mean(kortA, duur), 1) + ' dagen (afgerond) tegenover de norm van ' + NORM.kort : 'geen afgeronde acties met prioriteit kort') + (kortO.length ? '; ' + meer(kortO.length, 'open actie is', 'open acties zijn') + ' gemiddeld ' + NL(d3.mean(kortO), 1) + ' dagen oud (oudste ' + NL(d3.max(kortO)) + ')' : '');
  memo = {key, s};
  return s;
};

/* ---------- tekeningen: tekst ---------- */
const kernRij = (k) => { const x = D('kern'); return x.status === 'ok' && x.data ? x.data.find((r) => r.k === k) : null; };
const peilAlle = () => (D('peildatum').data[0] || {}).peildatum || '';
const vpAlle = () => verplicht(D('projecten').data || [], D('wpis').data, peilAlle());
const herhSet = () => new Set(groepeer(D('acties').data).flatMap((g) => [...g.ids]));
const klasRij = (k) => { const r = kernRij(k); return r ? r.tekst : ''; };
/* doorklikken vanaf de kerncijfers (hele periode, zonder filters) */
const KD = {
  wpis: () => ['Alle WPI’s', 'wpis', () => true], regels: () => ['Alle regels in de WPI’s', 'regels', () => true],
  waar: () => ['Regels gezien (Conform, Afwijking, Verbeterpunt)', 'regels', WAAR], conform: () => ['Positieve bevindingen (Conform)', 'regels', is('Conform')],
  afw: () => ['Afwijkingen', 'regels', is('Afwijking')], verb: () => ['Verbeterpunten', 'regels', is('Verbeterpunt')], neg: () => ['Afwijkingen en verbeterpunten', 'regels', NEG],
  nvt: () => ['Regels expliciet niet van toepassing', 'regels', NVT], ingepland: () => ['Ingeplande WPI’s', 'wpis', (w) => !SPO(w)], spontaan: () => ['Spontane WPI’s', 'wpis', SPO],
  stappen: () => ['WPI’s met de getoetste taken en taakstappen', 'wpis', () => true], stap_ts: () => ['WPI’s met getoetste taakstappen', 'wpis', (w) => +w.n_taakstap > 0], een_taak: () => ['WPI’s die één taak toetsten', 'wpis', (w) => +w.n_taken === 1],
  taak_top: () => { const t = klasRij('taak_top'); return ['WPI’s met taak ' + t, 'wpis', (w) => (w.taken || '').split(' | ').includes(t)]; },
  g_alg: () => ['Algemene onderwerpen gezien', 'regels', (r) => r.soort === 'Algemeen' && WAAR(r)], g_tra: () => ['TRA-regels gezien', 'regels', (r) => r.soort === 'TRA' && WAAR(r)], g_bui: () => ['Waarnemingen buiten de TRA', 'regels', (r) => r.soort === 'Buiten TRA' && WAAR(r)],
  uitgevoerd: () => ['Uitgevoerde WPI’s', 'wpis', () => true], dir_ok: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR], d_wpis: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR],
  pw_x: () => ['Uitgevoerde verplichte WPI’s per werkplek', 'proj', (o) => o.telt && o.ok], pw_y: () => ['Alle verplichte WPI’s per werkplek tot de peildatum', 'proj', (o) => o.telt],
  pw_mis: () => ['Gemiste verplichte WPI’s per werkplek', 'proj', (o) => o.telt && !o.ok],
  pw_lang_x: () => ['Projecten langer dan een maand – uitgevoerd', 'proj', (o) => o.telt && o.ok && o.cat === 'lang'], pw_lang_y: () => ['Projecten langer dan een maand – verplicht', 'proj', (o) => o.telt && o.cat === 'lang'],
  pw_risico_x: () => ['Korte projecten met risicokenmerk – uitgevoerd', 'proj', (o) => o.telt && o.ok && o.cat === 'risico'], pw_risico_y: () => ['Korte projecten met risicokenmerk – verplicht', 'proj', (o) => o.telt && o.cat === 'risico'],
  pw_geen: () => { const z = new Set(geenWpi(D('projecten').data, D('wpis').data, peilAlle()).map((p) => p.project)); return ['Projecten zonder enige WPI', 'proj', (o) => z.has(o.project) && !o.info]; },
  pw_lm_ok: () => { const lm = peilAlle().slice(0, 7); return ['Lopende maand – gehaald', 'proj', (o) => o.maand === lm && o.ok && !o.info]; },
  pw_lop: () => ['Verplichtingen die nog lopen (tellen nog niet mee)', 'proj', (o) => !o.telt && !o.info],
  risk_a: () => { const c = klasRij('risk_a'); return ['Afwijkingen en verbeterpunten – ' + c, 'regels', (r) => r.classificatie === c && NEG(r)]; },
  risk_a_y: () => { const c = klasRij('risk_a'); return ['Regels gezien – ' + c, 'regels', (r) => r.classificatie === c && WAAR(r)]; },
  risk_c: () => { const c = klasRij('risk_c'); return ['Afwijkingen en verbeterpunten – ' + c, 'regels', (r) => r.classificatie === c && NEG(r)]; },
  acties: () => ['Alle acties', 'acties', () => true], open: () => ['Open acties', 'acties', (a) => a.status === 'Open'],
  over: () => { const pl = peilAlle(); return ['Open acties over de termijn', 'acties', (a) => a.status === 'Open' && a.termijn < pl]; },
  afgerond: () => ['Afgeronde acties (na toetsing)', 'acties', (a) => a.status === 'Afgerond'], telaat: () => ['Na de termijn afgeronde acties', 'acties', (a) => a.status === 'Afgerond' && a.afgerond_op > a.termijn],
  bron_insp: () => ['Acties met bron Inspectie', 'acties', (a) => a.bron === 'Inspectie'], bron_buiten: () => ['Acties met bron Buiten TRA', 'acties', (a) => a.bron === 'Buiten TRA'], bron_idee: () => ['Acties met bron Idee monteurs', 'acties', (a) => a.bron === 'Idee monteurs'],
  herh_n: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.actie)]; }, herh_acties: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.actie)]; },
  c_uitg: () => ['WPI’s van de coördinatoren', 'wpis', (w) => w.soort !== DIR], d_uitg: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR],
  buiten: () => ['Waarnemingen buiten de TRA', 'regels', (r) => r.soort === 'Buiten TRA'], tra_neg: () => ['TRA-toetsingen met afwijking of verbeterpunt', 'regels', (r) => r.soort === 'TRA' && NEG(r)],
  tra_toets: () => ['TRA-toetsingen (gezien)', 'regels', (r) => r.soort === 'TRA' && WAAR(r)],
};
dash.draw('k', (el) => {
  const k = el.dataset.where.slice(2), row = kernRij(k), tekst = el.dataset.field === 'tekst';
  el.textContent = !row ? '—' : tekst ? row.tekst : row.toon;
  if (row && !tekst && KD[k] && row.waarde > 0 && el.closest('[data-host]')) { const [t, kind, pred] = KD[k](); clk(el, t + ' (hele periode, zonder filters)', kind, pred, true); } else unclk(el);
});
/* donker thema: fel groen dempen (alleen style op .w-page) */
const thema = () => {
  const c = document.querySelector('.w-card'); if (!c) return;
  const m = (getComputedStyle(c).backgroundColor.match(/[0-9.]+/g) || ['255', '255', '255']).map(Number), donker = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255 < 0.5;
  document.querySelectorAll('.w-page').forEach((e) => { e.style.setProperty('--w-ok', donker ? 'color-mix(in srgb,var(--color-ok) 62%,var(--color-panel))' : 'var(--color-ok)'); e.style.setProperty('--w-s1', dash.colors[0]); });
};
dash.onData(thema);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', thema);
dash.draw('t', (el) => {
  const s = S(), d = s.ok && s.t[el.dataset.t];
  if (!d) { el.textContent = '—'; unclk(el); return; }
  el.textContent = d[0];
  if (d[1] && d[0] !== '0' && d[0] !== '—') clk(el, d[2], d[1], d[3]); else unclk(el);
});
dash.draw('m', (el) => { const s = S(); el.textContent = s.ok ? (s.fout ? 'geen gegevens (begindatum na einddatum)' : s.m[el.dataset.m] || '—') : '—'; });

const kies = (naam, param, leegTekst, opties) => dash.draw(naam, (sel) => {
  const s = S(), o = s.ok ? opties(s) : [];
  sel.replaceChildren(new Option(leegTekst, ''), ...o.map((x) => Array.isArray(x) ? new Option(x[1], x[0]) : new Option(x)));
  sel.value = s.p[param] || '';
  sel.onchange = () => { W.drill = null; dash.setParams({[param]: sel.value}); };
});
kies('f-van', 'van', 'Begin', () => uniek(D('wpis').data, (r) => r.maand).map((m) => [m, mnd(m)]));
kies('f-tot', 'tot', 'Einde', () => uniek(D('wpis').data, (r) => r.maand).map((m) => [m, mnd(m)]));
kies('f-product', 'product', 'Alle producten', () => uniek(D('wpis').data, (r) => r.product));
kies('f-inspecteur', 'inspecteur', 'Alle inspecteurs', () => uniek(D('wpis').data, (r) => r.inspecteur));
kies('f-classificatie', 'classificatie', 'Alle classificaties', () => KLASSEN.concat(uniek(D('regels').data, (r) => r.classificatie).filter((c) => !KLASSEN.includes(c))));
dash.draw('f-actief', (el) => {
  const s = S(); el.classList.toggle('w-fout', !!s.fout);
  if (!s.ok) { el.textContent = '—'; return; }
  if (s.fout) { el.textContent = 'Let op: “Periode van” ligt na “Periode tot en met”. Kies een begin vóór het einde. Er worden geen gegevens getoond.'; return; }
  el.classList.toggle('w-fout', !s.rg.length && !s.ac.length);
  if (!s.rg.length && !s.ac.length) { el.textContent = 'Geen gegevens binnen deze filters: geen regels en geen acties. Kies een ruimere selectie of wis de filters.'; return; }
  const p = s.p, f = [(p.van || p.tot) && (p.van ? mnd(p.van) : 'begin') + ' t/m ' + (p.tot ? mnd(p.tot) : 'einde'), p.product, p.inspecteur, p.classificatie].filter(Boolean);
  el.textContent = 'Nu in beeld: ' + meer(s.wp.length, 'WPI', 'WPI’s') + ', ' + meer(s.rg.length, 'regel', 'regels') + ', ' + meer(s.ac.length, 'actie', 'acties') + (f.length ? ' (filter: ' + f.join(' · ') + ')' : ' (geen filter)');
});

/* ---------- Overzicht ---------- */
dash.draw('trendrijen', (el) => {
  const t = D('trendacties');
  if (t.status !== 'ok') { el.replaceChildren(); return; }
  el.replaceChildren(...t.data.map((r) => h('tr', {'data-key': r.nr}, cellen([
    ['Nummer', (x) => h('span', null, h('b', {text: x.nr}), h('small', {class: 'w-blok w-st warn', text: '△ ' + x.status}))],
    ['Wat', (x) => h('span', null, h('b', {text: x.onderwerp + '. '}), x.wat, h('small', {class: 'w-blok w-mut', text: 'Aanleiding: ' + x.aanleiding}))],
    ['Meetbaar doel', (x) => x.doel || '—'],
    ['Actiehouder', (x) => h('span', null, x.actiehouder, x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Toetser', (x) => x.toetser],
    ['Termijn en controle', (x) => h('span', null, h('span', {class: 'w-blok'}, 'termijn ', h('span', {class: 'w-nw', text: dat(x.termijn)})), h('span', {class: 'w-blok'}, 'controle ', h('span', {class: 'w-nw', text: dat(x.controledatum)})), x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Laatst besproken / voortgang', (x) => x.voortgang ? x.voortgang : h('span', {class: 'w-mut', text: 'nog niet besproken'})]], r))));
});

dash.draw('trendkort', (el) => {
  const t = D('trendacties');
  if (t.status !== 'ok') { el.replaceChildren(); return; }
  el.replaceChildren(...t.data.map((r) => h('tr', {'data-key': r.nr}, cellen([
    ['Nummer', (x) => h('b', {text: x.nr})], ['Wat', (x) => x.onderwerp], ['Actiehouder', (x) => x.actiehouder],
    ['Termijn', (x) => h('span', {class: 'w-nw', text: dat(x.termijn)})], ['Status', (x) => h('span', {class: 'w-st warn', text: '△ ' + x.status})]], r))));
});
/* vastgelegde, afdrukbare versie van de trendanalyse (hele periode, zonder filters) */
dash.draw('vastleg', (el) => {
  const k = (n, f) => { const r = kernRij(n); return r ? (f ? r.tekst : r.toon) : '—'; }, t = D('trendacties'), pd = (D('peildatum').data[0] || {});
  if (D('kern').status !== 'ok' || t.status !== 'ok' || D('projecten').status !== 'ok') { el.replaceChildren(h('p', {class: 'w-mut', text: '—'})); return; }
  const kloon = (sel) => { const n = document.querySelector(sel); if (!n) return null; const c = n.cloneNode(true);
    [c, ...c.querySelectorAll('*')].forEach((e) => { [...e.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'role' || a.name === 'tabindex' || a.name === 'id').forEach((a) => e.removeAttribute(a.name)); e.classList.remove('w-clk'); });
    c.querySelectorAll('.w-det').forEach((d) => d.remove()); return c; };
  const rg = D('regels').data, ac = D('acties').data, peil = peilAlle(), kl = KLASSEN.map((c) => { const r = rg.filter((x) => x.classificatie === c && WAAR(x)); return {c, w: r.length, a: r.filter(is('Afwijking')).length, v: r.filter(is('Verbeterpunt')).length}; }).filter((x) => x.w).sort((a, b) => (b.a + b.v) - (a.a + a.v) || b.w - a.w);
  const hg = groepeer(ac);
  const tabel = (kop, rijen) => h('table', {class: 'w-tbl w-vtbl'}, h('thead', null, h('tr', null, kop.map((x) => h('th', {text: x})))), h('tbody', null, rijen.map((r) => h('tr', null, r.map((x) => h('td', {text: String(x)}))))));
  /* kop met het eerste blok samen houden, zodat er geen losse kop onderaan een pagina staat */
  const sectie = (titel, eerste, ...rest) => [h('div', {class: 'w-keep'}, h('h3', {text: titel}), eerste), ...rest];
  const blok = (kop, velden) => h('div', {class: 'w-ab'}, h('p', null, h('b', {text: kop[0]}), kop[1] ? ' · ' + kop[1] : ''), h('dl', {class: 'w-vdl'}, velden.filter((v) => v[1]).map(([a, b]) => [h('dt', {text: a}), h('dd', {text: b})])));
  const over = (a) => a.status === 'Open' && a.termijn < peil;
  const actBlok = (a) => blok([a.actie, (a.status === 'Afgerond' ? 'Afgerond' : over(a) ? 'Open, over de termijn' : 'Open') + ' · prioriteit ' + a.prioriteit + ' · termijn ' + dat(a.termijn)],
    [['Bevinding', a.bevinding + ' (' + a.ref + ' · ' + a.classificatie + ')'], ['Verbeteractie', a.verbeteractie], ['Direct genomen', a.direct_genomen_maatregel], ['Actiehouder', a.actiehouder], ['Toetser', a.toetser],
      ['Afgerond / getoetst', a.status === 'Afgerond' ? 'afgerond ' + dat(a.afgerond_op) + ', getoetst ' + dat(a.getoetst_op) : 'nog niet getoetst']]);
  const open = ac.filter((a) => a.status === 'Open').sort((a, b) => d3.ascending(a.termijn, b.termijn) || d3.ascending(a.actie, b.actie)), klaar = ac.filter((a) => a.status === 'Afgerond').sort((a, b) => d3.ascending(a.afgerond_op, b.afgerond_op) || d3.ascending(a.actie, b.actie));
  const vp = vpAlle(), geen = geenWpi(D('projecten').data, D('wpis').data, peil), qs = kwLijst(d3.min(D('wpis').data, (w) => w.maand), peil), dirW = D('wpis').data.filter((w) => w.soort === DIR);
  const pr = D('programma').data, prMs = uniek(pr, (r) => r.maand), prI = uniek(pr, (r) => r.inspecteur), som = (l, f) => d3.sum(l, (r) => +r[f]);
  el.replaceChildren(
    h('p', {class: 'w-ban', text: 'VOORBEELD — fictieve data'}),
    h('h2', {text: 'Trendanalyse werkplekinspecties ' + k('per_van', 1) + ' t/m ' + k('per_tot', 1)}),
    h('p', {text: 'Noardling B.V., Service & Montage · peildatum ' + k('peil', 1) + ' · hele periode, zonder filters · VCA 7.2: jaarlijkse trendanalyse met te ondernemen acties en follow-up.'}),
    h('dl', {class: 'w-vdl w-vkop'}, [['Opgesteld door', '……………………'], ['Vastgesteld door en op', '…………………… op ……………'], ['Versie', 'concept 1 · dataset ' + (pd.versie || '—') + ' · peildatum ' + k('peil', 1)]].map(([a, b]) => [h('dt', {text: a}), h('dd', {text: b})])),
    ...sectie('1. Kernboodschap', kloon('#boodschappen .w-msgs')),
    ...sectie('2. Conclusie en onderbouwing', kloon('#conclusie ul')),
    ...sectie('3. Bevindingen per klasse (regels gezien)', tabel(['Klasse', 'Gezien', 'Afwijking', 'Verbeterpunt', 'Aandeel'], kl.map((x) => [x.c, NL(x.w), NL(x.a), NL(x.v), NL(100 * (x.a + x.v) / x.w) + '%' + (x.w < MIN_N ? ' (te klein)' : '')]))),
    ...sectie('4. Terugkerende bevindingen', tabel(['Bevinding (groep)', 'Acties', 'WPI’s', 'Klasse', 'Terug na afronding'], hg.map((x) => [x.label + (x.teksten.length > 1 ? ' (samengenomen: ' + x.teksten.length + ' formuleringen)' : ''), NL(x.l.length), NL(x.w), x.klasse, x.terug ? 'ja' : 'nee']))),
    ...sectie('5. Acties uit de trendanalyse en follow-up', h('p', {class: 'w-sm', text: 'De trendacties staan elke maandag op de agenda van het coördinatorenoverleg; het verslag noemt per nummer de nieuwe status. Op de controledatum toetst de toetser of het meetbare doel is gehaald. Actiehouders, doelen en data zijn een fictief voorbeeld.'}),
      ...t.data.map((x) => blok([x.nr + ' ' + x.onderwerp, x.status], [['Wat', x.wat], ['Aanleiding', x.aanleiding], ['Meetbaar doel', x.doel], ['Actiehouder', x.actiehouder], ['Toetser', x.toetser], ['Termijn', dat(x.termijn)], ['Controledatum', dat(x.controledatum)], ['Laatst besproken', x.voortgang || 'nog niet besproken']]))),
    ...sectie('6. Overzicht verbeteracties per peildatum ' + dat(peil), h('p', {class: 'w-sm', text: meer(ac.length, 'actie', 'acties') + ': ' + NL(open.length) + ' open (waarvan ' + NL(open.filter(over).length) + ' over de termijn), ' + NL(klaar.length) + ' afgerond na toetsing. VCA 7.1 actieplan en VCA 7.2 overzicht verbeteracties.'}),
      h('h4', {text: 'Open acties (' + open.length + '), op termijn'}), ...open.map(actBlok), h('h4', {text: 'Afgeronde acties (' + klaar.length + '), op datum van afronding'}), ...klaar.map(actBlok)),
    ...sectie('7. Programma per operationele werkplek', h('p', {class: 'w-sm w-pwintro', text: 'Verplichte WPI’s per werkplek tot de peildatum: ' + k('pw_x') + ' van ' + k('pw_y') + ' uitgevoerd (' + k('pw_pct') + '%); ' + k('pw_lop') + ' verplichtingen in de lopende maand tellen nog niet mee. Regel (voorstel procedure 5.5): project langer dan een maand = een WPI in elke kalendermaand met minstens 10 werkdagen projectduur; kort project met risicokenmerk = ten minste één WPI. Projectplanning fictief. ✓ uitgevoerd · ✕ gemist · ◌ loopt nog.'}),
      h('div', {class: 'w-keep'}, pwTabel(vp, false)),
      h('h4', {text: 'Projecten zonder enige WPI (' + geen.length + ')'}), tabel(['Project', 'Product', 'Locatie', 'Looptijd', 'Risicokenmerk'], geen.map((p) => [PN(p.project), p.product, p.locatie, dat(p.start) + ' t/m ' + dat(p.eind), RISKT(p) || '—'])),
      h('h4', {text: 'Directie-inspectie per kwartaal'}), tabel(['Kwartaal', 'Directie-inspecties'], qs.map((q) => { const l = dirW.filter((w) => kw(w.maand) === q); return [kwNaam(q, d3.min(D('wpis').data, (w) => w.maand), peil), l.length ? l.map((w) => w.nr).join(', ') : 'geen']; })),
      h('h4', {text: 'Inzet per inspecteur (ondergrens): uitgevoerd van gepland'}), tabel(['Inspecteur', ...prMs.map((m) => MND[+m.slice(5, 7) - 1]), 'Totaal'], prI.map((i) => [i, ...prMs.map((m) => { const l = pr.filter((r) => r.inspecteur === i && r.maand === m); return l.length ? som(l, 'uitgevoerd') + '/' + som(l, 'gepland') : '·'; }), som(pr.filter((r) => r.inspecteur === i), 'uitgevoerd') + '/' + som(pr.filter((r) => r.inspecteur === i), 'gepland')]))),
    h('p', {class: 'w-ban', text: 'VOORBEELD — fictieve data'}));
});

/* ---------- Programma per werkplek ---------- */
const pcel = (o) => {
  if (o.nv) return o.ok ? h('span', {class: 'w-pc w-nv', text: '✓', 'aria-label': PN(o.project) + ' ' + mnd(o.maand) + ': WPI, maand niet verplicht (' + o.wd + ' werkdagen)'}) : null;
  const lop = !o.telt, e = h('span', {class: 'w-pc ' + (o.ok ? 'w-ok' : lop ? 'w-lop' : 'w-mis'), text: o.ok ? '✓' : lop ? '◌' : '✕',
    'aria-label': PN(o.project) + ' ' + mnd(o.maand) + ': ' + (o.ok ? 'uitgevoerd' : lop ? 'loopt nog' : 'gemist') + (lop ? ', telt nog niet mee' : '')});
  return clk(e, PN(o.project) + ' – ' + mnd(o.maand), 'proj', (x) => x.project === o.project && x.maand === o.maand);
};
/* project x maand; klik = doorklikken (alleen op het dashboard, niet in de vastgelegde versie) */
const pwTabel = (vpAll, klik) => {
  const vp = vpAll.filter((o) => o.p), ms = uniek(vp, (o) => o.maand), proj = d3.groups(vp, (o) => o.project).sort((a, b) => d3.ascending(a[1][0].p.start, b[1][0].p.start) || d3.ascending(a[0], b[0]));
  const loopt = (pp, m) => pp.start.slice(0, 7) <= m && pp.eind.slice(0, 7) >= m;
  const cel = (o) => klik ? pcel(o) : o.nv ? (o.ok ? '(✓)' : '') : o.ok ? '✓' : !o.telt ? '◌' : '✕';
  const xy = (l) => { const t = telVp(l); if (!t.y) return h('span', {class: 'w-mut', text: '◌ loopt nog'}); const e = h('span', {text: t.x + ' van ' + t.y, class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad')}); return klik ? clk(e, PN(l[0].project) + ' – verplichtingen', 'proj', (o) => o.project === l[0].project) : e; };
  const totM = (m) => { const l = vpAll.filter((o) => o.maand === m && !o.info), t = telVp(l), lp = l.filter((o) => !o.telt).length;
    return h('span', null, t.y ? h('span', {class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad'), text: t.x + '/' + t.y}) : h('span', {class: 'w-mut', text: '—'}), lp ? h('small', {class: 'w-blok w-mut', text: '+' + lp + ' ◌'}) : null); };
  return h('table', {class: 'w-tbl w-sticky w-pwt'},
    h('thead', null, h('tr', null, h('th', {text: 'Project (fictief)'}), ms.map((m) => h('th', {class: 'w-c', text: MND[+m.slice(5, 7) - 1]})), h('th', {class: 'w-num', text: 'Uitgevoerd'}))),
    h('tbody', null, proj.map(([naam, l]) => { const pp = l[0].p;
      return h('tr', null, h('td', null, h('b', {text: PN(naam)}), h('small', {class: 'w-blok w-mut'}, pp.product + ' · ' + dk(pp.start) + ' – ' + dk(pp.eind), h('span', {class: 'w-breed', text: ' · ' + CATK[l[0].cat] + (RISK(pp) ? ' (' + RISKT(pp) + ')' : '')}))),
        ms.map((m) => { const o = l.find((x) => x.maand === m); return h('td', {class: 'w-c' + (loopt(pp, m) ? ' w-actief' : ''), title: o && o.nv ? 'Niet verplicht: ' + o.wd + ' werkdagen in deze maand (minder dan ' + MIN_WD + ')' : null}, o ? cel(o) : null); }),
        h('td', {class: 'w-num'}, xy(l))); }),
    h('tr', {class: 'w-tot'}, h('td', null, h('b', {text: 'Per maand'})), ms.map((m) => h('td', {class: 'w-c'}, totM(m))), h('td', {class: 'w-num'}, h('b', {text: telVp(vpAll).x + ' van ' + telVp(vpAll).y})))));
};
/* telefoon: één kaart per project met maandchips, in plaats van een brede tabel */
const pwKaarten = (vpAll) => {
  const vp = vpAll.filter((o) => o.p), ms = uniek(vp, (o) => o.maand), proj = d3.groups(vp, (o) => o.project).sort((a, b) => d3.ascending(a[1][0].p.start, b[1][0].p.start) || d3.ascending(a[0], b[0]));
  const chip = (o) => { const st = o.nv ? 'w-nv' : o.ok ? 'w-ok' : !o.telt ? 'w-lop' : 'w-mis', tk = o.nv ? (o.ok ? '✓ niet verplicht' : '') : o.ok ? '✓' : !o.telt ? '◌ loopt' : '✕';
    if (!tk) return null; const e = h('span', {class: 'w-mc ' + st, text: MND[+o.maand.slice(5, 7) - 1] + ' ' + tk}); return o.nv ? e : clk(e, PN(o.project) + ' – ' + mnd(o.maand), 'proj', (x) => x.project === o.project && x.maand === o.maand); };
  const tot = (m) => { const l = vpAll.filter((o) => o.maand === m && !o.info), t = telVp(l), lp = l.filter((o) => !o.telt).length; return h('span', {class: 'w-mc ' + (t.x === t.y ? 'w-ok' : 'w-mis'), text: MND[+m.slice(5, 7) - 1] + ' ' + t.x + '/' + t.y + (lp ? ' +' + lp + ' ◌' : '')}); };
  return h('div', {class: 'w-pks'}, proj.map(([naam, l]) => { const pp = l[0].p, t = telVp(l);
    return h('div', {class: 'w-pk'}, h('div', {class: 'w-pkh'}, h('b', {text: PN(naam)}), h('span', {class: 'w-st ' + (!t.y ? '' : t.x === t.y ? 'ok' : 'bad'), text: t.y ? t.x + ' van ' + t.y : '◌ loopt nog'})),
      h('small', {class: 'w-blok w-mut', text: pp.product + ' · ' + dk(pp.start) + ' – ' + dk(pp.eind) + ' · ' + CATK[l[0].cat] + (RISK(pp) ? ' (' + RISKT(pp) + ')' : '')}),
      h('div', {class: 'w-mcs'}, l.map(chip))); }),
    h('div', {class: 'w-pk w-pktot'}, h('div', {class: 'w-pkh'}, h('b', {text: 'Per maand'}), h('b', {text: telVp(vpAll).x + ' van ' + telVp(vpAll).y})), h('div', {class: 'w-mcs'}, ms.map(tot))));
};
dash.draw('pw', (el) => {
  const s = S(); if (!s.ok) return leeg(el, s);
  const vp = s.vp.filter((o) => o.p); if (!vp.length) return leeg(el, s);
  const mis = s.vp.filter((o) => o.telt && !o.ok), misP = new Set(mis.filter((o) => o.p).map((o) => o.project));
  const knop = mis.length ? clk(h('span', {class: 'w-btn w-inl', text: 'Toon de ' + meer(mis.length, 'gemiste verplichting', 'gemiste verplichtingen') + ' (' + meer(misP.size, 'project', 'projecten') + ')'}), 'Gemiste verplichte WPI’s', 'proj', (o) => o.telt && !o.ok) : null;
  const ov = s.vp.filter((o) => !o.p);
  el.replaceChildren(...[h('p', {class: 'w-sm'}, knop),
    h('div', {class: 'w-scroll w-breedtbl'}, pwTabel(s.vp, true)), h('div', {class: 'w-smal'}, pwKaarten(s.vp)),
    ov.length ? h('p', {class: 'w-sm'}, 'Overige korte projecten (één op de vier per kwartaal): ', ov.map((o) => o.q + (o.ok ? ' ✓' : ' ✕')).join(', ')) : null].filter(Boolean));
  const sc = el.querySelector('.w-scroll'); if (sc) setTimeout(() => { sc.scrollLeft = sc.scrollWidth; }, 0);
});
dash.draw('pwchart', (el) => {
  const vp = D('projecten').status === 'ok' ? vpAlle() : []; if (!vp.length) { el.replaceChildren(h('p', {class: 'w-mut w-sm', text: '—'})); return; }
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(uniek(vp, (o) => o.maand).map((m) => {
    const l = vp.filter((o) => o.maand === m), t = l.filter((o) => o.telt), ok = t.filter((o) => o.ok).length, lop = l.filter((o) => !o.telt && !o.info).length;
    return {label: mnd(m), sub: lop ? NL(ok) + ' gehaald · ' + NL(lop) + ' lopend' : '', val: ok + ' van ' + t.length,
      segs: [{n: ok, c: 'o-con', t: 'Uitgevoerd', kind: 'proj', alle: true, pred: (o) => o.maand === m && o.telt && o.ok}, {n: t.length - ok, c: 'o-afw', t: 'Gemist', kind: 'proj', alle: true, pred: (o) => o.maand === m && o.telt && !o.ok},
        {n: lop, c: 'o-lop', t: 'Loopt nog, telt nog niet mee', kind: 'proj', alle: true, pred: (o) => o.maand === m && !o.telt && !o.info}]};
  }), tip));
});

/* ---------- Programma per inspecteur ---------- */
dash.draw('progr', (el) => {
  const s = S(); if (!s.ok || !s.pr.length) return leeg(el, s);
  const ms = uniek(s.pr, (r) => r.maand), insp = uniek(s.pr, (r) => r.inspecteur);
  const cel = (rows, title, pred) => {
    const g = d3.sum(rows, (r) => +r.gepland), u = d3.sum(rows, (r) => +r.uitgevoerd);
    if (!g && !u) return h('span', {class: 'w-mut', text: '·'});
    return clk(h('span', {class: 'w-st ' + (u >= g ? 'ok' : 'bad'), text: (u >= g ? '✓ ' : '✕ ') + u + '/' + g}), title, 'wpis', pred);
  };
  el.replaceChildren(h('table', {class: 'w-tbl w-sticky'},
    h('thead', null, h('tr', null, h('th', {text: 'Inspecteur'}), ms.map((m) => h('th', {class: 'w-num', text: mnd(m)})), h('th', {class: 'w-num', text: 'Totaal'}))),
    h('tbody', null, insp.map((i) => h('tr', null, h('td', {text: i}),
      ms.map((m) => h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.maand === m && r.inspecteur === i), i + ' – ' + mnd(m), (w) => w.maand === m && w.inspecteur === i))),
      h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.inspecteur === i), i, (w) => w.inspecteur === i)))),
    h('tr', null, h('td', null, h('b', {text: 'Totaal'})), ms.map((m) => h('td', {class: 'w-num'}, cel(s.pr.filter((r) => r.maand === m), mnd(m), (w) => w.maand === m))),
      h('td', {class: 'w-num'}, cel(s.pr, 'Alle WPI’s', () => true))))), h('p', {class: 'w-sm w-mut w-schint', text: '← schuif naar links voor eerdere maanden'}));
  setTimeout(() => { el.scrollLeft = el.scrollWidth; el.classList.toggle('w-schuift', el.scrollWidth > el.clientWidth + 2); }, 0);
});
dash.draw('kwart', (el) => {
  const s = S(); if (!s.ok || !s.qs.length) return leeg(el, s);
  const vanM = d3.min(D('wpis').data, (r) => r.maand);
  el.replaceChildren(...s.qs.map((q) => {
    const n = s.dirW.filter((w) => kw(w.maand) === q).length;
    const c = h('div', {class: 'w-chip' + (n ? '' : ' w-no')}, h('b', {text: kwNaam(q, vanM, s.peil)}), h('span', {class: 'w-st ' + (n ? 'ok' : 'bad'), text: (n ? '✓ ' : '✕ ') + meer(n, 'directie-inspectie', 'directie-inspecties')}));
    return n ? clk(c, 'Directie-inspecties ' + q, 'wpis', (w) => w.soort === DIR && kw(w.maand) === q) : c;
  }));
});

/* ---------- Bevindingen ---------- */
dash.draw('maand', (el) => {
  const s = S(); if (!s.ok || !s.rg.length) return leeg(el, s);
  const ms = uniek(s.rg, (r) => r.maand), per = (m) => s.rg.filter((r) => r.maand === m), mx = d3.max(ms, (m) => per(m).length);
  const box = h('div', {class: 'w-cols', role: 'group', 'aria-label': 'Gestapelde kolommen: aantal regels per oordeel per maand'});
  el.replaceChildren(box, h('div', {class: 'w-colx'}, ms.map((m) => { const w = new Set(per(m).map((x) => x.wpi)).size; return h('div', null, h('span', {text: MND[+m.slice(5, 7) - 1]}), h('small', {text: meer(w, 'WPI', 'WPI’s')})); })));
  const tip = tipper(el);
  ms.forEach((m) => {
    const r = per(m), col = h('div', {class: 'w-col'}, h('em', {text: r.length}));
    [...OORD].reverse().forEach(([o, c]) => {
      const n = r.filter(is(o)).length; if (!n) return;
      col.append(tip(clk(h('span', {class: 'w-seg ' + c, style: 'height:' + (88 * n / mx) + '%', 'aria-label': mnd(m) + ' ' + o + ': ' + n}), mnd(m) + ' – ' + o, 'regels', (x) => x.maand === m && x.oordeel === o), mnd(m) + EOL + o + ': ' + n + ' van ' + r.length));
    });
    box.append(col);
  });
});
dash.draw('trend', (el) => {
  const s = S(), rg = s.rg.filter(WAAR);
  if (!s.ok || !rg.length) return leeg(el, s);
  const pts = uniek(rg, (r) => r.maand).map((m) => { const r = rg.filter((x) => x.maand === m); return {m, n: r.length, pos: 100 * r.filter(is('Conform')).length / r.length, neg: 100 * r.filter(NEG).length / r.length}; });
  if (pts.length < 3) { el.replaceChildren(h('p', {class: 'w-mut w-sm', text: 'Bij ' + meer(pts.length, 'maand', 'maanden') + ' in beeld wordt geen lijn getekend: een lijn suggereert een verloop dat er dan niet is. Kies een langere periode.'})); return; }
  const w = Math.max(260, el.clientWidth), ht = 220, mg = {t: 14, r: 52, b: 26, l: 46};
  const x = d3.scalePoint().domain(pts.map((d) => d.m)).range([mg.l, w - mg.r]).padding(0.3), y = d3.scaleLinear().domain([0, 100]).range([ht - mg.b, mg.t]);
  const svg = h('svg', {class: 'w-svg', viewBox: '0 0 ' + w + ' ' + ht, width: '100%', role: 'img', 'aria-label': 'Lijngrafiek: aandeel Conform en aandeel afwijking plus verbeterpunt van de waargenomen regels per maand'});
  [0, 25, 50, 75, 100].forEach((v) => svg.append(h('line', {x1: mg.l, x2: w - mg.r, y1: y(v), y2: y(v), stroke: 'var(--cds-chart-grid,var(--color-border-line))'}), h('text', {x: mg.l - 6, y: y(v) + 4, 'text-anchor': 'end', text: v + '%'})));
  const stap = Math.ceil(pts.length / Math.max(1, Math.floor((w - mg.l - mg.r) / 48)));
  pts.forEach((d, i) => { if (i % stap === 0) svg.append(h('text', {x: x(d.m), y: ht - 6, 'text-anchor': 'middle', text: MND[+d.m.slice(5, 7) - 1]})); });
  const lijn = (k, kleur, streep) => {
    svg.append(h('path', {d: d3.line().x((d) => x(d.m)).y((d) => y(d[k]))(pts), fill: 'none', stroke: kleur, 'stroke-width': 2, 'stroke-dasharray': streep}));
    pts.forEach((d) => svg.append(h('circle', {cx: x(d.m), cy: y(d[k]), r: 4, fill: kleur, stroke: 'var(--color-panel)', 'stroke-width': 2})));
  };
  lijn('pos', 'var(--color-ok)', null); lijn('neg', 'var(--color-bad)', '6 4');
  const l = pts[pts.length - 1], dy = Math.abs(y(l.pos) - y(l.neg)) < 14 ? (l.pos >= l.neg ? -8 : 8) : 0;
  svg.append(h('text', {class: 'w-val', x: x(l.m) + 9, y: y(l.pos) + 4 + dy, text: '✓ ' + NL(l.pos) + '%'}), h('text', {class: 'w-val', x: x(l.m) + 9, y: y(l.neg) + 4 - dy, text: '✕△ ' + NL(l.neg) + '%'}));
  el.replaceChildren(svg); const tip = tipper(el), bw = (w - mg.l - mg.r) / pts.length;
  pts.forEach((d) => svg.append(tip(clk(h('rect', {x: x(d.m) - bw / 2, y: mg.t, width: bw, height: ht - mg.t - mg.b, fill: 'transparent', 'aria-label': mnd(d.m)}), mnd(d.m) + ' – waargenomen regels', 'regels', (r) => r.maand === d.m && WAAR(r)),
    mnd(d.m) + EOL + '✓ Conform: ' + NL(d.pos) + '%' + EOL + '✕△ Afwijking + verbeterpunt: ' + NL(d.neg) + '%' + EOL + meer(d.n, 'regel gezien', 'regels gezien'))));
});
dash.draw('herh', (el) => {
  const s = S(); if (!s.ok || !s.herh.length) return leeg(el, s);
  const ws = new Map(D('wpis').data.map((w) => [w.nr, w]));
  el.replaceChildren(tbl([
    ['Bevinding (groep)', (x) => h('span', null, h('b', {text: x.label}), x.teksten.length > 1 && h('small', {class: 'w-blok w-mut', text: 'Samengenomen: ' + x.teksten.map((t) => '“' + kort(t, 70) + '”').join(' · ')}), h('small', {class: 'w-blok w-mut', text: 'Regels: ' + uniek(x.l, (a) => a.ref).join(', ')}))],
    ['Keer', (x) => clk(h('span', {text: meer(x.l.length, 'actie', 'acties')}), x.label, 'acties', (a) => x.ids.has(a.actie)), 'w-num'],
    ['WPI’s', (x) => { const n = new Set(x.l.map((a) => a.wpi)); return clk(h('span', {text: NL(n.size)}), x.label + ' – WPI’s', 'wpis', (w) => n.has(w.nr)); }, 'w-num'],
    ['Producten', (x) => uniek(x.l, (a) => (ws.get(a.wpi) || {}).product || a.product).join(', ')],
    ['Klasse', (x) => x.klasse],
    ['Acties', (x) => { const k = x.l.filter((a) => a.status === 'Afgerond').length; return '✓ ' + k + ' afgerond · △ ' + (x.l.length - k) + ' open'; }],
    ['Terug na afronding', (x) => x.terug ? h('span', {class: 'w-st bad', text: '✕ ja'}) : h('span', {class: 'w-mut', text: 'nee'})]], s.herh, 'w-herht'));
});
const negSegs = (rows, pred) => [
  {n: rows.filter(is('Afwijking')).length, c: 'o-afw', t: 'Afwijking', pred: (r) => pred(r) && r.oordeel === 'Afwijking'},
  {n: rows.filter(is('Verbeterpunt')).length, c: 'o-ver', t: 'Verbeterpunt', pred: (r) => pred(r) && r.oordeel === 'Verbeterpunt'}];
dash.draw('klasse', (el) => {
  const s = S(); if (!s.ok || !s.rg.length) return leeg(el, s);
  el.replaceChildren(); const tip = tipper(el);
  const lijst = KLASSEN.concat(uniek(s.rg, (r) => r.classificatie).filter((c) => !KLASSEN.includes(c)));
  const items = lijst.map((c) => {
    const f = (r) => r.classificatie === c, rows = s.rg.filter((r) => f(r) && WAAR(r)), a = rows.filter(is('Afwijking')).length, v = rows.filter(is('Verbeterpunt')).length, w = rows.length;
    const pct = w ? ' (' + NL(100 * (a + v) / w) + '%)' : '';
    return {label: c, sub: w ? '✕ ' + a + ' · △ ' + v + ' · ' + meer(w, 'regel gezien', 'regels gezien') + (w < MIN_N ? ' · te klein voor een conclusie' : '') : 'geen waargenomen regels', o: a + v, sh: w ? (a + v) / w : 0,
      val: w ? (a + v) + ' van ' + w + pct : '—',
      segs: [...negSegs(rows, f), {n: w - a - v, c: 'o-con', t: 'Conform (positief)', pred: (r) => f(r) && r.oordeel === 'Conform'}]};
  }).sort((x, y) => y.o - x.o || y.sh - x.sh || d3.ascending(x.label, y.label));
  el.prepend(bars(s.p.classificatie ? items.filter((i) => i.label === s.p.classificatie) : items, tip));
});
dash.draw('mom', (el) => {
  const s = S(); if (!s.ok || !s.wp.length) return leeg(el, s);
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(s.wp.slice().sort((a, b) => d3.ascending(a.datum, b.datum)).map((w) => {
    const f = (x) => x.wpi === w.nr, r = s.rg.filter(f), c = r.filter(is('Conform')).length, nv = r.filter(NVT).length;
    return {label: w.nr + (SPO(w) ? ' · spontaan' : ''), sub: dat(w.datum) + ' · ' + meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen') + ': ' + kort((w.taken || '—').split(' | ').join('; '), 90),
      val: '✓ ' + c + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length + (nv ? ' · – ' + nv : ''),
      segs: [{n: c, c: 'o-con', t: 'Conform', pred: (x) => f(x) && x.oordeel === 'Conform'}, ...negSegs(r, f), {n: nv, c: 'o-nvt', t: 'Niet van toepassing', pred: (x) => f(x) && NVT(x)}]};
  }), tip));
});
dash.draw('taken', (el) => {
  const s = S(); if (!s.ok || !s.wp.length) return leeg(el, s);
  const st = s.wp.flatMap((w) => (w.stappen || '').split(' | ').filter(Boolean).map((x) => ({wpi: w.nr, taak: x.split(' › ')[0], stap: x.includes(' › ')})));
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(d3.groups(st, (x) => x.taak).map(([t, l]) => {
    const nw = new Set(l.map((x) => x.wpi)), ns = l.filter((x) => x.stap).length, f = (r) => r.taak === t && nw.has(r.wpi), r = s.rg.filter(f), c = r.filter(is('Conform')).length;
    return {label: t, n: nw.size, sub: meer(nw.size, 'WPI', 'WPI’s') + ' · ' + (ns ? meer(ns, 'taakstap', 'taakstappen') + ' getoetst' : 'op taakniveau (de TRA kent hier geen taakstap)'),
      val: '✓ ' + c + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length,
      segs: [{n: c, c: 'o-con', t: 'Conform', pred: (x) => f(x) && x.oordeel === 'Conform'}, ...negSegs(r, f)]};
  }).sort((a, b) => b.n - a.n || d3.ascending(a.label, b.label)), tip));
});

/* ---------- TRA-toetsing ---------- */
dash.draw('tra', (el) => {
  const s = S(), tra = s.rg.filter((r) => r.soort === 'TRA' && WAAR(r));
  if (!s.ok || !tra.filter(NEG).length) return leeg(el, s);
  const kb = new Map(s.kb.map((k) => [k.id, k]));
  const lijst = d3.groups(tra, (r) => r.ref).map(([id, rows]) => ({id, rows, a: rows.filter(is('Afwijking')).length, v: rows.filter(is('Verbeterpunt')).length, k: kb.get(id) || {}}))
    .filter((x) => x.a + x.v).sort((x, y) => (y.a + y.v) - (x.a + x.v) || (y.a + y.v) / y.rows.length - (x.a + x.v) / x.rows.length || y.a - x.a || d3.ascending(x.id, y.id));
  const toon = W.traAll ? lijst : lijst.slice(0, 6);
  el.replaceChildren(
    h('p', {class: 'w-sm w-mut', text: meer(tra.length, 'toetsing', 'toetsingen') + ' van ' + meer(new Set(tra.map((r) => r.ref)).size, 'unieke TRA-regel', 'unieke TRA-regels') + '; ' + meer(lijst.length, 'unieke regel', 'unieke regels') + ' met een afwijking of verbeterpunt. Volgorde: aantal, dan aandeel, dan afwijking vóór verbeterpunt.'}),
    h('div', {class: 'w-items'}, toon.map((x) => h('details', {class: 'w-item'},
      h('summary', null, h('b', {text: x.id + ' · ' + (x.k.product || x.rows[0].product) + ' — ' + (x.a + x.v) + ' van ' + meer(x.rows.length, 'toetsing', 'toetsingen')}),
        h('span', {class: 'w-sm', text: '✕ ' + x.a + ' · △ ' + x.v + ' · ' + x.rows[0].classificatie}),
        h('span', {class: 'w-sm w-mut', text: kort(x.k.risico || x.rows[0].omschrijving, 140)})),
      h('p', {class: 'w-sm'}, h('b', {text: 'Fase: '}), x.k.fase || '—', h('br'), h('b', {text: 'Taak: '}), x.k.taak || '—', x.k.taakstap ? [h('br'), h('b', {text: 'Taakstap: '}), x.k.taakstap] : null),
      h('p', {class: 'w-sm'}, h('b', {text: 'Risico: '}), x.k.risico || x.rows[0].omschrijving),
      h('p', {class: 'w-sm'}, h('b', {text: 'Maatregelen uit de TRA:'})),
      h('ul', {class: 'w-sm'}, (x.k.maatregelen || '').split(' | ').filter(Boolean).map((m) => h('li', {text: m}))),
      clk(h('span', {class: 'w-sm', text: 'Toon de toetsingen en acties'}), 'TRA-regel ' + x.id, 'regels', (r) => r.ref === x.id)))),
    lijst.length > 6 && (() => { const b = h('button', {type: 'button', class: 'w-btn', style: 'margin-top:.6em', text: W.traAll ? 'Toon alleen de eerste 6' : 'Toon alle ' + lijst.length}); b.onclick = () => { W.traAll = !W.traAll; dash.draw('tra'); }; return b; })());
});
dash.draw('dim', (el) => {
  const s = S(); if (!s.ok || !s.rg.filter(NEG).length) return leeg(el, s);
  const dim = W.dim, basis = dim === 'taak' ? s.rg.filter((r) => r.taak) : s.rg;
  const key = dim === 'product' ? (r) => r.product : dim === 'fase' ? (r) => r.product + ' – ' + r.fase : (r) => r.product + ' – ' + r.taak;
  el.replaceChildren(); const tip = tipper(el);
  const items = d3.groups(basis, key).map(([k, alle]) => {
    const v = alle.filter(NEG), w = new Set(alle.map((r) => r.wpi)).size;
    return {label: k, sub: meer(w, 'WPI', 'WPI’s') + ' · ' + meer(alle.length, 'regel', 'regels'), o: v.length, val: '✕ ' + v.filter(is('Afwijking')).length + ' · △ ' + v.filter(is('Verbeterpunt')).length, segs: negSegs(v, (r) => key(r) === k && (dim !== 'taak' || r.taak))};
  }).filter((x) => x.o).sort((x, y) => y.o - x.o || d3.ascending(x.label, y.label)).slice(0, 8);
  el.prepend(bars(items, tip));
  if (dim === 'taak') el.append(h('p', {class: 'w-sm w-mut', text: 'Alleen TRA-regels hebben een taak; algemene onderwerpen en Buiten TRA tellen hier niet mee. Hoogstens 8 getoond.'}));
});
dash.draw('mdim', (el) => {
  const s = S(); if (!s.ok || s.fout) { el.textContent = '—'; return; }
  const dim = W.dim, basis = dim === 'taak' ? s.rg.filter((r) => r.taak) : s.rg;
  const key = dim === 'product' ? (r) => r.product : dim === 'fase' ? (r) => r.product + ' – ' + r.fase : (r) => r.product + ' – ' + r.taak;
  const g = d3.groups(basis, key).map(([k, v]) => [k, v.filter(NEG).length, new Set(v.map((r) => r.wpi)).size]).filter((x) => x[1]).sort((a, b) => b[1] - a[1] || d3.ascending(a[0], b[0]));
  el.textContent = g.length ? topTies(g, 1, (x) => x[1]).map((x) => x[0] + ' (' + x[1] + ' in ' + meer(x[2], 'WPI', 'WPI’s') + ')').join(', ') : 'geen';
});
dash.draw('buiten', (el) => {
  const s = S(), b = s.rg.filter((r) => r.soort === 'Buiten TRA'); if (!s.ok || !b.length) return leeg(el, s);
  const ac = new Map(D('acties').data.map((a) => [a.actie, a]));
  el.replaceChildren(h('div', {class: 'w-items'}, cnt(b, (r) => r.omschrijving).map(([o, n]) => {
    const rows = b.filter((r) => r.omschrijving === o), nrs = rows.flatMap((r) => (r.acties || '').split(', ').filter(Boolean));
    const st = nrs.map((x) => ac.get(x)).filter(Boolean), op = st.filter((a) => a.status === 'Open').length;
    return clk(h('div', {class: 'w-item'}, h('b', {text: n + '× ' + o}), h('br'),
      h('span', {class: 'w-sm w-mut', text: 'Product: ' + uniek(rows, (r) => r.product).join(', ') + ' · ' + meer(st.length, 'actie', 'acties') + ' (' + op + ' open): ' + nrs.join(', ')})), 'Buiten TRA – ' + o, 'regels', (r) => r.soort === 'Buiten TRA' && r.omschrijving === o);
  })));
});
/* ---------- Acties ---------- */
const vbCel = (a) => h('span', null, a.verbeteractie, a.direct_genomen_maatregel && h('small', {class: 'w-blok w-mut', text: 'Direct genomen: ' + a.direct_genomen_maatregel}));
const termijnCel = (a, s) => a.status === 'Afgerond' ? dat(a.termijn) : h('span', null, dat(a.termijn), h('small', {class: 'w-blok ' + (s.over(a) ? 'w-st bad' : 'w-mut'), text: s.over(a) ? meer(days(a.termijn, s.peil), 'dag', 'dagen') + ' over tijd' : a.termijn === s.peil ? 'termijn vandaag' : 'nog ' + meer(days(s.peil, a.termijn), 'dag', 'dagen')}));
const statusCel = (a, s) => a.status === 'Afgerond' ? h('span', {class: 'w-st ok', text: '✓ Afgerond'}) : s.over(a) ? h('span', {class: 'w-st bad', text: '✕ Over termijn'}) : h('span', {class: 'w-st warn', text: '△ Open'});
const OPEN_KOL = (s) => [['Actienummer', (a) => h('span', null, h('b', {text: a.actie}), h('small', {class: 'w-blok w-mut', text: a.prioriteit + ' · ' + a.bron}))], ['Termijn', (a) => termijnCel(a, s)], ['Status', (a) => statusCel(a, s)],
  ['Bevinding', (a) => h('span', null, a.bevinding, h('small', {class: 'w-blok w-mut', text: a.ref + ' · ' + a.classificatie}))], ['Verbeteractie', vbCel], ['Actiehouder', (a) => a.actiehouder], ['Toetser', (a) => a.toetser]];
const KLAAR_KOL = [['Actienummer', (a) => h('b', {text: a.actie})], ['Prioriteit', (a) => a.prioriteit], ['Termijn', (a) => dat(a.termijn)], ['Bevinding', (a) => a.bevinding],
  ['TRA-ID / klasse', (a) => h('span', null, h('b', {text: a.ref}), h('small', {class: 'w-blok w-mut', text: a.classificatie}))], ['Verbeteractie', vbCel], ['Actiehouder', (a) => a.actiehouder],
  ['Afgerond op', (a) => h('span', null, dat(a.afgerond_op), a.afgerond_op > a.termijn && h('small', {class: 'w-blok w-st warn', text: 'na termijn ' + dat(a.termijn)}))], ['Getoetst op', (a) => dat(a.getoetst_op)], ['Toetser', (a) => a.toetser]];
const rijen = (el, rows, cols) => el.replaceChildren(...rows.map((a) => h('tr', {'data-key': a.actie}, cellen(cols, a))));
dash.draw('openrijen', (el) => {
  const s = S(); if (!s.ok) { el.replaceChildren(); return; }
  const l = s.ac.filter((a) => a.status === 'Open').sort((a, b) => d3.ascending(a.termijn, b.termijn) || d3.ascending(a.actie, b.actie));
  rijen(el, W.openAll ? l : l.slice(0, 8), OPEN_KOL(s));
});
dash.draw('openmeer', (el) => {
  const s = S(), n = s.ok ? s.ac.filter((a) => a.status === 'Open').length : 0;
  if (n <= 8) { el.replaceChildren(); return; }
  const b = h('button', {type: 'button', class: 'w-btn', text: W.openAll ? 'Toon alleen de eerste 8' : 'Toon alle ' + n + ' open acties'});
  b.onclick = () => { W.openAll = !W.openAll; dash.draw('openrijen'); dash.draw('openmeer'); };
  el.replaceChildren(h('p', {class: 'w-sm w-mut'}, W.openAll ? '' : 'De eerste 8 op termijn (over de termijn eerst). ', b));
});
dash.draw('klaarrijen', (el) => {
  const s = S(); if (!s.ok) { el.replaceChildren(); return; }
  rijen(el, s.ac.filter((a) => a.status === 'Afgerond').sort((a, b) => d3.descending(a.afgerond_op, b.afgerond_op) || d3.ascending(a.actie, b.actie)), KLAAR_KOL);
});
dash.draw('nklaar', (el) => { const s = S(); el.textContent = s.ok ? NL(s.ac.filter((a) => a.status === 'Afgerond').length) : '—'; });
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
  el.prepend(bars(items, tip));
});
dash.draw('normrijen', (el) => {
  const s = S(); if (!s.ok) { el.replaceChildren(); return; }
  const kl = s.ac.filter((a) => a.status === 'Afgerond'), duur = (a) => days(a.datum, a.afgerond_op);
  const def = [['direct', 'zelfde dag', (a) => duur(a) <= NORM.direct], ['kort', NORM.kort + ' dagen', (a) => duur(a) <= NORM.kort], ['planmatig', 'eigen termijn', (a) => a.afgerond_op <= a.termijn]];
  el.replaceChildren(...def.map(([p, norm, ok]) => { const v = kl.filter((a) => a.prioriteit === p), oo = s.ac.filter((a) => a.prioriteit === p && a.status === 'Open').length;
    const lft = s.ac.filter((a) => a.prioriteit === p && a.status === 'Open').map((a) => days(a.datum, s.peil));
    return h('tr', null, cellen([['Prioriteit', () => h('b', {text: p})], ['Norm', () => norm], ['Afgerond', () => NL(v.length)], ['Gemiddeld (afgerond)', () => v.length ? NL(d3.mean(v, duur), 1) + ' dagen' : '—', 'w-num'],
      ['Binnen norm', () => v.length ? h('span', {class: 'w-st ' + (v.filter(ok).length === v.length ? 'ok' : 'bad')}, clk(h('span', {text: v.filter(ok).length + ' van ' + v.length}), 'Prioriteit ' + p + ' – afgerond', 'acties', (a) => a.prioriteit === p && a.status === 'Afgerond')) : '—'], ['Nog open', () => oo ? clk(h('span', {text: NL(oo)}), 'Prioriteit ' + p + ' – open', 'acties', (a) => a.prioriteit === p && a.status === 'Open') : '0', 'w-num'],
      ['Leeftijd open', () => lft.length ? 'gem. ' + NL(d3.mean(lft), 1) + ' dagen (oudste ' + NL(d3.max(lft)) + ')' : '—', 'w-num']], null)); }));
});

/* ---------- CSV-export (puntkomma, voor Excel NL) ---------- */
const Q2 = String.fromCharCode(34), csvCel = (v) => { const t = v == null ? '' : String(v); return [';', ',', EOL, Q2].some((x) => t.includes(x)) ? Q2 + t.split(Q2).join(Q2 + Q2) + Q2 : t; };
const csvTekst = (rijen) => rijen.map((r) => r.map(csvCel).join(';')).join(String.fromCharCode(13, 10));
const csvRijen = (soort) => { const s = S(); if (!s.ok) return [];
  if (soort === 'acties') return [['Actienummer', 'WPI', 'Datum WPI', 'TRA-ID / onderwerp', 'Klasse', 'Bron', 'Prioriteit', 'Bevinding', 'Verbeteractie', 'Direct genomen maatregel', 'Direct gecorrigeerd', 'Actiehouder', 'Toetser', 'Termijn', 'Status', 'Over de termijn', 'Afgerond op', 'Getoetst op']]
    .concat(s.ac.slice().sort((a, b) => d3.ascending(a.actie, b.actie)).map((a) => [a.actie, a.wpi, a.datum, a.ref, a.classificatie, a.bron, a.prioriteit, a.bevinding, a.verbeteractie, a.direct_genomen_maatregel || '', a.direct_gecorrigeerd ? 'ja' : 'nee', a.actiehouder, a.toetser, a.termijn, a.status, s.over(a) ? 'ja' : 'nee', a.afgerond_op || '', a.getoetst_op || '']));
  return [['Project', 'Product', 'Locatie', 'Start', 'Eind', 'Eis', 'Maand', 'Uitkomst', 'WPI’s']]
    .concat(s.vp.filter((o) => o.p).sort((a, b) => d3.ascending(a.p.start, b.p.start) || d3.ascending(a.project, b.project) || d3.ascending(a.maand, b.maand)).map((o) => [PN(o.project), o.p.product, o.p.locatie, o.p.start, o.p.eind, CAT[o.cat], o.maand,
      o.nv ? (o.ok ? 'WPI, maand niet verplicht' : 'niet verplicht') : o.ok ? 'uitgevoerd' : !o.telt ? 'loopt nog' : 'gemist', o.wpis.join(', ')])); };
document.querySelectorAll('[data-csv]').forEach((b) => b.addEventListener('click', () => {
  const soort = b.dataset.csv, tekst = csvTekst(csvRijen(soort)), naam = 'WPI-' + soort + '-voorbeeld-' + peilAlle() + '.csv';
  W.csv = {soort, tekst}; dash.draw('csvuit');
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([String.fromCharCode(65279) + tekst], {type: 'text/csv;charset=utf-8'})); a.download = naam; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch (e) { /* tekst staat hieronder */ }
}));
dash.draw('csvuit', (el) => {
  const c = W.csv; if (!c || c.soort !== el.dataset.csvuit) { el.replaceChildren(); return; }
  el.replaceChildren(h('p', {class: 'w-sm w-mut', text: 'Downloadt er niets? Kopieer de tekst hieronder en plak die in Excel (scheidingsteken puntkomma). Huidige filters zijn toegepast.'}),
    h('textarea', {class: 'w-csv', readonly: true, rows: 6, 'aria-label': 'CSV-tekst', text: c.tekst}));
});

/* ---------- doorklikken ---------- */
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
    cols = [['WPI', (w) => wpiKnop(w.nr)], ['Datum', (w) => dat(w.datum)], ['Inspecteur', (w) => w.inspecteur], ['Ingang', (w) => w.ingang || '—'], ['Project', (w) => PN(w.project || '—')], ['Product en fase', (w) => w.product + ' · ' + w.fase],
      ['Getoetst', (w) => h('span', null, meer(+w.n_stappen || 0, 'taak of taakstap', 'taken en taakstappen'), h('small', {class: 'w-blok w-mut', text: kort((w.taken || '—').split(' | ').join('; '), 110)}))],
      ['Bevindingen', (w) => { const r = D('regels').data.filter((x) => x.wpi === w.nr); return '✓ ' + r.filter(is('Conform')).length + ' · ✕ ' + r.filter(is('Afwijking')).length + ' · △ ' + r.filter(is('Verbeterpunt')).length; }]];
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
    extra = h('dl', {class: 'w-dl w-dl2'}, [['Soort', w.soort], ['Opdrachtgever', w.opdrachtgever], ['Locatie', w.locatie], ['Project', PN(w.project || '—')], ['Product', w.product], ['Fase', w.fase], ['Ingang', w.ingang], ['Getoetst tijdens bezoek', (w.stappen || '').split(' | ').join('; ')], ['Monteurs', w.monteurs == null ? '—' : meer(w.monteurs, 'monteur', 'monteurs')]].map(([k, v]) => [h('dt', {text: k}), h('dd', {text: v || '—'})]));
    const nc = rows.filter(is('Conform')).length;
    extra = h('div', null, extra, nc ? h('p', {class: 'w-sm w-mut', text: meer(nc, 'positieve bevinding', 'positieve bevindingen') + ' (Conform). Wat de inspecteur daarbij zag staat niet in de gegevenstabel maar in het WPI-rapport ' + w.nr + ', hoofdstuk 5 “Positieve bevindingen”.'}) : null);
    cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70), STAP(r) && h('small', {class: 'w-blok w-mut', text: 'Getoetst: ' + kort(STAP(r), 110)}))], ['Oordeel', (r) => r.oordeel === 'Conform' ? h('span', null, badge(r.oordeel), h('small', {class: 'w-blok w-mut', text: 'waarneming: rapport ' + w.nr + ', h5'})) : badge(r.oordeel)], ['Actie', (r) => actKnoppen(r.acties)]];
  } else {
    rows = B.rg.filter(d.pred);
    cols = [['WPI', (r) => wpiKnop(r.wpi)], ['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Taak / taakstap', (r) => STAP(r) ? kort(STAP(r), 90) : r.soort === 'Algemeen' ? 'algemeen onderwerp' : r.soort], ['Actie', (r) => actKnoppen(r.acties)]];
    kop += ' — ' + meer(rows.length, 'regel', 'regels');
  }
  const sluit = h('button', {type: 'button', class: 'w-btn', text: 'Sluiten'}); sluit.onclick = () => { W.drill = null; dash.draw('detail'); };
  const terug = d.terug && h('button', {type: 'button', class: 'w-btn', text: '← Terug'}); if (terug) terug.onclick = () => { W.drill = d.terug; dash.draw('detail'); };
  el.classList.add('w-open');
  el.replaceChildren(...[h('div', {class: 'w-dh'}, h('span', {text: kop}), h('span', {class: 'w-knoppen'}, terug, sluit)), extra,
    d.kind === 'actie' ? null : h('div', {class: 'w-scroll'}, rows.length ? tbl(cols, rows, cls) : h('p', {class: 'w-mut', text: 'Geen rijen binnen deze filters.'}))].filter(Boolean));
});

/* ---------- tabbladen en knoppen ---------- */
const TABS = ['overzicht', 'programma', 'bevindingen', 'tra', 'acties'];
const openTab = (id, link) => {
  document.querySelectorAll('.w-sec').forEach((sec) => { sec.hidden = sec.id !== id; });
  document.querySelectorAll('.w-tabbar').forEach((x) => { x.hidden = false; });
  document.querySelectorAll('[data-tabknop]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tabknop === id)));
  document.querySelectorAll('.w-filterbar').forEach((f) => { f.hidden = id === 'overzicht'; });
  W.drill = null;
  const namen = new Set(['detail', 'f-actief']); document.querySelectorAll('#' + id + ' [data-draw]').forEach((e) => namen.add(e.dataset.draw));
  namen.forEach((n) => dash.draw(n));
  thema();
  if (link) dash.setLink(id);
};
document.querySelectorAll('.w-fold').forEach((f) => f.addEventListener('toggle', () => {
  const namen = new Set(); f.querySelectorAll('[data-draw]').forEach((e) => namen.add(e.dataset.draw)); namen.forEach((n) => dash.draw(n));
}));
const vastleg = (aan) => {
  document.querySelectorAll('.w-sec').forEach((sec) => { sec.hidden = aan ? sec.id !== 'vastleggen' : sec.id === 'vastleggen' || sec.hidden; });
  document.querySelectorAll('.w-tabbar,.w-filterbar').forEach((x) => { x.hidden = aan || (x.classList.contains('w-filterbar') && !document.querySelector('#overzicht').hidden); });
  if (aan) dash.draw('vastleg'); else openTab('overzicht', true);
};
document.querySelectorAll('[data-act=vastleg]').forEach((b) => b.addEventListener('click', () => vastleg(true)));
document.querySelectorAll('[data-act=terug]').forEach((b) => b.addEventListener('click', () => vastleg(false)));
document.querySelectorAll('[data-act=print]').forEach((b) => b.addEventListener('click', () => { dash.draw('vastleg'); window.print(); }));
window.addEventListener('beforeprint', () => dash.draw('vastleg'));
document.querySelectorAll('[data-act=filters]').forEach((b) => b.addEventListener('click', () => {
  const bar = b.closest('.w-filterbar'), open = !bar.classList.contains('w-fopen');
  bar.classList.toggle('w-fopen', open); b.setAttribute('aria-expanded', String(open));
}));
document.querySelectorAll('[data-tabknop]').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tabknop, true)));
document.querySelectorAll('[data-naar]').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.naar, true)));
document.querySelectorAll('[data-act=reset]').forEach((b) => b.addEventListener('click', () => { W.drill = null; dash.resetParams(); }));
document.querySelectorAll('[data-dim]').forEach((b) => b.addEventListener('click', () => {
  W.dim = b.dataset.dim;
  document.querySelectorAll('[data-dim]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  dash.draw('dim'); dash.draw('mdim');
}));
openTab(TABS.includes((location.hash || '').slice(1)) ? location.hash.slice(1) : 'overzicht', false);
