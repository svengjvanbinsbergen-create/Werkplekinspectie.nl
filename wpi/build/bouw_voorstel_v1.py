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


def keuze(t, label="Keuze Noardling"):
    add(keuze_box(t, label=label))


# ------------------------------------------------------------ voorwerk
add(pagebreak())
add(documentbeheer(
    code="Voorstel nieuwe methode werkplekinspecties (met concept-procedure)",
    versie="0.1 concept, ter bespreking op 12-11-2026",
    datum="11-11-2026",
    opsteller="",
    goedgekeurd="Hoofd Service & Montage (procedure-eigenaar), na de proef",
    labels=("Document", "Versie", "Datum", "Opgesteld door", "Vast te stellen door")))
p("Bijlagen (afzonderlijk aangeleverd): voorbeeldrapport WPI-20261105-DAM-C2 en het WPI-dashboard. "
  "Beide draaien op fictieve data. Voorbeelden in dit document zijn gemarkeerd met 'VOORBEELD — fictieve data'.", italic=True, color=GRIJS)
add(_kn(para("Inhoud", bold=True, color=BLAUW, space_after=60)))
for regel in ["1. Aanleiding en wat er verandert", "2. Zo verloopt een WPI", "3. Wat we per WPI vastleggen",
              "4. Welke trenddata dit oplevert", "5. Procedure Werkplekinspecties (concept)",
              "6. Dekking van de VCA-eisen 7.1 en 7.2", "7. Risico's en open punten", "8. Voorstel voor de proef",
              "Bijlagen (afzonderlijk): voorbeeldrapport en WPI-dashboard"]:
    add(para(regel, space_after=20))
add(para("", space_after=60))

p("Leeswijzer", bold=True, color=BLAUW, space_after=60)
p("Wie weinig tijd heeft leest hoofdstuk 1 en hoofdstuk 8. Hoofdstuk 2 laat zien hoe een inspectie verloopt. "
  "Hoofdstuk 3 en 4 zijn het eigenlijke voorstel: wat we vastleggen en wat we daaruit halen. Hoofdstuk 5 is de "
  "herschreven procedure, hoofdstuk 6 de dekking van de VCA-eisen, hoofdstuk 7 wat nog onzeker is.")
vca("Een blauw kader bevat wat de VCA-checklist 2026/6.1 eist. De tekst is die van de checklist, niet onze uitleg ervan.",
    "Blauw kader: VCA-eis")
keuze("Een oranje kader bevat wat Noardling zelf kiest binnen de ruimte die de VCA laat. Hierover kunnen we morgen beslissen.",
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
p("De belasting voor de inspecteur is in het ontwerp niet hoger dan nu: hij hoeft geen lijst te kennen en niets te "
  "typen. Of dat in de praktijk ook zo uitpakt weten we pas na de proef. Dat is een van de dingen die we meten "
  "(hoofdstuk 8).")
keuze("1. Proefdraaien van 16 november tot en met 18 december 2026 met twee Montage Coördinatoren en één directielid, "
      "zeven WPI's in totaal.\n"
      "2. De set vast te leggen gegevens uit hoofdstuk 3 als startpunt nemen; schrappen of toevoegen kan morgen.\n"
      "3. Op maandag 21 december 2026 in het coördinatorenoverleg evalueren. Daarna beslist het Hoofd Service & Montage "
      "of AMS voor WPI's vervalt.", "Wat we morgen vragen")

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
    ["7. Afsluiten", "Beantwoordt de afsluitvraag en bevestigt de samenvatting", "Geeft regels zonder waarneming het oordeel 'Geen afwijking waargenomen' of 'Niet beoordeeld'"],
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
  "zelf hoeven opzoeken of typen.")

# ------------------------------------------------------------ 3
h1("3. Wat we per WPI vastleggen")
p("Dit is het volledige voorstel. Per veld staat waarom het erin zit, of het verplicht is, welke VCA-eis of trend het "
  "bedient (T-nummers verwijzen naar hoofdstuk 4) en wat het de inspecteur kost. Velden met 'Nieuw' staan niet in de "
  "eerste opzet van de skill; die stellen we hier voor. Er zijn bewust geen velden over onderaannemers of derden: de "
  "WPI gaat over onze eigen monteurs.")
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
    ["Oordeel", "Betekenis", "Telt als"],
    ["Conform", "De inspecteur heeft de maatregel gezien en beschreven wat hij zag", "Positieve bevinding"],
    ["Afwijking", "Een afgesproken maatregel wordt niet nageleefd of ontbreekt", "Negatieve bevinding, altijd met actie"],
    ["Verbeterpunt", "Het voldoet, maar het kan veiliger of beter", "Negatieve bevinding, met actie"],
    ["Niet van toepassing", "De regel speelt niet bij dit werk op deze locatie", "Telt niet mee"],
    ["Geen afwijking waargenomen", "Gezien, niets op aan te merken, niet afzonderlijk beschreven (antwoord op de afsluitvraag)", "Neutraal; telt niet als positieve bevinding"],
    ["Niet beoordeeld", "Niet gezien of niet aan toegekomen", "Telt niet mee; zichtbaar als blinde vlek"],
], [2200, 4664, 2200], first_bold=True)
keuze("Wij maken onderscheid tussen 'Conform' en 'Geen afwijking waargenomen'. De VCA vraagt om positieve bevindingen in "
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
     ["B3 Classificatie (twaalf klassen, zie 5.8)", "Maakt optellen over inspecties mogelijk", "Ja; Claude stelt voor", "7.2a; T3", "Bevestigen"],
     ["B4 Prioriteit\ndirect / kort (binnen 2 weken) / planmatig", "Bepaalt de termijn en de bespreking in het overleg", "Ja", "7.1d (tijdsduur); T9", "Eén woord"],
     ["B5 Direct gecorrigeerd\nja / nee, en wat er is gedaan", "Onderscheid tussen opgelost op locatie en nog te doen", "Ja", "7.1d; T10", "Eén zin"],
     ["B6 Werk stilgelegd (Nieuw)\nja / nee", "De zwaarste ingreep van een inspecteur hoort zichtbaar te zijn", "Bij prioriteit 'direct'", "T10", "Eén woord"],
     ["B7 Verbeteractie", "Wat er moet gebeuren", "Ja, tenzij direct gecorrigeerd en daarmee afgedaan", "7.1d, 7.1e", "Eén zin"],
     ["B8 Actiehouder (functie)", "Wie de actie uitvoert", "Ja", "7.1d, 7.1e; T9", "Eén functie"],
     ["B9 Toetser (Nieuw)", "Wie controleert dat de actie is uitgevoerd. De VCA vraagt dit uitdrukkelijk in het actieplan", "Ja; standaard de inspecteur", "7.1e", "Niets, of een andere functie noemen"],
     ["B10 Termijn (datum)", "Wanneer het klaar moet zijn", "Ja", "7.1d, 7.1e; T9", "Eén datum; Claude stelt voor op basis van de prioriteit"],
     ["B11 Status\nOpen / In uitvoering / Afgerond / Vervallen", "Follow-up", "Automatisch 'Open'; daarna in het dashboard", "7.1e; T9", "Niets tijdens de WPI"],
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
     ["A1 Dekkingsgraad", "Aandeel van de regels van de taak dat een oordeel op basis van waarneming kreeg", "Automatisch", "T13, T16", "Niets"],
     ["A2 Aantallen per oordeel", "Kopcijfers in de samenvatting", "Automatisch", "7.2; T3, T4", "Niets"],
     ["A3 Herhaalde bevinding", "Zelfde TRA-regel of classificatie eerder afwijkend bij hetzelfde product. Het dashboard rekent dit uit over alle rapporten", "Automatisch, in het dashboard", "T11", "Niets"],
     ], VW)

