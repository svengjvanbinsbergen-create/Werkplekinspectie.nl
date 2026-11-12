p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:80]); s=s.replace(a,b)
# trendacties table
R("""  el.replaceChildren(...t.data.map((r) => h('tr', {'data-key': r.nr}, cellen([
    ['Nummer', (x) => h('b', {text: x.nr})],
    ['Wat', (x) => h('span', null, h('b', {text: x.onderwerp + '. '}), x.wat, h('small', {class: 'w-blok w-mut', text: 'Aanleiding: ' + x.aanleiding}))],
    ['Actiehouder', (x) => h('span', null, x.actiehouder, x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Toetser', (x) => x.toetser],
    ['Termijn', (x) => h('span', null, dat(x.termijn), x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Status', (x) => x.status]], r))));""","""  el.replaceChildren(...t.data.map((r) => h('tr', {'data-key': r.nr}, cellen([
    ['Nummer', (x) => h('span', null, h('b', {text: x.nr}), h('small', {class: 'w-blok w-st warn', text: '△ ' + x.status}))],
    ['Wat', (x) => h('span', null, h('b', {text: x.onderwerp + '. '}), x.wat, h('small', {class: 'w-blok w-mut', text: 'Aanleiding: ' + x.aanleiding}))],
    ['Meetbaar doel', (x) => x.doel || '—'],
    ['Actiehouder', (x) => h('span', null, x.actiehouder, x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Toetser', (x) => x.toetser],
    ['Termijn en controle', (x) => h('span', null, h('span', {class: 'w-blok', text: 'termijn ' + dat(x.termijn)}), h('span', {class: 'w-blok', text: 'controle ' + dat(x.controledatum)}), x.fictief && h('small', {class: 'w-fict', text: 'fictief voorbeeld'}))],
    ['Laatst besproken / voortgang', (x) => x.voortgang ? x.voortgang : h('span', {class: 'w-mut', text: 'nog niet besproken'})]], r))));""")
