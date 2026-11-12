#!/usr/bin/env python3
# Bouwt "Voorstel nieuwe methode werkplekinspecties" in Noardling-huisstijl.
import sys
S = "/root/.claude/skills/synced/134f4af9-00ba-492e-80f4-f185b433f298_fafc370e-ca1f-402c-83bc-47a084adb998/noardling-docx-bouwer/scripts"
sys.path.insert(0, S)
from noardling_docx import *
from noardling_docx import _cel, _runs, _rpr, _next_id

W = 9064          # tekstbreedte in dxa
KL = 15           # lettergrootte in tabellen (7,5 pt)
ROOD = "B03A2E"

B = []
add = B.append


def _kn(x):
    return x.replace("</w:pStyle>", "</w:pStyle>").replace('"/>', '"/><w:keepNext/>', 1)


def h1(t):
    add(para("", space_after=60))
    add(_kn(heading(t, 1)))


def h2(t):
    add(_kn(heading(t, 2)))


def lab(t):
    add(_kn(para(t, bold=True, space_after=40)))


def p(t, **kw):
    kw.setdefault("space_after", 120)
    add(para(t, **kw))


def bl(t):
    add(bullet(t))


def tbl(rows, widths, size=KL, zebra=True, first_bold=False):
    """Tabel met kleine letter; cellen zijn strings, \n = regeleinde."""
    assert abs(sum(widths) - W) < 5, sum(widths)
    uit = []
    for i, r in enumerate(rows):
        assert len(r) == len(widths), r
        rij = []
        for j, c in enumerate(r):
            if i == 0:
                rij.append([para(c, bold=True, color="FFFFFF", size=size, space_after=0)])
            else:
                rij.append([para(c, size=size, space_after=0,
                                 bold=(first_bold and j == 0))])
        uit.append(rij)
    add(table(uit, widths=widths, zebra=zebra))


def voorbeeld():
    add(para("VOORBEELD — fictieve data", bold=True, color=ROOD, space_after=60))


def vca(t, label):
    add(vca_box(t, label=label))


def keuze(t, label="Keuze Noardling (voorstel, zie 8.1)"):
    add(keuze_box(t, label=label))


# ------------------------------------------------------------ voorwerk
add(pagebreak())
add(documentbeheer(
    code="Voorstel nieuwe methode werkplekinspecties (met concept-procedure)",
    versie="0.2 concept, ter bespreking op 12-11-2026",
    datum="11-11-2026",
    opsteller="",
    goedgekeurd="Hoofd Service & Montage (procedure-eigenaar), na de proef",
    labels=("Document", "Versie", "Datum", "Opgesteld door", "Vast te stellen door")))
p("Bijlagen (afzonderlijk aangeleverd): voorbeeldrapport WPI-20261105-DAM-C2 en het WPI-dashboard. "
  "Beide draaien op fictieve data. Voorbeelden in dit document zijn gemarkeerd met 'VOORBEELD — fictieve data'.", italic=True, color=GRIJS)
add(_kn(para("Inhoud", bold=True, color=BLAUW, space_after=60)))
for regel in ["1. Aanleiding en wat er verandert", "2. Zo verloopt een WPI", "3. Wat we per WPI vastleggen",
              "4. Welke trenddata dit oplevert", "5. Procedure Werkplekinspecties, versie 2.0 concept",
              "6. Dekking van de VCA-eisen 7.1 en 7.2", "7. Risico's en open punten", "8. Voorstel voor de proef en te nemen besluiten",
              "Bijlagen (afzonderlijk): voorbeeldrapport en WPI-dashboard"]:
    add(para(regel, space_after=20))
add(para("", space_after=60))

p("Leeswijzer", bold=True, color=BLAUW, space_after=60)
p("Wie weinig tijd heeft leest hoofdstuk 1 en de besluitenlijst in 8.1. Hoofdstuk 2 laat zien hoe een inspectie verloopt. "
  "Hoofdstuk 3 en 4 zijn het eigenlijke voorstel: wat we vastleggen en wat we daaruit halen. Hoofdstuk 5 is de "
  "herziene procedure, hoofdstuk 6 de dekking van de VCA-eisen, hoofdstuk 7 wat nog onzeker is.")
vca("Een blauw kader bevat wat de VCA-checklist 2026/6.1 eist. De tekst is letterlijk die van de checklist, niet onze uitleg ervan.",
    "Blauw kader: VCA-eis")
keuze("Een oranje kader bevat wat Noardling zelf kiest binnen de ruimte die de VCA laat. Zolang er niet over is beslist, is het een voorstel; de besluiten staan bij elkaar in 8.1.",
      "Oranje kader: keuze Noardling")

# ------------------------------------------------------------ 1
add(pagebreak())
h1("1. Aanleiding en wat er verandert")
p("Bij de hercertificering voor VCA 2026/6.1 oordeelde de auditor dat onze werkplekinspecties (WPI's) niet duidelijk "
  "genoeg zijn en niet doen waarvoor een WPI bedoeld is. De inspecteur loopt nu in AMS een vaste checklist af die voor "
  "elke locatie en elk product dezelfde is. Die lijst zegt niets over het werk waar de monteurs op dat moment mee bezig "
  "zijn. Daarnaast ontbreekt de trendanalyse die VCA-vraag 7.2 vraagt.")
p("We hebben intussen iets wat we bij de WPI nog niet gebruiken: 21 productspecifieke TRA's met samen 666 risicoregels. "
  "Daarin staat per taak welk risico er speelt en welke maatregelen we hebben afgesproken. Het voorstel is om de WPI "
  "daaraan te koppelen. De inspecteur toetst of de monteurs werken volgens de maatregelen uit de TRA van het product en "
  "de taak waar ze op dat moment mee bezig zijn, naast een algemene ronde over de werkplek.")
p("De inspecteur doet dat op zijn telefoon in de Claude-app, in een WPI-projectmap van Noardling. Hij vertelt wat hij "
  "ziet en maakt foto's. Claude noemt de maatregelen die bij de taak horen, vraagt door waar een waarneming onvolledig "
  "is, zet alles in de juiste velden en maakt het rapport in Word. Het oordeel en de waarneming blijven van de "
  "inspecteur; Claude vult niets in wat de inspecteur niet heeft gezegd.")
tbl([
    ["", "Nu (AMS)", "Voorstel"],
    ["Waar toetsen we op", "Vaste checklist, gelijk voor elk werk", "Negen algemene onderwerpen plus de risicoregels uit de TRA van de taak die wordt uitgevoerd"],
    ["Invoer", "Vakjes aanklikken en typen", "Inspreken en foto's maken; Claude ordent"],
    ["Positieve bevindingen", "Niet afzonderlijk zichtbaar", "Elke maatregel die de inspecteur in orde ziet en beschrijft telt als positieve bevinding"],
    ["Acties", "Los van de bevinding", "Elke actie heeft een nummer, actiehouder, toetser en termijn en staat in één actieoverzicht"],
    ["Trendanalyse", "Ontbreekt", "Elke regel is geclassificeerd; het dashboard telt over alle rapporten heen"],
    ["Terugkoppeling naar de TRA", "Geen", "Waarnemingen die bij geen TRA-regel passen worden apart geteld als signaal dat de TRA iets mist"],
], [1900, 2900, 4264], first_bold=True)
p("We verwachten dat dit de inspecteur niet meer moeite kost dan nu: hij hoeft geen lijst te kennen en niets te "
  "typen. Aangetoond is dat niet. Het is een meetpunt van de proef: we meten de duur van de inspectie, het aantal "
  "regels dat de inspecteur werkelijk heeft waargenomen en het oordeel van de inspecteur zelf (8.3).")
keuze("Alles hieronder is een voorstel; de volledige lijst met wie beslist staat in 8.1.\n"
      "1. Proefdraaien van 16 november tot en met 18 december 2026 met twee Montage Coördinatoren en één directielid, "
      "zeven WPI's in totaal.\n"
      "2. De set vast te leggen gegevens uit hoofdstuk 3 als startpunt nemen; schrappen of toevoegen kan morgen.\n"
      "3. Op maandag 21 december 2026 in het coördinatorenoverleg evalueren. Daarna beslist het Hoofd Service & Montage "
      "of AMS voor WPI's vervalt.", "Wat we morgen vragen (voorstel)")

# ------------------------------------------------------------ 2
h1("2. Zo verloopt een WPI")
h2("2.1 Voor de inspecteur: acht stappen")
p("De inspecteur opent de Claude-app, kiest de WPI-projectmap en zegt dat hij een WPI start. Vanaf daar leidt de skill "
  "wpi-begeleider hem door de inspectie. Hij mag onderwerpen overslaan en in eigen volgorde werken; aan het eind "
  "controleert Claude wat nog openstaat.")
tbl([
    ["Stap", "Wat de inspecteur doet", "Wat Claude doet"],
    ["0. Kop", "Noemt zijn naam en functie, opdrachtgever, locatie, projectnummer, de monteurs en de omstandigheden", "Vraagt alleen naar wat ontbreekt; noteert datum en tijd"],
    ["1. Product en taak", "Noemt het product en waar de monteurs mee bezig zijn", "Toont de fasen en taken uit de TRA van dat product, legt de keuze vast en maakt het WPI-nummer"],
    ["2. Algemene observatie", "Loopt rond en vertelt wat hij ziet", "Legt de waarneming bij een van de negen onderwerpen (A t/m I) en noemt de onderwerpen die nog niet aan bod kwamen"],
    ["3. Taakgerichte toetsing", "Kijkt naar het werk en vertelt per risico wat hij ziet", "Noemt per risicoregel de afgesproken maatregelen, vraagt welk oordeel erbij hoort en vraagt bij een afwijking door"],
    ["4. Foto's", "Maakt foto's en zegt bij elke foto wat erop staat", "Nummert de foto en koppelt hem aan een onderwerp of TRA-regel"],
    ["5. Gesprek met de monteurs", "Bespreekt de bevindingen met de monteurs en vertelt wat zij zeiden", "Legt vast wat besproken is, de reactie en ideeën van de monteurs"],
    ["6. Bevindingen en acties", "Zegt per bevinding wat er moet gebeuren, door wie en wanneer", "Stelt een classificatie voor, geeft elke actie een nummer en vraagt naar actiehouder, toetser en termijn als die ontbreken"],
    ["7. Afsluiten", "Beantwoordt de afsluitvraag en bevestigt de samenvatting", "Geeft regels zonder waarneming het oordeel 'Geen afwijking waargenomen' of 'Niet beoordeeld' en telt hoeveel regels zijn waargenomen, alleen bevestigd of niet beoordeeld"],
    ["8. Rapport", "Leest het rapport na", "Maakt het Word-rapport in de vaste indeling, met de gegevenstabel voor de trendanalyse"],
], [1700, 3500, 3864], first_bold=True)
p("Een WPI mag kort zijn of diep gaan. Wie tien minuten heeft, doet de kop, twee of drie risicoregels die hij ziet "
  "gebeuren en de afsluitvraag. Wie een uur heeft, loopt de hele taak door. Beide leveren een geldig rapport op; het "
  "rapport laat zien hoeveel regels werkelijk zijn beoordeeld.")

h2("2.2 Wat Claude wel en niet doet")
tbl([
    ["Claude doet", "Claude doet niet"],
    ["De maatregelen uit de TRA noemen die bij de gekozen taak horen", "Zelf een waarneming of oordeel invullen"],
    ["Doorvragen als een waarneming geen oordeel, actiehouder of termijn heeft", "Een regel 'Conform' noemen zonder dat de inspecteur heeft beschreven wat hij zag"],
    ["Een classificatie en een koppeling aan een TRA-regel voorstellen, die de inspecteur bevestigt of wijzigt", "Namen van monteurs bij een afwijking zetten"],
    ["Het rapport en de gegevenstabel opmaken", "Een actie afsluiten; dat doet de toetser"],
], [4532, 4532])

