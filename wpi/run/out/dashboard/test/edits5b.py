p='/home/claude/wpi/run/out/dashboard/app.js'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
# leeg: once
R("""const leeg = (el, s) => { el.replaceChildren(h('p', {class: 'w-mut w-sm', text: !s.ok ? '—' : s.fout ? 'Geen gegevens: de begindatum ligt na de einddatum.' : 'Geen gegevens binnen deze filters.'})); };""",
"""/* lege grafiek: bij een fout of een helemaal lege selectie staat de melding één keer in de filterbalk; anders kort per grafiek */
const leeg = (el, s) => { const alles = !s.ok || s.fout || (!s.rg.length && !s.ac.length); el.replaceChildren(...(alles ? [] : [h('p', {class: 'w-mut w-sm', text: 'Geen gegevens binnen deze filters.'})])); };""")
R("""  if (s.fout) { el.textContent = 'Let op: “Periode van” ligt na “Periode tot en met”. Kies een begin vóór het einde.'; return; }
  const p = s.p,""","""  if (s.fout) { el.textContent = 'Let op: “Periode van” ligt na “Periode tot en met”. Kies een begin vóór het einde. Er worden geen gegevens getoond.'; return; }
  el.classList.toggle('w-fout', !s.rg.length && !s.ac.length);
  if (!s.rg.length && !s.ac.length) { el.textContent = 'Geen gegevens binnen deze filters: geen regels en geen acties. Kies een ruimere selectie of wis de filters.'; return; }
  const p = s.p,""")
# pcel: niet-verplichte maand
R("""const pcel = (o) => {
  const lop""","""const pcel = (o) => {
  if (o.nv) return o.ok ? h('span', {class: 'w-pc w-nv', text: '✓', 'aria-label': PN(o.project) + ' ' + mnd(o.maand) + ': WPI, maand niet verplicht (' + o.wd + ' werkdagen)'}) : null;
  const lop""")
R("""          ms.map((m) => { const o = l.find((x) => x.maand === m); return h('td', {class: 'w-c' + (loopt(pp, m) ? ' w-actief' : '')}, o ? pcel(o) : null); }),""",
"""          ms.map((m) => { const o = l.find((x) => x.maand === m); return h('td', {class: 'w-c' + (loopt(pp, m) ? ' w-actief' : ''), title: o && o.nv ? 'Niet verplicht: ' + o.wd + ' werkdagen in deze maand (minder dan ' + MIN_WD + ')' : null}, o ? pcel(o) : null); }),""")
R("""  const totM = (m) => { const t = telVp(s.vp.filter((o) => o.maand === m)); return t.y ? h('span', {class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad'), text: t.x + '/' + t.y}) : h('span', {class: 'w-mut', text: '—'}); };""",
"""  const totM = (m) => { const l = s.vp.filter((o) => o.maand === m && !o.info), t = telVp(l), lp = l.filter((o) => !o.telt).length;
    return h('span', null, t.y ? h('span', {class: 'w-st ' + (t.x === t.y ? 'ok' : 'bad'), text: t.x + '/' + t.y}) : h('span', {class: 'w-mut', text: '—'}), lp ? h('small', {class: 'w-blok w-mut', text: '+' + lp + ' ◌'}) : null); };""")
R("""    ov.length ? h('p', {class: 'w-sm'}, 'Overige korte projecten (één op de vier per kwartaal): ', ov.map((o) => o.q + (o.ok ? ' ✓' : ' ✕')).join(', ')) : null].filter(Boolean));
});""","""    ov.length ? h('p', {class: 'w-sm'}, 'Overige korte projecten (één op de vier per kwartaal): ', ov.map((o) => o.q + (o.ok ? ' ✓' : ' ✕')).join(', ')) : null].filter(Boolean));
  const sc = el.querySelector('.w-scroll'); if (sc) setTimeout(() => { sc.scrollLeft = sc.scrollWidth; }, 0);
});""")
R("""    const l = vp.filter((o) => o.maand === m), t = l.filter((o) => o.telt), ok = t.filter((o) => o.ok).length, lop = l.filter((o) => !o.telt && !o.info).length;
    return {label: mnd(m), sub: lop ? meer(lop, 'verplichting loopt', 'verplichtingen lopen') + ' nog' : '', val: ok + ' van ' + t.length,""",
"""    const l = vp.filter((o) => o.maand === m), t = l.filter((o) => o.telt), ok = t.filter((o) => o.ok).length, lop = l.filter((o) => !o.telt && !o.info).length;
    return {label: mnd(m), sub: lop ? NL(ok) + ' gehaald, ' + NL(lop) + ' loopt nog' : '', val: ok + ' van ' + t.length,""")