h2("3.9 Wat dit de inspecteur in totaal kost")
p("Tegenover de eerste opzet van de skill komen er voor de inspecteur elf korte antwoorden bij: K4 (alleen als een "
  "directielid meeloopt), K7, K8, K9, K12, R4, R5 en R7 (alleen bij een afwijking), B6 (alleen bij 'direct'), B9 "
  "(alleen als de toetser iemand anders is) en S3 (alleen in de proef). Bij een WPI zonder afwijkingen zijn dat vier "
  "woorden in de kop. De rest wordt afgeleid of pas in het dashboard ingevuld. Als de proef uitwijst dat een veld niet "
  "wordt gebruikt of de inspecteur ophoudt, schrappen we het.")

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
    ["T13 Diepgang van de inspecties", "A1, K5, K12, aantal foto's", "Hoeveel regels worden echt beoordeeld, hoe lang duurt een WPI, hoe vaak is de terugvaloptie gebruikt?", "Hoofd S&M, evaluatie van de proef"],
    ["T14 Per product, fase en soort werk", "P1, P2, K7, R2", "Bij welk product of in welke fase (bijvoorbeeld demontage) zitten de meeste afwijkingen?", "TRA-beheer, werkvoorbereiding"],
    ["T15 Aangekondigd en soort inspectie", "K3, K9, R2", "Zien we bij onaangekondigde inspecties of bij de directie iets anders dan bij de coördinator?", "Hoofd S&M, directie"],
    ["T16 Blinde vlekken", "R1, R2, S1", "Welke TRA-regels krijgen nooit een oordeel op basis van waarneming?", "Hoofd S&M bij het plannen, TRA-beheer"],
    ["T17 Inbreng van de monteurs", "G2, G3, G4", "Welke ideeën komen van de werkvloer en wat is ermee gedaan?", "Coördinatorenoverleg, toolbox"],
    ["T18 Voorbereiding op orde", "V1–V4", "Hoe vaak ontbreekt het VGM-projectplan, de TRA, de werkvergunning of de LMRA?", "Hoofd S&M, werkvoorbereiding, auditor"],
], TW, first_bold=True)
p("T1, T3, T9 en T12 zijn nodig om aan 7.1 en 7.2 te voldoen. De andere zijn onze eigen keuze. T5, T8, T14 en T16 "
  "bestaan alleen doordat de WPI aan de TRA hangt; een losse checklist kan ze niet leveren.")
p("Een waarschuwing bij het lezen van de cijfers: bij twee coördinatoren en één directielid komen er ongeveer 28 WPI's "
  "per jaar. Per product of per TRA-regel zijn dat kleine aantallen. Een verschil van twee of drie bevindingen is dan "
  "geen trend. De jaarlijkse trendanalyse benoemt daarom aantallen en geen percentages waar het om minder dan tien "
  "waarnemingen gaat.")

# ------------------------------------------------------------ 5
add(pagebreak())
h1("5. Procedure Werkplekinspecties (concept, vervangt de huidige procedure)")
p("Dit hoofdstuk is de volledige nieuwe procedure. Na de proef wordt het als afzonderlijk document in het QMS gezet; "
  "de tabellen uit hoofdstuk 3 worden dan bijlage A (vast te leggen gegevens). Ten opzichte van de huidige procedure "
  "is AMS verdwenen en is de verwijzing bij de directie-inspectie gecorrigeerd: die eis staat in VCA 7.1, niet in 7.2.",
  italic=True, color=BLAUW)

h2("5.1 Doel")
p("Met werkplekinspecties stellen we op de werkplek vast of het werk wordt uitgevoerd volgens de afgesproken "
  "beheersmaatregelen, leggen we vast wat goed gaat en wat niet, en zorgen we dat afwijkingen worden opgelost. De "
  "uitkomsten gebruiken we om de TRA's, de voorbereiding en de instructie te verbeteren.")
vca("Vindt er op periodieke basis een werkplekinspectie plaats door operationeel leidinggevenden? Minimumeisen:\n"
    "a. Er is een procedure die beschrijft: de uitvoering van de inspecties, de positieve bevindingen, de opvolging van "
    "verbeterpunten en het gebruik van de checklist.\n"
    "b. Inspecties worden minstens eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden. Voetnoot: bij werk van korte duur geldt een programma waarmee de frequentie naar verhouding wordt "
    "gehaald, rekening houdend met de risico's.\n"
    "c. De inspecties mogen ook worden uitgevoerd door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.\n"
    "d. Er zijn inspectieverslagen met: positieve bevindingen, geconstateerde afwijkingen, uit te voeren verbeteracties, "
    "uitvoeringsverantwoordelijken en tijdsduur voor uitvoering.\n"
    "e. Er is een actieplan met: actiepunten uit de inspecties, verantwoordelijken voor uitvoering en toetsing, en "
    "tijdsplanning.\n"
    "f. (Operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "Documenten: procedure en inspectieprogramma; verslagen van inspecties en de follow-up.",
    "VCA 2026/6.1, vraag 7.1")