# programme matrix + overview chart
R("""/* ---------- Programma ---------- */
""","""/* ---------- Programma per werkplek ---------- */
const pcel = (o) => {
  const lop = !o.telt, e = h('span', {class: 'w-pc ' + (o.ok ? 'w-ok' : lop ? 'w-lop' : 'w-mis'), text: o.ok ? '✓' : lop ? '◌' : '✕',
    'aria-label': PN(o.project) + ' ' + mnd(o.maand) + ': ' + (o.ok ? 'uitgevoerd' : lop ? 'loopt nog' : 'gemist') + (lop ? ', telt nog niet mee' : '')});
  return clk(e, PN(o.project) + ' – ' + mnd(o.maand), 'proj', (x) => x.project === o.project && x.maand === o.maand);
};
dash.draw('pw', (el) => {
  const s = S(); if (!s.ok) return leeg(el, s);
  const vp = s.vp.filter((o) => o.p); if (!vp.length) return leeg(el, s);
  const ms = uniek(vp, (o) => o.maand), proj = d3.groups(vp, (o) => o.project).sort((a, b) => d3.ascending(a[1][0].p.start, b[1][0].p.start) || d3.ascending(a[0], b[0]));
  const loopt = (pp, m) => pp.start.slice(0, 7) <= m && pp.eind.slice(0, 7) >= m;
  const xy = (l) => { const t = telVp(l); return t.y ? clk(h('span', {text: t.x + ' van ' + t.y, class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad')}), PN(l[0].project) + ' – verplichtingen', 'proj', (o) => o.project === l[0].project) : h('span', {class: 'w-mut', text: '—'}); };
  const mis = s.vp.filter((o) => o.telt && !o.ok), misP = new Set(mis.filter((o) => o.p).map((o) => o.project));
  const knop = mis.length ? clk(h('span', {class: 'w-btn w-inl', text: 'Toon de ' + meer(mis.length, 'gemiste verplichting', 'gemiste verplichtingen') + ' (' + meer(misP.size, 'project', 'projecten') + ')'}), 'Gemiste verplichte WPI’s', 'proj', (o) => o.telt && !o.ok) : null;
  const totM = (m) => { const t = telVp(s.vp.filter((o) => o.maand === m)); return t.y ? h('span', {class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad'), text: t.x + '/' + t.y}) : h('span', {class: 'w-mut', text: '—'}); };
  const ov = s.vp.filter((o) => !o.p);
  el.replaceChildren(h('p', {class: 'w-sm'}, knop),
    h('div', {class: 'w-scroll'}, h('table', {class: 'w-tbl w-sticky w-pwt'},
      h('thead', null, h('tr', null, h('th', {text: 'Project (fictief)'}), ms.map((m) => h('th', {class: 'w-c', text: MND[+m.slice(5, 7) - 1]})), h('th', {class: 'w-num', text: 'Uitgevoerd'}))),
      h('tbody', null, proj.map(([naam, l]) => { const pp = l[0].p;
        return h('tr', null, h('td', null, h('b', {text: PN(naam)}), h('small', {class: 'w-blok w-mut', text: pp.product + ' · ' + dat(pp.start).slice(0, 5) + '–' + dat(pp.eind).slice(0, 5) + ' · ' + CATK[l[0].cat] + (RISK(pp) ? ' (' + RISKT(pp) + ')' : '')})),
          ms.map((m) => { const o = l.find((x) => x.maand === m); return h('td', {class: 'w-c' + (loopt(pp, m) ? ' w-actief' : '')}, o ? pcel(o) : null); }),
          h('td', {class: 'w-num'}, xy(l))); }),
      h('tr', {class: 'w-tot'}, h('td', null, h('b', {text: 'Per maand'})), ms.map((m) => h('td', {class: 'w-c'}, totM(m))), h('td', {class: 'w-num'}, h('b', {text: telVp(s.vp).x + ' van ' + telVp(s.vp).y})))))),
    ov.length ? h('p', {class: 'w-sm'}, 'Overige korte projecten (één op de vier per kwartaal): ', ov.map((o) => o.q + (o.ok ? ' ✓' : ' ✕')).join(', ')) : null);
});
dash.draw('pwchart', (el) => {
  const vp = D('projecten').status === 'ok' ? vpAlle() : []; if (!vp.length) { el.replaceChildren(h('p', {class: 'w-mut w-sm', text: '—'})); return; }
  el.replaceChildren(); const tip = tipper(el);
  el.prepend(bars(uniek(vp, (o) => o.maand).map((m) => {
    const l = vp.filter((o) => o.maand === m), t = l.filter((o) => o.telt), ok = t.filter((o) => o.ok).length, lop = l.filter((o) => !o.telt && !o.info).length;
    return {label: mnd(m), sub: lop ? meer(lop, 'verplichting loopt', 'verplichtingen lopen') + ' nog' : '', val: ok + ' van ' + t.length,
      segs: [{n: ok, c: 'o-con', t: 'Uitgevoerd', kind: 'proj', alle: true, pred: (o) => o.maand === m && o.telt && o.ok}, {n: t.length - ok, c: 'o-afw', t: 'Gemist', kind: 'proj', alle: true, pred: (o) => o.maand === m && o.telt && !o.ok}]};
  }), tip));
});

/* ---------- Programma per inspecteur ---------- */
""")
# terugkerende bevindingen
R("""const negSegs = (rows, pred) => [""","""dash.draw('herh', (el) => {
  const s = S(); if (!s.ok || !s.herh.length) return leeg(el, s);
  const ws = new Map(D('wpis').data.map((w) => [w.nr, w]));
  el.replaceChildren(tbl([
    ['Bevinding', (x) => h('b', {text: zp(x[0])})],
    ['Keer', (x) => clk(h('span', {text: meer(x[1].length, 'actie', 'acties')}), zp(x[0]), 'acties', (a) => a.bevinding === x[0]), 'w-num'],
    ['WPI’s', (x) => { const n = new Set(x[1].map((a) => a.wpi)); return clk(h('span', {text: NL(n.size)}), zp(x[0]) + ' – WPI’s', 'wpis', (w) => n.has(w.nr)); }, 'w-num'],
    ['Producten', (x) => uniek(x[1], (a) => (ws.get(a.wpi) || {}).product || a.product).join(', ')],
    ['Klasse', (x) => uniek(x[1], (a) => a.classificatie).join(', ')],
    ['Acties', (x) => { const k = x[1].filter((a) => a.status === 'Afgerond').length; return '✓ ' + k + ' afgerond · △ ' + (x[1].length - k) + ' open'; }],
    ['Terug na afronding', (x) => x[1].some((a) => a.afgerond_op && x[1].some((y) => a.afgerond_op < y.datum)) ? h('span', {class: 'w-st bad', text: '✕ ja'}) : h('span', {class: 'w-mut', text: 'nee'})]], s.herh, 'w-herht'));
});
const negSegs = (rows, pred) => [""")
# klasse bars: length = count of observed rows; label n van w (aandeel)
R("""    return {label: c, sub: w ? meer(w, 'waargenomen regel', 'waargenomen regels') + (w < MIN_N ? ' · te klein voor een conclusie' : '') : 'geen waargenomen regels', o: a + v, sh: w ? (a + v) / w : 0, tot: w || 1,
      val: '✕ ' + a + ' · △ ' + v + pct,""","""    return {label: c, sub: w ? '✕ ' + a + ' · △ ' + v + ' · ' + meer(w, 'waargenomen regel', 'waargenomen regels') + (w < MIN_N ? ' · te klein voor een conclusie' : '') : 'geen waargenomen regels', o: a + v, sh: w ? (a + v) / w : 0,
      val: w ? (a + v) + ' van ' + w + pct : '—',""")