h2("2.3 Voorbeeld van de dialoog")
voorbeeld()
p("Hieronder een deel van een WPI bij het verwijderen van een damwand: de start en twee risicoregels. Locatie, project "
  "en personen zijn verzonnen. De risicoregels en maatregelen komen uit de echte TRA Damwand. Het volledige rapport van "
  "deze inspectie is bijlage 1 (WPI-20261105-DAM-C2).", italic=True)


def dialoog(regels):
    rows = []
    for wie, tekst in regels:
        fill = "F4F7FB" if wie == "Claude" else None
        rows.append((wie, tekst, fill))
    grid = '<w:gridCol w:w="1300"/><w:gridCol w:w="7764"/>'
    tblpr = ('<w:tblPr><w:tblW w:w="9064" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
             '<w:tblLook w:val="04A0" w:firstRow="0" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>')
    trs = []
    for wie, tekst, fill in rows:
        c1 = _cel([para(wie, bold=True, size=KL, space_after=0,
                        color=BLAUW if wie == "Claude" else None)], 1300, fill=fill, valign="top")
        c2 = _cel([para(tekst, size=KL, space_after=0, italic=(wie != "Claude"))], 7764, fill=fill, valign="top")
        trs.append(f"<w:tr><w:trPr><w:cantSplit/></w:trPr>{c1}{c2}</w:tr>")
    add(f"<w:tbl>{tblpr}<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>" + para("", space_after=0))


dialoog([
    ("Inspecteur", "Start WPI. Coördinator 2, RWZI Voorbeeldstad, project P26-168. Twee monteurs, ze halen de damwand eruit."),
    ("Claude", "Genoteerd. Product Damwand, fase Demontage, taak 'Verwijderen damwand'. Klopt dat? Dan is het nummer WPI-20261105-DAM-C2. Nog drie dingen voor de kop: is de inspectie aangekondigd, duurt het werk hier korter dan een maand, en hoe zijn de omstandigheden?"),
    ("Inspecteur", "Klopt. Niet aangekondigd. Drie dagen werk. Droog, wel glad op het pad door blad."),
    ("Claude", "Bij deze taak horen acht risicoregels uit de TRA. Ik noem ze een voor een; vertel wat je ziet of zeg 'overslaan'. DAM-2.05: de last begeleiden vanaf een onveilige positie. Afgesproken maatregel: op veilige afstand blijven en stuurlijnen gebruiken. Wat zie je?"),
    ("Inspecteur", "Twee stuurlijnen aan de damwand. De man die begeleidt staat ruim buiten het hijspad."),
    ("Claude", "Dat noteer ik als Conform bij DAM-2.05, met jouw waarneming als positieve bevinding. Volgende, DAM-2.06: contact met afvalwater en slib. Maatregelen: de opdrachtgever reinigt de werkplek vooraf; handen wassen voor de pauze en niet eten of drinken in de werkzone."),
    ("Inspecteur", "De damwand zit onder het slib, die is niet schoongespoten."),
    ("Claude", "Dan wijkt de eerste maatregel af: reiniging vooraf door de opdrachtgever, een collectieve maatregel. Ik noteer een Afwijking met classificatie 'Gevaarlijke stoffen en hygiëne'. Akkoord? En weet je waardoor er niet gereinigd is?"),
    ("Inspecteur", "Akkoord. Het is vooraf niet afgesproken met het waterschap."),
    ("Claude", "Oorzaak: niet geregeld in de voorbereiding. Is het ter plekke opgelost? Wat moet er gebeuren, door wie en wanneer?"),
    ("Inspecteur", "Nee, niet opgelost. Reiniging vooraf moet standaard in de werkvoorbereiding komen. Dat is voor het Hoofd Service en Montage, voor het eind van het jaar."),
    ("Claude", "Actie WPI-20261105-DAM-C2-3: reiniging vooraf door de opdrachtgever opnemen in de werkvoorbereiding. Actiehouder Hoofd Service & Montage, termijn 31-12-2026, prioriteit planmatig. Wie controleert of het gedaan is?"),
    ("Inspecteur", "Ik zelf. Hier is een foto: slib op de damwand bij het uithijsen."),
    ("Claude", "Foto 4, gekoppeld aan DAM-2.06, met jouw toelichting. Toetser: de inspecteur."),
    ("Inspecteur", "(later) Dat was het."),
    ("Claude", "Over DAM-2.02, 2.03, 2.04 en 2.08 heb je niets gezegd. Heb je die gezien en was er niets op aan te merken?"),
    ("Inspecteur", "2.03 en 2.04 heb ik gezien, niets op aan te merken. 2.02 en 2.08 heb ik niet kunnen zien, de bevestiging was al los toen ik kwam."),
    ("Claude", "Dan krijgen DAM-2.03 en 2.04 'Geen afwijking waargenomen' en DAM-2.02 en 2.08 'Niet beoordeeld'. Hier is de samenvatting ter bevestiging."),
])
p("De inspecteur heeft hier zeven korte dingen gezegd over twee risicoregels. In het rapport staan daardoor per regel: "
  "het TRA-nummer, de maatregel waar het om gaat en of die collectief of individueel is, het oordeel, de classificatie, "
  "de oorzaak, de actie met actiehouder, toetser en termijn, en de foto met toelichting. Geen van die velden heeft hij "
  "zelf hoeven opzoeken of typen. DAM-2.05 en 2.06 tellen in het rapport als waargenomen, DAM-2.03 en 2.04 als alleen "
  "bevestigd, DAM-2.02 en 2.08 als niet beoordeeld.")

# ------------------------------------------------------------ 3
h1("3. Wat we per WPI vastleggen")
p("Dit is het volledige voorstel. Per veld staat waarom het erin zit, of het verplicht is, welke VCA-eis of trend het "
  "bedient (T-nummers verwijzen naar hoofdstuk 4) en wat het de inspecteur kost. Velden met 'Nieuw' staan niet in de "
  "eerste opzet van de skill; die stellen we hier voor. Er zijn bewust geen velden over onderaannemers of derden: de "
  "WPI gaat over onze eigen monteurs.")
p("De checklist nummert de minimumeisen niet. Voor de verwijzingen gebruiken we eigen letters in de volgorde van de "
  "checklist. Bij 7.1: a de procedure, b de maandelijkse frequentie (met voetnoot 10), c uitvoering door operationele "
  "medewerkers, d de inspectieverslagen, e het actieplan, f de deelname van directieleden. Bij 7.2: a de classificatie, "
  "b de jaarlijkse trendanalyse. De letterlijke tekst staat in 5.1.")
p("'Verplicht' betekent dat Claude het rapport niet afrondt voordat het veld een waarde heeft. 'Automatisch' betekent "
  "dat de inspecteur er niets voor hoeft te doen.")

VW = [1700, 2450, 1400, 1500, 2014]
KOPV = ["Veld", "Waarom", "Verplicht", "Bedient", "Kost de inspecteur"]

h2("3.1 Kop")
tbl([KOPV,
     ["K1 WPI-nummer\nWPI-JJJJMMDD-productcode-initialen", "Eén sleutel voor rapport, foto's en acties", "Automatisch", "7.1d, 7.1e; alle trends", "Niets"],
     ["K2 Inspecteur en functie", "Toont dat een operationeel leidinggevende of directielid inspecteert. Nodig omdat iedereen met hetzelfde account werkt", "Ja", "7.1b, 7.1f; T1", "Naam noemen"],
     ["K3 Soort inspectie\nWPI coördinator / VGM-inspectie directie", "Scheidt de maandelijkse WPI van de kwartaalinspectie van de directie", "Ja", "7.1b, 7.1f; T1, T15", "Eén woord"],
     ["K4 Deelnemend directielid (Nieuw)", "Loopt een directielid mee met een coördinator, dan telt die WPI ook voor de kwartaaleis", "Alleen als het speelt", "7.1f; T1", "Eén naam"],
     ["K5 Datum, begin- en eindtijd", "Datum voor het programma; de duur laat zien wat een WPI kost", "Datum ja; tijd automatisch", "7.1b; T1, T13", "Niets"],
     ["K6 Opdrachtgever, locatie, projectnummer", "Legt vast welke werkplek is geïnspecteerd", "Ja", "7.1b; T2", "Inspreken"],
     ["K7 Soort werk (Nieuw)\nmontage / onderhoud / revisie / storing", "Storingswerk kent andere druk en voorbereiding dan geplande montage", "Ja", "T14", "Eén woord"],
     ["K8 Werk van korte duur (Nieuw)\nkorter dan een maand op locatie: ja / nee", "Het meeste S&M-werk duurt korter dan een maand. Dit veld onderbouwt het inspectieprogramma voor kort werk", "Ja", "7.1b voetnoot; T2", "Eén woord"],
     ["K9 Aangekondigd of niet (Nieuw)", "Een aangekondigde inspectie geeft een ander beeld dan een onverwachte", "Ja", "T15", "Eén woord"],
     ["K10 Aanwezige monteurs", "Wie er werkte, voor de terugkoppeling. Namen staan alleen hier, nooit bij een afwijking", "Ja (aantal); namen naar keuze", "7.1d; AVG", "Inspreken"],
     ["K11 Omstandigheden\nweer, licht, ondergrond, bijzonderheden van de locatie", "Context bij bevindingen, bijvoorbeeld gladheid", "Nee", "Context bij T3", "Eén zin"],
     ["K12 Invoerwijze (Nieuw)\nop locatie met Claude / achteraf vanaf terugvalformulier", "Laat zien hoe vaak de terugvaloptie nodig is", "Ja; één vraag", "7.1a; T13", "Eén woord"],
     ], VW)

h2("3.2 Product, taak en voorbereiding")
tbl([KOPV,
     ["P1 Product", "Bepaalt welke TRA geldt", "Ja", "7.1a (checklist); T14", "Product noemen"],
     ["P2 Fase en taak (een of meer)", "Bepaalt welke risicoregels worden getoetst", "Ja", "7.1a (checklist); T5, T14", "Kiezen uit wat Claude toont"],
     ["P3 Versie van de kennisbank (Nieuw)", "Toont tegen welke versie van de TRA is getoetst, ook nadat de TRA is gewijzigd", "Automatisch", "7.1a; aantoonbaarheid", "Niets"],
     ["V1 VGM-projectplan op locatie en bekend\nja / nee / n.v.t.", "Controle op de voorbereiding", "Ja", "T18", "Eén woord"],
     ["V2 TRA van dit product beschikbaar\nja / nee", "Een TRA die de monteurs niet kennen, werkt niet", "Ja", "T18", "Eén woord"],
     ["V3 Werkvergunning aanwezig en geldig\nja / nee / niet vereist", "Controle op de voorbereiding", "Ja", "T18", "Eén woord"],
     ["V4 LMRA gedaan vóór aanvang (Nieuw als vast veld)\nja / nee / niet nagevraagd", "De LMRA leggen we niet schriftelijk vast. De WPI is het moment waarop we kunnen zien of hij gebeurt", "Ja", "T18", "Navragen bij de monteurs"],
     ], VW)
p("V1 tot en met V4 horen bij onderwerp A van de algemene observatie. We stellen voor ze als vier vaste korte vragen te "
  "stellen, omdat een vrij antwoord over 'de voorbereiding' deze vier dingen zelden alle vier noemt.")

h2("3.3 Algemene observatie (onderwerpen A t/m I)")
p("A Voorbereiding en documenten, B Veiligstellen (LOTOTO), C PBM, D Arbeidsmiddelen en gereedschap, E Hijsen en kraan, "
  "F Werkplek en omgeving, G Gevaarlijke stoffen, hygiëne en milieu, H Noodvoorzieningen, I Gedrag en samenwerking.")
tbl([KOPV,
     ["O1 Oordeel per onderwerp", "Alle negen onderwerpen krijgen een oordeel, zodat zichtbaar is wat wel en niet bekeken is", "Ja; desnoods via de afsluitvraag", "7.1d; T3, T4", "Eén woord per onderwerp, of één antwoord aan het eind"],
     ["O2 Waarneming per onderwerp", "Wat de inspecteur zag, in zijn woorden. Zonder waarneming geen 'Conform'", "Bij Conform, Afwijking en Verbeterpunt", "7.1d; T12", "Eén of twee zinnen"],
     ], VW)

