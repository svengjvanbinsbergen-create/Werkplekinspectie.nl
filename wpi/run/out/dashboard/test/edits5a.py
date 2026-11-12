p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
# --- helpers: werkdagen, koppeling, groepering
R("""const LANG = (p) => days(p.start, p.eind) > 31;""","""const LANG = (p) => days(p.start, p.eind) > 31;
const MIN_WD = 10;
const werkdagen = (a, b) => { let n = 0; for (let d = new Date(a + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= b; d.setUTCDate(d.getUTCDate() + 1)) { const g = d.getUTCDay(); if (g > 0 && g < 6) n++; } return n; };
const pnorm = (x) => (x || '').toLowerCase().split(' (')[0];
/* koppeling WPI -> project: projectnummer, en locatie en product moeten passen */
const past = (w, p) => !!p && w.locatie === p.locatie && (pnorm(p.product).startsWith(pnorm(w.product)) || pnorm(w.product).startsWith(pnorm(p.product)));
const koppelFout = (wpis, projecten) => { const m = new Map(projecten.map((p) => [p.project, p])); return wpis.filter((w) => !past(w, m.get(w.project))); };
const geenWpi = (projecten, wpis, peil) => projecten.filter((p) => p.start <= peil && !wpis.some((w) => w.project === p.project && past(w, p)));""")
R("""    const ws = wpis.filter((w) => w.project === p.project).sort((a, b) => d3.ascending(a.datum, b.datum)), nrs = (l) => l.map((w) => w.nr);""",
"""    const ws = wpis.filter((w) => w.project === p.project && past(w, p)).sort((a, b) => d3.ascending(a.datum, b.datum)), nrs = (l) => l.map((w) => w.nr);""")
R("""        const w = ws.filter((x) => x.maand === m), einde = mEind(m) < p.eind ? mEind(m) : p.eind;
        uit.push({...b, cat: 'lang', maand: m, telt: einde <= peil, ok: w.length > 0, wpis: nrs(w)});""",
"""        const w = ws.filter((x) => x.maand === m), begin = m + '-01' > p.start ? m + '-01' : p.start, einde = mEind(m) < p.eind ? mEind(m) : p.eind, wd = werkdagen(begin, einde);
        if (wd >= MIN_WD) uit.push({...b, cat: 'lang', maand: m, wd, telt: w.length > 0 || einde <= peil, ok: w.length > 0, wpis: nrs(w)});
        else uit.push({...b, cat: 'lang', maand: m, wd, telt: false, ok: w.length > 0, wpis: nrs(w), info: true, nv: true});""")
R("""      uit.push({...b, cat: 'risico', maand: ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7), telt: p.eind <= peil, ok: ws.length > 0, wpis: nrs(ws)});""",
"""      uit.push({...b, cat: 'risico', maand: ws.length ? ws[0].maand : (p.eind < peil ? p.eind : peil).slice(0, 7), telt: ws.length > 0 || p.eind <= peil, ok: ws.length > 0, wpis: nrs(ws)});""")
R("""const telVp = (vp) =>""","""/* terugkerende bevindingen: zelfde klasse en (minstens 2 gedeelde kernwoorden, of zelfde TRA-regel/onderwerp en 1 gedeeld kernwoord) */
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
const telVp = (vp) =>""")
# kern
R("""    zet('gepland', gepland); zet('uitgevoerd', uitgevoerd);""","""    zet('gepland', gepland); zet('uitgevoerd', uitgevoerd);
    const dirNamen = new Set(wpis.filter((w) => w.soort === DIR).map((w) => w.inspecteur)), isDir = (p) => dirNamen.has(p.inspecteur);
    zet('c_gepl', d3.sum(programma.filter((p) => !isDir(p)), (p) => +p.gepland)); zet('c_uitg', d3.sum(programma.filter((p) => !isDir(p)), (p) => +p.uitgevoerd));
    zet('d_gepl', d3.sum(programma.filter(isDir), (p) => +p.gepland)); zet('d_uitg', d3.sum(programma.filter(isDir), (p) => +p.uitgevoerd));""")
R("""    const nul = d3.groups(tel.filter((o) => o.p), (o) => o.project).filter(([, l]) => !l.some((o) => o.ok)).map(([k]) => k);
    zet('pw_nul', nul.length, nul.map(PN).join(', ') || 'geen');
    zet('pw_lop', vp.filter((o) => !o.telt && !o.info).length);
    const herh = d3.groups(acties, (a) => a.bevinding).map(([b, l]) => ({b, l, w: new Set(l.map((a) => a.wpi)).size})).filter((x) => x.w > 1)
      .sort((a, b) => b.l.length - a.l.length || b.w - a.w || d3.ascending(a.b, b.b));
    zet('herh_n', herh.length); zet('herh_acties', d3.sum(herh, (x) => x.l.length));
    zet('herh_top', herh.length, topTies(herh, 3, (x) => x.l.length).map((x) => zp(x.b) + ' (' + x.l.length + '× in ' + meer(x.w, 'WPI', 'WPI’s') + ')').join('; ') || 'geen');
    zet('herh_terug', herh.filter((x) => x.l.some((a) => a.afgerond_op && x.l.some((y) => a.afgerond_op < y.datum))).length);""",
"""    const geen = geenWpi(projecten, wpis, peil), kf = koppelFout(wpis, projecten);
    zet('pw_geen', geen.length, geen.map((p) => PN(p.project)).join(', ') || 'geen');
    zet('pw_lop', vp.filter((o) => !o.telt && !o.info).length); zet('pw_koppel', kf.length, kf.map((w) => w.nr).join(', ') || 'geen');
    const lm = peil.slice(0, 7), inLm = vp.filter((o) => o.maand === lm && !o.info);
    zet('pw_lm_ok', inLm.filter((o) => o.ok).length, mnd(lm)); zet('pw_lm_lop', inLm.filter((o) => !o.telt).length);
    const herh = groepeer(acties);
    zet('herh_n', herh.length); zet('herh_acties', d3.sum(herh, (x) => x.l.length));
    zet('herh_top', herh.length, topTies(herh, 3, (x) => x.l.length).map((x) => x.label + ' (' + x.l.length + '× in ' + meer(x.w, 'WPI', 'WPI’s') + ')').join('; ') || 'geen');
    zet('herh_terug', herh.filter((x) => x.terug).length);
    const opn = (p) => open.filter((a) => a.prioriteit === p).map((a) => days(a.datum, peil));
    zet('open_kort_n', opn('kort').length); zet('open_kort_gem', opn('kort').length ? r1(d3.mean(opn('kort'))) : 0, '', 1); zet('open_kort_max', d3.max(opn('kort')) || 0);""")