R("""  }).sort((x, y) => y.o - x.o || y.sh - x.sh || d3.ascending(x.label, y.label));
  el.prepend(bars(items, tip));
});""","""  }).sort((x, y) => y.o - x.o || y.sh - x.sh || d3.ascending(x.label, y.label));
  el.prepend(bars(s.p.classificatie ? items.filter((i) => i.label === s.p.classificatie) : items, tip));
});""")
# termijn singular
R("""text: s.over(a) ? days(a.termijn, s.peil) + ' dagen over tijd' : 'nog ' + days(s.peil, a.termijn) + ' dagen'}));""","""text: s.over(a) ? meer(days(a.termijn, s.peil), 'dag', 'dagen') + ' over tijd' : a.termijn === s.peil ? 'termijn vandaag' : 'nog ' + meer(days(s.peil, a.termijn), 'dag', 'dagen')}));""")
# klaar kolommen
R("""const KLAAR_KOL = [['Actienummer', (a) => h('b', {text: a.actie})], ['Bevinding', (a) => a.bevinding], ['Verbeteractie', vbCel], ['Actiehouder', (a) => a.actiehouder],
  ['Afgerond op',""","""const KLAAR_KOL = [['Actienummer', (a) => h('b', {text: a.actie})], ['Prioriteit', (a) => a.prioriteit], ['Termijn', (a) => dat(a.termijn)], ['Bevinding', (a) => a.bevinding],
  ['TRA-ID / klasse', (a) => h('span', null, h('b', {text: a.ref}), h('small', {class: 'w-blok w-mut', text: a.classificatie}))], ['Verbeteractie', vbCel], ['Actiehouder', (a) => a.actiehouder],
  ['Afgerond op',""")
# open rows: first 8 + button
R("""  rijen(el, s.ac.filter((a) => a.status === 'Open').sort((a, b) => d3.ascending(a.termijn, b.termijn) || d3.ascending(a.actie, b.actie)), OPEN_KOL(s));
});""","""  const l = s.ac.filter((a) => a.status === 'Open').sort((a, b) => d3.ascending(a.termijn, b.termijn) || d3.ascending(a.actie, b.actie));
  rijen(el, W.openAll ? l : l.slice(0, 8), OPEN_KOL(s));
});
dash.draw('openmeer', (el) => {
  const s = S(), n = s.ok ? s.ac.filter((a) => a.status === 'Open').length : 0;
  if (n <= 8) { el.replaceChildren(); return; }
  const b = h('button', {type: 'button', class: 'w-btn', text: W.openAll ? 'Toon alleen de eerste 8' : 'Toon alle ' + n + ' open acties'});
  b.onclick = () => { W.openAll = !W.openAll; dash.draw('openrijen'); dash.draw('openmeer'); };
  el.replaceChildren(h('p', {class: 'w-sm w-mut'}, W.openAll ? '' : 'De eerste 8 op termijn (over de termijn eerst). ', b));
});""")
open(p,'w').write(s); print('ok')