h2("3.4 Taakgerichte toetsing (per risicoregel van de taak)")
tbl([KOPV,
     ["R1 TRA-regel", "Vast nummer, bijvoorbeeld DAM-2.03. Maakt tellen per risico mogelijk", "Automatisch", "7.1a (checklist); T5, T16", "Niets"],
     ["R2 Oordeel", "Zie de zes waarden onder deze tabel", "Ja, voor elke regel van de taak", "7.1d, 7.2a; T3–T5", "Eén woord, of de afsluitvraag"],
     ["R3 Waarneming", "Wat de inspecteur zag", "Bij Conform, Afwijking en Verbeterpunt", "7.1d; T12", "Eén of twee zinnen"],
     ["R4 Betrokken maatregel en niveau (Nieuw)\ncollectief / individueel / PBM", "De TRA noemt per regel maatregelen op drie niveaus. Zo zien we of collectieve voorzieningen ontbreken of dat het om gedrag gaat", "Bij Afwijking en Verbeterpunt; niveau automatisch", "T6", "Aanwijzen welke maatregel ontbrak"],
     ["R5 Oorzaak (Nieuw)\nniet bekend / middel niet beschikbaar / maatregel hier niet werkbaar / niet geregeld in voorbereiding / tijdsdruk / gewoonte", "De oorzaak bepaalt de soort actie: instructie, middelen, voorbereiding of de TRA aanpassen", "Bij Afwijking; naar keuze bij Verbeterpunt", "T7; 7.2b (acties)", "Eén antwoord op één doorvraag"],
     ["R6 Waarneming buiten de TRA", "Iets wat bij geen regel past. Signaal dat de TRA een risico mist", "Alleen als het speelt", "T8", "Eén of twee zinnen"],
     ["R7 Voorstel TRA aanpassen (Nieuw)\nja / nee", "Zet een waarneming door naar het TRA-beheer", "Bij R6 en bij oorzaak 'maatregel hier niet werkbaar'", "T8", "Eén woord"],
     ], VW)
tbl([
    ["Oordeel", "Betekenis", "Telt als", "Wijze van beoordeling"],
    ["Conform", "De inspecteur heeft de maatregel gezien en beschreven wat hij zag", "Positieve bevinding", "Waargenomen"],
    ["Afwijking", "Een afgesproken maatregel wordt niet nageleefd of ontbreekt", "Negatieve bevinding, altijd met actie", "Waargenomen"],
    ["Verbeterpunt", "Het voldoet, maar het kan veiliger of beter", "Negatieve bevinding, met actie", "Waargenomen"],
    ["Geen afwijking waargenomen", "Niets op aan te merken, niet afzonderlijk beschreven (antwoord op de afsluitvraag)", "Neutraal; geen positieve bevinding", "Alleen bevestigd"],
    ["Niet beoordeeld", "Niet gezien of niet aan toegekomen", "Telt niet mee; blinde vlek", "Niet beoordeeld"],
    ["Niet van toepassing", "De regel speelt niet bij dit werk op deze locatie", "Telt niet mee", "Buiten de telling"],
], [2000, 3464, 1900, 1700], first_bold=True)
p("De laatste kolom is een afgeleid gegeven (veld A4): de inspecteur hoeft er niets voor te doen. Een regel is "
  "waargenomen als de inspecteur er een eigen waarneming bij heeft uitgesproken. Een regel is alleen bevestigd als hij "
  "uitsluitend via de afsluitvraag is afgedaan. Rapport en dashboard tonen de drie aantallen naast elkaar. De reden: "
  "een rapport waarin dertig regels 'in orde' staan zegt niets als niet te zien is naar hoeveel daarvan werkelijk is "
  "gekeken. Een auditor moet kunnen zien bij welke maatregelen de inspecteur feitelijk heeft gekeken, en wij moeten "
  "kunnen zien welke maatregelen nooit worden waargenomen.")
keuze("Voorstel: wij maken onderscheid tussen 'Conform' en 'Geen afwijking waargenomen'. De VCA vraagt om positieve bevindingen in "
      "het verslag. Een vinkje bij elke regel is geen bevinding. Daarom telt alleen een beschreven waarneming als positief.")

h2("3.5 Foto's")
tbl([KOPV,
     ["F1 Fotonummer", "Verwijzing in het rapport", "Automatisch", "7.1d", "Niets"],
     ["F2 Toelichting", "Een foto zonder uitleg bewijst niets", "Ja, per foto", "7.1d", "Eén zin per foto"],
     ["F3 Koppeling aan onderwerp of TRA-regel", "Foto staat in het rapport bij de bevinding", "Ja; Claude stelt voor", "7.1d; T5", "Bevestigen"],
     ["F4 Herkenbare personen in beeld (Nieuw)", "AVG. Claude meldt het als er een gezicht herkenbaar op staat; de inspecteur beslist of de foto blijft", "Controle automatisch", "AVG", "Alleen iets doen bij een melding"],
     ], VW)

h2("3.6 Gesprek met de monteurs")
tbl([KOPV,
     ["G1 Bevindingen besproken\nja / nee", "Een WPI zonder gesprek is een controle, geen inspectie met leereffect", "Ja", "7.1a (uitvoering)", "Eén woord"],
     ["G2 Wat is besproken en de reactie", "Laat zien of de monteurs de bevinding herkennen", "Als G1 ja is", "T17", "Twee of drie zinnen"],
     ["G3 Ideeën van de monteurs", "Verbetervoorstellen van de werkvloer", "Nee", "T17", "Eén zin per idee"],
     ["G4 Idee opnemen als actie (Nieuw)\nja / nee", "Voorkomt dat een goed idee in het rapport blijft liggen", "Als G3 is ingevuld", "7.1e; T9", "Eén woord"],
     ], VW)

h2("3.7 Bevindingen en acties")
tbl([KOPV,
     ["B1 Actienummer\nWPI-nummer plus volgnummer", "Elke actie is terug te vinden in rapport, dashboard en overleg", "Automatisch", "7.1e; T9", "Niets"],
     ["B2 Omschrijving van de bevinding", "Wat er aan de hand is", "Ja", "7.1d", "Staat al in de waarneming"],
     ["B3 Classificatie (veertien klassen, zie 5.10)", "Maakt optellen over inspecties mogelijk", "Ja; Claude stelt voor", "7.2a; T3", "Bevestigen"],
     ["B4 Prioriteit\ndirect / kort (binnen 2 weken) / planmatig", "Bepaalt de termijn en de bespreking in het overleg", "Ja", "7.1d (tijdsduur); T9", "Eén woord"],
     ["B5 Direct gecorrigeerd\nja / nee, en wat er is gedaan", "Onderscheid tussen opgelost op locatie en nog te doen", "Ja", "7.1d; T10", "Eén zin"],
     ["B6 Werk stilgelegd (Nieuw)\nja / nee", "De zwaarste ingreep van een inspecteur hoort zichtbaar te zijn", "Bij prioriteit 'direct'", "T10", "Eén woord"],
     ["B7 Verbeteractie", "Wat er moet gebeuren", "Ja, tenzij direct gecorrigeerd en daarmee afgedaan", "7.1d, 7.1e", "Eén zin"],
     ["B8 Actiehouder (functie)", "Wie de actie uitvoert", "Ja", "7.1d, 7.1e; T9", "Eén functie"],
     ["B9 Toetser (Nieuw)", "Wie controleert dat de actie is uitgevoerd. De VCA vraagt dit uitdrukkelijk in het actieplan", "Ja; standaard de inspecteur", "7.1e", "Niets, of een andere functie noemen"],
     ["B10 Termijn (datum)", "Wanneer het klaar moet zijn", "Ja", "7.1d, 7.1e; T9", "Eén datum; Claude stelt voor op basis van de prioriteit"],
     ["B11 Status\nOpen / In behandeling / Afgerond / Vervallen", "Follow-up", "Automatisch 'Open'; daarna in het dashboard", "7.1e; T9", "Niets tijdens de WPI"],
     ["B12 Datum afgerond en wijze van toetsing (Nieuw)\nfoto / gezien bij volgende WPI / document", "Bewijs dat een actie echt is gesloten", "Bij afsluiten, in het dashboard", "7.1e; T9", "Niets tijdens de WPI"],
     ["B13 Mogelijke ernst (Nieuw)\nlaag / middel / hoog", "Onderscheid tussen een slordigheid en iets waar iemand zwaar gewond door kan raken", "Nee; in de proef bezien of het naast de prioriteit iets toevoegt", "T3, T9", "Eén woord"],
     ["B14 Wat ging opvallend goed", "Positieve bevinding die niet aan één regel hangt", "Ja: minstens één, of uitdrukkelijk 'geen'", "7.1a, 7.1d; T12", "Eén zin"],
     ["B15 Delen als goed voorbeeld (Nieuw)\nja / nee", "Levert onderwerpen voor toolbox en coördinatorenoverleg", "Nee", "T12", "Eén woord"],
     ], VW)

h2("3.8 Afsluiting en afgeleide gegevens")
tbl([KOPV,
     ["S1 Antwoord op de afsluitvraag", "Geeft elke overgebleven regel een eerlijk oordeel: gezien of niet gezien", "Ja", "7.1d; T16", "Eén antwoord"],
     ["S2 Bevestiging van de samenvatting", "De inspecteur staat in voor de inhoud; vervangt een handtekening", "Ja", "7.1b, 7.1d", "Eén woord"],
     ["S3 Opmerking over de methode (Nieuw)", "Wat werkte niet: spraak, volgorde, vragen. Alleen tijdens de proef", "Tijdens de proef", "Evaluatie", "Eén zin"],
     ["A1 Dekkingsgraad", "Aandeel van de regels van de taak dat is waargenomen", "Automatisch", "T13, T16", "Niets"],
     ["A2 Aantallen per oordeel", "Kopcijfers in de samenvatting", "Automatisch", "7.2; T3, T4", "Niets"],
     ["A3 Herhaalde bevinding", "Zelfde TRA-regel of classificatie eerder afwijkend bij hetzelfde product. Het dashboard rekent dit uit over alle rapporten", "Automatisch, in het dashboard", "T11", "Niets"],
          ["A4 Wijze van beoordeling per regel (Nieuw)\nwaargenomen / alleen bevestigd / niet beoordeeld", "Laat zien bij welke maatregelen feitelijk is gekeken. Afgeleid uit R2, R3 en S1", "Automatisch", "7.1 (verslag); T13, T16", "Niets"],
], VW)

h2("3.9 Wat dit de inspecteur in totaal kost")
p("Tegenover de eerste opzet van de skill komen er voor de inspecteur elf korte antwoorden bij: K4 (alleen als een "
  "directielid meeloopt), K7, K8, K9, K12, R4, R5 en R7 (alleen bij een afwijking), B6 (alleen bij 'direct'), B9 "
  "(alleen als de toetser iemand anders is) en S3 (alleen in de proef). Bij een WPI zonder afwijkingen zijn dat vier "
  "woorden in de kop. De rest wordt afgeleid of pas in het dashboard ingevuld. Dit is een verwachting op basis van het "
  "ontwerp, geen meting. In de proef meten we de duur van de inspectie en vragen we de inspecteur na elke WPI wat hem "
  "ophield (S3). Een veld dat niet wordt gebruikt of de inspecteur ophoudt, schrappen we.")

# ------------------------------------------------------------ 4
h1("4. Welke trenddata dit oplevert")
p("Elk rapport eindigt met een platte gegevenstabel: één rij per beoordeelde regel en één rij per actie. Het dashboard "
  "(bijlage 2) leest die tabellen uit alle rapporten. Hieronder staat welke trends dat oplevert. De voorbeelden in het "
  "dashboard zijn berekend op een fictieve dataset van 15 WPI's.")
