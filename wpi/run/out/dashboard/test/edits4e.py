p='/home/claude/wpi/run/out/dashboard/test/genhtml.py'; s=open(p).read()
def R(a,b,n=1):
    global s
    assert s.count(a)==n,(s.count(a),a[:90]); s=s.replace(a,b)
R("""<div class='w-filterbar w-card' id='filters' hidden>
<div class='w-filters'>""","""<div class='w-filterbar w-card' id='filters' hidden>
<button type='button' class='w-btn w-ftog' data-act='filters' aria-expanded='false' aria-controls='filterset'>Filters</button>
<div class='w-filters' id='filterset'>""")
# messages
R("""<div class='w-card w-boodschap' id='boodschappen'>""","""<div class='w-card w-boodschap' id='boodschappen' data-host>""")
R("""<p>{K('conf_pct')}% van de regels met een eigen waarneming was Conform ({K('conform')} van {K('waar')}). {K('uitgevoerd')} van de {K('gepland')} geplande WPI’s zijn uitgevoerd; de directie inspecteerde in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</p></div>""","""<p>{K('conf_pct')}% van de regels met een eigen waarneming was Conform ({K('conform')} van {K('waar')}). De coördinatoren deden {K('uitgevoerd')} van hun {K('gepland')} maandelijkse WPI’s; de directie inspecteerde in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</p></div>""")
R("""<p>Hoogste aandeel afwijkingen en verbeterpunten: {K('risk_a','tekst')} ({K('risk_a')} van {K('risk_a_y')} waargenomen regels). Meeste in aantal: {K('risk_c','tekst')} ({K('risk_c')}).</p></div>""","""<p>Per werkplek is maar {K('pw_x')} van de {K('pw_y')} verplichte WPI’s gedaan ({K('pw_pct')}%); {K('pw_nul')} projecten kregen er geen enkele. Inhoudelijk: hoogste aandeel afwijkingen bij {K('risk_a','tekst')} ({K('risk_a')} van {K('risk_a_y')}), meeste bij {K('risk_c','tekst')} ({K('risk_c')}).</p></div>""")
R("""<p>{K('over')} acties staan over de termijn (oudste {K('over_oudste')} dagen). Stel in het coördinatorenoverleg van {K('overleg','tekst')} de trendacties {K('trend_eerste','tekst')} t/m {K('trend_laatste','tekst')} vast.</p></div>""","""<p>Het Hoofd S&amp;M stelt elke maand het inspectieprogramma op uit de projectplanning ({K('trend_pw','tekst')}). {K('over')} acties staan over de termijn (oudste {K('over_oudste')} dagen) en {K('herh_n')} bevindingen kwamen terug. Stel op {K('overleg','tekst')} de {K('trend_n')} trendacties vast.</p></div>""")
R("""<p class='w-let'><b>Kleine aantallen.</b> Dit zijn {K('wpis')} WPI’s in {K('maanden')} maanden ({K('wpm_min')} tot {K('wpm_max')} per maand). Verschillen tussen maanden, inspecteurs en klassen zijn een signaal om op te letten, geen bewezen trend.</p>
</div>""","""<p class='w-let'><b>Kleine aantallen.</b> Dit zijn {K('wpis')} WPI’s in {K('maanden')} maanden ({K('wpm_min')} tot {K('wpm_max')} per maand). Verschillen tussen maanden, inspecteurs en klassen zijn een signaal om op te letten, geen bewezen trend. Onderstreepte getallen openen de onderliggende regels.</p>
{DET('boodschappen')}
</div>

<div class='w-card' id='pw-kort' data-host>
<h2>Verplichte WPI’s per werkplek, per maand <span class='w-vca'>VCA 7.1</span> {VB}</h2>
<h3>{K('pw_x')} van {K('pw_y')} uitgevoerd ({K('pw_pct')}%)</h3>
<div class='w-leg'><span><i class='w-sw o-con'></i>✓ Uitgevoerd</span><span><i class='w-sw o-afw'></i>✕ Gemist</span><span class='w-mut'>balklengte = aantal verplichte WPI’s in de maand; projectplanning fictief</span></div>
<div class='w-rel w-beam' data-draw='pwchart' data-source='projecten wpis'></div>
<p class='w-sm w-mut'>Details per project staan onder Programma. <button type='button' class='w-btn' data-naar='programma'>Naar Programma</button></p>
{DET('pw-kort')}
</div>""")
R("""<thead><tr><th data-field='nr'>Nummer</th><th data-field='wat'>Wat</th><th data-field='actiehouder'>Actiehouder</th><th data-field='toetser'>Toetser</th><th data-field='termijn'>Termijn</th><th data-field='status'>Status</th></tr></thead>""","""<thead><tr><th data-field='nr'>Nummer</th><th data-field='wat'>Wat</th><th data-field='doel'>Meetbaar doel</th><th data-field='actiehouder'>Actiehouder</th><th data-field='toetser'>Toetser</th><th data-field='termijn'>Termijn en controle</th><th data-field='voortgang'>Laatst besproken / voortgang</th></tr></thead>""")
R("""staan elke maandag op de agenda van het coördinatorenoverleg; het verslag noemt per nummer de nieuwe status. Actiehouders en termijnen hierboven zijn een fictief voorbeeld; het Hoofd Service &amp; Montage stelt ze vast.</p>""","""staan elke maandag op de agenda van het coördinatorenoverleg; het verslag noemt per nummer de nieuwe status en Claude zet die in de kolom “Laatst besproken / voortgang”. Op de controledatum toetst de toetser of het doel is gehaald. Actiehouders, doelen en data hierboven zijn een fictief voorbeeld; het Hoofd Service &amp; Montage stelt ze vast.</p>""")
R("""<details class='w-card w-concl' id='conclusie'>""","""<details class='w-card w-concl' id='conclusie' data-host>""")
R("""<li><b>Programma.</b> {K('uitgevoerd')} van {K('gepland')} geplande WPI’s uitgevoerd; niet uitgevoerd: {K('gemist','tekst')}. Directie-inspectie in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</li>""","""<li><b>Programma per werkplek (VCA 7.1).</b> {K('pw_x')} van {K('pw_y')} verplichte WPI’s uitgevoerd ({K('pw_pct')}%): projecten langer dan een maand {K('pw_lang_x')} van {K('pw_lang_y')}, korte projecten met risicokenmerk {K('pw_risico_x')} van {K('pw_risico_y')}; overige korte projecten in de planning: {K('pw_overig_n')}. Geen enkele verplichte WPI bij {K('pw_nul')} projecten: {K('pw_nul','tekst')}. Verplichtingen die nog lopen en nog niet meetellen: {K('pw_lop')}. Hier zit het grootste gat met VCA 7.1.</li>
<li><b>Inzet per inspecteur (ondergrens).</b> {K('uitgevoerd')} van {K('gepland')} geplande WPI’s uitgevoerd; niet uitgevoerd: {K('gemist','tekst')}. Directie-inspectie in {K('dir_ok')} van de {K('dir_tot')} kwartalen. Dit zegt niets over de dekking per werkplek.</li>
<li><b>Terugkerende bevindingen.</b> {K('herh_n')} bevindingen kwamen in meer dan één WPI terug, samen {K('herh_acties')} van de {K('acties')} acties; het vaakst: {K('herh_top','tekst')}. {K('herh_terug')} daarvan kwamen terug nadat een eerdere actie al was afgerond: per WPI afronden lost ze niet op. De trendacties pakken ze daarom bij de bron aan (LMRA, uitrusting van de montagewagen).</li>""")
R("""</ul>
</details>

<details class='w-card' id='definities'>""","""</ul>
{DET('conclusie')}
</details>

<details class='w-card' id='definities'>""")
R("""<li><b>Kwartaal onvolledig</b>""","""<li><b>Verplichte WPI per werkplek</b> (voorstel procedure 5.5): project langer dan een maand = elke kalendermaand van start tot einde (of peildatum) één WPI op dat project, ook als het project maar een deel van die maand loopt; kort project met hijsen, besloten ruimte of open water = ten minste één WPI; overige korte projecten = één op de vier per kwartaal. Een verplichting telt mee zodra de maand voorbij is of het project is afgelopen. WPI’s worden aan een project gekoppeld via het projectnummer.</li>
<li><b>Terugkerende bevinding</b>: dezelfde bevinding (zelfde tekst) bij acties uit twee of meer verschillende WPI’s.</li>
<li><b>Kwartaal onvolledig</b>""")
# programma
R("""<section class='w-sec' id='programma' hidden>
<div class='w-card' id='progr-kaart' data-host>
<h2>Programma en uitvoering <span class='w-vca'>VCA 7.1</span> {VB}</h2>""","""<section class='w-sec' id='programma' hidden>
<div class='w-card' id='werkplek' data-host>
<h2>Programma per operationele werkplek <span class='w-vca'>VCA 7.1</span> {VB}</h2>""")
R("""<div class='w-kader w-o w-sm'><b>Invulling door Noardling (voorstel uit de procedure).</b> Een project dat langer dan een maand loopt krijgt elke maand een WPI. Elk kort project met hijsen, een besloten ruimte of werk bij open water krijgt ten minste één WPI. Van de overige korte projecten wordt per kwartaal één op de vier geïnspecteerd. Daarnaast doet elke Montage Coördinator ten minste 1 WPI per maand en een directielid ten minste 1 per kwartaal. <b>De noemer</b> (lopende projecten per maand) komt uit de projectplanning en zit niet in deze voorbeelddata; de tabel toont daarom alleen het programma per inspecteur.</div>
<h3>Uitgevoerd: {M('progr')}</h3>
<div class='w-scroll w-rel' data-draw='progr' data-source='programma wpis'></div>
<h3>Directie-inspectie {M('dir')}</h3>
<div class='w-chips w-rel' data-draw='kwart' data-source='wpis'></div>
{DET('progr-kaart')}
</div>""","""<div class='w-kader w-o w-sm'><b>Invulling door Noardling (voorstel procedure 5.5).</b> Een project dat langer dan een maand loopt krijgt elke kalendermaand een WPI. Elk kort project met hijsen met een mobiele kraan, een besloten ruimte met vergunning of werk bij open water krijgt ten minste één WPI. Van de overige korte projecten wordt per kwartaal één op de vier geïnspecteurd. De noemer komt uit de projectplanning; <b>die planning is in dit voorbeeld fictief</b> ({K('pw_proj')} projecten).</div>
<h3>{M('pw')}</h3>
<p class='w-sm'>{M('pwd')}</p>
<div class='w-leg'><span><b class='w-st ok'>✓</b> WPI op dit project in deze maand</span><span><b class='w-st bad'>✕</b> verplicht, geen WPI</span><span><b class='w-mut'>◌</b> loopt nog, telt nog niet mee</span><span><i class='w-sw w-actief'></i> project loopt, geen eigen eis in deze maand</span><span class='w-mut'>leeg = niet verplicht</span></div>
<div class='w-rel' data-draw='pw' data-source='projecten wpis'></div>
<p class='w-sm w-mut'>Product- en periodefilter gelden hier; inspecteur- en classificatiefilter niet (de eis geldt per werkplek, niet per inspecteur). Een kort project staat in de maand van de WPI, of in de eindmaand als er geen WPI was.</p>
{DET('werkplek')}
</div>
<div class='w-card' id='progr-kaart' data-host>
<h2>Inzet per inspecteur (ondergrens) {VB}</h2>
<p class='w-sm w-mut'>Elke Montage Coördinator doet ten minste 1 WPI per maand en een directielid ten minste 1 per kwartaal. Dit is een ondergrens voor de inzet, geen maat voor de dekking per werkplek.</p>
<h3>Uitgevoerd: {M('progr')}</h3>
<div class='w-scroll w-rel' data-draw='progr' data-source='programma wpis'></div>
<h3>Directie-inspectie {M('dir')}</h3>
<div class='w-chips w-rel' data-draw='kwart' data-source='wpis'></div>
{DET('progr-kaart')}
</div>""")
# bevindingen
R("""<span><i class='w-sw o-gee'></i>○ Alleen bevestigd</span>""","""<span><i class='w-sw o-ab'></i>○ Alleen bevestigd</span>""")
R("""<div class='w-rel' data-draw='maand' data-source='regels' style='min-height:16em'></div>""","""<div class='w-rel' data-draw='maand' data-source='regels'></div>""")
R("""<div class='w-rel' data-draw='trend' data-source='regels' style='min-height:12em'></div>""","""<div class='w-rel' data-draw='trend' data-source='regels'></div>""")
R("""<div class='w-leg'><span><i class='w-sw o-afw'></i>✕ Afwijking</span><span><i class='w-sw o-ver'></i>△ Verbeterpunt</span><span><i class='w-sw o-con'></i>✓ Conform</span><span class='w-mut'>balk = alle waargenomen regels van de klasse</span></div>""","""<div class='w-leg'><span><i class='w-sw o-afw'></i>✕ Afwijking</span><span><i class='w-sw o-ver'></i>△ Verbeterpunt</span><span><i class='w-sw o-con'></i>✓ Conform</span><span class='w-mut'>balklengte = aantal waargenomen regels; rechts: afwijking + verbeterpunt van dat aantal (aandeel)</span></div>""")
R("""<div class='w-card' id='dekking' data-host>
<h2>Waar is feitelijk gekeken? <span class='w-own'>Noardling-keuze</span> {VB}</h2>
<h3>Eigen waarneming bij {M('dek')}</h3>""","""<div class='w-card' id='terugkerend' data-host>
<h2>Terugkerende bevindingen <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<h3>{M('herh')}</h3>
<p class='w-sm w-mut'>Dezelfde bevinding bij acties uit twee of meer WPI’s. “Terug na afronding” = de bevinding kwam terug nadat een eerdere actie al was afgerond.</p>
<div class='w-rel' data-draw='herh' data-source='acties wpis'></div>
{DET('terugkerend')}
</div>
<details class='w-card w-fold' id='dekking' data-host>
<summary><h2>Waar is feitelijk gekeken? <span class='w-own'>Noardling-keuze</span> {VB}</h2>
<h3>Eigen waarneming bij {M('dek')}</h3><span class='w-hint'>Tik om te openen</span></summary>""")
R("""<div><p class='w-sm w-mut'>Per maand</p><div class='w-rel' data-draw='diep' data-by='maand' data-source='regels'></div></div>
</div>
{DET('dekking')}
</div>""","""<div><p class='w-sm w-mut'>Per maand</p><div class='w-rel' data-draw='diep' data-by='maand' data-source='regels'></div></div>
</div>
{DET('dekking')}
</details>""")
# TRA folds
R("""<div class='w-card' id='tra-dim' data-host>
<h2>Waar zitten de afwijkingen? {VB}</h2>
<h3>Meeste afwijkingen en verbeterpunten: <span data-draw='mdim'>—</span></h3>""","""<details class='w-card w-fold' id='tra-dim' data-host>
<summary><h2>Waar zitten de afwijkingen? {VB}</h2>
<h3>Meeste afwijkingen en verbeterpunten: <span data-draw='mdim'>—</span></h3><span class='w-hint'>Tik om te openen</span></summary>""")
R("""{DET('tra-dim')}
</div>
<div class='w-card' id='buitentra' data-host>
<h2>Buiten de TRA <span class='w-own'>Noardling · signaal dat een TRA een risico mist</span> {VB}</h2>
<h3>{M('buiten')}</h3>""","""{DET('tra-dim')}
</details>
<details class='w-card w-fold' id='buitentra' data-host>
<summary><h2>Buiten de TRA <span class='w-own'>Noardling · signaal dat een TRA een risico mist</span> {VB}</h2>
<h3>{M('buiten')}</h3><span class='w-hint'>Tik om te openen</span></summary>""")
R("""{DET('buitentra')}
</div>
<div class='w-card' id='blind' data-host>
<h2>Blinde vlekken {VB}</h2>
<h3>Vaakst zonder eigen waarneming: <span data-draw='mnb'>—</span></h3>""","""{DET('buitentra')}
</details>
<details class='w-card w-fold' id='blind' data-host>
<summary><h2>Blinde vlekken {VB}</h2>
<h3>Vaakst zonder eigen waarneming: <span data-draw='mnb'>—</span></h3><span class='w-hint'>Tik om te openen</span></summary>""")
R("""{DET('blind')}
</div>
</section>""","""{DET('blind')}
</details>
</section>""")
# acties
R("""<tbody data-draw='openrijen'></tbody>
</table>""","""<tbody data-draw='openrijen'></tbody>
</table>
<div data-draw='openmeer' data-source='acties'></div>""")
R("""<thead><tr><th data-field='actie'>Actienummer</th><th data-field='bevinding'>Bevinding</th><th data-field='verbeteractie'>Verbeteractie</th><th data-field='actiehouder'>Actiehouder</th><th data-field='afgerond_op'>Afgerond op</th><th data-field='getoetst_op'>Getoetst op</th><th data-field='toetser'>Toetser</th></tr></thead>""","""<thead><tr><th data-field='actie'>Actienummer</th><th data-field='prioriteit'>Prioriteit</th><th data-field='termijn'>Termijn</th><th data-field='bevinding'>Bevinding</th><th data-field='ref'>TRA-ID / klasse</th><th data-field='verbeteractie'>Verbeteractie</th><th data-field='actiehouder'>Actiehouder</th><th data-field='afgerond_op'>Afgerond op</th><th data-field='getoetst_op'>Getoetst op</th><th data-field='toetser'>Toetser</th></tr></thead>""")
R("""<div class='w-card' id='doorlooptijd' data-host>
<h2>Doorlooptijd en verdeling {VB}</h2>
<h3>Prioriteit {M('prio')}</h3>""","""<details class='w-card w-fold' id='doorlooptijd' data-host>
<summary><h2>Doorlooptijd en verdeling {VB}</h2>
<h3>Prioriteit {M('prio')}</h3><span class='w-hint'>Tik om te openen</span></summary>""")
R("""{DET('doorlooptijd')}
</div>
</section>""","""{DET('doorlooptijd')}
</details>
</section>""")
open(p,'w').write(s); print('ok')