vca("Wordt er een trendanalyse gemaakt van de bij inspecties geconstateerde bevindingen (positieve en negatieve)? "
    "Minimumeisen:\n"
    "a. De bevindingen worden geclassificeerd.\n"
    "b. Er wordt jaarlijks een trendanalyse uitgevoerd, inclusief te ondernemen acties en follow-up.\n"
    "Documenten: trendanalyse; overzicht verbeteracties.",
    "VCA 2026/6.1, vraag 7.2")

h2("5.2 Toepassingsgebied")
p("Deze procedure geldt voor alle werkzaamheden die monteurs van Service & Montage van Noardling B.V. uitvoeren op "
  "locaties van opdrachtgevers: montage, onderhoud, revisie en storingswerk. De inspectie richt zich op het werk van "
  "onze eigen monteurs. Bevindingen over de locatie van de opdrachtgever die ons werk raken (bijvoorbeeld een werkplek "
  "die niet gereinigd is) worden vastgelegd als bevinding over onze eigen voorbereiding.")
p("Buiten deze procedure vallen de Fabriek en de beoordeling van onderaannemers.")

h2("5.3 Definities")
tbl([
    ["Begrip", "Betekenis in deze procedure"],
    ["Werkplekinspectie (WPI)", "Inspectie op de plek waar het werk wordt uitgevoerd, bestaande uit een algemene observatie en een toetsing van het lopende werk aan de maatregelen uit de TRA"],
    ["Operationele werkplek", "Een projectlocatie van een opdrachtgever waar monteurs van Service & Montage aan het werk zijn"],
    ["Werk van korte duur", "Werk dat korter dan een maand op dezelfde locatie duurt"],
    ["Operationeel leidinggevende", "De Montage Coördinator"],
    ["Inspecteur", "Degene die de WPI uitvoert: een Montage Coördinator, een directielid of, onder verantwoordelijkheid van een Montage Coördinator, een ervaren monteur"],
    ["VGM-inspectie directie", "WPI waaraan een directielid deelneemt of die een directielid zelf uitvoert (VCA 7.1f)"],
    ["Kennisbank", "De 21 product-TRA's in de vorm waarin de skill ze gebruikt: per product de fasen, taken, risicoregels en maatregelen. Elke risicoregel heeft een vast nummer (productcode, fase, volgnummer)"],
    ["Checklist", "De negen algemene onderwerpen (A t/m I) plus de risicoregels uit de kennisbank die horen bij de taak die wordt uitgevoerd"],
    ["Positieve bevinding", "Een maatregel of werkwijze die de inspecteur in orde heeft gezien en heeft beschreven (oordeel Conform), of een opmerking onder 'wat ging opvallend goed'"],
    ["Afwijking", "Een afgesproken maatregel wordt niet nageleefd of ontbreekt"],
    ["Verbeterpunt", "De situatie voldoet, maar kan veiliger of beter"],
    ["Buiten TRA", "Een waarneming van een risico dat in de TRA van het product niet voorkomt"],
    ["Actieoverzicht", "Het overzicht van alle acties uit WPI's met actiehouder, toetser, termijn en status, bijgehouden in het WPI-dashboard. Dit is het actieplan in de zin van VCA 7.1e"],
    ["Toetser", "Degene die vaststelt dat een actie is uitgevoerd en werkt"],
], [2400, 6664], first_bold=True)

h2("5.4 Verantwoordelijkheden")
tbl([
    ["Functie", "Verantwoordelijkheid"],
    ["Hoofd Service & Montage", "Eigenaar van deze procedure en eindverantwoordelijk. Stelt het inspectieprogramma op en bewaakt de uitvoering. Zit de bespreking van de acties in het coördinatorenoverleg voor. Slaat maandelijks de rapporten op in het QMS. Stelt jaarlijks de trendanalyse op en brengt die in bij de directiebeoordeling. Beslist over escalatie van acties die te laat zijn"],
    ["Montage Coördinator", "Voert elke maand minstens één WPI uit. Bespreekt de bevindingen met de monteurs. Is toetser van de acties uit zijn eigen WPI's, tenzij anders vastgelegd. Draagt de verantwoordelijkheid voor WPI's die een monteur onder zijn naam uitvoert"],
    ["Directielid", "Neemt elk kwartaal minstens één keer deel aan een WPI op een werklocatie, zelfstandig of samen met een Montage Coördinator"],
    ["Monteur", "Werkt mee aan de inspectie, geeft zijn reactie en ideeën. Voert acties uit die aan hem zijn toegewezen. Kan onder verantwoordelijkheid van een Montage Coördinator zelf een WPI uitvoeren"],
    ["QHSE-Manager", "Ondersteunt bij de methode en de trendanalyse. Verwerkt voorstellen tot wijziging van een TRA en werkt daarna de kennisbank bij. Is niet verantwoordelijk voor de uitvoering van de inspecties"],
], [2400, 6664], first_bold=True)

h2("5.5 Werkwijze")
vca("7.1a: een procedure die beschrijft: de uitvoering van de inspecties, de positieve bevindingen, de opvolging van "
    "verbeterpunten en het gebruik van de checklist.", "VCA 7.1a")
lab("Voorbereiding")
p("De inspecteur kiest een werkplek volgens het inspectieprogramma (5.10). Hij hoeft de inspectie niet aan te kondigen. "
  "Hij neemt zijn telefoon mee met de Claude-app, aangemeld op het Noardling-account.")
lab("Uitvoering")
p("De inspecteur opent de WPI-projectmap en start de inspectie. De skill wpi-begeleider leidt hem door de volgende "
  "onderdelen. De volgorde is vrij; alle onderdelen moeten aan het eind een waarde hebben.")