TW = [1900, 1500, 3100, 2564]
tbl([
    ["Trend", "Uit velden", "Welke vraag beantwoordt hij", "Voor wie"],
    ["T1 Uitvoering van het programma", "K2, K3, K4, K5", "Heeft elke coördinator elke maand een WPI gedaan en de directie elk kwartaal?", "Coördinatorenoverleg (maandelijks), auditor, directiebeoordeling"],
    ["T2 Spreiding over werkplekken", "K6, K8, P1", "Welke projecten en producten zijn bezocht, welke niet? Komt kort werk naar verhouding aan bod?", "Hoofd S&M bij het plannen, auditor (voetnoot 7.1b)"],
    ["T3 Bevindingen per classificatie", "B3, R2, O1, K5", "Waar zitten onze afwijkingen en positieve bevindingen, en verschuift dat per kwartaal?", "Directiebeoordeling, auditor (7.2), coördinatorenoverleg"],
    ["T4 Oordelen per algemeen onderwerp", "O1", "Welke van de negen onderwerpen scoort structureel goed of slecht?", "Coördinatorenoverleg, toolboxkeuze"],
    ["T5 Meest afwijkende TRA-regels", "R1, R2", "Welke maatregelen uit de TRA worden in de praktijk het vaakst niet nageleefd?", "TRA-beheer, coördinatorenoverleg"],
    ["T6 Naleving per maatregelniveau", "R4", "Ontbreken er collectieve voorzieningen, of gaat het om individueel gedrag en PBM?", "Directiebeoordeling, Hoofd S&M"],
    ["T7 Oorzaken", "R5", "Komt het door onbekendheid, ontbrekende middelen, de voorbereiding of een onwerkbare maatregel?", "Hoofd S&M, QHSE-Manager, directiebeoordeling"],
    ["T8 Waarnemingen buiten de TRA", "R6, R7", "Welke risico's ziet de inspecteur die de TRA niet noemt? Welke maatregelen zijn onwerkbaar?", "TRA-beheer"],
    ["T9 Opvolging van acties", "B1, B4, B8–B12", "Hoeveel acties staan open, hoeveel zijn te laat, hoe lang duurt afhandeling, bij welke functie blijft het liggen?", "Coördinatorenoverleg (wekelijks), auditor (7.1e), directiebeoordeling"],
    ["T10 Direct gecorrigeerd en stilgelegd", "B5, B6", "Welk deel lossen we op locatie op? Hoe vaak is werk stilgelegd?", "Directiebeoordeling"],
    ["T11 Herhaalde bevindingen", "A3", "Komt dezelfde afwijking terug nadat de actie is gesloten? Dan werkte de actie niet", "Hoofd S&M, auditor (follow-up 7.2b)"],
    ["T12 Positieve bevindingen", "R2, R3, B14, B15", "Wat gaat aantoonbaar goed, en wat is het delen waard?", "Toolbox, coördinatorenoverleg, auditor (7.1d, 7.2)"],
    ["T13 Diepgang van de inspecties", "A1, A4, K5, K12, aantal foto's", "Welk deel van de regels is waargenomen, alleen bevestigd of niet beoordeeld? Hoe lang duurt een WPI, hoe vaak is de terugvaloptie gebruikt?", "Hoofd S&M, auditor, evaluatie van de proef"],
    ["T14 Per product, fase en soort werk", "P1, P2, K7, R2", "Bij welk product of in welke fase (bijvoorbeeld demontage) zitten de meeste afwijkingen?", "TRA-beheer, werkvoorbereiding"],
    ["T15 Aangekondigd en soort inspectie", "K3, K9, R2", "Zien we bij onaangekondigde inspecties of bij de directie iets anders dan bij de coördinator?", "Hoofd S&M, directie"],
    ["T16 Blinde vlekken", "R1, A4", "Welke TRA-maatregelen zijn in geen enkele WPI waargenomen, en welke alleen bevestigd?", "Hoofd S&M bij het plannen, TRA-beheer, auditor"],
    ["T17 Inbreng van de monteurs", "G2, G3, G4", "Welke ideeën komen van de werkvloer en wat is ermee gedaan?", "Coördinatorenoverleg, toolbox"],
    ["T18 Voorbereiding op orde", "V1–V4", "Hoe vaak ontbreekt het VGM-projectplan, de TRA, de werkvergunning of de LMRA?", "Hoofd S&M, werkvoorbereiding, auditor"],
], TW, first_bold=True)
p("T1, T3, T9 en T12 zijn nodig om aan 7.1 en 7.2 te voldoen. De andere zijn onze eigen keuze. T5, T8, T14 en T16 "
  "bestaan alleen doordat de WPI aan de TRA hangt; een losse checklist kan ze niet leveren. T13 en T16 rusten op het "
  "onderscheid tussen waargenomen, alleen bevestigd en niet beoordeeld. Zonder dat onderscheid zou een hoge score "
  "'in orde' ook kunnen betekenen dat er weinig is gekeken.")
p("Een waarschuwing bij het lezen van de cijfers: bij twee coördinatoren en één directielid komen er ongeveer 28 WPI's "
  "per jaar. Per product of per TRA-regel zijn dat kleine aantallen. Een verschil van twee of drie bevindingen is dan "
  "geen trend. De jaarlijkse trendanalyse benoemt daarom aantallen en geen percentages waar het om minder dan tien "
  "waarnemingen gaat.")

# ------------------------------------------------------------ 5
add(pagebreak())
h1("5. Procedure Werkplekinspecties, versie 2.0 concept (herziening van versie 1.0)")
p("Dit hoofdstuk is de herziene procedure. De opbouw en de afspraken van versie 1.0 zijn behouden waar ze goed zijn; "
  "AMS is vervangen door de nieuwe werkwijze. Na de proef en na de besluiten uit 8.1 wordt dit hoofdstuk als "
  "afzonderlijk document in het QMS gezet. De tabellen uit hoofdstuk 3 worden dan bijlage A (vast te leggen gegevens). "
  "Waar een termijn, aantal of regel nog een voorstel is, staat dat erbij.", italic=True, color=BLAUW)
tbl([
    ["Documentbeheer", ""],
    ["Versie", "2.0 concept (vervangt versie 1.0 na vaststelling)"],
    ["Eigenaar", "Hoofd Service, Montage & Aftersales (hierna: Hoofd Service & Montage)"],
    ["Opgesteld door / goedgekeurd door / datum", "In te vullen bij vaststelling"],
    ["Reviewfrequentie", "Jaarlijks"],
], [3000, 6064], first_bold=True, zebra=False)

h2("5.0 Wat is gewijzigd ten opzichte van versie 1.0")
tbl([
    ["Onderdeel", "Versie 1.0", "Versie 2.0", "Waarom"],
    ["Hulpmiddel", "Checklist invullen in AMS", "Inspreken en fotograferen in de Claude-app; de skill wpi-begeleider maakt het rapport. AMS vervalt voor WPI's na het besluit in 8.1", "De auditor vond de WPI's niet duidelijk genoeg; AMS kent geen koppeling met het werk"],
    ["Checklist", "Eén vaste checklist", "Negen algemene onderwerpen plus de risicoregels uit de TRA van de taak die wordt uitgevoerd", "De inspectie moet gaan over het werk dat op dat moment gebeurt"],
    ["Positieve bevindingen", "Niet beschreven; een bevinding was alleen een verbeterpunt, afwijking of onveilige situatie", "Beschreven: oordeel Conform met waarneming, en 'wat ging opvallend goed'", "VCA 7.1 vraagt dat de procedure en het verslag de positieve bevindingen bevatten"],
    ["Directie-inspectie", "'conform VCA 7.2'", "Verwijzing naar VCA 7.1", "Fout in versie 1.0: de deelname van directieleden staat in 7.1"],
    ["Onderaannemers", "Waarnemingen ook bespreken met de leidinggevende van de onderaannemer", "Bevindingen worden alleen over eigen monteurs vastgelegd (zie het oranje kader in 5.2)", "Keuze voor de nieuwe methode; onderaannemers worden beoordeeld via hun eigen procedure"],
    ["Acties", "Actiehouder, termijn, prioriteit", "Daarbij: actienummer en toetser", "VCA 7.1 vraagt in het actieplan de verantwoordelijken voor uitvoering en toetsing"],
    ["Classificatie", "'Per categorie', categorieën niet benoemd", "Veertien vaste klassen", "VCA 7.2: bevindingen worden geclassificeerd"],
    ["Trendanalyse", "Aantallen, meest voorkomende bevindingen, doorlooptijd, trends", "Daarbij: positieve bevindingen, TRA-maatregelen, oorzaken, te ondernemen acties en de follow-up daarvan", "VCA 7.2 vraagt positieve en negatieve bevindingen, acties en follow-up"],
    ["Werk van korte duur", "Niet benoemd", "Regels voor de keuze van de werkplek in het inspectieprogramma", "Voetnoot 10 bij VCA 7.1"],
    ["Inspectie door een monteur", "Niet beschreven", "Beschreven als mogelijkheid", "Derde minimumeis van VCA 7.1"],
    ["Waargenomen of alleen bevestigd", "Niet aanwezig", "Per regel zichtbaar: waargenomen, alleen bevestigd of niet beoordeeld", "Een auditor moet kunnen zien bij welke maatregelen feitelijk is gekeken"],
    ["Terugvaloptie", "Niet aanwezig", "Terugvalformulier en Word-sjabloon", "Afhankelijkheid van app en bereik"],
    ["Registraties", "In AMS; bewaartermijnen niet ingevuld", "WPI-rapport in het QMS; bewaartermijnen ingevuld (voorstel)", "Aantoonbaarheid bij de audit"],
    ["Ongewijzigd", "Frequenties (coördinator maandelijks, directie vier per jaar); bezoek bij voorkeur niet of kort van tevoren aankondigen; direct gevaarlijke situaties stoppen en melden; een bevinding is pas afgerond na verificatie; bespreking in het coördinatorenoverleg op maandag; trendanalyse als input voor directiebeoordeling en het volgende inspectieprogramma; rolverdeling", "Overgenomen", "Deze afspraken voldoen en zijn bekend bij de inspecteurs"],
], [1500, 2500, 2764, 2300], first_bold=True)

h2("5.1 Doel")
p("Deze procedure beschrijft hoe Noardling B.V. werkplekinspecties (WPI's) uitvoert binnen de afdeling Service & "
  "Montage. De procedure waarborgt dat:", space_after=40)
bl("VGM-risico's op de werkplek tijdig worden gesignaleerd en gecorrigeerd;")
bl("de operationeel leidinggevenden en de directie aantoonbaar betrokken zijn bij het toezicht op veilig werken;")
bl("bevindingen, positieve en negatieve, structureel worden opgevolgd en gebruikt voor verbetering van het VGM-beheersysteem, waaronder de TRA's.")
vca("7.1 Worden periodiek werkplekinspecties uitgevoerd door operationeel leidinggevenden? (*/**/P)\n"
    "Doelstelling: Het in stand houden dan wel bevorderen van een veilige werkomgeving en werkwijze.\n"
    "Minimumeisen:\n"
    "• Er is een procedure, waarin de volgende zaken staan beschreven:\n"
    "    – de uitvoering van de inspecties;\n"
    "    – de positieve bevindingen van de inspecties;\n"
    "    – de opvolging van waargenomen verbeterpunten;\n"
    "    – gebruik van de checklist.\n"
    "• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n"
    "• Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.\n"
    "• Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te "
    "voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.\n"
    "• Er is een actieplan met daarin:\n"
    "    – actiepunten, voortkomende uit de inspecties;\n"
    "    – de verantwoordelijken voor de uitvoering en toetsing;\n"
    "    – tijdsplanning.\n"
    "• De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "Documenten:\n"
    "• Procedure met betrekking tot de uitvoering van de werkplekinspecties en het inspectieprogramma\n"
    "• Verslagen van de uitgevoerde inspecties en de follow-up hiervan\n"
    "(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar "
    "verhouding wordt behaald, rekening houdend met de risico's.",
    "VCA 2026/6.1, hoofdstuk 7 VGM-inspecties, vraag 7.1 (letterlijke tekst)")
