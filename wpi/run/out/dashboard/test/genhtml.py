K=lambda k,f='toon':"<b data-draw='k' data-source='kern' data-field='%s' data-where='k=%s'>—</b>"%(f,k)
T=lambda t:"<b data-draw='t' data-t='%s'>—</b>"%t
TS=lambda t:"<span data-draw='t' data-t='%s'>—</span>"%t
M=lambda m:"<span data-draw='m' data-m='%s'>—</span>"%m
DET=lambda slot:"<div class='w-det w-rel' data-draw='detail' data-slot='%s' data-source='wpis regels acties'></div>"%slot
VB="<span class='w-vb'>VOORBEELD — fictieve data</span>"
css=open('/home/claude/wpi/run/out/dashboard/test/style.css').read()
html=f"""<meta name='dash-one-writer'>
<style>
{css}</style>
<div class='w-root'><div class='w-page' lang='nl'>

<div class='w-ban' id='voorbeeld'>VOORBEELD — fictieve data · geen echte inspecties, personen, opdrachtgevers of locaties</div>

<header id='kop' class='w-kop'>
<h1>Trendanalyse werkplekinspecties 2026</h1>
<p class='w-sub'>Noardling B.V., Service &amp; Montage · periode {K('per_van','tekst')} t/m {K('per_tot','tekst')} · peildatum {K('peil','tekst')}</p>
<p class='w-sm w-mut'>Opgesteld door: <span class='w-in'>……………</span> · Vastgesteld op: <span class='w-in'>……………</span> (in te vullen; leeg in dit voorbeeld). Alleen eigen monteurs.</p>
<p><button type='button' class='w-btn w-hoofd' data-act='vastleg'>Trendanalyse vastleggen (afdrukbare versie)</button></p>
</header>

<nav class='w-tabbar' role='tablist' aria-label='Onderdelen'>
<button type='button' class='w-tab' role='tab' data-tabknop='overzicht' aria-selected='true'>Overzicht</button>
<button type='button' class='w-tab' role='tab' data-tabknop='programma' aria-selected='false'>Programma</button>
<button type='button' class='w-tab' role='tab' data-tabknop='bevindingen' aria-selected='false'>Bevindingen</button>
<button type='button' class='w-tab' role='tab' data-tabknop='tra' aria-selected='false'>TRA-toetsing</button>
<button type='button' class='w-tab' role='tab' data-tabknop='acties' aria-selected='false'>Acties</button>
</nav>

<div class='w-filterbar w-card' id='filters' hidden>
<button type='button' class='w-btn w-ftog' data-act='filters' aria-expanded='false' aria-controls='filterset'>Filters</button>
<div class='w-filters' id='filterset'>
<label>Periode van<select class='dash-select' data-draw='f-van' data-source='wpis' aria-label='Periode van'></select></label>
<label>Periode tot en met<select class='dash-select' data-draw='f-tot' data-source='wpis' aria-label='Periode tot en met'></select></label>
<label>Product<select class='dash-select' data-draw='f-product' data-source='wpis' aria-label='Product'></select></label>
<label>Inspecteur<select class='dash-select' data-draw='f-inspecteur' data-source='wpis' aria-label='Inspecteur'></select></label>
<label>Classificatie<select class='dash-select' data-draw='f-classificatie' data-source='regels' aria-label='Classificatie'></select></label>
<button type='button' class='w-btn' data-act='reset'>Filters wissen</button>
</div>
<p class='w-sm w-mut' data-draw='f-actief' data-source='wpis regels'>—</p>
</div>

<section class='w-sec' id='overzicht'>
<div class='w-card w-boodschap' id='boodschappen' data-host>
<h2>In twee minuten {VB}</h2>
<p class='w-sm w-mut w-heel'>Hele periode; de filters van de andere tabbladen gelden hier niet.</p>
<div class='w-msgs'>
<div class='w-msg w-goed'><span class='w-msgl'>✓ Wat gaat goed</span>
<p>{K('conf_pct')}% van de regels met een eigen waarneming was Conform ({K('conform')} van {K('waar')}). De coördinatoren deden {K('c_uitg')} van hun {K('c_gepl')} maandelijkse WPI’s; de directie deed {K('d_uitg')} van {K('d_gepl')} en inspecteerde in {K('dir_ok')} van de {K('dir_tot')} kwartalen.</p></div>
<div class='w-msg w-risico'><span class='w-msgl'>✕ Grootste risico</span>
<p>Per werkplek is maar {K('pw_x')} van de {K('pw_y')} verplichte WPI’s gedaan ({K('pw_pct')}%); {K('pw_geen')} projecten kregen geen enkele WPI. Inhoudelijk: hoogste aandeel afwijkingen bij {K('risk_a','tekst')} ({K('risk_a')} van {K('risk_a_y')}), meeste bij {K('risk_c','tekst')} ({K('risk_c')}).</p></div>
<div class='w-msg w-nu'><span class='w-msgl'>→ Wat moet er nu gebeuren</span>
<p>Laat het Hoofd S&amp;M voortaan elke maand het inspectieprogramma opstellen uit de projectplanning ({K('trend_pw','tekst')}). {K('over')} acties staan over de termijn (oudste {K('over_oudste')} dagen) en {K('herh_n')} bevindingen kwamen terug. Stel op {K('overleg','tekst')} de {K('trend_n')} trendacties vast.</p></div>
</div>
<p class='w-let'><b>Kleine aantallen.</b> Dit zijn {K('wpis')} WPI’s in {K('maanden')} maanden ({K('wpm_min')} tot {K('wpm_max')} per maand). Verschillen tussen maanden, inspecteurs en klassen zijn een signaal om op te letten, geen bewezen trend. Onderstreepte getallen openen de onderliggende regels.</p>
{DET('boodschappen')}
</div>

<div class='w-card' id='pw-kort' data-host>
<h2>Verplichte WPI’s per werkplek, per maand <span class='w-vca'>VCA 7.1</span> {VB}</h2>
<p class='w-sm w-mut w-heel'>Hele periode; de filters van de andere tabbladen gelden hier niet.</p>
<h3>{K('pw_x')} van {K('pw_y')} uitgevoerd ({K('pw_pct')}%)</h3>
<div class='w-leg'><span><i class='w-sw o-con'></i>✓ Uitgevoerd</span><span><i class='w-sw o-afw'></i>✕ Gemist</span><span><i class='w-sw o-lop'></i>◌ Loopt nog (telt nog niet mee)</span><span class='w-mut'>balklengte = aantal verplichte WPI’s in de maand; projectplanning fictief</span></div>
<div class='w-rel w-beam' data-draw='pwchart' data-source='projecten wpis'></div>
<p class='w-sm w-mut'>Details per project staan onder Programma. <button type='button' class='w-btn' data-naar='programma'>Naar Programma</button></p>
{DET('pw-kort')}
</div>

<div class='w-card' id='trendacties' data-host>
<h2>Acties uit de trendanalyse <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<p class='w-sm w-mut w-heel'>Hele periode; de filters van de andere tabbladen gelden hier niet.</p>
<p class='w-kader w-sm'>VCA 7.2, minimumeis: “Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.”</p>
<table class='w-tbl w-cards w-trendk' data-source='trendacties' data-row-key='nr'>
<thead><tr><th data-field='nr'>Nummer</th><th data-field='onderwerp'>Wat</th><th data-field='actiehouder'>Actiehouder</th><th data-field='termijn'>Termijn</th><th data-field='status'>Status</th></tr></thead>
<tbody data-draw='trendkort'></tbody>
</table>
<details class='w-sub2'><summary>Volledige trendacties: wat, aanleiding, meetbaar doel, toetser, controledatum en voortgang</summary>
<table class='w-tbl w-cards w-trendt' data-source='trendacties' data-row-key='nr'>
<thead><tr><th data-field='nr'>Nummer</th><th data-field='wat'>Wat</th><th data-field='doel'>Meetbaar doel</th><th data-field='actiehouder'>Actiehouder</th><th data-field='toetser'>Toetser</th><th data-field='termijn'>Termijn en controle</th><th data-field='voortgang'>Laatst besproken / voortgang</th></tr></thead>
<tbody data-draw='trendrijen'></tbody>
</table>
</details>
<p class='w-kader w-o w-sm'><b>Follow-up (Noardling-keuze).</b> {K('trend_eerste','tekst')} t/m {K('trend_laatste','tekst')} staan elke maandag op de agenda van het coördinatorenoverleg; het verslag noemt per nummer de nieuwe status en Claude zet die in de kolom “Laatst besproken / voortgang”. Op de controledatum toetst de toetser of het doel is gehaald. Actiehouders, doelen en data hierboven zijn een fictief voorbeeld; het Hoofd Service &amp; Montage stelt ze vast.</p>
</div>

<details class='w-card w-concl' id='conclusie' data-host>
<summary>Volledige conclusie en onderbouwing</summary>
<p class='w-sm w-mut'>Over de hele periode, zonder filters. Elk getal komt uit de berekening “Kerncijfers hele periode”.</p>
<ul>
<li><b>Gegevens.</b> {K('wpis')} WPI’s met {K('regels')} regels in de WPI’s, waarvan {K('waar')} met een eigen waarneming (Conform {K('conform')}, Afwijking {K('afw')}, Verbeterpunt {K('verb')}), {K('ab')} alleen bevestigd via de afsluitvraag en {K('nee')} niet beoordeeld of niet van toepassing.</li>
<li><b>Kleine aantallen.</b> {K('wpm_min')} tot {K('wpm_max')} WPI’s per maand, {K('d_wpis')} directie-inspecties. Klassen met minder dan {K('min_n')} waargenomen regels zijn te klein voor een conclusie: {K('klein','tekst')}.</li>
<li><b>Per kwartaal</b> (afwijkingen en verbeterpunten per WPI): {K('kw_lijst','tekst')}. {K('richting','tekst')}</li>
<li><b>Programma per werkplek (VCA 7.1).</b> {K('pw_x')} van {K('pw_y')} verplichte WPI’s uitgevoerd ({K('pw_pct')}%): projecten langer dan een maand {K('pw_lang_x')} van {K('pw_lang_y')}, korte projecten met risicokenmerk {K('pw_risico_x')} van {K('pw_risico_y')}; overige korte projecten in de planning: {K('pw_overig_n')}. Geen enkele WPI bij {K('pw_geen')} projecten: {K('pw_geen','tekst')}. Lopende maand ({K('pw_lm_ok','tekst')}): gehaald {K('pw_lm_ok')}, nog niet gehaald {K('pw_lop')} (die tellen pas mee als de maand voorbij is). Hier zit het grootste gat met VCA 7.1.</li>
<li><b>Inzet per inspecteur (ondergrens).</b> {K('uitgevoerd')} van {K('gepland')} geplande WPI’s uitgevoerd: coördinatoren {K('c_uitg')} van {K('c_gepl')}, directie {K('d_uitg')} van {K('d_gepl')}; niet uitgevoerd: {K('gemist','tekst')}. Directie-inspectie in {K('dir_ok')} van de {K('dir_tot')} kwartalen. Dit zegt niets over de dekking per werkplek.</li>
<li><b>Terugkerende bevindingen.</b> {K('herh_n')} bevindingen kwamen in meer dan één WPI terug, samen {K('herh_acties')} van de {K('acties')} acties; het vaakst: {K('herh_top','tekst')}. {K('herh_terug')} daarvan kwamen terug nadat een eerdere actie al was afgerond: per WPI afronden lost ze niet op. De trendacties pakken ze daarom bij de bron aan (LMRA, uitrusting van de montagewagen). Bevindingen met een andere formulering maar dezelfde klasse en dezelfde kernwoorden zijn samengenomen.</li>
<li><b>Zwaartepunt.</b> Meeste afwijkingen en verbeterpunten in aantal: {K('top_aantal','tekst')}. Hoogste aandeel van de waargenomen regels in de klasse (bij minstens {K('min_n')} waargenomen regels): {K('top_aandeel','tekst')}.</li>
<li><b>TRA-toetsing.</b> {K('tra_toets')} waargenomen toetsingen van {K('tra_uniek')} unieke TRA-regels. Daarvan {K('tra_neg')} toetsingen met een afwijking of verbeterpunt, verdeeld over {K('tra_neg_uniek')} unieke regels. In meer dan één WPI afwijkend ({K('tra_herh')} regels, gelijke stand): {K('tra_herh','tekst')}.</li>
<li><b>Dekking.</b> Eigen waarneming bij {K('waar_pct')}% van de regels; per inspecteur van {K('ins_laag')}% ({K('ins_laag','tekst')}) tot {K('ins_hoog')}% ({K('ins_hoog','tekst')}). Vaakst zonder eigen waarneming: {K('zonder','tekst')} ({K('zonder')} van {K('zonder_y')}). {K('prod_niet')} van {K('prod_tot')} producten nog nooit geïnspecteerd; {K('kb_gezien')} van {K('kb_regels')} kennisbankregels ooit waargenomen.</li>
<li><b>Buiten TRA.</b> {K('buiten')} waarnemingen over {K('buiten_ond')} onderwerpen, het vaakst: {K('buiten_top','tekst')} ({K('buiten_top')}). Elke waarneming heeft een actie om de TRA aan te vullen.</li>
<li><b>Acties.</b> {K('acties')} acties: {K('open')} open, waarvan {K('over')} over de termijn (oudste {K('over_oudste')} dagen, {K('over_oudste','tekst')}); {K('afgerond')} afgerond na toetsing, waarvan {K('telaat')} na de termijn. Tegenover de norm: direct {K('dir_norm_ok')} van {K('dir_norm_n')} dezelfde dag; kort (norm {K('norm_kort')} dagen) gemiddeld {K('kort_gem')} dagen, {K('kort_ok')} van {K('kort_n')} binnen de norm (alleen afgeronde acties en daardoor te gunstig: {K('open_kort_n')} open acties met prioriteit kort zijn gemiddeld {K('open_kort_gem')} dagen oud, de oudste {K('open_kort_max')}); planmatig {K('plan_ok')} van {K('plan_n')} binnen de eigen termijn. Bron: {K('bron_insp')} inspectie, {K('bron_buiten')} buiten de TRA, {K('bron_idee')} idee van monteurs.</li>
<li><b>Coördinator tegenover directie.</b> {K('c_neg')} tegenover {K('d_neg')} afwijkingen en verbeterpunten per WPI; eigen waarneming {K('c_ja')}% tegenover {K('d_ja')}%, alleen bevestigd {K('c_ab')}% tegenover {K('d_ab')}%. Bij {K('d_wpis')} directie-inspecties bepaalt één WPI het gemiddelde sterk.</li>
</ul>
{DET('conclusie')}
</details>

<details class='w-card' id='definities'><summary>Definities en rekenregels</summary>
<ul class='w-sm'>
<li><b>Positieve bevinding</b>: oordeel Conform. <b>Negatieve bevinding</b>: Afwijking of Verbeterpunt. Conform, Afwijking en Verbeterpunt bestaan alleen met een eigen waarneming van de inspecteur.</li>
<li><b>Waarneming</b> (afgeleid van het oordeel, geen apart oordeel): ● Waargenomen = Conform, Afwijking of Verbeterpunt; ○ Alleen bevestigd = “Geen afwijking waargenomen”, alleen via de afsluitvraag; ? Niet beoordeeld; – niet van toepassing.</li>
<li><b>Toetsing</b>: één waargenomen beoordeling van een TRA-regel in één WPI. <b>Unieke regel</b>: een TRA-regel uit de kennisbank, ongeacht hoe vaak getoetst.</li>
<li><b>Direct gecorrigeerd</b>: de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter plaatse. Een <b>direct genomen maatregel</b> maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en getoetst.</li>
<li><b>Over de termijn</b>: status Open en termijn vóór de peildatum. Een actie is pas <b>Afgerond</b> nadat de toetser heeft vastgesteld dat de verbeteractie is uitgevoerd. <b>Doorlooptijd</b>: dagen van de WPI tot afgerond.</li>
<li><b>Verplichte WPI per werkplek</b> (voorstel procedure 5.5): project langer dan een maand = één WPI in elke kalendermaand met minstens 10 werkdagen projectduur (voorstel); kort project met hijsen, besloten ruimte of open water = ten minste één WPI; overige korte projecten = één op de vier per kwartaal. Een gehaalde verplichting telt direct mee; een nog niet gehaalde wacht tot de maand voorbij is of het project is afgelopen. WPI’s worden aan een project gekoppeld via het projectnummer; locatie en product moeten daarbij passen, anders telt de WPI niet mee en volgt een waarschuwing.</li>
<li><b>Terugkerende bevinding</b>: dezelfde bevinding bij acties uit twee of meer verschillende WPI’s. Twee acties horen bij dezelfde bevinding als ze dezelfde klasse hebben én minstens twee kernwoorden delen (woorden van vier letters of meer, zonder vulwoorden, vergeleken op de eerste zes letters), of op dezelfde TRA-regel of hetzelfde algemene onderwerp staan en één kernwoord delen.</li>
<li><b>Kwartaal onvolledig</b>: de periode begint of eindigt binnen het kwartaal. Een richting wordt pas genoemd vanaf vier volledige kwartalen.</li>
<li>Alle gegevens zijn fictief en gaan alleen over eigen monteurs; namen van monteurs komen niet voor.</li>
</ul></details>
</section>

<section class='w-sec' id='programma' hidden>
<div class='w-card' id='werkplek' data-host>
<h2>Programma per operationele werkplek <span class='w-vca'>VCA 7.1</span> {VB}</h2>
<p class='w-kader w-sm'>VCA 7.1, minimumeisen: “Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel leidinggevenden.” Voetnoot 10: “Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar verhouding wordt behaald, rekening houdend met de risico’s.” En: “De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een werklocatie.”</p>
<div class='w-kader w-o w-sm'><b>Invulling door Noardling (voorstel procedure 5.5).</b> Een project dat langer dan een maand loopt krijgt een WPI in elke kalendermaand met minstens 10 werkdagen projectduur. Elk kort project met hijsen met een mobiele kraan, een besloten ruimte met vergunning of werk bij open water krijgt ten minste één WPI. Van de overige korte projecten wordt per kwartaal één op de vier geïnspecteerd. Die grens van 10 werkdagen is een voorstel: zo telt een start op de laatste dagen van een maand niet als gemiste maand. De noemer komt uit de projectplanning; <b>die planning is in dit voorbeeld fictief</b> ({K('pw_proj')} projecten).</div>
<h3>{M('pw')}</h3>
<p class='w-sm'>{M('pwd')}. {M('lopend')}</p>
<div class='w-leg'><span><b class='w-st ok'>✓</b> WPI op dit project in deze maand</span><span><b class='w-st bad'>✕</b> verplicht, geen WPI</span><span><b class='w-mut'>◌</b> loopt nog, telt nog niet mee</span><span><i class='w-sw w-actief'></i> project loopt, geen eigen eis in deze maand</span><span><b class='w-mut'>✓</b> licht: WPI in een maand met minder dan 10 werkdagen (niet verplicht)</span><span class='w-mut'>leeg = niet verplicht</span></div>
<div class='w-rel' data-draw='pw' data-source='projecten wpis'></div>
<p class='w-sm'><button type='button' class='w-btn' data-csv='programma'>Download programmatabel (CSV)</button></p>
<div data-draw='csvuit' data-csvuit='programma'></div>
<p class='w-sm w-mut'>{M('koppel')} Product- en periodefilter gelden hier; inspecteur- en classificatiefilter niet (de eis geldt per werkplek, niet per inspecteur). Een kort project staat in de maand van de WPI, of in de eindmaand als er geen WPI was.</p>
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
</div>
<div class='w-card' id='soort' data-host>
<h2>Coördinator tegenover directie <span class='w-vca'>VCA 7.1</span> {VB}</h2>
<h3>{M('cvd')}</h3>
<div class='w-scroll'>
<table class='w-tbl w-sticky' data-source='wpis regels acties'>
<thead><tr><th>Kengetal</th><th class='w-num'>Coördinator</th><th class='w-num'>Directie</th></tr></thead>
<tbody>
<tr><td>WPI’s</td><td class='w-num'>{T('c_wpis')}</td><td class='w-num'>{T('d_wpis')}</td></tr>
<tr><td>Regels per WPI</td><td class='w-num'>{T('c_rpw')}</td><td class='w-num'>{T('d_rpw')}</td></tr>
<tr><td>Eigen waarneming</td><td class='w-num'>{T('c_ja')}</td><td class='w-num'>{T('d_ja')}</td></tr>
<tr><td>Alleen bevestigd</td><td class='w-num'>{T('c_ab')}</td><td class='w-num'>{T('d_ab')}</td></tr>
<tr><td>Afwijking + verbeterpunt per WPI</td><td class='w-num'>{T('c_neg')}</td><td class='w-num'>{T('d_neg')}</td></tr>
<tr><td>Waarnemingen buiten de TRA</td><td class='w-num'>{T('c_buiten')}</td><td class='w-num'>{T('d_buiten')}</td></tr>
<tr><td>Acties direct gecorrigeerd</td><td class='w-num'>{T('c_direct')}</td><td class='w-num'>{T('d_direct')}</td></tr>
</tbody></table></div>
<p class='w-sm w-mut'>Weinig directie-inspecties: één WPI bepaalt het gemiddelde sterk.</p>
{DET('soort')}
</div>
</section>

<section class='w-sec' id='bevindingen' hidden>
<div class='w-tilebox' id='bev-tegels' data-host>
<div class='w-tilehead'>Bevindingen binnen de filters {VB}</div>
<div class='w-tiles' data-source='regels'>
<div class='w-tile'><span>Regels in de WPI’s</span>{T('regels')}<small>waarvan {TS('waar')} met eigen waarneming</small></div>
<div class='w-tile'><span>Positief (Conform)</span>{T('pos')}<small>{TS('pos_pct')} van de waargenomen regels</small></div>
<div class='w-tile'><span>Afwijking + verbeterpunt</span>{T('neg')}<small>✕ {TS('afw')} · △ {TS('verb')}</small></div>
<div class='w-tile'><span>Zonder eigen waarneming</span>{T('zonder')}<small>○ {TS('ab')} alleen bevestigd · ? {TS('nee')} niet beoordeeld of n.v.t.</small></div>
</div>
{DET('bev-tegels')}
</div>
<div class='w-card' id='oordelen' data-host>
<h2>Oordelen per maand <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<p class='w-kader w-sm'>VCA 7.2, vraag: “Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)?”</p>
<h3>{M('maand')}</h3>
<div class='w-leg'><span><i class='w-sw o-con'></i>✓ Conform</span><span><i class='w-sw o-ver'></i>△ Verbeterpunt</span><span><i class='w-sw o-afw'></i>✕ Afwijking</span><span><i class='w-sw o-ab'></i>○ Alleen bevestigd</span><span><i class='w-sw o-nb'></i>? Niet beoordeeld</span><span><i class='w-sw o-nvt'></i>– N.v.t.</span></div>
<div class='w-two'>
<div><p class='w-sm w-mut'>Aantal regels per oordeel</p><div class='w-rel' data-draw='maand' data-source='regels'></div></div>
<div><p class='w-sm w-mut'>Aandeel van de waargenomen regels: lijn ✓ Conform, streep ✕△ afwijking + verbeterpunt</p><div class='w-rel' data-draw='trend' data-source='regels'></div></div>
</div>
{DET('oordelen')}
</div>
<div class='w-card' id='classificatie' data-host>
<h2>Bevindingen per klasse <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<p class='w-kader w-sm'>VCA 7.2, minimumeis: “Bevindingen worden geclassificeerd.”</p>
<h3>{M('klasse')}</h3>
<div class='w-leg'><span><i class='w-sw o-afw'></i>✕ Afwijking</span><span><i class='w-sw o-ver'></i>△ Verbeterpunt</span><span><i class='w-sw o-con'></i>✓ Conform</span><span class='w-mut'>balklengte = aantal waargenomen regels; rechts: afwijking + verbeterpunt van dat aantal (aandeel)</span></div>
<div class='w-rel' data-draw='klasse' data-source='regels'></div>
{DET('classificatie')}
</div>
<div class='w-card' id='terugkerend' data-host>
<h2>Terugkerende bevindingen <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<h3>{M('herh')}</h3>
<p class='w-sm w-mut'>Dezelfde bevinding bij acties uit twee of meer WPI’s. “Terug na afronding” = de bevinding kwam terug nadat een eerdere actie al was afgerond.</p>
<div class='w-rel' data-draw='herh' data-source='acties wpis'></div>
{DET('terugkerend')}
</div>
<details class='w-card w-fold' id='dekking' data-host>
<summary><h2>Waar is feitelijk gekeken? <span class='w-own'>Noardling-keuze</span> {VB}</h2>
<h3>Eigen waarneming bij {M('dek')}</h3><span class='w-hint'>Tik om te openen</span></summary>
<div class='w-leg'><span><i class='w-sw o-ja'></i>● Waargenomen</span><span><i class='w-sw o-ab'></i>○ Alleen bevestigd</span><span><i class='w-sw o-nb'></i>? Niet beoordeeld of n.v.t.</span></div>
<div class='w-two'>
<div><p class='w-sm w-mut'>Per inspecteur</p><div class='w-rel' data-draw='diep' data-by='inspecteur' data-source='regels'></div></div>
<div><p class='w-sm w-mut'>Per maand</p><div class='w-rel' data-draw='diep' data-by='maand' data-source='regels'></div></div>
</div>
{DET('dekking')}
</details>
</section>

<section class='w-sec' id='tra' hidden>
<div class='w-card' id='tra-rang' data-host>
<h2>Vaakst afwijkende TRA-maatregelen <span class='w-own'>Noardling · koppeling met product-TRA</span> {VB}</h2>
<h3>{M('tra')}</h3>
<div class='w-rel' data-draw='tra' data-source='regels kennisbank'></div>
{DET('tra-rang')}
</div>
<details class='w-card w-fold' id='tra-dim' data-host>
<summary><h2>Waar zitten de afwijkingen? {VB}</h2>
<h3>Meeste afwijkingen en verbeterpunten: <span data-draw='mdim'>—</span></h3><span class='w-hint'>Tik om te openen</span></summary>
<div class='w-tabs' role='group' aria-label='Indeling'>
<button type='button' class='w-btn' data-dim='product' aria-pressed='true'>Per product</button>
<button type='button' class='w-btn' data-dim='fase' aria-pressed='false'>Per fase</button>
<button type='button' class='w-btn' data-dim='taak' aria-pressed='false'>Per taak</button>
</div>
<div class='w-rel' data-draw='dim' data-source='regels'></div>
{DET('tra-dim')}
</details>
<details class='w-card w-fold' id='buitentra' data-host>
<summary><h2>Buiten de TRA <span class='w-own'>Noardling · signaal dat een TRA een risico mist</span> {VB}</h2>
<h3>{M('buiten')}</h3><span class='w-hint'>Tik om te openen</span></summary>
<div class='w-rel' data-draw='buiten' data-source='regels acties'></div>
{DET('buitentra')}
</details>
<details class='w-card w-fold' id='blind' data-host>
<summary><h2>Blinde vlekken {VB}</h2>
<h3>Vaakst zonder eigen waarneming: <span data-draw='mnb'>—</span></h3><span class='w-hint'>Tik om te openen</span></summary>
<div class='w-leg'><span><i class='w-sw o-ab'></i>○ Alleen bevestigd</span><span><i class='w-sw o-nb'></i>? Niet beoordeeld</span><span class='w-mut'>balk = alle keren dat het onderwerp voorkwam</span></div>
<div class='w-rel' data-draw='nb' data-source='regels'></div>
<h3><span data-draw='mkb'>—</span></h3>
<p class='w-sm w-mut'>Per klasse: unieke kennisbankregels die minstens één keer zijn waargenomen. Product- en classificatiefilter gelden hier niet.</p>
<div class='w-rel' data-draw='kbk' data-source='regels kennisbank'></div>
<div class='w-rel' data-draw='prod' data-source='wpis regels kennisbank'></div>
{DET('blind')}
</details>
</section>

<section class='w-sec' id='acties' hidden>
<div class='w-tilebox' id='act-tegels' data-host>
<div class='w-tilehead'>Acties binnen de filters <span class='w-vca'>VCA 7.1</span> {VB}</div>
<div class='w-tiles' data-source='acties'>
<div class='w-tile'><span>Open</span>{T('open')}<small>waarvan {TS('over')} over de termijn</small></div>
<div class='w-tile'><span>Over de termijn</span>{T('over')}<small>oudste {TS('oudste')} dagen</small></div>
<div class='w-tile'><span>Afgerond na toetsing</span>{T('afgerond')}<small>waarvan {TS('telaat')} na de termijn</small></div>
<div class='w-tile'><span>Prioriteit kort: dagen</span>{T('kort_gem')}<small>norm {TS('norm_kort')}; {TS('kort_ok')} van {TS('kort_n')} binnen norm</small></div>
</div>
<p class='w-sm w-mut'>Bron: {TS('bron_insp')} inspectie · {TS('bron_buiten')} buiten de TRA · {TS('bron_idee')} idee van monteurs</p>
{DET('act-tegels')}
</div>
<div class='w-card' id='openacties' data-host>
<h2>Open acties <span class='w-vca'>VCA 7.1</span> <span class='w-vca'>VCA 7.2</span> {VB}</h2>
<p class='w-kader w-sm'>VCA 7.1, minimumeis: “Er is een actieplan met daarin: actiepunten, voortkomende uit de inspecties; de verantwoordelijken voor de uitvoering en toetsing; tijdsplanning.” VCA 7.2, document: “Overzicht verbeteracties”.</p>
<h3>{M('open')}</h3>
<table class='w-tbl w-cards w-actt' data-source='acties' data-row-key='actie'>
<thead><tr><th data-field='actie'>Actienummer</th><th data-field='termijn'>Termijn</th><th>Status</th><th data-field='bevinding'>Bevinding</th><th data-field='verbeteractie'>Verbeteractie</th><th data-field='actiehouder'>Actiehouder</th><th data-field='toetser'>Toetser</th></tr></thead>
<tbody data-draw='openrijen'></tbody>
</table>
<div data-draw='openmeer' data-source='acties'></div>
<p class='w-sm'><button type='button' class='w-btn' data-csv='acties'>Download actielijst (CSV, open en afgerond)</button></p>
<div data-draw='csvuit' data-csvuit='acties'></div>
<details class='w-sub2'><summary>Afgeronde acties (<span data-draw='nklaar'>—</span>), met datum van toetsing</summary>
<table class='w-tbl w-cards w-klaart' data-source='acties' data-row-key='actie'>
<thead><tr><th data-field='actie'>Actienummer</th><th data-field='prioriteit'>Prioriteit</th><th data-field='termijn'>Termijn</th><th data-field='bevinding'>Bevinding</th><th data-field='ref'>TRA-ID / klasse</th><th data-field='verbeteractie'>Verbeteractie</th><th data-field='actiehouder'>Actiehouder</th><th data-field='afgerond_op'>Afgerond op</th><th data-field='getoetst_op'>Getoetst op</th><th data-field='toetser'>Toetser</th></tr></thead>
<tbody data-draw='klaarrijen'></tbody>
</table>
</details>
{DET('openacties')}
</div>
<details class='w-card w-fold' id='doorlooptijd' data-host>
<summary><h2>Doorlooptijd en verdeling {VB}</h2>
<h3>Prioriteit {M('prio')}</h3><span class='w-hint'>Tik om te openen</span></summary>
<table class='w-tbl w-cards w-normt' data-source='acties'>
<thead><tr><th>Prioriteit</th><th>Norm</th><th>Afgerond</th><th class='w-num'>Gemiddeld (afgerond)</th><th>Binnen norm</th><th class='w-num'>Nog open</th><th class='w-num'>Leeftijd open</th></tr></thead>
<tbody data-draw='normrijen'></tbody>
</table>
<p class='w-sm w-mut'>Het gemiddelde telt alleen afgeronde acties en valt daardoor te gunstig uit; de leeftijd van de open acties (dagen sinds de WPI tot de peildatum) staat ernaast.</p>
<div class='w-leg'><span><i class='w-sw o-con'></i>✓ Afgerond</span><span><i class='w-sw o-ver'></i>△ Open, binnen termijn</span><span><i class='w-sw o-afw'></i>✕ Over de termijn</span></div>
<div class='w-two'>
<div><p class='w-sm w-mut'>Per prioriteit</p><div class='w-rel' data-draw='act' data-by='prioriteit' data-source='acties'></div></div>
<div><p class='w-sm w-mut'>Per actiehouder (functie)</p><div class='w-rel' data-draw='act' data-by='actiehouder' data-source='acties'></div></div>
</div>
{DET('doorlooptijd')}
</details>
</section>

<section class='w-sec' id='vastleggen' hidden>
<div class='w-card w-noprint'><p><b>Vastgelegde versie van de trendanalyse.</b> Deze versie gebruikt de hele periode zonder filters en zet conclusie, klassen, terugkerende bevindingen, trendacties en follow-up in één document. Vul opgesteld door, vastgesteld op en versie in na vaststelling.</p>
<p><button type='button' class='w-btn w-hoofd' data-act='print'>Afdrukken of opslaan als pdf</button> <button type='button' class='w-btn' data-act='terug'>Terug naar het dashboard</button></p></div>
<div class='w-card w-doc' data-draw='vastleg' data-source='kern trendacties regels acties'></div>
</section>

<div class='w-ban w-ban2'>VOORBEELD — fictieve data</div>
</div></div>
<script src='app.js'></script>
"""
assert '"' not in html and '\\' not in html, [l for l in html.split('\n') if '"' in l or '\\' in l][:3]
open('/home/claude/wpi/run/out/dashboard/index.html','w').write(html)
js=open('/home/claude/wpi/run/out/dashboard/app.js').read()
assert '"' not in js and '\\' not in js, [l for l in js.split('\n') if '"' in l or '\\' in l][:3]
print(len(html),len(js))