tbl([
    ["Onderdeel", "Inhoud", "Vastlegging (bijlage A)"],
    ["1. Kop", "Inspecteur en functie, soort inspectie, deelnemend directielid, datum en tijd, opdrachtgever, locatie, projectnummer, soort werk, werk van korte duur, aangekondigd of niet, aanwezige monteurs, omstandigheden", "K1–K12"],
    ["2. Product en taak", "De inspecteur noemt het product en de taak waar de monteurs mee bezig zijn. Daarmee ligt vast welke risicoregels uit de kennisbank worden getoetst. Het WPI-nummer wordt toegekend", "P1–P3"],
    ["3. Algemene observatie", "De negen onderwerpen A t/m I. Onder A worden vier vaste vragen gesteld: VGM-projectplan, TRA, werkvergunning, LMRA", "V1–V4, O1, O2"],
    ["4. Taakgerichte toetsing", "Per risicoregel van de taak noemt Claude de maatregelen uit de TRA. De inspecteur beschrijft wat hij ziet en geeft een oordeel. Bij een afwijking legt hij vast welke maatregel ontbreekt en wat de oorzaak is. Waarnemingen die bij geen regel passen krijgen de aanduiding Buiten TRA", "R1–R7"],
    ["5. Foto's", "Elke foto krijgt een nummer, een toelichting van de inspecteur en een koppeling aan een onderwerp of risicoregel. Geen herkenbare personen in beeld, tenzij dat voor de bevinding nodig is", "F1–F4"],
    ["6. Gesprek met de monteurs", "De inspecteur bespreekt de bevindingen, ook de positieve, met de monteurs op de werkplek en legt hun reactie en ideeën vast", "G1–G4"],
    ["7. Bevindingen en acties", "Elke afwijking en elk verbeterpunt krijgt een classificatie, prioriteit, verbeteractie, actiehouder, toetser en termijn. De inspecteur noemt minstens één ding dat opvallend goed ging, of zegt uitdrukkelijk dat er niets opviel", "B1–B15"],
    ["8. Afsluiten", "Claude stelt de afsluitvraag voor alle regels zonder waarneming. De inspecteur bevestigt de samenvatting", "S1, S2, A1–A3"],
], [1700, 6064, 1300], first_bold=True)
p("Bij gevaar dat direct ingrijpen vraagt legt de inspecteur het werk stil en lost hij het op voordat hij verdergaat "
  "met de inspectie. Dat wordt vastgelegd als prioriteit 'direct' met 'werk stilgelegd: ja'.")
lab("Regels voor de vastlegging")
bl("Waarneming en oordeel komen van de inspecteur. Claude vult geen waarneming of oordeel in dat de inspecteur niet heeft uitgesproken.")
bl("'Conform' wordt alleen gegeven als de inspecteur heeft beschreven wat hij zag. Dat is de positieve bevinding.")
bl("Regels waarover de inspecteur niets zegt, krijgen na de afsluitvraag 'Geen afwijking waargenomen' (gezien) of 'Niet beoordeeld' (niet gezien).")
bl("Namen van monteurs staan alleen in de kop van het rapport, niet bij een bevinding.")
bl("Een korte WPI is geldig. Het rapport vermeldt hoeveel regels van de taak op basis van waarneming zijn beoordeeld.")
lab("Het rapport")
p("Na de bevestiging maakt Claude het inspectieverslag als Word-document met een vaste indeling: 1 Kop, 2 Samenvatting, "
  "3 Algemene observatie, 4 Taakgerichte toetsing (alle regels van de taak), 5 Positieve bevindingen, 6 Bevindingen en "
  "acties, 7 Gesprek met de monteurs, 8 Foto's met toelichting, 9 Gegevenstabel. De inspecteur leest het rapport na en "
  "laat fouten in dezelfde chat herstellen.")
vca("7.1d: inspectieverslagen met positieve bevindingen, geconstateerde afwijkingen, uit te voeren verbeteracties, "
    "uitvoeringsverantwoordelijken en tijdsduur voor uitvoering.", "VCA 7.1d")
keuze("De koppeling aan de product-TRA, de negen algemene onderwerpen, het gesprek met de monteurs als vast onderdeel, "
      "de foto's en het gebruik van Claude zijn onze eigen invulling. De VCA schrijft geen vorm of hulpmiddel voor.")

h2("5.6 Inspectie door een monteur")
vca("7.1c: de inspecties mogen ook worden uitgevoerd door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.", "VCA 7.1c")
keuze("Een ervaren monteur mag een WPI uitvoeren op een werkplek waar hij zelf niet aan het werk is. De Montage "
      "Coördinator onder wiens verantwoordelijkheid dat gebeurt staat in de kop, leest het rapport na en is toetser van "
      "de acties. Zo'n WPI telt mee in de spreiding over werkplekken, maar niet voor de maandelijkse norm van de "
      "coördinator zelf.")

h2("5.7 Als Claude op locatie niet beschikbaar is")
p("Geen bereik, een lege telefoon of een storing mag geen reden zijn om een WPI over te slaan.")
tbl([
    ["Situatie", "Werkwijze"],
    ["Geen bereik of storing tijdens één inspectie", "De inspecteur gebruikt het terugvalformulier WPI (één A4, op papier in de bus en als pdf op de telefoon) met dezelfde onderdelen: kop, negen onderwerpen, ruimte voor waarnemingen bij het werk, acties met actiehouder en termijn. Foto's maakt hij met de camera van de telefoon. Binnen twee werkdagen voert hij de inspectie zelf in via de skill, die dan de risicoregels van de taak naloopt. Het rapport vermeldt 'achteraf ingevoerd' en de datum van de inspectie"],
    ["Claude langer dan twee weken niet bruikbaar", "De inspecteur maakt het rapport met het Word-sjabloon WPI-rapport uit het QMS, dat dezelfde indeling heeft. De risicoregels van de taak haalt hij uit de kennisbank, die als pdf per product in het QMS staat. Het Hoofd Service & Montage houdt het actieoverzicht in die periode bij in het coördinatorenoverleg"],
], [2600, 6464], first_bold=True)
p("Het terugvalformulier, het Word-sjabloon en de pdf's van de kennisbank worden vóór de start van de proef gemaakt.",
  italic=True, color=BLAUW)

h2("5.8 Opvolging van acties")
vca("7.1e: een actieplan met actiepunten uit de inspecties, verantwoordelijken voor uitvoering en toetsing, en "
    "tijdsplanning.", "VCA 7.1e")
p("Elke afwijking en elk verbeterpunt leidt tot een actie met een nummer (WPI-nummer plus volgnummer). Alle acties staan "
  "in het actieoverzicht in het WPI-dashboard, met actiehouder, toetser, termijn en status.")