vca("7.2 Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)? (-/□/P)\n"
    "Doelstelling: Het identificeren van basisoorzaken van structurele verbetermogelijkheden.\n"
    "Minimumeisen:\n"
    "• Bevindingen worden geclassificeerd.\n"
    "• Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.\n"
    "Documenten:\n"
    "• Trendanalyse\n"
    "• Overzicht verbeteracties",
    "VCA 2026/6.1, vraag 7.2 (letterlijke tekst)")

h2("5.2 Toepassingsgebied")
p("Deze procedure geldt voor alle werkzaamheden die door of namens de afdeling Service & Montage van Noardling B.V. "
  "worden uitgevoerd, uitsluitend voor de Service & Montage-werkzaamheden op projectlocaties: montage, onderhoud, "
  "revisie en storingswerk.")
keuze("Versie 1.0 liet de inspecteur waarnemingen ook bespreken met de leidinggevende van de onderaannemer. In de nieuwe "
      "methode leggen we in het WPI-rapport alleen bevindingen vast over het werk van onze eigen monteurs. Er is geen "
      "veld voor onderaannemers of derden. Wat blijft: ziet de inspecteur bij een ander een direct gevaarlijke situatie, "
      "dan laat hij die stoppen, spreekt hij de betrokkene of diens leidinggevende aan en meldt hij het volgens de "
      "procedure incidentenrapportage. De beoordeling van onderaannemers loopt via de Procedure Inkoop van Diensten. "
      "Bevindingen over de locatie van de opdrachtgever die ons eigen werk raken, bijvoorbeeld een werkplek die niet is "
      "gereinigd, leggen we vast als bevinding over onze eigen voorbereiding.",
      "Keuze Noardling (voorstel, zie 8.1): alleen eigen monteurs")

h2("5.3 Definities")
tbl([
    ["Begrip", "Betekenis in deze procedure"],
    ["Werkplekinspectie (WPI)", "Geplande, vastgelegde inspectie van een werkplek of werksituatie, gericht op de naleving van VGM-afspraken. Bestaat uit een algemene observatie en een toetsing van het lopende werk aan de maatregelen uit de TRA"],
    ["VGM-inspectie directie", "Werkplekinspectie waaraan een directielid deelneemt of die een directielid zelf uitvoert, conform VCA 7.1"],
    ["Operationele werkplek", "Een projectlocatie waar monteurs van Service & Montage aan het werk zijn"],
    ["Werk van korte duur", "Werk dat korter dan een maand op dezelfde locatie duurt (voorstel)"],
    ["Operationeel leidinggevende", "De Montage Coördinator en het Hoofd Service & Montage"],
    ["Inspecteur", "Degene die de WPI uitvoert: een Montage Coördinator, het Hoofd Service & Montage, een directielid of, onder verantwoordelijkheid van een Montage Coördinator, een ervaren monteur"],
    ["Kennisbank", "De 21 product-TRA's in de vorm waarin de skill wpi-begeleider ze gebruikt: per product de fasen, taken, risicoregels en maatregelen. Elke risicoregel heeft een vast nummer (productcode, fase, volgnummer)"],
    ["Checklist", "De negen algemene onderwerpen (A t/m I) plus de risicoregels uit de kennisbank die horen bij de taak die wordt uitgevoerd"],
    ["Bevinding", "Wat de inspecteur tijdens de WPI vaststelt: een positieve bevinding, een verbeterpunt, een afwijking of een onveilige situatie"],
    ["Positieve bevinding", "Een maatregel of werkwijze die de inspecteur in orde heeft gezien en heeft beschreven (oordeel Conform), of een opmerking onder 'wat ging opvallend goed'"],
    ["Afwijking", "Een afgesproken maatregel wordt niet nageleefd of ontbreekt"],
    ["Verbeterpunt", "De situatie voldoet, maar kan veiliger of beter"],
    ["Waargenomen / alleen bevestigd / niet beoordeeld", "Waargenomen: de inspecteur heeft bij de regel een eigen waarneming beschreven. Alleen bevestigd: de regel is afgedaan met het antwoord op de afsluitvraag. Niet beoordeeld: de inspecteur heeft de regel niet gezien"],
    ["Buiten TRA", "Een waarneming van een risico dat in de TRA van het product niet voorkomt"],
    ["Actieoverzicht", "Het overzicht van alle acties uit WPI's met actiehouder, toetser, termijn en status, bijgehouden in het WPI-dashboard. Dit is het actieplan in de zin van VCA 7.1"],
    ["Toetser", "Degene die verifieert dat een maatregel daadwerkelijk is uitgevoerd"],
    ["Coördinatorenoverleg", "Wekelijks overleg op maandagochtend onder leiding van het Hoofd Service & Montage, waarin onder andere WPI-bevindingen worden besproken en opvolging wordt vastgelegd"],
], [2500, 6564], first_bold=True)

h2("5.4 Verantwoordelijkheden")
tbl([
    ["Functie", "Verantwoordelijkheid"],
    ["Directielid", "Neemt minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie (minimaal 4 VGM-inspecties per kalenderjaar). Toont zichtbaar commitment. Ziet toe op de opvolging van bevindingen. Bespreekt de jaarlijkse trendanalyse in de directiebeoordeling"],
    ["Hoofd Service & Montage", "Eigenaar van deze procedure en eindverantwoordelijk voor de uitvoering van het inspectieprogramma binnen Service & Montage. Stelt het inspectieprogramma vast en deelt het met de inspecteurs. Voert aanvullend WPI's uit naar eigen inzicht. Bewaakt tijdige opvolging in het coördinatorenoverleg. Slaat de rapporten op in het QMS. Stelt de jaarlijkse trendanalyse op"],
    ["Montage Coördinator", "Voert minimaal 1 WPI per maand uit (gezamenlijk minimaal 24 per jaar). Bespreekt de waarnemingen ter plaatse met de monteurs. Brengt de bevindingen in tijdens het coördinatorenoverleg. Is toetser van de acties uit zijn eigen WPI's, tenzij anders vastgelegd. Draagt de verantwoordelijkheid voor WPI's die een monteur onder zijn naam uitvoert"],
    ["Monteur", "Werkt mee aan de uitvoering van inspecties. Signaleert onveilige situaties en meldt deze conform de geldende procedures. Voert acties uit die aan hem zijn toegewezen"],
    ["QHSE-Manager", "Ondersteunt bij de methode en de trendanalyse. Verwerkt voorstellen tot wijziging van een TRA en werkt daarna de kennisbank bij. Is niet verantwoordelijk voor de uitvoering van de inspecties"],
], [2400, 6664], first_bold=True)

h2("5.5 Inspectieprogramma")
vca("• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n"
    "• De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar "
    "verhouding wordt behaald, rekening houdend met de risico's.", "VCA 7.1, minimumeisen 2 en 6 en voetnoot 10")
tbl([
    ["Wie", "Frequentie", "Keuze van de werkplek"],
    ["Elke Montage Coördinator", "Minimaal 1 WPI per maand (gezamenlijk minimaal 24 per jaar)", "Een lopende werklocatie of werksituatie binnen Service & Montage; zie de regels hieronder"],
    ["Directielid", "Minimaal 1 per kwartaal, 4 per kalenderjaar", "Een projectlocatie; bij voorkeur een project met hijswerk, een besloten ruimte of werk bij open water"],
    ["Hoofd Service & Montage", "Aanvullend, naar eigen inzicht", "Vrij"],
    ["Project dat langer dan een maand op dezelfde locatie loopt (voorstel)", "Minimaal 1 WPI per maand op die werkplek", "Door de coördinator van het project; telt mee voor zijn maandnorm"],
], [2800, 2800, 3464], first_bold=True)
p("Het werk van Service & Montage duurt op de meeste locaties enkele dagen tot enkele weken. Voetnoot 10 is daarom op "
  "ons werk van toepassing. Het programma haalt de frequentie naar verhouding met de volgende regels voor de keuze van "
  "de werkplek.", space_after=40)
bl("Projecten met hijswerk, een besloten ruimte, werken op hoogte of bij open water, of werk aan een installatie die is veiliggesteld gaan voor.")
bl("In een kalenderjaar worden zo veel mogelijk verschillende producten en fasen geïnspecteerd. Het dashboard laat zien welke producten en welke TRA-maatregelen nog niet zijn waargenomen; de inspecteur gebruikt dat bij zijn keuze.")
bl("Elke monteursploeg wordt minimaal één keer per jaar geïnspecteerd.")
p("Het programma wordt vastgesteld door het Hoofd Service & Montage en gedeeld met de inspecteurs. Het staat in het "
  "WPI-dashboard: per maand en per inspecteur het geplande aantal, met daartegenover de uitgevoerde WPI's. Een gemiste "
  "maand wordt in het eerstvolgende coördinatorenoverleg besproken en in de maand erna ingehaald. De uitkomsten van de "
  "jaarlijkse trendanalyse zijn input voor het programma van het volgende jaar.")
keuze("De VCA laat open hoe het programma voor werk van korte duur eruitziet. De grens van een maand, de voorrangsregels "
      "op risico, de spreiding over producten en de regel dat elke ploeg minimaal één keer per jaar wordt geïnspecteerd "
      "zijn een voorstel voor onze invulling.", "Keuze Noardling (voorstel, zie 8.1): programma bij werk van korte duur")

h2("5.6 Voorbereiding")
bl("De inspecteur selecteert een lopende werklocatie of werksituatie binnen Service & Montage volgens het inspectieprogramma.")
bl("Hij kondigt het bezoek bij voorkeur niet (of slechts kort) van tevoren aan, zodat een representatief beeld ontstaat. Voorstel: minimaal een derde van de WPI's is onaangekondigd; het rapport vermeldt of de WPI was aangekondigd.")
bl("Hij neemt zijn telefoon mee met de Claude-app, aangemeld op het Noardling-account, en opent de WPI-projectmap.")

h2("5.7 Uitvoering")
vca("• Er is een procedure, waarin de volgende zaken staan beschreven:\n"
    "    – de uitvoering van de inspecties;\n"
    "    – de positieve bevindingen van de inspecties;\n"
    "    – de opvolging van waargenomen verbeterpunten;\n"
    "    – gebruik van de checklist.", "VCA 7.1, minimumeis 1")
p("De inspecteur start de inspectie in de WPI-projectmap. De skill wpi-begeleider leidt hem door de onderdelen "
  "hieronder. De volgorde is vrij; aan het eind hebben alle onderdelen een waarde.")
tbl([
    ["Onderdeel", "Inhoud", "Vastlegging (bijlage A)"],
    ["1. Kop", "Inspecteur en functie, soort inspectie, deelnemend directielid, datum en tijd, opdrachtgever, locatie, projectnummer, soort werk, werk van korte duur, aangekondigd of niet, aanwezige monteurs, omstandigheden", "K1–K12"],
    ["2. Product en taak", "De inspecteur noemt het product en de taak waar de monteurs mee bezig zijn. Daarmee ligt vast welke risicoregels uit de kennisbank de checklist vormen. Het WPI-nummer wordt toegekend", "P1–P3"],
    ["3. Algemene observatie", "De negen onderwerpen A t/m I, waaronder de naleving van afgesproken beheersmaatregelen en het gebruik van PBM, orde en netheid, en de staat en keuring van gereedschappen en arbeidsmiddelen. Onder A worden vier vaste vragen gesteld: VGM-projectplan, TRA, werkvergunning, LMRA", "V1–V4, O1, O2"],
    ["4. Taakgerichte toetsing", "Per risicoregel van de taak noemt Claude de maatregelen uit de TRA. De inspecteur beschrijft wat hij ziet en geeft een oordeel. Bij een afwijking legt hij vast welke maatregel ontbreekt en wat de oorzaak is. Waarnemingen die bij geen regel passen krijgen de aanduiding Buiten TRA", "R1–R7"],
    ["5. Foto's", "Elke foto krijgt een nummer, een toelichting van de inspecteur en een koppeling aan een onderwerp of risicoregel. Geen herkenbare personen in beeld, tenzij dat voor de bevinding nodig is", "F1–F4"],
    ["6. Gesprek met de monteurs", "De inspecteur bespreekt zijn waarnemingen, ook de positieve, ter plaatse met de aanwezige monteur(s) en legt hun reactie en ideeën vast", "G1–G4"],
    ["7. Bevindingen en acties", "Zie 5.8", "B1–B15"],
    ["8. Afsluiten", "Claude stelt de afsluitvraag voor alle regels zonder waarneming. De inspecteur bevestigt de samenvatting", "S1, S2, A1–A4"],
], [1700, 6064, 1300], first_bold=True)
p("Direct gevaarlijke situaties worden ter plaatse gestopt en, indien nodig, gemeld conform de procedure "
  "incidentenrapportage. De inspecteur legt dit vast met prioriteit 'direct' en 'werk stilgelegd: ja'.")