# S(): herh, koppel message
R("""  const hg = d3.groups(s.ac, (a) => a.bevinding).filter(([, l]) => new Set(l.map((a) => a.wpi)).size > 1).sort((a, b) => b[1].length - a[1].length || d3.ascending(a[0], b[0]));
  s.herh = hg;
  M.herh = hg.length ? meer(hg.length, 'bevinding kwam', 'bevindingen kwamen') + ' in meer dan één WPI terug; vaakst: ' + zp(hg[0][0]) + ' (' + hg[0][1].length + '×)' : 'geen bevinding kwam in meer dan één WPI terug';""",
"""  const hg = groepeer(s.ac);
  s.herh = hg;
  M.herh = hg.length ? meer(hg.length, 'bevinding kwam', 'bevindingen kwamen') + ' in meer dan één WPI terug; vaakst: ' + hg[0].label + ' (' + hg[0].l.length + '×)' : 'geen bevinding kwam in meer dan één WPI terug';
  const kf = koppelFout(D('wpis').data, D('projecten').data), lop = s.vp.filter((o) => !o.telt && !o.info), lm = s.peil.slice(0, 7), lmOk = s.vp.filter((o) => o.maand === lm && o.ok && !o.info).length;
  M.koppel = kf.length ? 'Let op: ' + meer(kf.length, 'WPI past', 'WPI’s passen') + ' niet bij de locatie of het product van het opgegeven project (' + kf.map((w) => w.nr).join(', ') + '); die tellen niet mee.' : 'Koppelcontrole: alle ' + NL(D('wpis').data.length) + ' WPI’s passen op projectnummer, locatie en product bij een project in de planning.';
  M.lopend = lop.length || lmOk ? mnd(lm) + ' (lopende maand): ' + NL(lmOk) + ' gehaald, ' + NL(lop.length) + ' loopt nog' : '';""")
R("""  M.prio = kortA.length ? 'kort duurt gemiddeld ' + NL(d3.mean(kortA, duur), 1) + ' dagen tegenover de norm van ' + NORM.kort : 'geen afgeronde acties met prioriteit kort';""",
"""  const kortO = s.ac.filter((a) => open(a) && a.prioriteit === 'kort').map((a) => days(a.datum, s.peil));
  M.prio = (kortA.length ? 'kort duurt gemiddeld ' + NL(d3.mean(kortA, duur), 1) + ' dagen (afgerond) tegenover de norm van ' + NORM.kort : 'geen afgeronde acties met prioriteit kort') + (kortO.length ? '; ' + meer(kortO.length, 'open actie is', 'open acties zijn') + ' gemiddeld ' + NL(d3.mean(kortO), 1) + ' dagen oud (oudste ' + NL(d3.max(kortO)) + ')' : '');""")
R("""  pw_nul: () => { const z = zonderPw(); return ['Projecten zonder enige verplichte WPI', 'proj', (o) => z.has(o.project) && o.telt]; },""",
"""  pw_geen: () => { const z = new Set(geenWpi(D('projecten').data, D('wpis').data, peilAlle()).map((p) => p.project)); return ['Projecten zonder enige WPI', 'proj', (o) => z.has(o.project) && !o.info]; },
  pw_lm_ok: () => { const lm = peilAlle().slice(0, 7); return ['Lopende maand – gehaald', 'proj', (o) => o.maand === lm && o.ok && !o.info]; },""")
R("""const zonderPw = () => { const t = vpAlle().filter((o) => o.telt && o.p); return new Set(d3.groups(t, (o) => o.project).filter(([, l]) => !l.some((o) => o.ok)).map(([k]) => k)); };
const herhSet = () => new Set(d3.groups(D('acties').data, (a) => a.bevinding).filter(([, l]) => new Set(l.map((a) => a.wpi)).size > 1).map(([b]) => b));""",
"""const herhSet = () => new Set(groepeer(D('acties').data).flatMap((g) => [...g.ids]));""")
R("""  herh_n: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.bevinding)]; }, herh_acties: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.bevinding)]; },""",
"""  herh_n: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.actie)]; }, herh_acties: () => { const z = herhSet(); return ['Acties bij terugkerende bevindingen', 'acties', (a) => z.has(a.actie)]; },
  c_uitg: () => ['WPI’s van de coördinatoren', 'wpis', (w) => w.soort !== DIR], d_uitg: () => ['Directie-inspecties', 'wpis', (w) => w.soort === DIR],""")
open(p,'w').write(s); print('ok')