tbl([
    ["Prioriteit", "Betekenis", "Termijn"],
    ["Direct", "Gevaar dat niet kan wachten. Wordt ter plekke opgelost, zo nodig wordt het werk stilgelegd", "Tijdens de inspectie"],
    ["Kort", "Moet snel worden opgelost, maar het werk kan veilig doorgaan", "Binnen twee weken"],
    ["Planmatig", "Vraagt een aanpassing in voorbereiding, middelen, instructie of TRA", "Datum in overleg, uiterlijk het einde van het volgende kwartaal"],
], [1700, 4864, 2500], first_bold=True)
bl("Het actieoverzicht is een vast agendapunt van het coördinatorenoverleg op maandag. Nieuwe acties, acties die te laat zijn en acties die ter toetsing klaarstaan worden besproken. De bespreking staat in het verslag van het overleg.")
bl("De actiehouder meldt de actie gereed. De toetser stelt vast dat de actie is uitgevoerd en legt vast hoe hij dat heeft gezien: een foto, een document of een waarneming bij een volgende WPI. Pas dan krijgt de actie de status Afgerond met datum.")
bl("Een actie die vervalt krijgt de status Vervallen met de reden.")
bl("Is een actie meer dan twee weken te laat, dan beslist het Hoofd Service & Montage over een nieuwe termijn of een andere actiehouder. Dat wordt bij de actie vastgelegd.")
bl("Een voorstel om een TRA aan te passen gaat als actie naar de QHSE-Manager. Na wijziging van de TRA wordt de kennisbank bijgewerkt (5.11).")

h2("5.9 Classificatie en trendanalyse")
vca("7.2a: de bevindingen worden geclassificeerd.\n7.2b: er wordt jaarlijks een trendanalyse uitgevoerd, inclusief te "
    "ondernemen acties en follow-up.", "VCA 7.2")
p("Elke beoordeelde regel, positief en negatief, krijgt een van de volgende twaalf klassen. Risicoregels uit de TRA "
  "hebben hun klasse al in de kennisbank; bij andere bevindingen stelt Claude een klasse voor en bevestigt de inspecteur.")
tbl([
    ["Classificatie", "Classificatie", "Classificatie"],
    ["PBM", "Arbeidsmiddelen en keuring", "Gedrag en werkwijze"],
    ["Veiligstellen-LOTOTO", "Orde en netheid", "Omgeving en afzetting"],
    ["Hijsen", "Gevaarlijke stoffen en hygiëne", "Milieu"],
    ["Werken op hoogte of bij water", "Documenten en voorbereiding", "TRA onvolledig"],
], [3021, 3021, 3022], zebra=False)
tbl([
    ["Wanneer", "Wat", "Wie", "Vastlegging"],
    ["Wekelijks", "Actieoverzicht bespreken", "Coördinatorenoverleg", "Verslag coördinatorenoverleg"],
    ["Per kwartaal", "Dashboard bekijken: uitvoering van het programma, bevindingen per classificatie, open acties, positieve bevindingen. Onderwerpen kiezen voor toolbox en instructie", "Hoofd S&M met de Montage Coördinatoren", "Verslag coördinatorenoverleg"],
    ["Jaarlijks, in januari", "Trendanalyse over het afgelopen kalenderjaar: positieve en negatieve bevindingen per classificatie en per kwartaal, meest afwijkende TRA-regels, oorzaken, herhaalde bevindingen, opvolging van acties, en de stand van de acties uit de vorige trendanalyse. Sluit af met de te ondernemen acties, elk met actiehouder en termijn", "Hoofd S&M, ondersteund door de QHSE-Manager", "Document 'Trendanalyse WPI [jaar]' in het QMS; acties in het actieoverzicht"],
    ["Jaarlijks", "Trendanalyse bespreken en acties vaststellen", "Directie", "Verslag directiebeoordeling"],
], [1400, 3964, 1800, 1900], first_bold=True)
keuze("De twaalf klassen, het kwartaaloverzicht en de koppeling aan de directiebeoordeling zijn onze keuze. De VCA vraagt "
      "een classificatie en een jaarlijkse analyse met acties en follow-up, maar schrijft de indeling niet voor.")

h2("5.10 Inspectieprogramma")
vca("7.1b: inspecties minstens eenmaal per maand per operationele werkplek door operationeel leidinggevenden. Voetnoot: "
    "bij werk van korte duur een programma waarmee de frequentie naar verhouding wordt gehaald, rekening houdend met "
    "de risico's.\n7.1f: (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie "
    "op een werklocatie.", "VCA 7.1b en 7.1f")
p("Het werk van Service & Montage duurt op de meeste locaties enkele dagen tot enkele weken. Een inspectie per maand per "
  "werkplek is daar niet uitvoerbaar; de voetnoot bij 7.1b is op ons werk van toepassing. Het programma is daarom als "
  "volgt.")
tbl([
    ["Wie", "Frequentie", "Keuze van de werkplek"],
    ["Elke Montage Coördinator", "Minstens één WPI per kalendermaand", "Zie de regels hieronder"],
    ["Elk project dat langer dan een maand op dezelfde locatie loopt", "Minstens één WPI per maand op die werkplek", "Door de coördinator van het project; telt mee voor zijn maandnorm"],
    ["Directie", "Minstens één deelname per kwartaal, vier per jaar", "Bij voorkeur een project met hijswerk, een besloten ruimte of werk bij open water"],
], [2800, 2800, 3464], first_bold=True)
p("Regels voor de keuze bij werk van korte duur:", space_after=40)
bl("Projecten met hijswerk, een besloten ruimte, werken op hoogte of bij open water, of werk aan een installatie die door de opdrachtgever is veiliggesteld gaan voor.")
bl("In een kalenderjaar worden zo veel mogelijk verschillende producten en fasen geïnspecteerd. Het dashboard laat zien welke producten en welke TRA-regels nog niet zijn gezien; de coördinator gebruikt dat bij zijn keuze.")
bl("Elke monteursploeg wordt minstens één keer per jaar geïnspecteerd.")
bl("Minstens een derde van de WPI's is onaangekondigd.")
p("Het Hoofd Service & Montage legt het programma aan het begin van het jaar vast in het WPI-dashboard: per maand en per "
  "inspecteur het geplande aantal. Het dashboard zet daar de uitgevoerde WPI's tegenover. Een gemiste maand wordt in het "
  "eerstvolgende coördinatorenoverleg besproken en in de maand erna ingehaald. Het programma wordt bijgesteld als het "
  "aantal coördinatoren of het soort werk verandert.")
keuze("De ondergrens van één WPI per coördinator per maand, de voorrangsregels op risico, de eis van spreiding over "
      "producten en ploegen en het aandeel onaangekondigde inspecties zijn onze invulling van 'een programma waarmee de "
      "frequentie naar verhouding wordt gehaald'.")