lab("Regels voor de uitvoering")
bl("Waarneming en oordeel komen van de inspecteur. Claude vult geen waarneming of oordeel in dat de inspecteur niet heeft uitgesproken.")
bl("Positieve bevindingen: het oordeel 'Conform' wordt alleen gegeven als de inspecteur heeft beschreven wat hij zag. Daarnaast noemt hij minimaal één ding dat opvallend goed ging, of zegt hij uitdrukkelijk dat er niets opviel.")
bl("Regels waarover de inspecteur niets zegt, krijgen na de afsluitvraag 'Geen afwijking waargenomen' of 'Niet beoordeeld'.")
bl("Het rapport toont per regel of die is waargenomen, alleen bevestigd of niet beoordeeld, en telt dat op in de samenvatting. Zo kan een auditor zien bij welke maatregelen feitelijk is gekeken.")
bl("Namen van monteurs staan alleen in de kop van het rapport, niet bij een bevinding.")
bl("Een korte WPI is geldig.")
lab("Inspectie door een monteur")
vca("• Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.", "VCA 7.1, minimumeis 3")
keuze("Een ervaren monteur mag een WPI uitvoeren op een werkplek waar hij zelf niet aan het werk is. De Montage "
      "Coördinator onder wiens verantwoordelijkheid dat gebeurt staat in de kop, leest het rapport na en is toetser van "
      "de acties. Zo'n WPI telt mee in de spreiding over werkplekken, maar niet voor de maandelijkse norm van de "
      "coördinator zelf.", "Keuze Noardling (voorstel, zie 8.1): inspectie door een monteur")

h2("5.8 Vastleggen van bevindingen en het inspectieverslag")
vca("• Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te "
    "voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.",
    "VCA 7.1, minimumeis 4")
p("Per onderwerp en per risicoregel worden het oordeel, een korte toelichting in de woorden van de inspecteur en "
  "eventuele foto's vastgelegd. Per afwijking en per verbeterpunt daarnaast: omschrijving, classificatie, verbeteractie, "
  "actiehouder, toetser, overeengekomen termijn en prioriteit.")
tbl([
    ["Prioriteit", "Betekenis", "Termijn"],
    ["Direct", "Gevaar dat niet kan wachten. Wordt ter plaatse gestopt en opgelost", "Tijdens de inspectie"],
    ["Kort", "Moet snel worden opgelost, maar het werk kan veilig doorgaan", "Binnen twee weken"],
    ["Planmatig", "Vraagt een aanpassing in voorbereiding, middelen, instructie of TRA", "Datum in overleg; voorstel: uiterlijk het einde van het volgende kwartaal"],
], [1700, 4664, 2700], first_bold=True)
p("Na de bevestiging van de inspecteur maakt Claude het inspectieverslag (WPI-rapport) als Word-document met negen vaste "
  "onderdelen: 1 Kop, 2 Samenvatting, 3 Algemene observatie, 4 Taakgerichte toetsing (alle regels van de taak), "
  "5 Positieve bevindingen, 6 Bevindingen en acties, 7 Gesprek met de monteurs, 8 Foto's met toelichting, "
  "9 Gegevenstabel. De inspecteur leest het rapport na en laat fouten in dezelfde chat herstellen.")
keuze("De VCA schrijft geen vorm of hulpmiddel voor. De koppeling aan de product-TRA, de negen algemene onderwerpen, de "
      "foto's, de vaste indeling van het rapport en het gebruik van Claude zijn onze eigen invulling.",
      "Keuze Noardling (voorstel, zie 8.1): vorm van de inspectie en het verslag")

h2("5.9 Opvolging")
vca("• Er is een actieplan met daarin:\n"
    "    – actiepunten, voortkomende uit de inspecties;\n"
    "    – de verantwoordelijken voor de uitvoering en toetsing;\n"
    "    – tijdsplanning.", "VCA 7.1, minimumeis 5")
p("Elke afwijking en elk verbeterpunt leidt tot een actie met een nummer (WPI-nummer plus volgnummer). Alle acties staan "
  "in het actieoverzicht in het WPI-dashboard.", space_after=40)
bl("Bevindingen uit alle WPI's worden besproken in het wekelijkse coördinatorenoverleg op maandag. Per bevinding worden vastgelegd: status (open, in behandeling, afgerond, vervallen), actiehouder en termijn, uitgevoerde maatregel(en) en verificatie.")
bl("Een bevinding wordt pas als afgerond geregistreerd nadat de toetser heeft geverifieerd dat de maatregel daadwerkelijk is uitgevoerd. Hij legt vast hoe hij dat heeft gezien: een foto, een document of een waarneming bij een volgende WPI.")
bl("De afhandeling wordt vastgelegd in het actieoverzicht en in het verslag van het coördinatorenoverleg.")
bl("Een actie die vervalt krijgt de status Vervallen met de reden.")
bl("Voorstel: is een actie meer dan twee weken te laat, dan beslist het Hoofd Service & Montage over een nieuwe termijn of een andere actiehouder. Dat wordt bij de actie vastgelegd.")
bl("Een voorstel om een TRA aan te passen gaat als actie naar de QHSE-Manager. Na wijziging van de TRA wordt de kennisbank bijgewerkt (5.12).")

h2("5.10 Classificatie en trendanalyse")
vca("• Bevindingen worden geclassificeerd.\n"
    "• Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.",
    "VCA 7.2, minimumeisen")
p("Elke beoordeelde regel, positief en negatief, krijgt een van de volgende veertien klassen. Risicoregels uit de TRA "
  "hebben hun klasse al in de kennisbank; bij andere bevindingen stelt Claude een klasse voor en bevestigt de inspecteur.")
tbl([
    ["Classificatie", "Classificatie", "Classificatie"],
    ["PBM", "Orde en netheid", "Gedrag en werkwijze"],
    ["Veiligstellen-LOTOTO", "Gevaarlijke stoffen en hygiëne", "Omgeving en afzetting"],
    ["Hijsen", "Besloten ruimte en gas", "Milieu"],
    ["Werken op hoogte of bij water", "Noodvoorzieningen", "TRA onvolledig"],
    ["Arbeidsmiddelen en keuring", "Documenten en voorbereiding", ""],
], [3021, 3021, 3022], zebra=False)
p("De trendanalyse wordt minimaal eenmaal per jaar gemaakt door het Hoofd Service & Montage, ondersteund door de "
  "QHSE-Manager, op basis van de uitgevoerde WPI's. Voorstel: in januari over het afgelopen kalenderjaar. Zij bevat:",
  space_after=40)
bl("het aantal WPI's ten opzichte van het programma;")
bl("de meest voorkomende bevindingen per classificatie, positief en negatief;")
bl("de TRA-maatregelen die het vaakst afwijken, de oorzaken en de herhaalde bevindingen;")
bl("welk deel van de regels is waargenomen, alleen bevestigd of niet beoordeeld, en welke maatregelen nooit zijn waargenomen;")
bl("de doorlooptijd van openstaande bevindingen;")
bl("trends over de tijd;")
bl("de te ondernemen acties, elk met actiehouder en termijn, en de stand van de acties uit de vorige trendanalyse (follow-up).")
p("De resultaten worden besproken in het coördinatorenoverleg en vormen input voor de directiebeoordeling en het "
  "volgende inspectieprogramma. De acties uit de trendanalyse komen in het actieoverzicht. Voorstel: daarnaast bekijkt "
  "het Hoofd Service & Montage elk kwartaal met de Montage Coördinatoren het dashboard en kiezen zij onderwerpen voor "
  "toolbox en instructie.")
keuze("De VCA vraagt een classificatie en een jaarlijkse trendanalyse met acties en follow-up, maar schrijft de indeling "
      "niet voor. De veertien klassen, het kwartaaloverzicht en de analyse van TRA-maatregelen, oorzaken en blinde "
      "vlekken zijn onze eigen invulling.", "Keuze Noardling (voorstel, zie 8.1): indeling en inhoud van de trendanalyse")

h2("5.11 Als Claude op locatie niet beschikbaar is")
p("Geen bereik, een lege telefoon of een storing is geen reden om een WPI over te slaan.")
tbl([
    ["Situatie", "Werkwijze"],
    ["Geen bereik of storing tijdens één inspectie", "De inspecteur gebruikt het terugvalformulier WPI (één A4, op papier in de bus en als pdf op de telefoon) met dezelfde onderdelen: kop, negen onderwerpen, ruimte voor waarnemingen bij het werk, acties met actiehouder en termijn. Foto's maakt hij met de camera van de telefoon. Binnen twee werkdagen voert hij de inspectie zelf in via de skill, die dan de risicoregels van de taak naloopt. Het rapport vermeldt 'achteraf ingevoerd' en de datum van de inspectie"],
    ["Claude langer dan twee weken niet bruikbaar", "De inspecteur maakt het rapport met het Word-sjabloon WPI-rapport uit het QMS, dat dezelfde negen onderdelen heeft. De risicoregels van de taak haalt hij uit de kennisbank, die als pdf per product in het QMS staat. Het Hoofd Service & Montage houdt het actieoverzicht in die periode bij in het verslag van het coördinatorenoverleg"],
], [2600, 6464], first_bold=True)
p("Het terugvalformulier, het Word-sjabloon en de pdf's van de kennisbank bestaan nog niet. Voorstel: ze worden vóór de "
  "start van de proef gemaakt. De termijnen van twee werkdagen en twee weken zijn een voorstel.",
  italic=True, color=BLAUW)