# herh table
R("""  el.replaceChildren(tbl([
    ['Bevinding', (x) => h('b', {text: zp(x[0])})],
    ['Keer', (x) => clk(h('span', {text: meer(x[1].length, 'actie', 'acties')}), zp(x[0]), 'acties', (a) => a.bevinding === x[0]), 'w-num'],
    ['WPI’s', (x) => { const n = new Set(x[1].map((a) => a.wpi)); return clk(h('span', {text: NL(n.size)}), zp(x[0]) + ' – WPI’s', 'wpis', (w) => n.has(w.nr)); }, 'w-num'],
    ['Producten', (x) => uniek(x[1], (a) => (ws.get(a.wpi) || {}).product || a.product).join(', ')],
    ['Klasse', (x) => uniek(x[1], (a) => a.classificatie).join(', ')],
    ['Acties', (x) => { const k = x[1].filter((a) => a.status === 'Afgerond').length; return '✓ ' + k + ' afgerond · △ ' + (x[1].length - k) + ' open'; }],
    ['Terug na afronding', (x) => x[1].some((a) => a.afgerond_op && x[1].some((y) => a.afgerond_op < y.datum)) ? h('span', {class: 'w-st bad', text: '✕ ja'}) : h('span', {class: 'w-mut', text: 'nee'})]], s.herh, 'w-herht'));""",
"""  el.replaceChildren(tbl([
    ['Bevinding (groep)', (x) => h('span', null, h('b', {text: x.label}), x.teksten.length > 1 && h('small', {class: 'w-blok w-mut', text: 'Samengenomen: ' + x.teksten.map((t) => '“' + kort(t, 70) + '”').join(' · ')}), h('small', {class: 'w-blok w-mut', text: 'Regels: ' + uniek(x.l, (a) => a.ref).join(', ')}))],
    ['Keer', (x) => clk(h('span', {text: meer(x.l.length, 'actie', 'acties')}), x.label, 'acties', (a) => x.ids.has(a.actie)), 'w-num'],
    ['WPI’s', (x) => { const n = new Set(x.l.map((a) => a.wpi)); return clk(h('span', {text: NL(n.size)}), x.label + ' – WPI’s', 'wpis', (w) => n.has(w.nr)); }, 'w-num'],
    ['Producten', (x) => uniek(x.l, (a) => (ws.get(a.wpi) || {}).product || a.product).join(', ')],
    ['Klasse', (x) => x.klasse],
    ['Acties', (x) => { const k = x.l.filter((a) => a.status === 'Afgerond').length; return '✓ ' + k + ' afgerond · △ ' + (x.l.length - k) + ' open'; }],
    ['Terug na afronding', (x) => x.terug ? h('span', {class: 'w-st bad', text: '✕ ja'}) : h('span', {class: 'w-mut', text: 'nee'})]], s.herh, 'w-herht'));""")
# normrijen: open leeftijd
R("""    return h('tr', null, cellen([['Prioriteit', () => h('b', {text: p})], ['Norm', () => norm], ['Afgerond', () => NL(v.length)], ['Gemiddeld', () => v.length ? NL(d3.mean(v, duur), 1) + ' dagen' : '—', 'w-num'],
      ['Binnen norm', () => v.length ? h('span', {class: 'w-st ' + (v.filter(ok).length === v.length ? 'ok' : 'bad')}, clk(h('span', {text: v.filter(ok).length + ' van ' + v.length}), 'Prioriteit ' + p + ' – afgerond', 'acties', (a) => a.prioriteit === p && a.status === 'Afgerond')) : '—'], ['Nog open', () => NL(oo), 'w-num']], null)); }));""",
"""    const lft = s.ac.filter((a) => a.prioriteit === p && a.status === 'Open').map((a) => days(a.datum, s.peil));
    return h('tr', null, cellen([['Prioriteit', () => h('b', {text: p})], ['Norm', () => norm], ['Afgerond', () => NL(v.length)], ['Gemiddeld (afgerond)', () => v.length ? NL(d3.mean(v, duur), 1) + ' dagen' : '—', 'w-num'],
      ['Binnen norm', () => v.length ? h('span', {class: 'w-st ' + (v.filter(ok).length === v.length ? 'ok' : 'bad')}, clk(h('span', {text: v.filter(ok).length + ' van ' + v.length}), 'Prioriteit ' + p + ' – afgerond', 'acties', (a) => a.prioriteit === p && a.status === 'Afgerond')) : '—'], ['Nog open', () => oo ? clk(h('span', {text: NL(oo)}), 'Prioriteit ' + p + ' – open', 'acties', (a) => a.prioriteit === p && a.status === 'Open') : '0', 'w-num'],
      ['Leeftijd open', () => lft.length ? 'gem. ' + NL(d3.mean(lft), 1) + ' dagen (oudste ' + NL(d3.max(lft)) + ')' : '—', 'w-num']], null)); }));""")