h2("5.11 Registraties en bewaartermijnen")
tbl([
    ["Registratie", "Waar", "Wie", "Bewaartermijn"],
    ["Inspectieprogramma (gepland en uitgevoerd)", "WPI-dashboard; jaarlijks als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["WPI-rapport (Word en pdf)", "WPI-projectmap in Claude; maandelijks opgeslagen in het QMS, uiterlijk vóór het eerste coördinatorenoverleg van de volgende maand", "Inspecteur maakt; Hoofd S&M slaat op", "5 jaar"],
    ["Foto's", "In het WPI-rapport", "Inspecteur", "Gelijk aan het rapport; niet afzonderlijk bewaard"],
    ["Actieoverzicht", "WPI-dashboard; elk kwartaal als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["Bespreking van acties", "Verslag coördinatorenoverleg in het QMS", "Voorzitter van het overleg", "Volgens het QMS"],
    ["Jaarlijkse trendanalyse", "QMS", "Hoofd S&M", "5 jaar"],
    ["Kennisbank (TRA's per product, met versiedatum)", "WPI-projectmap in Claude; pdf per product in het QMS", "QHSE-Manager", "Actuele versie plus de vorige"],
    ["Ingevulde terugvalformulieren", "Als bijlage bij het rapport in het QMS", "Inspecteur", "Gelijk aan het rapport"],
], [2300, 3164, 1900, 1700], first_bold=True)
p("Het QMS is de plaats waar de registraties voor de audit staan. De Claude-omgeving is het gereedschap waarmee ze worden "
  "gemaakt. Wijzigt een TRA, dan werkt de QHSE-Manager binnen twee weken het bijbehorende bestand in de kennisbank bij en "
  "past hij de versiedatum aan. De nummers van bestaande risicoregels blijven gelijk; een nieuwe regel krijgt een nieuw "
  "nummer, een vervallen nummer wordt niet opnieuw gebruikt.")
keuze("De bewaartermijn van vijf jaar is onze keuze: langer dan één certificatieperiode van drie jaar, zodat een auditor "
      "de vorige periode kan inzien. De VCA noemt geen termijn.")

h2("5.12 Gerelateerde documenten")
p("Methodiek TRA; de 21 product-TRA's; Procedure VGM-projectplan; LMRA-procedure; Verslagformulier coördinatorenoverleg; "
  "Procedure Ongevallenanalyse (voor incidenten die tijdens een WPI aan het licht komen). Alle documenten staan in het QMS.")

# ------------------------------------------------------------ 6
h1("6. Dekking van de VCA-eisen 7.1 en 7.2")
p("Per minimumeis staat waar hij is ingevuld en wat de auditor te zien krijgt. De rapportonderdelen verwijzen naar de "
  "indeling van het WPI-rapport (bijlage 1); de dashboardonderdelen naar bijlage 2.")
DW = [2200, 1100, 950, 1450, 1500, 1864]
tbl([
    ["Minimumeis VCA 2026/6.1", "Methode (dit voorstel)", "Procedure", "WPI-rapport", "Dashboard", "Bewijsstuk voor de auditor"],
    ["7.1a (1) procedure beschrijft de uitvoering van de inspecties", "H2", "5.5, 5.6, 5.7", "Vaste indeling 1–9", "–", "Procedure Werkplekinspecties; een rapport dat de beschreven indeling volgt"],
    ["7.1a (2) procedure beschrijft de positieve bevindingen", "3.4 (oordeel Conform), B14", "5.3, 5.5", "Onderdeel 5 Positieve bevindingen", "Positieve bevindingen per classificatie", "Procedure 5.3 en 5.5; onderdeel 5 van elk rapport"],
    ["7.1a (3) procedure beschrijft de opvolging van verbeterpunten", "3.7", "5.8", "Onderdeel 6", "Actieoverzicht", "Procedure 5.8; actieoverzicht; verslagen coördinatorenoverleg"],
    ["7.1a (4) procedure beschrijft het gebruik van de checklist", "2.1, 3.3, 3.4", "5.3 (definitie), 5.5", "Onderdelen 3 en 4", "–", "Procedure 5.5; kennisbank per product; rapportonderdelen 3 en 4 met alle regels van de taak"],
    ["7.1b minstens eenmaal per maand per operationele werkplek door operationeel leidinggevenden", "K2, K3, K5, K6", "5.4, 5.10", "Onderdeel 1 Kop", "Programma: gepland en uitgevoerd per maand per inspecteur", "Inspectieprogramma; rapporten per maand per coördinator"],
    ["7.1b voetnoot: bij werk van korte duur een programma naar verhouding, rekening houdend met risico's", "K8, T2", "5.10", "Kop: werk van korte duur ja/nee", "Spreiding over projecten, producten en TRA-regels", "Procedure 5.10 met voorrangsregels; overzicht van bezochte projecten en producten"],
    ["7.1c mag door operationele medewerkers onder verantwoordelijkheid van een operationeel leidinggevende", "K2", "5.6", "Kop: inspecteur en verantwoordelijke coördinator", "–", "Procedure 5.6; rapport met beide namen in de kop (als het is toegepast)"],
    ["7.1d verslag met positieve bevindingen", "O2, R2, R3, B14", "5.5", "Onderdeel 5; oordeel Conform in 3 en 4", "Aantal positieve bevindingen", "Elk WPI-rapport"],
    ["7.1d verslag met geconstateerde afwijkingen", "R2, R3, B2", "5.5", "Onderdelen 3, 4 en 6", "Bevindingen per classificatie", "Elk WPI-rapport"],
    ["7.1d verslag met uit te voeren verbeteracties", "B7", "5.5, 5.8", "Onderdeel 6", "Actieoverzicht", "Elk WPI-rapport, onderdeel 6"],
    ["7.1d verslag met uitvoeringsverantwoordelijken", "B8", "5.8", "Onderdeel 6: actiehouder", "Acties per actiehouder", "Elk WPI-rapport, onderdeel 6"],
    ["7.1d verslag met tijdsduur voor uitvoering", "B4, B10", "5.8", "Onderdeel 6: prioriteit en termijn", "Termijn en doorlooptijd", "Elk WPI-rapport, onderdeel 6"],
    ["7.1e actieplan met actiepunten uit de inspecties", "B1", "5.8", "Onderdeel 6 en 9", "Actieoverzicht", "Actieoverzicht (kwartaal-pdf in het QMS)"],
    ["7.1e actieplan met verantwoordelijken voor uitvoering en toetsing", "B8, B9", "5.8", "Onderdeel 6: actiehouder en toetser", "Kolommen actiehouder en toetser", "Actieoverzicht; afgeronde acties met wijze van toetsing"],
    ["7.1e actieplan met tijdsplanning", "B10, B11, B12", "5.8", "Onderdeel 6: termijn", "Termijn, status, datum afgerond, te laat", "Actieoverzicht; verslagen coördinatorenoverleg"],
    ["7.1f directieleden nemen minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie", "K3, K4", "5.4, 5.10", "Kop: soort inspectie, deelnemend directielid", "Programma: directie per kwartaal", "Vier rapporten per jaar met een directielid in de kop"],
    ["7.1 documenten: procedure en inspectieprogramma; verslagen en follow-up", "H5", "5.10, 5.11", "Het rapport zelf", "Programma en actieoverzicht", "QMS: procedure, programma, rapporten, actieoverzicht"],
    ["7.2 trendanalyse van positieve en negatieve bevindingen", "H4", "5.9", "Onderdeel 9 Gegevenstabel", "Positief en negatief per classificatie en per kwartaal", "Trendanalyse WPI [jaar]"],
    ["7.2a bevindingen worden geclassificeerd", "B3, R2", "5.9", "Classificatie bij elke regel in 3, 4, 6 en 9", "Indeling in twaalf klassen", "Elk rapport; lijst van klassen in procedure 5.9"],
    ["7.2b jaarlijkse trendanalyse, inclusief te ondernemen acties en follow-up", "H4, T11", "5.9", "–", "Jaaroverzicht; acties uit de trendanalyse in het actieoverzicht", "Trendanalyse WPI [jaar] met acties; stand van de acties uit het vorige jaar; verslag directiebeoordeling"],
    ["7.2 documenten: trendanalyse; overzicht verbeteracties", "H4", "5.9, 5.11", "–", "Actieoverzicht", "QMS: trendanalyse en actieoverzicht"],
], DW, size=14)
p("Wat de auditor bij de eerstvolgende audit nog niet kan zien: een trendanalyse over een heel jaar en acties uit een "
  "vorige trendanalyse. Die bestaan pas in januari 2028 over 2027. Tot die tijd tonen we de procedure, het dashboard met "
  "de gegevens tot dan toe en een eerste analyse over de periode sinds de start.")

# ------------------------------------------------------------ 7
h1("7. Risico's en open punten")
tbl([
    ["Onderwerp", "Wat er mis kan gaan", "Wat we eraan doen", "Nog open"],
    ["Afhankelijk van AI", "Claude koppelt een waarneming aan de verkeerde TRA-regel, kiest een verkeerde classificatie of vat iets anders samen dan de inspecteur bedoelde", "De inspecteur bevestigt elke koppeling en de samenvatting. De waarneming staat in zijn eigen woorden in het rapport. Het rapport is een Word-bestand dat ook zonder Claude leesbaar blijft", "Hoe vaak het misgaat weten we niet. In de proef tellen we de correcties per rapport"],
    ["Afhankelijk van één leverancier", "De app, de prijs of de voorwaarden veranderen; de dienst valt uit", "Terugvalformulier en Word-sjabloon (5.7). Rapporten staan maandelijks in het QMS. De kennisbank bestaat uit gewone tekstbestanden", "Het Word-sjabloon en het terugvalformulier moeten nog gemaakt worden"],
    ["Eén gedeeld account", "Niet vast te stellen wie een rapport heeft gemaakt; iedere gebruiker kan alle chats en rapporten zien en wijzigen; een vertrekkende collega houdt toegang tot het wachtwoord wordt gewijzigd", "De inspecteur noemt zijn naam en bevestigt de samenvatting. De pdf in het QMS is de vaste versie. Wachtwoord wijzigen bij vertrek", "Zijn er persoonlijke accounts mogelijk binnen het Noardling-abonnement, en past één gedeeld account binnen het AI-beleid van Noardling? Dit navragen bij IT"],
    ["AVG: foto's", "Monteurs of medewerkers van de opdrachtgever staan herkenbaar op een foto; foto's van een locatie van de opdrachtgever worden bij een externe dienst verwerkt", "Regel: geen gezichten in beeld; Claude meldt een herkenbaar gezicht. Foto's worden alleen in het rapport bewaard", "Mogen we op elke locatie fotograferen? Sommige opdrachtgevers verbieden dat. Per opdrachtgever nagaan. Verwerkersvoorwaarden van het account laten toetsen"],
    ["AVG: namen", "Een afwijking is te herleiden tot een persoon, zeker bij een ploeg van twee", "Namen alleen in de kop; acties staan op functie. Het doel is leren, niet beoordelen van personen", "Monteurs vooraf informeren over de nieuwe werkwijze en wat er wordt vastgelegd. Nagaan of de OR hierover moet worden geïnformeerd"],
    ["De inspecteur spreekt weinig in", "Een rapport met vooral 'Geen afwijking waargenomen' zegt even weinig als de oude checklist", "Het onderscheid tussen Conform en 'Geen afwijking waargenomen' en de dekkingsgraad maken een dunne WPI zichtbaar. Claude vult niets aan", "Willen we een ondergrens, bijvoorbeeld minstens drie beschreven waarnemingen per WPI? Voorstel: nu niet, eerst kijken wat de proef laat zien"],
    ["Spraak en foto's op de telefoon", "Spraakherkenning verstaat vaktermen, Fries of dialect en wind slecht; foto's uploaden lukt niet bij zwak bereik; bedienen met handschoenen of in de regen is lastig", "Terugvalformulier; achteraf invoeren binnen twee werkdagen", "Dit is niet getest. In de proef minstens één WPI buiten bij slecht weer en één op een locatie met zwak bereik"],
    ["Lengte van het gesprek", "Bij een lange WPI met veel foto's wordt de chat traag of raakt Claude het begin kwijt", "Eén chat per WPI; het rapport wordt aan het eind in één keer opgebouwd uit de bevestigde samenvatting", "Niet getest met een taak van meer dan vijftien risicoregels en meer dan tien foto's"],
    ["Kennisbank loopt achter op de TRA", "Een TRA wordt gewijzigd, de kennisbank niet. De inspecteur toetst dan op verouderde maatregelen", "Bijwerken binnen twee weken door de QHSE-Manager (5.11). Het rapport vermeldt de versie van de kennisbank. Regelnummers blijven vast", "Wie controleert dat het gebeurt? Voorstel: vast punt bij elke TRA-wijziging in de Methodiek TRA opnemen"],
    ["Kwaliteit van de TRA's", "De kennisbank is gebouwd op de samengevatte versies van de TRA's. Sommige regels hebben een algemene maatregel ('Standaard maatregel') waar weinig aan te toetsen valt", "Zulke regels komen in de proef naar boven en gaan als voorstel naar het TRA-beheer", "Lijst van regels zonder toetsbare maatregel maken en aanvullen"],
    ["Dashboard en actiestatus", "Het dashboard leest de gegevenstabellen uit de rapporten. De status van een actie wijzigt na de WPI en staat dus niet in het rapport", "De status wordt in het dashboard bijgehouden en elk kwartaal als pdf in het QMS gezet", "Wie werkt de status bij en hoe voorkomen we dat rapport en dashboard uit elkaar lopen? In de proef uitwerken"],
    ["Eisteksten in dit document", "De VCA-teksten in de blauwe kaders zijn overgenomen uit de projectopzet en bij het schrijven van dit concept niet woord voor woord naast de checklist gelegd", "–", "Vóór vaststelling van de procedure de kaders in 5.1 en hoofdstuk 6 controleren tegen de checklist VCA 2026/6.1, vraag 7.1 en 7.2"],
], [1400, 2500, 2664, 2500], first_bold=True)
p("Ook de huidige procedure is bij het schrijven van hoofdstuk 5 niet regel voor regel vergeleken. Bepalingen daaruit die "
  "moeten blijven (bijvoorbeeld over de werkplaats in Sneek, als die eronder valt) moeten bij de vaststelling worden "
  "toegevoegd.")

# ------------------------------------------------------------ 8
h1("8. Voorstel voor de proef")
tbl([
    ["Onderdeel", "Voorstel"],
    ["Periode", "Maandag 16 november tot en met vrijdag 18 december 2026"],
    ["Wie", "Twee Montage Coördinatoren (elk drie WPI's) en één directielid (één WPI, zelfstandig of met een coördinator). Het Hoofd Service & Montage is eigenaar van de proef. QHSE ondersteunt en verzamelt de uitkomsten"],
    ["Aantal", "Zeven WPI's, op minstens vier verschillende producten. Minstens één buiten bij slecht weer, één op een locatie met zwak bereik (terugvalformulier) en één bewust korte WPI van ongeveer tien minuten"],
    ["Vooraf", "Terugvalformulier en Word-sjabloon maken. Een kwartier uitleg per inspecteur, met één proefgesprek op kantoor. Monteurs informeren. Bij twee gewone WPI's in AMS de tijd opnemen als vergelijking"],
    ["WPI's in AMS tijdens de proef", "Een WPI in de proef telt als de WPI van die maand en wordt als rapport in het QMS opgeslagen. Ze worden niet dubbel in AMS ingevoerd. Lukt een proef-WPI niet, dan doet de inspecteur die maand een WPI in AMS"],
    ["Acties", "Acties uit de proef zijn echte acties en komen vanaf 23 november op de agenda van het coördinatorenoverleg"],
], [2200, 6864], first_bold=True)
h2("Waar we op letten")
tbl([
    ["Vraag", "Hoe we het meten", "Wanneer zijn we tevreden"],
    ["Kost het de inspecteur meer tijd?", "Duur per WPI (K5) naast de twee gemeten WPI's in AMS; tijd voor nalezen en herstellen van het rapport", "Niet langer op locatie dan nu; nalezen en herstellen binnen tien minuten"],
    ["Gaat het dieper?", "Aantal beschreven waarnemingen, positieve bevindingen en gekoppelde TRA-regels per rapport; dekkingsgraad (A1)", "Elk rapport bevat minstens één positieve bevinding en minstens één beoordeelde TRA-regel met een beschreven waarneming"],
    ["Klopt wat Claude vastlegt?", "Aantal correcties van de inspecteur per rapport: verkeerde regel, classificatie of samenvatting", "Geen rapport waarin een waarneming of oordeel staat dat de inspecteur niet heeft gegeven"],
    ["Werkt het op de telefoon?", "Opmerkingen bij S3; aantal keren terugvalformulier", "Inspecteurs willen ermee door; spraak is buiten bruikbaar of het terugvalformulier vangt het op"],
    ["Voldoet elk rapport aan 7.1d?", "Controle van de zeven rapporten op de vijf verplichte elementen", "Zeven van de zeven"],
    ["Zijn de velden bruikbaar?", "Welke velden bleven leeg of riepen vragen op", "Lijst van te schrappen of aan te passen velden"],
    ["Wat vinden de monteurs?", "Reactie in het gesprek (G2) en navraag door de coördinator", "Geen bezwaar tegen foto's en vastlegging; het gesprek wordt als nuttig ervaren"],
], [2400, 3664, 3000], first_bold=True)
h2("Wanneer we beslissen")
bl("Maandag 21 december 2026, coördinatorenoverleg: evaluatie aan de hand van de zeven rapporten, het dashboard en de tabel hierboven.")
bl("Daarna beslist het Hoofd Service & Montage. Bij een positieve uitkomst wordt de procedure uit hoofdstuk 5 vastgesteld, vervalt AMS voor WPI's per 1 januari 2027 en start het inspectieprogramma 2027 in het dashboard.")
bl("Bij twijfel verlengen we de proef met het eerste kwartaal van 2027 en blijft AMS zolang de terugvaloptie.")
bl("Als de rapporten goed zijn, leggen we er twee met de procedure voor aan de certificerende instelling, met de vraag of dit de tekortkoming bij 7.1 en 7.2 wegneemt.")

h1("Bijlagen")
p("Bijlage 1: voorbeeldrapport WPI-20261105-DAM-C2 (VOORBEELD — fictieve data), afzonderlijk bestand.", space_after=40)
p("Bijlage 2: WPI-dashboard met trendoverzichten op een fictieve dataset van 15 WPI's (VOORBEELD — fictieve data), "
  "afzonderlijk bestand.")

UIT = "/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx"
build(template="/home/claude/wpi/build/sjabloon.docx",
      title="Werkplek-\ninspecties",
      subtitle="Voorstel nieuwe methode",
      body_xml="\n".join(B),
      output=UIT, cover_size=72, work="/home/claude/wpi/build/_nb_build")
