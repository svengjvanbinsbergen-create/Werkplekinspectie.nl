# Ronde 11 (koers2, momentopname): gerichte vervangingen in index.html. Bron = index.v10.html (gepubliceerde stand).
import json
base = '/home/claude/wpi/run/out/dashboard/'
src = open(base + 'index.v10.html').read()
K = lambda k, f='toon': "<b data-draw='k' data-source='kern' data-field='%s' data-where='k=%s'>—</b>" % (f, k)
T = lambda t: "<b data-draw='t' data-t='%s'>—</b>" % t
TS = lambda t: "<span data-draw='t' data-t='%s'>—</span>" % t
M = lambda m: "<span data-draw='m' data-m='%s'>—</span>" % m
DET = lambda slot: "<div class='w-det w-rel' data-draw='detail' data-slot='%s' data-source='wpis regels acties'></div>" % slot
VB = "<span class='w-vb'>VOORBEELD — fictieve data</span>"
P = []
def rep(old, new): P.append((old, new, False))
def regel(begin):
    i = src.index(begin); j = src.index('\n', i); return src[i:j]
def blok(start, eind):
    i = src.index(start); j = src.index(eind, i) + len(eind); return src[i:j]

# In twee minuten
rep("% van de regels met een eigen waarneming was Conform (", "% van wat de inspecteurs zagen was Conform (")
rep(K('waar') + "). De coördinatoren", K('waar') + " regels). De coördinatoren")
rep("WPI’s in " + K('maanden') + " maanden", "WPI’s (" + K('ingepland') + " ingepland, " + K('spontaan') + " spontaan) in " + K('maanden') + " maanden")
rep("per maand). Verschillen tussen maanden", "per maand). Elke WPI is een momentopname: alleen wat de inspecteur zag, staat erin. Verschillen tussen maanden")
# conclusie
rep(regel("<li><b>Gegevens.</b>"),
    f"<li><b>Gegevens.</b> {K('wpis')} WPI’s met {K('regels')} vastgelegde regels: alleen wat de inspecteur zag, Conform {K('conform')}, Afwijking {K('afw')}, Verbeterpunt {K('verb')}, en {K('nvt')} keer expliciet niet van toepassing. Wat niet gezien is, staat er niet in.</li>")
rep("Klassen met minder dan " + K('min_n') + " waargenomen regels zijn te klein", "Klassen met minder dan " + K('min_n') + " regels gezien zijn te klein")
rep("Hoogste aandeel van de waargenomen regels in de klasse (bij minstens " + K('min_n') + " waargenomen regels)", "Hoogste aandeel van de regels gezien in de klasse (bij minstens " + K('min_n') + " regels gezien)")
rep(K('tra_toets') + " waargenomen toetsingen van", K('tra_toets') + " toetsingen van")
rep(regel("<li><b>Dekking.</b>"),
    f"<li><b>Momentopname: wat is getoetst.</b> De {K('wpis')} WPI’s toetsten samen {K('stappen')} taken en taakstappen, gemiddeld {K('stap_gem')} per WPI ({K('stap_min')} tot {K('stap_max')}); {K('stap_ts')} daarvan op taakstapniveau ({K('stap_pct')}%), de overige op taakniveau omdat de TRA daar geen taakstap kent. {K('een_taak')} WPI’s toetsten één taak; samen {K('taken_uniek')} verschillende taken, het vaakst {K('taak_top','tekst')} ({K('taak_top')} WPI’s). Gezien: {K('g_alg')} algemene onderwerpen, {K('g_tra')} TRA-regels en {K('g_bui')} waarnemingen buiten de TRA. Ingang: {K('ingepland')} ingepland, {K('spontaan')} spontaan ({K('spontaan','tekst')}).</li>")
rep(regel("<li><b>Coördinator tegenover directie.</b>"),
    f"<li><b>Coördinator tegenover directie.</b> {K('c_neg')} tegenover {K('d_neg')} afwijkingen en verbeterpunten per WPI; regels gezien per WPI {K('c_mpw')} tegenover {K('d_mpw')}; getoetste taken en taakstappen per WPI {K('c_spw')} tegenover {K('d_spw')}. Bij {K('d_wpis')} directie-inspecties bepaalt één WPI het gemiddelde sterk.</li>")
# definities
rep(regel("<li><b>Waarneming</b> (afgeleid"),
    "<li><b>Momentopname</b>: een WPI toetst of de werkwijze uit de TRA op dat moment wordt uitgevoerd. De inspecteur legt vast welke taak en, waar de TRA die kent, welke taakstap(pen) de monteurs uitvoeren (<b>getoetst</b>), en per maatregel die hij ziet een oordeel: Conform, Afwijking of Verbeterpunt, altijd met een eigen waarneming; optioneel niet van toepassing als hij dat expliciet ziet. Wat niet gezien is, wordt niet vastgelegd. Regeloordeel bij meerdere maatregelen: het slechtste van wat gezien is (Afwijking, dan Verbeterpunt, dan Conform). <b>Toetsniveau</b>: de taak; waar de bron-TRA een taakstap kent ook de taakstap.</li>\n"
    "<li><b>Ingang</b>: ingepland (uit het programma, kop vooraf gevuld) of spontaan (de inspecteur kwam langs). Een spontane WPI telt mee voor het programma per werkplek als hij op een verplichte werkplek en maand valt.</li>")