# WPI detail: positive note
R("""    cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];
  } else {""","""    const nc = rows.filter(is('Conform')).length;
    extra = h('div', null, extra, nc ? h('p', {class: 'w-sm w-mut', text: meer(nc, 'positieve bevinding', 'positieve bevindingen') + ' (Conform). Wat de inspecteur daarbij zag staat niet in de gegevenstabel maar in het WPI-rapport ' + w.nr + ', hoofdstuk 5 “Positieve bevindingen”.'}) : null);
    cols = [['Regel', (r) => h('span', null, h('b', {text: r.ref}), ' ', kort(r.omschrijving, 70))], ['Oordeel', (r) => badge(r.oordeel)], ['Waarneming', (r) => r.oordeel === 'Conform' ? h('span', null, badge(r.waargenomen, DEK), h('small', {class: 'w-blok w-mut', text: 'zie rapport ' + w.nr + ', h5'})) : badge(r.waargenomen, DEK)], ['Actie', (r) => actKnoppen(r.acties)]];
  } else {""")
# trendkort + vastleg
R("""/* ---------- Programma per werkplek ---------- */""","""dash.draw('trendkort', (el) => {
  const t = D('trendacties');
  if (t.status !== 'ok') { el.replaceChildren(); return; }
  el.replaceChildren(...t.data.map((r) => h('tr', {'data-key': r.nr}, cellen([
    ['Nummer', (x) => h('b', {text: x.nr})], ['Wat', (x) => x.onderwerp], ['Actiehouder', (x) => x.actiehouder],
    ['Termijn', (x) => h('span', {class: 'w-nw', text: dat(x.termijn)})], ['Status', (x) => h('span', {class: 'w-st warn', text: '△ ' + x.status})]], r))));
});
/* vastgelegde, afdrukbare versie van de trendanalyse (hele periode, zonder filters) */
dash.draw('vastleg', (el) => {
  const k = (n, f) => { const r = kernRij(n); return r ? (f ? r.tekst : r.toon) : '—'; }, t = D('trendacties'), pd = (D('peildatum').data[0] || {});
  if (D('kern').status !== 'ok' || t.status !== 'ok') { el.replaceChildren(h('p', {class: 'w-mut', text: '—'})); return; }
  const kloon = (sel) => { const n = document.querySelector(sel); if (!n) return null; const c = n.cloneNode(true);
    [c, ...c.querySelectorAll('*')].forEach((e) => { [...e.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'role' || a.name === 'tabindex' || a.name === 'id').forEach((a) => e.removeAttribute(a.name)); e.classList.remove('w-clk'); });
    c.querySelectorAll('.w-det').forEach((d) => d.remove()); return c; };
  const rg = D('regels').data, kl = KLASSEN.map((c) => { const r = rg.filter((x) => x.classificatie === c && WAAR(x)); return {c, w: r.length, a: r.filter(is('Afwijking')).length, v: r.filter(is('Verbeterpunt')).length}; }).filter((x) => x.w).sort((a, b) => (b.a + b.v) - (a.a + a.v) || b.w - a.w);
  const hg = groepeer(D('acties').data);
  const tabel = (kop, rijen) => h('table', {class: 'w-tbl w-vtbl'}, h('thead', null, h('tr', null, kop.map((x) => h('th', {text: x})))), h('tbody', null, rijen.map((r) => h('tr', null, r.map((x) => h('td', {text: String(x)}))))));
  el.replaceChildren(
    h('p', {class: 'w-ban', text: 'VOORBEELD — fictieve data'}),
    h('h2', {text: 'Trendanalyse werkplekinspecties ' + k('per_van', 1) + ' t/m ' + k('per_tot', 1)}),
    h('p', {text: 'Noardling B.V., Service & Montage · peildatum ' + k('peil', 1) + ' · hele periode, zonder filters · VCA 7.2: jaarlijkse trendanalyse met te ondernemen acties en follow-up.'}),
    tabel(['Opgesteld door', 'Vastgesteld door en op', 'Versie'], [['……………………', '…………………… op ……………', 'concept 1 · dataset ' + (pd.versie || '—') + ' · peildatum ' + k('peil', 1)]]),
    h('h3', {text: '1. Kernboodschap'}), kloon('#boodschappen .w-msgs'),
    h('h3', {text: '2. Conclusie en onderbouwing'}), kloon('#conclusie ul'),
    h('h3', {text: '3. Bevindingen per klasse (waargenomen regels)'}),
    tabel(['Klasse', 'Waargenomen', 'Afwijking', 'Verbeterpunt', 'Aandeel'], kl.map((x) => [x.c, NL(x.w), NL(x.a), NL(x.v), NL(100 * (x.a + x.v) / x.w) + '%' + (x.w < MIN_N ? ' (te klein)' : '')])),
    h('h3', {text: '4. Terugkerende bevindingen'}),
    tabel(['Bevinding (groep)', 'Acties', 'WPI’s', 'Klasse', 'Terug na afronding'], hg.map((x) => [x.label + (x.teksten.length > 1 ? ' (samengenomen: ' + x.teksten.length + ' formuleringen)' : ''), NL(x.l.length), NL(x.w), x.klasse, x.terug ? 'ja' : 'nee'])),
    h('h3', {text: '5. Acties uit de trendanalyse en follow-up'}),
    tabel(['Nummer', 'Wat', 'Meetbaar doel', 'Actiehouder', 'Toetser', 'Termijn', 'Controle', 'Status / voortgang'], t.data.map((x) => [x.nr, x.onderwerp + '. ' + x.wat, x.doel || '—', x.actiehouder, x.toetser, dat(x.termijn), dat(x.controledatum), x.status + (x.voortgang ? ' · ' + x.voortgang : ' · nog niet besproken')])),
    h('p', {class: 'w-sm', text: 'Follow-up: de trendacties staan elke maandag op de agenda van het coördinatorenoverleg; het verslag noemt per nummer de nieuwe status. Op de controledatum toetst de toetser of het meetbare doel is gehaald. Actiehouders, doelen en data zijn een fictief voorbeeld.'}),
    h('p', {class: 'w-ban', text: 'VOORBEELD — fictieve data'}));
});

/* ---------- Programma per werkplek ---------- */""")
# open/close vastleg view + print
R("""document.querySelectorAll('[data-act=filters]')""","""const vastleg = (aan) => {
  document.querySelectorAll('.w-sec').forEach((sec) => { sec.hidden = aan ? sec.id !== 'vastleggen' : sec.id === 'vastleggen' || sec.hidden; });
  document.querySelectorAll('.w-tabbar,.w-filterbar').forEach((x) => { x.hidden = aan || (x.classList.contains('w-filterbar') && !document.querySelector('#overzicht').hidden); });
  if (aan) dash.draw('vastleg'); else openTab('overzicht', true);
};
document.querySelectorAll('[data-act=vastleg]').forEach((b) => b.addEventListener('click', () => vastleg(true)));
document.querySelectorAll('[data-act=terug]').forEach((b) => b.addEventListener('click', () => vastleg(false)));
document.querySelectorAll('[data-act=print]').forEach((b) => b.addEventListener('click', () => { dash.draw('vastleg'); window.print(); }));
window.addEventListener('beforeprint', () => dash.draw('vastleg'));
document.querySelectorAll('[data-act=filters]')""")
R("""  document.querySelectorAll('.w-sec').forEach((sec) => { sec.hidden = sec.id !== id; });""","""  document.querySelectorAll('.w-sec').forEach((sec) => { sec.hidden = sec.id !== id; });
  document.querySelectorAll('.w-tabbar').forEach((x) => { x.hidden = false; });""")
open(p,'w').write(s); print('ok')
