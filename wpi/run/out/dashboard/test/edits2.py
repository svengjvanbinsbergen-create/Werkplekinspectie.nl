B='/home/claude/wpi/run/out/dashboard/'
def run(fn,pairs):
    s=open(B+fn).read()
    for p in pairs:
        old,new=p[0],p[1]; allr=len(p)>2
        c=s.count(old)
        assert (c==p[2] if allr else c==1),(fn,c,old[:70])
        s=s.replace(old,new)
    open(B+fn,'w').write(s)
K=lambda k,f='toon':"<b data-draw='k' data-source='kern' data-field='%s' data-where='k=%s'>—</b>"%(f,k)
H=[
("producten zijn nog niet geïnspecteerd.</li>","producten zijn nog niet geïnspecteerd. Van de "+K('kb_regels')+" TRA-regels in de kennisbank zijn er "+K('kb_gezien')+" ("+K('kb_pct')+"%) minstens één keer waargenomen; in de grootste klasse, "+K('kl_groot','tekst')+" ("+K('kl_groot_n')+" regels), zijn dat er "+K('kl_groot')+".</li>"),
("<li><b>Diepgang.</b>","<li><b>Dekking.</b>"),
("<h2>Diepgang: waar is feitelijk gekeken? ","<h2>Dekking van de inspecties: waar is feitelijk gekeken? "),
("Waargenomen = de inspecteur legde een eigen waarneming vast. Alleen bevestigd = alleen via de afsluitvraag afgedaan (“Geen afwijking waargenomen” zonder eigen waarneming). Niet beoordeeld of n.v.t.","De dekking is afgeleid van het oordeel en is zelf geen oordeel. Waargenomen = Conform, Afwijking of Verbeterpunt; die bestaan alleen met een eigen waarneming van de inspecteur. Alleen bevestigd = “Geen afwijking waargenomen”, alleen via de afsluitvraag. Niet beoordeeld of n.v.t."),
("○ Geen afwijking waargenomen</span>","○ Geen afwijking waargenomen (alleen bevestigd)</span>"),
("<div class='w-det w-rel' data-draw='detail' data-slot='blindevlekken'","<h3>Klassen in de kennisbank tegenover waargenomen toetsingen</h3>\n<p class='w-sm w-mut'>Per klasse: hoeveel TRA-regels de kennisbank telt en hoeveel daarvan minstens één keer zijn waargenomen. Veel regels met een korte balk is een blinde vlek. Het productfilter en het classificatiefilter gelden hier niet.</p>\n<div class='w-rel' data-draw='klasse' data-source='regels kennisbank'></div>\n<div class='w-det w-rel' data-draw='detail' data-slot='blindevlekken'"),
("<li><b>Waargenomen</b>: veld “waargenomen” = Ja. <b>Alleen bevestigd</b>: alleen via de afsluitvraag afgedaan. <b>Niet beoordeeld of n.v.t.</b>: veld “waargenomen” = Nee.</li>","<li><b>Dekking</b> (afgeleid van het oordeel): <b>Waargenomen</b> = Conform, Afwijking of Verbeterpunt, altijd met een eigen waarneming. <b>Alleen bevestigd</b> = “Geen afwijking waargenomen”, alleen via de afsluitvraag. <b>Niet beoordeeld of n.v.t.</b> = de overige regels.</li>"),
("TRA-regel met oordeel Conform, Geen afwijking waargenomen, Afwijking of Verbeterpunt.</li>","TRA-regel die is waargenomen (oordeel Conform, Afwijking of Verbeterpunt).</li>"),
]
J=[
("wg('Ja')","wg('Waargenomen')",8),
("zet('nee', n(wg('Nee')));","zet('nee', n((r) => r.waargenomen !== 'Waargenomen' && r.waargenomen !== 'Alleen bevestigd'));"),
("idee = (a) => a.bron === 'Idee monteurs';","idee = (a) => a.bron === 'Idee monteurs', nee = (r) => r.waargenomen !== 'Waargenomen' && r.waargenomen !== 'Alleen bevestigd';"),
("t('nee', NL(N(s.rg, wg('Nee'))), 'regels', 'Niet beoordeeld of n.v.t.', wg('Nee'));","t('nee', NL(N(s.rg, nee)), 'regels', 'Niet beoordeeld of n.v.t.', nee);"),
("soorten = [['Ja', 'o-ja', 'Waargenomen'], ['Alleen bevestigd', 'o-ab', 'Alleen bevestigd'], ['Nee', 'o-nb', 'Niet beoordeeld of n.v.t.']];","soorten = [[(r) => r.waargenomen === 'Waargenomen', 'o-ja', 'Waargenomen'], [(r) => r.waargenomen === 'Alleen bevestigd', 'o-ab', 'Alleen bevestigd'], [(r) => r.waargenomen !== 'Waargenomen' && r.waargenomen !== 'Alleen bevestigd', 'o-nb', 'Niet beoordeeld of n.v.t.']];"),
("const c = soorten.map(([w]) => v.filter((r) => r.waargenomen === w).length);","const c = soorten.map(([w]) => v.filter(w).length);"),
("pred: (r) => r[by] === k && r.waargenomen === w}","pred: (r) => r[by] === k && w(r)}"),
("tra.filter((r) => r.oordeel !== 'Niet beoordeeld' && r.oordeel !== 'Niet van toepassing')","tra.filter((r) => r.waargenomen === 'Waargenomen')",3),
("oord = (r) => r.soort === 'TRA' && r.waargenomen === 'Ja';","oord = (r) => r.soort === 'TRA' && r.waargenomen === 'Waargenomen';"),
("['Waargenomen', (r) => r.waargenomen === 'Nee' ? 'Niet beoordeeld of n.v.t.' : r.waargenomen],","['Dekking', (r) => r.waargenomen],"),
("['Actiehouder', (a) => a.actiehouder],","['Actiehouder', (a) => a.actiehouder], ['Toetser', (a) => a.toetser],"),
("    const buiten = regels.filter(","    const gez = new Set(tra.filter((r) => r.waargenomen === 'Waargenomen').map((r) => r.ref));\n    const kls = d3.rollups(kennisbank, (v) => [v.filter((x) => gez.has(x.id)).length, v.length], (x) => x.klasse).sort((a, b) => b[1][1] - a[1][1] || d3.ascending(a[0], b[0]));\n    zet('kl_groot', kls[0] ? kls[0][1][0] : 0, kls[0] ? kls[0][0] : '—'); zet('kl_groot_n', kls[0] ? kls[0][1][1] : 0);\n    zet('kb_gezien', gez.size); zet('kb_regels', kennisbank.length); zet('kb_pct', pc(gez.size, kennisbank.length));\n    const buiten = regels.filter("),
("dash.draw('prod', (el) => {","dash.draw('klasse', (el) => {\n  const s = S(); if (!s.ok || !s.kb.length) return leeg(el, s);\n  const waar = s.rg0.filter((r) => r.soort === 'TRA' && r.waargenomen === 'Waargenomen'), gez = new Set(waar.map((r) => r.ref)), kl = new Map(s.kb.map((x) => [x.id, x.klasse]));\n  el.replaceChildren(); const tip = tipper(el);\n  el.prepend(bars(el, d3.groups(s.kb, (x) => x.klasse).sort((a, b) => b[1].length - a[1].length || d3.ascending(a[0], b[0])).map(([k, v]) => {\n    const g = v.filter((x) => gez.has(x.id)).length, n = waar.filter((r) => kl.get(r.ref) === k).length;\n    return {label: k, sub: v.length + ' regels in de kennisbank · ' + n + ' waargenomen toetsingen', tot: v.length, val: g + ' van ' + v.length + ' (' + NL(100 * g / v.length) + '%)',\n      segs: [{n: g, c: 'o-ja', t: 'Regels minstens één keer waargenomen', pred: (r) => r.soort === 'TRA' && r.waargenomen === 'Waargenomen' && kl.get(r.ref) === k}]};\n  }), tip));\n});\n\ndash.draw('prod', (el) => {"),
]
run('index.html',H); run('app.js',J); print('ok')