rep("<li><b>Toetsing</b>: één waargenomen beoordeling van een TRA-regel in één WPI.", "<li><b>Toetsing</b>: één beoordeling (Conform, Afwijking of Verbeterpunt) van een TRA-regel in één WPI.")
# programma
rep("<h3>Uitgevoerd: " + M('progr') + "</h3>", "<h3>Uitgevoerd: " + M('progr') + "</h3>\n<p class='w-sm'>" + M('ingang') + "</p>")
rep(regel("<tr><td>Eigen waarneming</td>") + "\n" + regel("<tr><td>Alleen bevestigd</td>"),
    f"<tr><td>Regels gezien per WPI</td><td class='w-num'>{T('c_mpw')}</td><td class='w-num'>{T('d_mpw')}</td></tr>\n"
    f"<tr><td>Getoetste taken en taakstappen per WPI</td><td class='w-num'>{T('c_spw')}</td><td class='w-num'>{T('d_spw')}</td></tr>\n"
    f"<tr><td>Spontane WPI’s</td><td class='w-num'>{T('c_spo')}</td><td class='w-num'>{T('d_spo')}</td></tr>")
# bevindingen: tegels
rep("<small>waarvan " + TS('waar') + " met eigen waarneming</small>", "<small>waarvan " + TS('waar') + " gezien (✓✕△) · " + TS('nvt') + " n.v.t.</small>")
rep(TS('pos_pct') + " van de waargenomen regels</small>", TS('pos_pct') + " van de regels gezien</small>")
rep(regel("<div class='w-tile'><span>Zonder eigen waarneming</span>"),
    f"<div class='w-tile'><span>Getoetste taken en taakstappen</span>{T('stappen')}<small>{TS('ts')} op taakstapniveau · WPI’s: {TS('ing')} ingepland, {TS('spo')} spontaan</small></div>")
rep("<span><i class='w-sw o-ab'></i>○ Alleen bevestigd</span><span><i class='w-sw o-nb'></i>? Niet beoordeeld</span><span><i class='w-sw o-nvt'></i>– N.v.t.</span>",
    "<span><i class='w-sw o-nvt'></i>– Niet van toepassing</span>")
rep(blok("<details class='w-card w-fold' id='dekking' data-host>", "</details>"),
    f"""<details class='w-card w-fold' id='getoetst' data-host>
<summary><h2>Wat is getoetst? <span class='w-own'>Momentopname</span> {VB}</h2>
<h3>{M('mom')}</h3><span class='w-hint'>Tik om te openen</span></summary>
<p class='w-sm w-mut'>Per WPI de taak en taakstap(pen) die tijdens het bezoek getoetst zijn, en de oordelen over wat de inspecteur zag. Er is geen noemer: wat niet gezien is, staat niet in de WPI.</p>
<div class='w-leg'><span><i class='w-sw o-con'></i>✓ Conform</span><span><i class='w-sw o-ver'></i>△ Verbeterpunt</span><span><i class='w-sw o-afw'></i>✕ Afwijking</span><span><i class='w-sw o-nvt'></i>– Niet van toepassing</span><span class='w-mut'>balklengte = aantal vastgelegde regels</span></div>
<p class='w-sm w-mut'>Per WPI</p><div class='w-rel' data-draw='mom' data-source='wpis regels'></div>
<h3>{M('taken')}</h3>
<p class='w-sm w-mut'>Per getoetste taak (uit de product-TRA)</p><div class='w-rel' data-draw='taken' data-source='wpis regels'></div>
{DET('getoetst')}
</details>""")
# TRA-tab: blinde vlekken (dekking) eruit
rep("\n" + blok("<details class='w-card w-fold' id='blind' data-host>", "</details>"), "")

out = src
for old, new, _ in P:
    assert out.count(old) == 1, (out.count(old), old[:90])
    out = out.replace(old, new)
for bad in ['eigen waarneming bij', 'Alleen bevestigd', 'Niet beoordeeld', 'Blinde vlekken', "k=waar_pct", "data-t='c_ja'", "data-t='zonder'", "data-draw='diep'"]:
    assert bad not in out, bad
assert '"' not in out and chr(92) not in out
open(base + 'index.html', 'w').write(out)
json.dump(P, open(base + 'test/edits11_html.json', 'w'), ensure_ascii=False)
print(len(P), 'vervangingen;', len(src), '->', len(out), '; oud', sum(len(o) for o, _, _ in P), 'nieuw', sum(len(n) for _, n, _ in P))
