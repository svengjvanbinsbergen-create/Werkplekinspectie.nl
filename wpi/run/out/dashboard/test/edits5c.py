p='/home/claude/wpi/run/out/dashboard/test/genhtml.py'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
R("""<p class='w-sm w-mut'>Opgesteld door: <span class='w-in'>……………</span> · Vastgesteld op: <span class='w-in'>……………</span> (in te vullen; leeg in dit voorbeeld). Alleen eigen monteurs.</p>
</header>""","""<p class='w-sm w-mut'>Opgesteld door: <span class='w-in'>……………</span> · Vastgesteld op: <span class='w-in'>……………</span> (in te vullen; leeg in dit voorbeeld). Alleen eigen monteurs.</p>
<p><button type='button' class='w-btn w-hoofd' data-act='vastleg'>Trendanalyse vastleggen (afdrukbare versie)</button></p>
</header>""")
NOTE="<p class='w-sm w-mut w-heel'>Hele periode; de filters van de andere tabbladen gelden hier niet.</p>"
R("""<h2>In twee minuten {VB}</h2>""","""<h2>In twee minuten {VB}</h2>
"""+NOTE)
R("""De coördinatoren deden {K('uitgevoerd')} van hun {K('gepland')} maandelijkse WPI’s; de directie inspecteerde in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</p></div>""",
"""De coördinatoren deden {K('c_uitg')} van hun {K('c_gepl')} maandelijkse WPI’s; de directie deed {K('d_uitg')} van {K('d_gepl')} en inspecteerde in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</p></div>""")
R("""verplichte WPI’s gedaan ({K('pw_pct')}%); {K('pw_nul')} projecten kregen er geen enkele.""","""verplichte WPI’s gedaan ({K('pw_pct')}%); {K('pw_geen')} projecten kregen geen enkele WPI.""")
R("""<h2>Verplichte WPI’s per werkplek, per maand <span class='w-vca'>VCA 7.1</span> {VB}</h2>""","""<h2>Verplichte WPI’s per werkplek, per maand <span class='w-vca'>VCA 7.1</span> {VB}</h2>
"""+NOTE)
R("""<h2>Acties uit de trendanalyse <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<p class='w-kader w-sm'>VCA 7.2, minimumeis: “Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.”</p>
<table class='w-tbl w-cards w-trendt' data-source='trendacties' data-row-key='nr'>""","""<h2>Acties uit de trendanalyse <span class='w-vca'>VCA 7.2</span> {VB}</h2>
"""+NOTE+"""
<p class='w-kader w-sm'>VCA 7.2, minimumeis: “Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.”</p>
<table class='w-tbl w-cards w-trendk' data-source='trendacties' data-row-key='nr'>
<thead><tr><th data-field='nr'>Nummer</th><th data-field='onderwerp'>Wat</th><th data-field='actiehouder'>Actiehouder</th><th data-field='termijn'>Termijn</th><th data-field='status'>Status</th></tr></thead>
<tbody data-draw='trendkort'></tbody>
</table>
<details class='w-sub2'><summary>Volledige trendacties: wat, aanleiding, meetbaar doel, toetser, controledatum en voortgang</summary>
<table class='w-tbl w-cards w-trendt' data-source='trendacties' data-row-key='nr'>""")
R("""<tbody data-draw='trendrijen'></tbody>
</table>""","""<tbody data-draw='trendrijen'></tbody>
</table>
</details>""")
R("""Geen enkele verplichte WPI bij {K('pw_nul')} projecten: {K('pw_nul','tekst')}. Verplichtingen die nog lopen en nog niet meetellen: {K('pw_lop')}. Hier zit het grootste gat met VCA 7.1.</li>""",
"""Geen enkele WPI bij {K('pw_geen')} projecten: {K('pw_geen','tekst')}. Lopende maand ({K('pw_lm_ok','tekst')}): {K('pw_lm_ok')} gehaald, {K('pw_lop')} loopt nog en telt pas mee als de maand voorbij is. Hier zit het grootste gat met VCA 7.1.</li>""")
R("""<li><b>Inzet per inspecteur (ondergrens).</b> {K('uitgevoerd')} van {K('gepland')} geplande WPI’s uitgevoerd; niet uitgevoerd: {K('gemist','tekst')}.""",
"""<li><b>Inzet per inspecteur (ondergrens).</b> {K('uitgevoerd')} van {K('gepland')} geplande WPI’s uitgevoerd: coördinatoren {K('c_uitg')} van {K('c_gepl')}, directie {K('d_uitg')} van {K('d_gepl')}; niet uitgevoerd: {K('gemist','tekst')}.""")
R("""De trendacties pakken ze daarom bij de bron aan (LMRA, uitrusting van de montagewagen).</li>""","""De trendacties pakken ze daarom bij de bron aan (LMRA, uitrusting van de montagewagen). Bevindingen met een andere formulering maar dezelfde klasse en dezelfde kernwoorden zijn samengenomen.</li>""")
R("""kort (norm {K('norm_kort')} dagen) gemiddeld {K('kort_gem')} dagen, {K('kort_ok')} van {K('kort_n')} binnen de norm;""","""kort (norm {K('norm_kort')} dagen) gemiddeld {K('kort_gem')} dagen, {K('kort_ok')} van {K('kort_n')} binnen de norm (alleen afgeronde acties en daardoor te gunstig: {K('open_kort_n')} open acties met prioriteit kort zijn gemiddeld {K('open_kort_gem')} dagen oud, de oudste {K('open_kort_max')});""")
R("""Een verplichting telt mee zodra de maand voorbij is of het project is afgelopen. WPI’s worden aan een project gekoppeld via het projectnummer.</li>
<li><b>Terugkerende bevinding</b>: dezelfde bevinding (zelfde tekst) bij acties uit twee of meer verschillende WPI’s.</li>""",
"""Een maand is alleen verplicht als het project er minstens 10 werkdagen loopt (voorstel). Een gehaalde verplichting telt direct mee; een nog niet gehaalde wacht tot de maand voorbij is of het project is afgelopen. WPI’s worden aan een project gekoppeld via het projectnummer; locatie en product moeten daarbij passen, anders telt de WPI niet mee en volgt een waarschuwing.</li>
<li><b>Terugkerende bevinding</b>: dezelfde bevinding bij acties uit twee of meer verschillende WPI’s. Twee acties horen bij dezelfde bevinding als ze dezelfde klasse hebben én minstens twee kernwoorden delen (woorden van vier letters of meer, zonder vulwoorden, vergeleken op de eerste zes letters), of op dezelfde TRA-regel of hetzelfde algemene onderwerp staan en één kernwoord delen.</li>""")
R("""Product- en periodefilter gelden hier;""","""{M('koppel')} Product- en periodefilter gelden hier;""")
R("""<h3>{M('pw')}</h3>
<p class='w-sm'>{M('pwd')}</p>""","""<h3>{M('pw')}</h3>
<p class='w-sm'>{M('pwd')}. {M('lopend')}</p>""")
R("""Van de overige korte projecten wordt per kwartaal één op de vier geïnspecteerd. De noemer""","""Van de overige korte projecten wordt per kwartaal één op de vier geïnspecteerd. Een maand telt alleen als het project er minstens 10 werkdagen loopt (voorstel; zo telt een start op de laatste dagen van een maand niet als gemiste maand). De noemer""")
R("""<span><i class='w-sw w-actief'></i> project loopt, geen eigen eis in deze maand</span>""","""<span><i class='w-sw w-actief'></i> project loopt, geen eigen eis in deze maand</span><span><b class='w-mut'>✓</b> licht: WPI in een maand met minder dan 10 werkdagen (niet verplicht)</span>""")
R("""<thead><tr><th>Prioriteit</th><th>Norm</th><th>Afgerond</th><th class='w-num'>Gemiddeld</th><th>Binnen norm</th><th class='w-num'>Nog open</th></tr></thead>""",
"""<thead><tr><th>Prioriteit</th><th>Norm</th><th>Afgerond</th><th class='w-num'>Gemiddeld (afgerond)</th><th>Binnen norm</th><th class='w-num'>Nog open</th><th class='w-num'>Leeftijd open</th></tr></thead>""")
R("""<tbody data-draw='normrijen'></tbody>
</table>""","""<tbody data-draw='normrijen'></tbody>
</table>
<p class='w-sm w-mut'>Het gemiddelde telt alleen afgeronde acties en valt daardoor te gunstig uit; de leeftijd van de open acties (dagen sinds de WPI tot de peildatum) staat ernaast.</p>""")
R("""<div class='w-ban w-ban2'>VOORBEELD — fictieve data</div>""","""<section class='w-sec' id='vastleggen' hidden>
<div class='w-card w-noprint'><p><b>Vastgelegde versie van de trendanalyse.</b> Deze versie gebruikt de hele periode zonder filters en zet conclusie, klassen, terugkerende bevindingen, trendacties en follow-up in één document. Vul opgesteld door, vastgesteld op en versie in na vaststelling.</p>
<p><button type='button' class='w-btn w-hoofd' data-act='print'>Afdrukken of opslaan als pdf</button> <button type='button' class='w-btn' data-act='terug'>Terug naar het dashboard</button></p></div>
<div class='w-card w-doc' data-draw='vastleg' data-source='kern trendacties regels acties'></div>
</section>

<div class='w-ban w-ban2'>VOORBEELD — fictieve data</div>""")
open(p,'w').write(s)
c=open('/home/claude/wpi/run/out/dashboard/test/style.css').read()
c=c.replace(".o-ja{background:var(--w-s1)}",".o-ja{background:color-mix(in srgb,var(--color-fg) 50%,var(--color-panel))}")
c+="""/* ronde 5 */
.w-heel{margin:-.1em 0 .4em!important}
.w-hoofd{font-weight:600;border-color:var(--color-fg)}
.w-pc.w-nv{color:var(--color-fg-muted);opacity:.7}
.w-trendk{table-layout:fixed}
.w-trendk th:nth-child(1){width:15%}.w-trendk th:nth-child(2){width:45%}.w-trendk th:nth-child(3){width:20%}.w-trendk th:nth-child(4){width:11%}.w-trendk th:nth-child(5){width:9%}
.w-doc h2{margin-top:.6em}.w-doc h3{margin-top:1.2em;border-bottom:1px solid var(--color-border-line)}
.w-vtbl{margin:.3em 0}
.w-doc .w-msgs{grid-template-columns:1fr}
.w-doc .w-msg p{font-size:1em}
@container (max-width:700px){
 .w-pwt td:first-child{min-width:6.5em;max-width:7.5em}
 .w-pwt th.w-c,.w-pwt td.w-c{min-width:2.2em}
 .w-vtbl{display:block;overflow-x:auto}
}
@media print{
 .w-page>*:not(#vastleggen){display:none!important}
 #vastleggen{display:block!important}
 .w-noprint{display:none!important}
 .w-doc{border:0;padding:0}
 .w-doc table{page-break-inside:auto}.w-doc tr{page-break-inside:avoid}
}
"""
open('/home/claude/wpi/run/out/dashboard/test/style.css','w').write(c)
print('ok')
