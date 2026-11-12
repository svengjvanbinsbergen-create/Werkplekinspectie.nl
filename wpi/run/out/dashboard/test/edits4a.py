p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
# helpers
R("""  return q + ' (' + dat(a + '-01').slice(0, 5) + ' t/m ' + dat(eind).slice(0, 5) + ', onvolledig)'; };
""","""  return q + ' (' + dat(a + '-01').slice(0, 5) + ' t/m ' + dat(eind).slice(0, 5) + ', onvolledig)'; };
const zp = (t) => t && t.endsWith('.') ? t.slice(0, -1) : t;
const PN = (x) => x.replace(' (fictief)', '');

/* ---------- programma per operationele werkplek (VCA 7.1 + voetnoot 10; invulling: voorstel procedure 5.5) ---------- */
const RISK = (p) => !!(p.hijsen_mobiele_kraan || p.besloten_ruimte_vergunning || p.open_water);
const RISKT = (p) => [p.hijsen_mobiele_kraan && 'hijsen', p.besloten_ruimte_vergunning && 'besloten ruimte', p.open_water && 'open water'].filter(Boolean).join(', ');
const mEind = (m) => m + '-' + String(new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate()).padStart(2, '0');
const mVolg = (m) => { const y = +m.slice(0, 4), n = +m.slice(5, 7); return n === 12 ? (y + 1) + '-01' : y + '-' + String(n + 1).padStart(2, '0'); };
const LANG = (p) => days(p.start, p.eind) > 31;
const CAT = {lang: 'langer dan een maand: elke kalendermaand een WPI', risico: 'kort, met risicokenmerk: ten minste één WPI', overig: 'kort, zonder risicokenmerk: één op de vier per kwartaal'};
const CATK = {lang: '> 1 maand', risico: 'kort · risico', overig: 'kort'};
/* Eén verplichting = één WPI die volgens de regel nodig is. telt = de periode van de verplichting is voorbij (maand om, of project afgelopen);
   een verplichting in de lopende maand of van een nog lopend kort project telt pas mee als die periode voorbij is. */
const verplicht = (projecten, wpis, peil) => {
  const uit = [], overig = [];
  projecten.forEach((p) => {
    const ws = wpis.filter((w) => w.project === p.project).sort((a, b) => d3.ascending(a.datum, b.datum)), nrs = (l) => l.map((w) => w.nr);
    const b = {project: p.project, p, product: p.product};
    if (p.start > peil) return;
    if (LANG(p)) {
      const tot = (p.eind < peil ? p.eind : peil).slice(0, 7);
      for (let m = p.start.slice(0, 7); m <= tot; m = mVolg(m)) {
        const w = ws.filter((x) => x.maand === m), einde = mEind(m) < p.eind ? mEind(m) : p.eind;
        uit.push({...b, cat: 'lang', maand: m, telt: einde <= peil, ok: w.length > 0, wpis: nrs(w)});
      }
    } else if (RISK(p)) {
      uit.push({...b, cat: 'risico', maand: ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7), telt: p.eind <= peil, ok: ws.length > 0, wpis: nrs(ws)});
    } else overig.push({...b, cat: 'overig', maand: (ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7)), telt: false, ok: ws.length > 0, wpis: nrs(ws), info: true});
  });
  /* overige korte projecten: per kwartaal (op einddatum, afgelopen projecten) is één op de vier verplicht, naar boven afgerond */
  d3.groups(overig.filter((o) => o.p.eind <= peil), (o) => kw(o.p.eind.slice(0, 7))).forEach(([q, l]) => {
    const nodig = Math.ceil(l.length / 4), gedaan = l.filter((o) => o.ok);
    for (let i = 0; i < nodig; i++) uit.push({project: '1 op 4 · ' + q, p: null, product: '', cat: 'overig', maand: d3.max(l, (o) => o.p.eind).slice(0, 7), telt: true, ok: i < gedaan.length, wpis: i < gedaan.length ? gedaan[i].wpis : [], q});
  });
  return uit.concat(overig);
};
const telVp = (vp) => { const t = vp.filter((o) => o.telt), x = t.filter((o) => o.ok).length; return {x, y: t.length}; };
""")
# kern inputs and keys
R("""  inputs: ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum', 'trendacties'],
  fn: (wpis, regels, acties, programma, kennisbank, peildatum, trendacties) => {""","""  inputs: ['wpis', 'regels', 'acties', 'programma', 'kennisbank', 'peildatum', 'trendacties', 'projecten'],
  fn: (wpis, regels, acties, programma, kennisbank, peildatum, trendacties, projecten) => {""")
R("""    zet('trend_n', trendacties.length);""","""    const vp = verplicht(projecten, wpis, peil), tv = telVp(vp), tel = vp.filter((o) => o.telt);
    zet('pw_x', tv.x); zet('pw_y', tv.y); zet('pw_pct', pc(tv.x, tv.y)); zet('pw_mis', tv.y - tv.x); zet('pw_proj', projecten.length);
    ['lang', 'risico', 'overig'].forEach((c) => { const t = telVp(vp.filter((o) => o.cat === c)); zet('pw_' + c + '_x', t.x); zet('pw_' + c + '_y', t.y); });
    zet('pw_overig_n', projecten.filter((p) => !LANG(p) && !RISK(p)).length);
    const nul = d3.groups(tel.filter((o) => o.p), (o) => o.project).filter(([, l]) => !l.some((o) => o.ok)).map(([k]) => k);
    zet('pw_nul', nul.length, nul.map(PN).join(', ') || 'geen');
    zet('pw_lop', vp.filter((o) => !o.telt && !o.info).length);
    const herh = d3.groups(acties, (a) => a.bevinding).map(([b, l]) => ({b, l, w: new Set(l.map((a) => a.wpi)).size})).filter((x) => x.w > 1)
      .sort((a, b) => b.l.length - a.l.length || b.w - a.w || d3.ascending(a.b, b.b));
    zet('herh_n', herh.length); zet('herh_acties', d3.sum(herh, (x) => x.l.length));
    zet('herh_top', herh.length, topTies(herh, 3, (x) => x.l.length).map((x) => zp(x.b) + ' (' + x.l.length + '× in ' + meer(x.w, 'WPI', 'WPI’s') + ')').join('; ') || 'geen');
    zet('herh_terug', herh.filter((x) => x.l.some((a) => a.afgerond_op && x.l.some((y) => a.afgerond_op < y.datum))).length);
    const tpw = trendacties.find((t) => (t.onderwerp || '').toLowerCase().includes('programma'));
    zet('trend_pw', 0, tpw ? tpw.nr : '—');
    zet('trend_n', trendacties.length);""")
open(p,'w').write(s); print('ok')