h2("5.12 Registraties")
tbl([
    ["Registratie", "Omschrijving en plaats", "Beheer", "Bewaartermijn (voorstel)"],
    ["Inspectieprogramma", "Jaarplanning WPI's per inspecteur, gepland en uitgevoerd. In het WPI-dashboard; jaarlijks als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["WPI-rapport (inspectieverslag)", "Per inspectie, inclusief bevindingen, foto's en acties. Gemaakt in de WPI-projectmap in Claude; maandelijks opgeslagen in het QMS als Word en pdf", "Inspecteur maakt; Hoofd S&M slaat op", "5 jaar"],
    ["Actieoverzicht", "Alle acties met actiehouder, toetser, termijn, status en verificatie. In het WPI-dashboard; elk kwartaal als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["Verslag coördinatorenoverleg", "Bespreking en opvolging van bevindingen", "Hoofd S&M", "Volgens het QMS"],
    ["Trendanalyse WPI's", "Jaarrapportage met aantallen, bevindingen per classificatie, trends, acties en follow-up. In het QMS", "Hoofd S&M", "5 jaar"],
    ["Kennisbank", "TRA's per product met versiedatum. In de WPI-projectmap in Claude; pdf per product in het QMS", "QHSE-Manager", "Actuele versie plus de vorige"],
    ["Ingevuld terugvalformulier", "Bijlage bij het WPI-rapport in het QMS", "Inspecteur", "Gelijk aan het rapport"],
], [2000, 3764, 1700, 1600], first_bold=True)
p("Het QMS is de plaats waar de registraties voor de audit staan. De Claude-omgeving is het gereedschap waarmee ze worden "
  "gemaakt. Wijzigt een TRA, dan werkt de QHSE-Manager het bijbehorende bestand in de kennisbank bij en past hij de "
  "versiedatum aan (voorstel: binnen twee weken). De nummers van bestaande risicoregels blijven gelijk; een nieuwe regel "
  "krijgt een nieuw nummer, een vervallen nummer wordt niet opnieuw gebruikt.")
keuze("De VCA noemt geen bewaartermijn; versie 1.0 had de termijnen niet ingevuld. Voorstel: vijf jaar, langer dan één "
      "certificatieperiode van drie jaar, zodat een auditor de vorige periode kan inzien. Ook het maandelijks opslaan "
      "in het QMS door het Hoofd Service & Montage is een voorstel.",
      "Keuze Noardling (voorstel, zie 8.1): bewaartermijn en opslag")

h2("5.13 Gerelateerde documenten")
p("Methodiek TRA; de 21 product-TRA's; Procedure VGM-projectplan; LMRA-procedure; Verslagformulier coördinatorenoverleg; "
  "procedure incidentenrapportage; Procedure Inkoop van Diensten. Alle documenten staan in het QMS.")

# ------------------------------------------------------------ 6
h1("6. Dekking van de VCA-eisen 7.1 en 7.2")
p("Per minimumeis en per deelpunt staat waar hij is ingevuld en wat de auditor te zien krijgt. De eerste kolom bevat de "
  "letterlijke tekst van de checklist. 'Rapport' verwijst naar de negen vaste onderdelen van het WPI-rapport "
  "(bijlage 1). 'Dashboard' verwijst naar de onderdelen van het WPI-dashboard (bijlage 2, nog in aanbouw): programma, "
  "oordelen, classificatie, TRA-maatregelen, blinde vlekken en acties. Verwijzingen als K2 of B9 zijn velden uit "
  "hoofdstuk 3; T-nummers zijn trends uit hoofdstuk 4.")
DW = [2700, 1900, 2264, 2200]
DK = ["Eis (letterlijke tekst checklist)", "Waar ingevuld", "Waar zichtbaar", "Bewijsstuk voor de auditor"]


def dek(titel, labels, rijen):
    assert len(labels) == len(rijen)
    add(_kn(para(titel, bold=True, color=BLAUW, space_after=40)))
    tbl([DK] + [[l + "\n" + r[0]] + r[1:] for l, r in zip(labels, rijen)], DW, size=16)


dek("VCA 7.1: Worden periodiek werkplekinspecties uitgevoerd door operationeel leidinggevenden?",
    ["7.1a, deelpunt 1", "7.1a, deelpunt 2", "7.1a, deelpunt 3", "7.1a, deelpunt 4", "7.1b", "7.1b, voetnoot 10", "7.1c",
     "7.1d, element 1", "7.1d, element 2", "7.1d, element 3", "7.1d, element 4", "7.1d, element 5",
     "7.1e, deelpunt 1", "7.1e, deelpunt 2", "7.1e, deelpunt 3", "7.1f", "7.1, document 1", "7.1, document 2"], [
    ["Er is een procedure, waarin [is] beschreven: de uitvoering van de inspecties", "Methode: hoofdstuk 2\nProcedure: 5.6, 5.7, 5.11", "Rapport: volgt de negen vaste onderdelen\nDashboard: –", "Procedure Werkplekinspecties; een WPI-rapport dat de beschreven werkwijze volgt"],
    ["[...] de positieve bevindingen van de inspecties", "Methode: 3.4 (oordeel Conform), B14\nProcedure: 5.3, 5.7", "Rapport: onderdeel 5 Positieve bevindingen\nDashboard: oordelen", "Procedure 5.3 en 5.7; onderdeel 5 van elk rapport"],
    ["[...] de opvolging van waargenomen verbeterpunten", "Methode: 3.7\nProcedure: 5.9", "Rapport: onderdeel 6 Bevindingen en acties\nDashboard: acties", "Procedure 5.9; actieoverzicht; verslagen coördinatorenoverleg"],
    ["[...] gebruik van de checklist", "Methode: 2.1, 3.3, 3.4\nProcedure: 5.3 (definitie), 5.7", "Rapport: onderdelen 3 en 4, met alle regels van de taak\nDashboard: TRA-maatregelen", "Procedure 5.7; kennisbank per product; onderdelen 3 en 4 van elk rapport"],
    ["Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel leidinggevenden.(10)", "Methode: K2, K3, K5, K6; T1\nProcedure: 5.4, 5.5", "Rapport: onderdeel 1 Kop\nDashboard: programma (gepland en uitgevoerd per maand per inspecteur)", "Inspectieprogramma; rapporten per maand per coördinator"],
    ["(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar verhouding wordt behaald, rekening houdend met de risico's.", "Methode: K8; T2\nProcedure: 5.5", "Rapport: onderdeel 1 Kop (werk van korte duur ja/nee)\nDashboard: programma, blinde vlekken", "Procedure 5.5 met de regels voor de keuze van de werkplek; overzicht van bezochte projecten en producten"],
    ["Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een operationeel leidinggevende.", "Methode: K2\nProcedure: 5.7", "Rapport: onderdeel 1 Kop (inspecteur en verantwoordelijke coördinator)\nDashboard: –", "Procedure 5.7; rapport met beide namen in de kop, als het is toegepast"],
    ["Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen", "Methode: O2, R2, R3, B14\nProcedure: 5.7, 5.8", "Rapport: onderdeel 5; oordeel Conform in onderdelen 3 en 4\nDashboard: oordelen", "Elk WPI-rapport"],
    ["[...] geconstateerde afwijkingen", "Methode: R2, R3, B2\nProcedure: 5.8", "Rapport: onderdelen 3, 4 en 6\nDashboard: oordelen, classificatie", "Elk WPI-rapport"],
    ["[...] uit te voeren verbeteracties", "Methode: B7\nProcedure: 5.8, 5.9", "Rapport: onderdeel 6\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["[...] uitvoeringsverantwoordelijken", "Methode: B8\nProcedure: 5.8", "Rapport: onderdeel 6 (actiehouder)\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["[...] en de bepaling van de tijdsduur voor de uitvoering", "Methode: B4, B10\nProcedure: 5.8", "Rapport: onderdeel 6 (prioriteit en termijn)\nDashboard: acties", "Elk WPI-rapport, onderdeel 6"],
    ["Er is een actieplan met daarin: actiepunten, voortkomende uit de inspecties", "Methode: B1\nProcedure: 5.9", "Rapport: onderdelen 6 en 9\nDashboard: acties", "Actieoverzicht (elk kwartaal als pdf in het QMS)"],
    ["[...] de verantwoordelijken voor de uitvoering en toetsing", "Methode: B8, B9\nProcedure: 5.9", "Rapport: onderdeel 6 (actiehouder en toetser)\nDashboard: acties", "Actieoverzicht; afgeronde acties met de wijze van verificatie"],
    ["[...] tijdsplanning", "Methode: B10, B11, B12; T9\nProcedure: 5.8, 5.9", "Rapport: onderdeel 6 (termijn)\nDashboard: acties (termijn, status, datum afgerond, te laat)", "Actieoverzicht; verslagen coördinatorenoverleg"],
    ["De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een werklocatie.", "Methode: K3, K4; T1\nProcedure: 5.4, 5.5", "Rapport: onderdeel 1 Kop (soort inspectie, deelnemend directielid)\nDashboard: programma (directie per kwartaal)", "Vier rapporten per jaar met een directielid in de kop, één per kwartaal"],
    ["Procedure met betrekking tot de uitvoering van de werkplekinspecties en het inspectieprogramma", "Methode: hoofdstuk 5\nProcedure: geheel; programma in 5.5", "Rapport: –\nDashboard: programma", "Procedure Werkplekinspecties versie 2.0 en het inspectieprogramma in het QMS"],
    ["Verslagen van de uitgevoerde inspecties en de follow-up hiervan", "Methode: hoofdstuk 3\nProcedure: 5.8, 5.9, 5.12", "Rapport: het rapport zelf\nDashboard: acties", "WPI-rapporten en actieoverzicht in het QMS; verslagen coördinatorenoverleg"],
])
dek("VCA 7.2: Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)?",
    ["7.2, vraag", "7.2, doelstelling", "7.2a", "7.2b", "7.2, document 1", "7.2, document 2"], [
    ["Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)?", "Methode: hoofdstuk 4; T3, T12\nProcedure: 5.10", "Rapport: onderdeel 9 Gegevenstabel (bron)\nDashboard: oordelen, classificatie", "Trendanalyse WPI's [jaar], met positieve en negatieve bevindingen"],
    ["Het identificeren van basisoorzaken van structurele verbetermogelijkheden.", "Methode: R4, R5; T5, T6, T7, T11\nProcedure: 5.10", "Rapport: onderdelen 4 en 6 (maatregel, oorzaak)\nDashboard: TRA-maatregelen", "Trendanalyse: oorzaken en herhaalde bevindingen"],
    ["Bevindingen worden geclassificeerd.", "Methode: B3, R2\nProcedure: 5.10", "Rapport: classificatie bij elke regel in onderdelen 3, 4, 6 en 9\nDashboard: classificatie", "Elk rapport; de veertien klassen in procedure 5.10"],
    ["Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.", "Methode: hoofdstuk 4; T9, T11\nProcedure: 5.10", "Rapport: –\nDashboard: alle onderdelen; acties uit de trendanalyse onder acties", "Trendanalyse WPI's [jaar] met acties en de stand van de acties uit het vorige jaar; verslag directiebeoordeling"],
    ["Trendanalyse", "Procedure: 5.10, 5.12", "Dashboard: bron voor de analyse", "Trendanalyse WPI's [jaar] in het QMS"],
    ["Overzicht verbeteracties", "Procedure: 5.9, 5.12", "Dashboard: acties", "Actieoverzicht in het QMS"],
])
p("Wat de auditor bij de eerstvolgende audit nog niet kan zien: een trendanalyse over een heel jaar en de follow-up van "
  "acties uit een vorige trendanalyse. Bij invoering per 1 januari 2027 bestaat de eerste volledige jaaranalyse in "
  "januari 2028. Tot die tijd tonen we de procedure, het dashboard met de gegevens tot dan toe en een eerste analyse over "
  "de periode sinds de start.")

# ------------------------------------------------------------ 7
h1("7. Risico's en open punten")
tbl([
    ["Onderwerp", "Wat er mis kan gaan", "Wat we eraan doen", "Nog open"],
    ["Afhankelijk van AI", "Claude koppelt een waarneming aan de verkeerde TRA-regel, kiest een verkeerde classificatie of vat iets anders samen dan de inspecteur bedoelde", "De inspecteur bevestigt elke koppeling en de samenvatting. De waarneming staat in zijn eigen woorden in het rapport. Het rapport is een Word-bestand dat ook zonder Claude leesbaar blijft", "Hoe vaak het misgaat weten we niet. In de proef tellen we de correcties per rapport"],
    ["Afhankelijk van één leverancier", "De app, de prijs of de voorwaarden veranderen; de dienst valt uit", "Terugvalformulier en Word-sjabloon (5.11). Rapporten staan maandelijks in het QMS. De kennisbank bestaat uit gewone tekstbestanden", "Het Word-sjabloon en het terugvalformulier moeten nog gemaakt worden"],
    ["Eén gedeeld account", "Niet vast te stellen wie een rapport heeft gemaakt; iedere gebruiker kan alle chats en rapporten zien en wijzigen; een vertrekkende collega houdt toegang tot het wachtwoord wordt gewijzigd", "De inspecteur noemt zijn naam en bevestigt de samenvatting. De pdf in het QMS is de vaste versie. Wachtwoord wijzigen bij vertrek", "Zijn er persoonlijke accounts mogelijk binnen het Noardling-abonnement, en past één gedeeld account binnen het AI-beleid van Noardling? Dit navragen bij IT"],
    ["AVG: foto's", "Monteurs of medewerkers van de opdrachtgever staan herkenbaar op een foto; foto's van een locatie van de opdrachtgever worden bij een externe dienst verwerkt", "Regel: geen gezichten in beeld; Claude meldt een herkenbaar gezicht. Foto's worden alleen in het rapport bewaard", "Mogen we op elke locatie fotograferen? Sommige opdrachtgevers verbieden dat. Per opdrachtgever nagaan. Verwerkersvoorwaarden van het account laten toetsen"],
    ["AVG: namen", "Een afwijking is te herleiden tot een persoon, zeker bij een ploeg van twee", "Namen alleen in de kop; acties staan op functie. Het doel is leren, niet beoordelen van personen", "Monteurs vooraf informeren over de nieuwe werkwijze en wat er wordt vastgelegd. Nagaan of de OR hierover moet worden geïnformeerd"],
    ["De inspecteur spreekt weinig in", "Een rapport met vooral 'Geen afwijking waargenomen' zegt even weinig als de oude checklist", "Rapport en dashboard tonen per WPI hoeveel regels zijn waargenomen, alleen bevestigd en niet beoordeeld. Een dunne WPI is daardoor zichtbaar. Claude vult niets aan", "Willen we een ondergrens, bijvoorbeeld minstens drie beschreven waarnemingen per WPI? Voorstel: nu niet, eerst kijken wat de proef laat zien"],
    ["Spraak en foto's op de telefoon", "Spraakherkenning verstaat vaktermen, Fries of dialect en wind slecht; foto's uploaden lukt niet bij zwak bereik; bedienen met handschoenen of in de regen is lastig", "Terugvalformulier; achteraf invoeren binnen twee werkdagen", "Dit is niet getest. In de proef minstens één WPI buiten bij slecht weer en één op een locatie met zwak bereik"],
    ["Lengte van het gesprek", "Bij een lange WPI met veel foto's wordt de chat traag of raakt Claude het begin kwijt", "Eén chat per WPI; het rapport wordt aan het eind in één keer opgebouwd uit de bevestigde samenvatting", "Niet getest met een taak van meer dan vijftien risicoregels en meer dan tien foto's"],
    ["Kennisbank loopt achter op de TRA", "Een TRA wordt gewijzigd, de kennisbank niet. De inspecteur toetst dan op verouderde maatregelen", "Bijwerken binnen twee weken door de QHSE-Manager (5.12). Het rapport vermeldt de versie van de kennisbank. Regelnummers blijven vast", "Wie controleert dat het gebeurt? Voorstel: vast punt bij elke TRA-wijziging in de Methodiek TRA opnemen"],
    ["Kwaliteit van de TRA's", "De kennisbank is gebouwd op de samengevatte versies van de TRA's. Sommige regels hebben een algemene maatregel ('Standaard maatregel') waar weinig aan te toetsen valt", "Zulke regels komen in de proef naar boven en gaan als voorstel naar het TRA-beheer", "Lijst van regels zonder toetsbare maatregel maken en aanvullen"],
    ["Dashboard en actiestatus", "Het dashboard leest de gegevenstabellen uit de rapporten. De status van een actie wijzigt na de WPI en staat dus niet in het rapport", "De status wordt in het dashboard bijgehouden en elk kwartaal als pdf in het QMS gezet", "Wie werkt de status bij en hoe voorkomen we dat rapport en dashboard uit elkaar lopen? In de proef uitwerken"],
], [1400, 2500, 2664, 2500], first_bold=True)
p("De maatregelen in de derde kolom zijn voor een deel voorstellen; de besluiten erover staan in 8.1.")

# ------------------------------------------------------------ 8
h1("8. Voorstel voor de proef en te nemen besluiten")
h2("8.1 Te nemen besluiten")
p("Alles in deze tabel is een voorstel. Niets hiervan ligt vast; de kolom rechts zegt wie erover beslist. In de "
  "lopende tekst en in de concept-procedure zijn deze punten gemarkeerd als voorstel.")
tbl([
    ["Nr", "Besluit", "Voorstel", "Wie beslist"],
    ["1", "Proefdraaien met de nieuwe methode", "Ja, van maandag 16 november tot en met vrijdag 18 december 2026", "Hoofd S&M"],
    ["2", "Deelnemers en aantal", "Twee Montage Coördinatoren (elk drie WPI's) en één directielid (één WPI): zeven WPI's", "Hoofd S&M; directie over eigen deelname"],
    ["3", "Status van een proef-WPI", "Telt als de WPI van die maand; niet dubbel invoeren in AMS", "Hoofd S&M"],
    ["4", "Vast te leggen gegevens", "De set uit hoofdstuk 3 als startpunt, inclusief de velden met 'Nieuw'; na de proef schrappen wat niet werkt", "Hoofd S&M met de Montage Coördinatoren"],
    ["5", "Alleen bevindingen over eigen monteurs", "Ja; geen veld voor onderaannemers of derden (5.2)", "Hoofd S&M"],
    ["6", "Onderscheid Conform / Geen afwijking waargenomen", "Alleen een beschreven waarneming telt als positieve bevinding; het rapport toont waargenomen, alleen bevestigd en niet beoordeeld", "Hoofd S&M"],
    ["7", "Classificatie", "Veertien klassen (5.10)", "Hoofd S&M met de QHSE-Manager"],
    ["8", "Programma bij werk van korte duur", "Grens van een maand; voorrang op risico; spreiding over producten; elke ploeg minimaal één keer per jaar (5.5)", "Hoofd S&M"],
    ["9", "Aandeel onaangekondigd", "Minimaal een derde van de WPI's", "Hoofd S&M"],
    ["10", "Inspectie door een monteur", "Toegestaan onder verantwoordelijkheid van een coördinator; telt niet voor diens maandnorm", "Hoofd S&M"],
    ["11", "Toetser van acties", "Standaard de inspecteur zelf", "Hoofd S&M"],
    ["12", "Termijnen voor acties", "Planmatig: uiterlijk einde volgend kwartaal. Escalatie naar Hoofd S&M bij meer dan twee weken te laat", "Hoofd S&M"],
    ["13", "Terugvaloptie", "Terugvalformulier en Word-sjabloon maken vóór de start; achteraf invoeren binnen twee werkdagen", "Hoofd S&M"],
    ["14", "Opslag in het QMS", "Rapporten maandelijks, actieoverzicht per kwartaal, door het Hoofd S&M", "Hoofd S&M"],
    ["15", "Bewaartermijn", "Vijf jaar voor programma, rapporten, actieoverzicht en trendanalyse", "Hoofd S&M met de QHSE-Manager"],
    ["16", "Trendanalyse", "Jaarlijks in januari over het afgelopen jaar; daarnaast een kwartaaloverzicht", "Hoofd S&M; directie voor de directiebeoordeling"],
    ["17", "Kennisbank bijwerken na wijziging van een TRA", "Binnen twee weken, door de QHSE-Manager", "QHSE-Manager met Hoofd S&M"],
    ["18", "Gedeeld account, foto's en AVG", "Eerst navragen bij IT en laten toetsen (hoofdstuk 7); tot dan geen gezichten op foto's", "Directie"],
    ["19", "Evaluatie en besluit over AMS", "Evaluatie op maandag 21 december 2026 in het coördinatorenoverleg. Bij een positieve uitkomst vervalt AMS voor WPI's per 1 januari 2027 en wordt de procedure vastgesteld", "Hoofd S&M"],
], [500, 2300, 4164, 2100])

h2("8.2 Opzet van de proef (voorstel)")
tbl([
    ["Onderdeel", "Voorstel"],
    ["Periode", "Maandag 16 november tot en met vrijdag 18 december 2026"],
    ["Wie", "Twee Montage Coördinatoren (elk drie WPI's) en één directielid (één WPI, zelfstandig of met een coördinator). Het Hoofd Service & Montage is eigenaar van de proef. QHSE ondersteunt en verzamelt de uitkomsten"],
    ["Aantal", "Zeven WPI's, op minimaal vier verschillende producten. Minimaal één buiten bij slecht weer, één op een locatie met zwak bereik (terugvalformulier) en één bewust korte WPI van ongeveer tien minuten"],
    ["Vooraf", "Terugvalformulier en Word-sjabloon maken. Een kwartier uitleg per inspecteur, met één proefgesprek op kantoor. Monteurs informeren. Bij twee gewone WPI's in AMS de tijd opnemen als vergelijking"],
    ["WPI's in AMS tijdens de proef", "Een WPI in de proef telt als de WPI van die maand en wordt als rapport in het QMS opgeslagen. Lukt een proef-WPI niet, dan doet de inspecteur die maand een WPI in AMS"],
    ["Acties", "Acties uit de proef zijn echte acties en komen vanaf 23 november op de agenda van het coördinatorenoverleg"],
], [2200, 6864], first_bold=True)

h2("8.3 Waar we op letten")
p("De verwachting is dat de nieuwe methode de inspecteur niet meer moeite kost dan de checklist in AMS. Dat is niet "
  "aangetoond. De proef meet het met drie dingen: de duur van de inspectie, het aantal waargenomen regels en het "
  "oordeel van de inspecteur zelf.")
tbl([
    ["Vraag", "Hoe we het meten", "Voorstel: wanneer zijn we tevreden"],
    ["Kost het de inspecteur meer moeite?", "Duur van de inspectie (K5) naast de twee gemeten WPI's in AMS; tijd voor nalezen en herstellen van het rapport; oordeel van de inspecteur na elke WPI (S3) en in de evaluatie", "Niet langer op locatie dan nu; nalezen en herstellen binnen tien minuten; de inspecteurs vinden het niet zwaarder dan AMS"],
    ["Gaat het dieper?", "Aantal waargenomen regels per rapport, naast alleen bevestigd en niet beoordeeld (A1, A4); aantal positieve bevindingen en gekoppelde TRA-regels", "Elk rapport bevat minimaal één positieve bevinding en minimaal één waargenomen TRA-regel"],
    ["Klopt wat Claude vastlegt?", "Aantal correcties van de inspecteur per rapport: verkeerde regel, classificatie of samenvatting", "Geen rapport waarin een waarneming of oordeel staat dat de inspecteur niet heeft gegeven"],
    ["Werkt het op de telefoon?", "Opmerkingen bij S3; aantal keren terugvalformulier", "Spraak is buiten bruikbaar, of het terugvalformulier vangt het op"],
    ["Voldoet elk rapport aan VCA 7.1?", "Controle van de zeven rapporten op positieve bevindingen, afwijkingen, verbeteracties, uitvoeringsverantwoordelijken en tijdsduur", "Zeven van de zeven"],
    ["Zijn de velden bruikbaar?", "Welke velden bleven leeg of riepen vragen op", "Lijst van te schrappen of aan te passen velden"],
    ["Wat vinden de monteurs?", "Reactie in het gesprek (G2) en navraag door de coördinator", "Geen bezwaar tegen foto's en vastlegging"],
], [2300, 3664, 3100], first_bold=True)

h2("8.4 Na de proef (voorstel)")
bl("Maandag 21 december 2026, coördinatorenoverleg: evaluatie aan de hand van de zeven rapporten, het dashboard en de tabel in 8.3.")
bl("Daarna beslist het Hoofd Service & Montage. Bij een positieve uitkomst wordt de procedure uit hoofdstuk 5 vastgesteld, vervalt AMS voor WPI's per 1 januari 2027 en start het inspectieprogramma 2027 in het dashboard.")
bl("Bij twijfel verlengen we de proef met het eerste kwartaal van 2027 en blijft AMS zolang de terugvaloptie.")
bl("Als de rapporten goed zijn, leggen we er twee met de procedure voor aan de certificerende instelling, met de vraag of dit het oordeel over de WPI's en het ontbreken van de trendanalyse wegneemt.")

h1("Bijlagen")
p("Bijlage 1: voorbeeldrapport WPI-20261105-DAM-C2 (VOORBEELD — fictieve data), afzonderlijk bestand.", space_after=40)
p("Bijlage 2: WPI-dashboard, nog in aanbouw, met trendoverzichten op een fictieve dataset van 15 WPI's "
  "(VOORBEELD — fictieve data), afzonderlijk bestand.")

UIT = "/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx"
build(template="/home/claude/wpi/build/sjabloon.docx",
      title="Werkplek-\ninspecties",
      subtitle="Voorstel nieuwe methode",
      body_xml="\n".join(B),
      output=UIT, cover_size=72, work="/home/claude/wpi/build/_nb_build")
