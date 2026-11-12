#!/usr/bin/env python3
# Voorstel nieuwe methode werkplekinspecties, ronde 3. Gebruik: bouw_v3.py [toc.json]
import sys, os, json, re, shutil, subprocess
S = "/root/.claude/skills/synced/134f4af9-00ba-492e-80f4-f185b433f298_fafc370e-ca1f-402c-83bc-47a084adb998/noardling-docx-bouwer/scripts"
sys.path.insert(0, S)
from noardling_docx import *
from noardling_docx import _cel, _runs, _rpr, _next_id, _esc

W = 9064
BODY = 19      # 9,5 pt
TAB = 16       # 8 pt
ROOD = "B03A2E"
BW = "/home/claude/wpi/build"
TOCNR = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}

B = []
add = B.append
KOPPEN = []


def _kn(x):
    return x.replace('"/>', '"/><w:keepNext/>', 1)


def h1(t):
    KOPPEN.append(t)
    add(_kn(para(t, style="Kop1", size=24, space_after=80)))


def h2(t):
    add(_kn(para(t, style="Kop2", size=20, indent_left=0, space_after=60)))


def lab(t):
    add(_kn(para(t, bold=True, size=BODY, space_after=40)))


def p(t, **kw):
    kw.setdefault("space_after", 110)
    kw.setdefault("size", BODY)
    add(para(t, **kw))


def bl(t):
    ppr = (f'<w:pStyle w:val="{STIJL_BODY}"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
           '<w:spacing w:after="30"/><w:ind w:left="400" w:hanging="260"/>')
    add(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{ppr}</w:pPr>{_runs(t, size=BODY)}</w:p>')


def gap(n=80):
    add(para("", space_after=n, size=4))


def tbl(rows, widths, size=TAB, zebra=True, first_bold=False):
    assert abs(sum(widths) - W) < 5, sum(widths)
    uit = []
    for i, r in enumerate(rows):
        assert len(r) == len(widths), r
        rij = []
        for j, c in enumerate(r):
            if i == 0:
                rij.append([para(c, bold=True, color="FFFFFF", size=size, space_after=0)])
            else:
                rij.append([para(c, size=size, space_after=0, bold=(first_bold and j == 0))])
        uit.append(rij)
    t = table(uit, widths=widths, zebra=zebra)
    # de lege alinea na de tabel klein houden
    add(t[:t.rfind("<w:p ")] + para("", space_after=60, size=6))


def kader(text, lijn, vulling, label, heel=True):
    kl = "<w:keepLines/>" if heel else ""
    ppr = (f'<w:pStyle w:val="{STIJL_BODY}"/>{kl}<w:pBdr>'
           f'<w:top w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/>'
           f'<w:left w:val="single" w:sz="18" w:space="8" w:color="{lijn}"/>'
           f'<w:bottom w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/>'
           f'<w:right w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/></w:pBdr>'
           f'<w:shd w:val="clear" w:color="auto" w:fill="{vulling}"/>'
           f'<w:spacing w:before="60" w:after="140"/><w:ind w:left="140" w:right="140"/>')
    runs = _runs(label, bold=True, color=lijn, size=BODY) + f'<w:r>{_rpr()}<w:br/></w:r>' + _runs(text, size=BODY)
    add(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{ppr}</w:pPr>{runs}</w:p>')


def vca(t, label):
    kader(t, BLAUW, VULLING_BLAUW, label)


def keuze(t, label):
    kader(t, LIJN_ORANJE, VULLING_ORANJE, label, heel=False)


def toc():
    """Echt TOC-veld met vooraf ingevulde regels; paginanummers uit de vorige render."""
    regels = [(k, TOCNR.get(k, "")) for k in TOC_KOPPEN]
    out = []
    for i, (k, nr) in enumerate(regels):
        ppr = (f'<w:pPr><w:pStyle w:val="{STIJL_BODY}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="{W}"/></w:tabs>'
               '<w:spacing w:after="20"/></w:pPr>')
        begin = ""
        if i == 0:
            begin = ('<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                     '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z \\u </w:instrText></w:r>'
                     '<w:r><w:fldChar w:fldCharType="separate"/></w:r>')
        eind = '<w:r><w:fldChar w:fldCharType="end"/></w:r>' if i == len(regels) - 1 else ""
        run = (f'<w:r>{_rpr(size=BODY)}<w:t xml:space="preserve">{_esc(k)}</w:t></w:r>'
               f'<w:r>{_rpr(size=BODY)}<w:tab/><w:t>{nr}</w:t></w:r>')
        out.append(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777">{ppr}{begin}{run}{eind}</w:p>')
    add("".join(out))


TOC_KOPPEN = ["Samenvatting", "1. Aanleiding en wat er verandert", "2. Zo verloopt een WPI",
              "3. Wat we per WPI vastleggen", "4. Welke trenddata dit oplevert",
              "5. Procedure Werkplekinspecties, versie 2.0 concept", "6. Dekking van de VCA-eisen 7.1 en 7.2",
              "7. Risico's en open punten", "8. Te nemen besluiten en de proef",
              "Bijlage A. Vast te leggen gegevens per WPI"]

# ============================================================ voorwerk + samenvatting
add(pagebreak())
rijen = [["Document", "Voorstel nieuwe methode werkplekinspecties, met concept-procedure versie 2.0"],
         ["Versie en datum", "0.3 concept, 11-11-2026, ter bespreking op 12-11-2026"],
         ["Vast te stellen door", "Hoofd Service & Montage (eigenaar van de procedure), na de proef"],
         ["Bijlagen", "A Vast te leggen gegevens (achterin). Afzonderlijk: voorbeeldrapport WPI-20261105-DAM-C2 en WPI-dashboard, beide VOORBEELD — fictieve data"]]
t = table([[[para(a, bold=True, size=TAB, space_after=0)], [para(b, size=TAB, space_after=0)]] for a, b in rijen],
          widths=[2000, 7064], header=False)
add(t[:t.rfind("<w:p ")] + para("", space_after=60, size=6))

h1("Samenvatting")
lab("Het probleem")
p("De auditor oordeelde bij de hercertificering voor VCA 2026/6.1 dat onze werkplekinspecties (WPI's) niet duidelijk "
  "genoeg zijn en hun doel missen. De inspecteur loopt in AMS een vaste checklist af die niets zegt over het werk dat "
  "de monteurs op dat moment doen. Een trendanalyse (VCA 7.2) ontbreekt.")
lab("Het voorstel")
p("De WPI koppelen aan onze 21 product-TRA's (666 risicoregels). De inspecteur toetst of de monteurs werken volgens de "
  "maatregelen uit de TRA van het product en de taak waar ze mee bezig zijn, naast een ronde over negen algemene "
  "onderwerpen. Hij doet dat op zijn telefoon in de Claude-app: hij spreekt in wat hij ziet en maakt foto's. Claude "
  "noemt de maatregelen, vraagt naar oordeel, actiehouder en termijn, en maakt een rapport met negen vaste onderdelen. "
  "Waarneming en oordeel komen altijd van de inspecteur. Elk rapport laat zien welke regels hij zelf heeft waargenomen, "
  "welke hij alleen heeft bevestigd en welke niet zijn beoordeeld. Een dashboard telt alle rapporten op tot "
  "inspectieprogramma, actieoverzicht en trendanalyse.")
lab("Wat het vraagt")
p("Van de inspecteur: per WPI inspreken in plaats van aanvinken, en bij elke afwijking een oordeel, actiehouder en "
  "termijn noemen. We verwachten dat dit niet meer moeite kost dan AMS; aangetoond is dat niet, de proef meet het. Van "
  "de organisatie: de actiestatus elke maandag bijwerken in het coördinatorenoverleg, rapporten maandelijks in het QMS "
  "zetten, de kennisbank bijhouden als een TRA wijzigt en een terugvalformulier maken voor als de app niet werkt.")
lab("De drie grootste risico's")
bl("Spraak en foto's op de telefoon zijn op locatie niet getest: wind, vaktermen, zwak bereik.")
bl("Alle inspecteurs werken met één gedeeld account bij één leverancier; foto's en namen vragen een AVG-toets.")
bl("Een inspecteur die weinig inspreekt levert een dun rapport. Dat is in het rapport zichtbaar, maar het wordt er niet beter van.")
lab("Gevraagd besluit")
p("Proefdraaien van 16 november tot en met 18 december 2026 met twee Montage Coördinatoren en één directielid (zeven "
  "WPI's), evalueren op 21 december en dan beslissen of AMS voor WPI's per 1 januari 2027 vervalt. Alle 21 keuzes staan "
  "met een voorstel en wie beslist in 8.1.", space_after=0)

add(pagebreak())
add(_kn(para("Inhoud", bold=True, color=BLAUW, size=24, space_after=80)))
toc()
gap(120)
vca("Bevat wat de VCA-checklist 2026/6.1 eist, in de woorden van de checklist; opsommingen staan op één regel.", "Blauw kader: VCA-eis")
keuze("Bevat wat Noardling zelf kiest binnen de ruimte die de VCA laat. Elk oranje kader en elke verwijzing als "
      "(besluit 8) hoort bij een regel in de tabel in 8.1. Tot daarover is beslist, is het een voorstel.",
      "Oranje kader: keuze Noardling")

# ============================================================ 1
h1("1. Aanleiding en wat er verandert")
p("We hebben 21 productspecifieke TRA's waarin per taak staat welk risico er speelt en welke maatregelen we hebben "
  "afgesproken. Bij de WPI gebruiken we die nu niet. De nieuwe methode hangt de inspectie daaraan op.")
tbl([
    ["", "Nu (AMS)", "Nieuwe methode"],
    ["Waar toetsen we op", "Vaste checklist, gelijk voor elk werk", "Negen algemene onderwerpen plus de risicoregels uit de TRA van de taak die wordt uitgevoerd"],
    ["Invoer", "Aanvinken en typen", "Inspreken en foto's maken; Claude ordent en vraagt door"],
    ["Positieve bevindingen", "Niet afzonderlijk zichtbaar", "Elke maatregel die de inspecteur in orde ziet en beschrijft"],
    ["Acties", "Los van de bevinding", "Genummerd, met actiehouder, toetser en termijn, in één actieoverzicht"],
    ["Trendanalyse", "Ontbreekt", "Elke regel heeft een classificatie; het dashboard telt over alle rapporten"],
    ["Terugkoppeling naar de TRA", "Geen", "Waarnemingen die bij geen TRA-regel passen worden apart geteld"],
], [2100, 2800, 4164], first_bold=True)

# ============================================================ 2
h1("2. Zo verloopt een WPI")
h2("2.1 Acht stappen")
tbl([
    ["Stap", "Wat de inspecteur doet", "Wat Claude doet"],
    ["0. Kop", "Noemt zijn naam en functie, opdrachtgever, locatie, project, monteurs, omstandigheden", "Vraagt naar wat ontbreekt; noteert datum en tijd"],
    ["1. Product en taak", "Noemt het product en waar de monteurs mee bezig zijn", "Toont de fasen en taken uit de TRA, legt de keuze vast, maakt het WPI-nummer"],
    ["2. Algemene observatie", "Vertelt wat hij ziet bij de negen onderwerpen A t/m I en geeft per onderwerp zijn oordeel", "Noemt de onderwerpen die nog niet aan bod kwamen"],
    ["3. Taakgerichte toetsing", "Vertelt per risicoregel wat hij ziet en geeft zijn oordeel", "Noemt per regel de maatregelen uit de TRA en vraagt naar het oordeel"],
    ["4. Foto's", "Maakt foto's en zegt wat erop staat", "Nummert de foto en koppelt hem aan een onderwerp of regel"],
    ["5. Gesprek", "Bespreekt de bevindingen met de monteurs", "Legt reactie en ideeën vast; vraagt of een idee een actie wordt"],
    ["6. Acties", "Zegt wat er moet gebeuren, door wie, wanneer en met welke prioriteit", "Nummert de actie en vraagt naar wat ontbreekt"],
    ["7. Afsluiten", "Beantwoordt de afsluitvraag over de regels waar hij niets over zei; bevestigt de samenvatting", "Telt waargenomen, alleen bevestigd en niet beoordeeld"],
    ["8. Rapport", "Leest het rapport na", "Maakt het Word-rapport met negen vaste onderdelen"],
], [1900, 3700, 3464], first_bold=True)
p("De volgorde is vrij en een korte WPI is geldig: wie tien minuten heeft, doet de kop, de regels die hij ziet gebeuren "
  "en de afsluitvraag. Claude vult nooit zelf een waarneming, oordeel of prioriteit in, zet geen namen van monteurs bij "
  "een afwijking en sluit geen acties af.")

h2("2.2 Voorbeeld van de dialoog")
add(_kn(para("VOORBEELD — fictieve data", bold=True, color=ROOD, size=BODY, space_after=40)))
p("Fragmenten uit de inspectie waarvan het volledige rapport bijlage 1 is (WPI-20261105-DAM-C2). Locatie, project en "
  "personen zijn verzonnen; de risicoregels komen uit de TRA Damwand.", italic=True, space_after=60)


def dialoog(regels):
    tblpr = ('<w:tblPr><w:tblW w:w="9064" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
             '<w:tblLook w:val="04A0" w:firstRow="0" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>')
    trs = []
    for wie, tekst in regels:
        fill = "F4F7FB" if wie == "Claude" else None
        c1 = _cel([para(wie, bold=True, size=TAB, space_after=0, color=BLAUW if wie == "Claude" else None)], 1200, fill=fill, valign="top")
        c2 = _cel([para(tekst, size=TAB, space_after=0, italic=(wie == "Inspecteur"))], 7864, fill=fill, valign="top")
        trs.append(f"<w:tr><w:trPr><w:cantSplit/></w:trPr>{c1}{c2}</w:tr>")
    add(f'<w:tbl>{tblpr}<w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="7864"/></w:tblGrid>{"".join(trs)}</w:tbl>'
        + para("", space_after=60, size=6))


dialoog([
    ("Inspecteur", "Start WPI. Coördinator 2, RWZI Voorbeeldstad, project P26-168. Twee monteurs, ze halen de damwand eruit. Droog, weinig wind, het betondek is nat."),
    ("Claude", "Product Damwand, fase Demontage, taak 'Verwijderen damwand'. Klopt dat?"),
    ("Inspecteur", "Klopt."),
    ("Claude", "Het nummer is WPI-20261105-DAM-C2. Bij deze taak horen acht risicoregels, DAM-2.01 tot en met 2.08. Vertel wat je ziet of zeg 'overslaan'. DAM-2.05: de last begeleiden vanaf een onveilige positie. Maatregel in de TRA: op veilige afstand blijven en stuurlijnen gebruiken. Wat zie je?"),
    ("Inspecteur", "Ze begeleiden met een stuurlijn, vanaf een droge plek buiten de draaicirkel. Foto erbij."),
    ("Claude", "Welk oordeel geef je: conform, afwijking of verbeterpunt?"),
    ("Inspecteur", "Conform."),
    ("Claude", "Genoteerd met jouw waarneming; foto 3 hangt aan DAM-2.05. Volgende, DAM-2.06: contact met afvalwater en slib. Maatregelen: de opdrachtgever reinigt de werkplek vooraf; handen wassen voor de pauze; niet eten of drinken in de werkzone. Wat zie je?"),
    ("Inspecteur", "De delen komen onder het slib omhoog, er is niet vooraf gereinigd. De monteurs spoelen zelf af met de tuinslang. En er wordt gedronken in de werkzone. Foto."),
    ("Claude", "Welk oordeel geef je?"),
    ("Inspecteur", "Afwijking."),
    ("Claude", "De vaste klasse van deze regel is 'Gevaarlijke stoffen en hygiëne'. Foto 4 hangt aan DAM-2.06. Is het ter plaatse opgelost? Welke verbeteractie hoort erbij, wie voert die uit, wanneer, en welke prioriteit: direct, kort of planmatig?"),
    ("Inspecteur", "Niet opgelost. Reiniging vooraf door de opdrachtgever vast opnemen in de werkvoorbereiding en het VGM-projectplan. Werkvoorbereider, binnen twee weken, kort."),
    ("Claude", "Actie WPI-20261105-DAM-C2-3. Bevinding: niet vooraf gereinigd, koffie in de werkzone. Verbeteractie: reiniging vooraf vast opnemen. Actiehouder Werkvoorbereider, termijn 19-11-2026, kort. Toetser is standaard het Hoofd Service & Montage. Akkoord?"),
    ("Inspecteur", "Akkoord. DAM-2.07: de gasmeter hangt boven aan de ladder, niet bij de monteur in het kanaal. Afwijking, prioriteit direct. Ik heb ze hem laten omhangen; hij hangt nu op borsthoogte."),
    ("Claude", "Actie -4: direct gecorrigeerd door de monteurs ter plaatse. Bij een direct gecorrigeerde actie toets jij ter plaatse. Heb je gezien dat de gasmeter nu bij de monteur hangt?"),
    ("Inspecteur", "Ja, gezien. De monteurs zeggen dat hij bij het afdalen in de weg zit. Hun idee: een klem of karabijn om hem op borsthoogte te dragen."),
    ("Claude", "Actie -4 is afgerond en getoetst op 05-11-2026. Wil je het idee als actie opnemen? Zo ja: welke verbeteractie, wie, wanneer en welke prioriteit?"),
    ("Inspecteur", "Ja. Klem of karabijn bij elke gasmeter in de wagens. Dat doe ik zelf, eind december, planmatig. Dat was het."),
    ("Claude", "Actie -5 bij DAM-2.07, bron 'Idee monteurs', actiehouder jij, toetser het Hoofd Service & Montage. Over F, H, DAM-2.02 en DAM-2.08 heb je niets gezegd. Is daar niets op aan te merken, of heb je ze niet gezien?"),
    ("Inspecteur", "F en H niets op aan te merken. 2.02 en 2.08 niet gezien, de bevestiging was al los toen ik kwam."),
    ("Claude", "Dan krijgen F en H 'Geen afwijking waargenomen' en DAM-2.02 en 2.08 'Niet beoordeeld'. Samenvatting: van de 17 regels 13 waargenomen, 2 alleen bevestigd, 2 niet beoordeeld; 9 conform, 3 afwijkingen, 1 verbeterpunt, 5 acties. Klopt dit?"),
])
p("Het rapport bevat hierdoor per regel oordeel, waarneming en classificatie, en per actie bevinding, verbeteractie, "
  "prioriteit, direct gecorrigeerd, actiehouder, toetser, termijn, status, getoetst op en bron, met de foto's. Extra velden die wij voorstellen, zoals "
  "de oorzaak van een afwijking, staan in hoofdstuk 3 en zijn nog niet gebouwd.")

# ============================================================ 3
h1("3. Wat we per WPI vastleggen")
p("De volledige lijst met per veld het waarom, de verplichting, de bediende eis of trend en de kosten voor de "
  "inspecteur staat in bijlage A. De rechterkolom hieronder is ons voorstel voor uitbreiding (besluit 2).")
tbl([
    ["Onderdeel", "In het voorbeeldrapport", "Voorgesteld, nog niet in het voorbeeldrapport"],
    ["Kop", "WPI-nummer, inspecteur en functie, soort inspectie, datum en tijd, opdrachtgever, locatie, project, monteurs, omstandigheden", "Verantwoordelijke coördinator (bij inspectie door een monteur), deelnemend directielid, werk van korte duur, aangekondigd of niet, invoerwijze"],
    ["Start", "–", "Claude toont open acties en eerdere afwijkingen op dit product of deze locatie en vraagt of ze opnieuw zijn bekeken"],
    ["Product en taak", "Product, fase, taak", "Versie van de kennisbank; vier vaste ja/nee-vragen over VGM-projectplan, TRA, werkvergunning en LMRA"],
    ["Per onderwerp en per risicoregel", "Oordeel, waarneming, classificatie; afgeleid: waargenomen, alleen bevestigd of niet beoordeeld", "Bij een afwijking: welke maatregel ontbrak (collectief, individueel of PBM) en de oorzaak. Later: de risicoscore uit de TRA"],
    ["Foto's", "Nummer, toelichting, koppeling aan onderwerp of regel", "Melding als een persoon herkenbaar in beeld is"],
    ["Gesprek", "Wat besproken is, reactie, ideeën van de monteurs", "–"],
    ["Acties", "Nummer, bevinding, verbeteractie, prioriteit, direct gecorrigeerd, actiehouder, toetser, termijn, status, getoetst op, bron", "Werk stilgelegd; wijze van verificatie"],
    ["Afsluiting", "Antwoord op de afsluitvraag, bevestiging, aantallen per oordeel", "Opmerking over de methode (alleen in de proef)"],
], [1700, 3600, 3764], first_bold=True)
lab("Eén model voor de oordelen (besluit 4)")
tbl([
    ["Oordeel", "Wanneer", "Niveau (afgeleid van het oordeel)", "Telt als"],
    ["Conform", "De inspecteur beschrijft wat hij zag en heeft niets aan te merken", "Waargenomen", "Positieve bevinding"],
    ["Afwijking", "De inspecteur beschrijft dat een afgesproken maatregel ontbreekt of niet wordt nageleefd", "Waargenomen", "Negatieve bevinding, met actie"],
    ["Verbeterpunt", "De inspecteur beschrijft iets dat voldoet maar veiliger kan", "Waargenomen", "Negatieve bevinding, met actie"],
    ["Geen afwijking waargenomen", "Alleen via de afsluitvraag, zonder eigen waarneming", "Alleen bevestigd", "Neutraal"],
    ["Niet beoordeeld", "Niet gezien", "Niet beoordeeld", "Blinde vlek"],
    ["Niet van toepassing", "De regel speelt niet bij dit werk", "–", "Telt niet mee"],
], [2000, 3964, 1700, 1400], first_bold=True)
p("Het niveau is geen apart veld; het volgt uit het oordeel. Zo kan een auditor zien bij welke maatregelen de "
  "inspecteur feitelijk heeft gekeken, en zien wij welke maatregelen nooit worden waargenomen.")

# ============================================================ 4
h1("4. Welke trenddata dit oplevert")
p("Elk rapport eindigt met een gegevenstabel: één rij per beoordeelde regel en één per actie. Het dashboard (bijlage 2, "
  "in aanbouw) telt die op. Bij ongeveer 28 WPI's per jaar (twee coördinatoren, één directielid) zijn de aantallen per "
  "kwartaal, per product of per TRA-regel klein. Alleen T1 en T9 zeggen per maand of kwartaal iets; de andere trends "
  "lezen we op jaarbasis en in aantallen, niet in percentages.")
tbl([
    ["Trend", "Uit velden (bijlage A)", "Welke vraag beantwoordt hij", "Voor wie"],
    ["T1 Uitvoering van het programma", "K2, K3, K5, K6", "Heeft elke coördinator elke maand een WPI gedaan en de directie elk kwartaal?", "Coördinatorenoverleg, auditor"],
    ["T2 Dekking van korte projecten", "K7, K8 en de projectplanning", "Welk deel van de gestarte korte projecten is geïnspecteerd, en zijn alle projecten met een risicokenmerk bezocht? Kan alleen met de noemer uit de planning", "Hoofd S&M, auditor"],
    ["T3 Bevindingen per classificatie", "B3, R2, O1", "Waar zitten de afwijkingen en de positieve bevindingen?", "Directiebeoordeling, auditor"],
    ["T4 Oordelen per algemeen onderwerp", "O1", "Welke van de negen onderwerpen scoren goed of slecht?", "Coördinatorenoverleg, toolbox"],
    ["T5 Meest afwijkende TRA-regels", "R1, R2", "Welke maatregelen worden het vaakst niet nageleefd? Alleen bij producten die vaker zijn geïnspecteerd", "TRA-beheer"],
    ["T6 Afwijkingen per maatregelniveau", "R4", "Telling: gaat het bij afwijkingen om collectieve maatregelen, individuele maatregelen of PBM? Geen maat voor naleving", "Hoofd S&M"],
    ["T7 Oorzaken", "R5", "Onbekendheid, ontbrekende middelen, voorbereiding of een onwerkbare maatregel?", "Hoofd S&M, directiebeoordeling"],
    ["T8 Waarnemingen buiten de TRA", "R6", "Welke risico's ziet de inspecteur die de TRA niet noemt?", "TRA-beheer"],
    ["T9 Opvolging van acties", "B1, B4, B8–B13, B15", "Hoeveel acties zijn open of te laat, hoe lang duurt afhandeling, bij welke functie blijft het liggen?", "Coördinatorenoverleg, auditor"],
    ["T10 Direct gecorrigeerd en stilgelegd", "B5, B6", "Welk deel lossen we op locatie op; hoe vaak is werk stilgelegd?", "Directiebeoordeling"],
    ["T11 Herhaalde bevindingen", "E1, A3, R1, B3", "Komt dezelfde afwijking terug nadat de actie is gesloten?", "Hoofd S&M, auditor"],
    ["T12 Positieve bevindingen", "R2, R3, O2, B14", "Wat gaat aantoonbaar goed?", "Toolbox, auditor"],
    ["T13 Diepgang", "A1, K6, K12", "Welk deel van de regels is waargenomen, alleen bevestigd of niet beoordeeld? Hoe lang duurt een WPI?", "Hoofd S&M, auditor, proef"],
    ["T14 Per product en fase", "P1, P2, R2", "Bij welk product of in welke fase zitten de afwijkingen?", "TRA-beheer, werkvoorbereiding"],
    ["T15 Blinde vlekken", "R1, A1 (later A4)", "Welke TRA-maatregelen zijn in geen enkele WPI waargenomen? Later te wegen met de risicoscore uit de TRA", "Hoofd S&M, TRA-beheer, auditor"],
    ["T16 Inbreng van de monteurs", "G2, G3, B12", "Welke ideeën kwamen van de werkvloer en wat is ermee gedaan?", "Coördinatorenoverleg"],
    ["T17 Voorbereiding op orde", "V1–V4", "Hoe vaak ontbreekt projectplan, TRA, werkvergunning of LMRA?", "Hoofd S&M, werkvoorbereiding"],
], [2200, 1500, 3464, 1900], first_bold=True)
p("T1, T3, T9 en T12 zijn nodig voor VCA 7.1 en 7.2. T5, T8, T14 en T15 bestaan alleen doordat de WPI aan de TRA hangt. "
  "T2, T6, T7, T11 en T17 rusten op voorgestelde velden.")

# ============================================================ 5
h1("5. Procedure Werkplekinspecties, versie 2.0 concept")
p("Herziening van versie 1.0. Eigenaar: Hoofd Service, Montage & Aftersales (hierna Hoofd Service & Montage). "
  "Reviewfrequentie: jaarlijks. Na de proef wordt dit hoofdstuk een afzonderlijk document in het QMS, met bijlage A. "
  "Verwijzingen als (besluit 8) wijzen naar de tabel in 8.1. Wat is gewijzigd ten opzichte van versie 1.0 staat in 5.12.", italic=True, color=BLAUW)

h2("5.1 Doel en toepassingsgebied")
p("Deze procedure beschrijft hoe Noardling B.V. werkplekinspecties uitvoert binnen Service & Montage. Zij waarborgt dat "
  "VGM-risico's tijdig worden gesignaleerd en gecorrigeerd, dat leidinggevenden en directie aantoonbaar betrokken zijn "
  "bij het toezicht, en dat bevindingen worden opgevolgd en gebruikt voor verbetering van het VGM-beheersysteem.")

p("Alle werkzaamheden die door of namens de afdeling Service & Montage worden uitgevoerd, uitsluitend op "
  "projectlocaties.")
keuze("Het WPI-rapport legt alleen bevindingen vast over het werk van onze eigen monteurs; er is geen veld voor "
      "onderaannemers of derden. Versie 1.0 liet de inspecteur waarnemingen ook bespreken met de leidinggevende van de "
      "onderaannemer. Dat blijft bij direct gevaar: de inspecteur laat het stoppen, spreekt de betrokkene of diens "
      "leidinggevende aan en meldt het volgens de procedure incidentenrapportage. Onderaannemers worden beoordeeld via "
      "de Procedure Inkoop van Diensten.", "Keuze Noardling · besluit 3: alleen eigen monteurs")

h2("5.2 Eisen uit de VCA")
vca("7.1 Worden periodiek werkplekinspecties uitgevoerd door operationeel leidinggevenden? (*/**/P)\n"
    "Doelstelling: Het in stand houden dan wel bevorderen van een veilige werkomgeving en werkwijze.\n"
    "Minimumeisen:\n"
    "• Er is een procedure, waarin de volgende zaken staan beschreven: – de uitvoering van de inspecties; – de positieve "
    "bevindingen van de inspecties; – de opvolging van waargenomen verbeterpunten; – gebruik van de checklist.\n"
    "• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n"
    "• Bovenstaand punt kan ook ingevuld worden door operationele medewerkers onder verantwoordelijkheid van een "
    "operationeel leidinggevende.\n"
    "• Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te "
    "voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.\n"
    "• Er is een actieplan met daarin: – actiepunten, voortkomende uit de inspecties; – de verantwoordelijken voor de "
    "uitvoering en toetsing; – tijdsplanning.\n"
    "• De (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een werkplekinspectie op een "
    "werklocatie.\n"
    "Documenten: • Procedure met betrekking tot de uitvoering van de werkplekinspecties en het inspectieprogramma "
    "• Verslagen van de uitgevoerde inspecties en de follow-up hiervan\n"
    "(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de bovenstaande frequentie naar "
    "verhouding wordt behaald, rekening houdend met de risico's.",
    "VCA 2026/6.1, vraag 7.1 (tekst van de checklist; opsommingen op één regel gezet)")
vca("7.2 Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)? (-/□/P)\n"
    "Doelstelling: Het identificeren van basisoorzaken van structurele verbetermogelijkheden.\n"
    "Minimumeisen: • Bevindingen worden geclassificeerd. • Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te "
    "ondernemen acties en follow-up.\n"
    "Documenten: • Trendanalyse • Overzicht verbeteracties",
    "VCA 2026/6.1, vraag 7.2 (tekst van de checklist; opsommingen op één regel gezet)")

h2("5.3 Definities (eigen invulling, besluit 7)")
tbl([
    ["Begrip", "Betekenis in deze procedure"],
    ["WPI", "Geplande, vastgelegde inspectie van een werkplek of werksituatie, gericht op de naleving van VGM-afspraken: een algemene observatie plus een toetsing van het lopende werk aan de maatregelen uit de TRA"],
    ["VGM-inspectie directie", "WPI waaraan een directielid deelneemt of die een directielid uitvoert, conform VCA 7.1"],
    ["Operationele werkplek", "Een projectlocatie waar monteurs van Service & Montage aan het werk zijn"],
    ["Werk van korte duur", "Werk dat korter dan een maand op dezelfde locatie duurt"],
    ["Operationeel leidinggevende", "De Montage Coördinator en het Hoofd Service & Montage"],
    ["Kennisbank en checklist", "Kennisbank: de 21 product-TRA's zoals de skill ze gebruikt, met per risicoregel een vast nummer, de maatregelen en een vaste klasse. Checklist: de negen algemene onderwerpen plus de risicoregels van de taak die wordt uitgevoerd"],
    ["Bevinding", "Wat de inspecteur vaststelt. Positieve bevinding: oordeel Conform, altijd met een eigen waarneming, of een opmerking onder 'wat ging opvallend goed'. Afwijking: een afgesproken maatregel ontbreekt of wordt niet nageleefd. Verbeterpunt: het voldoet, maar kan veiliger"],
    ["Waargenomen, alleen bevestigd, niet beoordeeld", "Afgeleid van het oordeel. Waargenomen: Conform, Afwijking of Verbeterpunt, altijd met een eigen waarneming. Alleen bevestigd: 'Geen afwijking waargenomen', gegeven via de afsluitvraag. Niet beoordeeld: niet gezien"],
    ["Buiten TRA", "Vlag bij een waarneming van een risico dat de TRA van het product niet noemt. De waarneming krijgt daarnaast een gewone klasse"],
    ["Actieoverzicht en toetser", "Actieoverzicht: alle acties uit WPI's met actiehouder, toetser, termijn, status en bron, in het WPI-dashboard; dit is het actieplan uit VCA 7.1. Toetser: degene die vaststelt dat de verbeteractie is uitgevoerd; nooit dezelfde als de actiehouder"],
    ["Coördinatorenoverleg", "Wekelijks overleg op maandagochtend onder leiding van het Hoofd Service & Montage"],
], [2500, 6564], first_bold=True)

h2("5.4 Verantwoordelijkheden")
tbl([
    ["Functie", "Verantwoordelijkheid"],
    ["Directielid", "Neemt minimaal eenmaal per kwartaal deel aan een WPI op een projectlocatie (minimaal 4 per kalenderjaar). Toont zichtbaar commitment. Ziet toe op de opvolging van bevindingen"],
    ["Hoofd Service & Montage", "Eigenaar van de procedure en eindverantwoordelijk voor het inspectieprogramma. Voert aanvullend WPI's uit naar eigen inzicht. Bewaakt de opvolging in het coördinatorenoverleg en werkt daar de actiestatus bij. Is standaard toetser van acties. Slaat rapporten op in het QMS. Stelt de jaarlijkse trendanalyse op"],
    ["Montage Coördinator", "Voert minimaal 1 WPI per maand uit (gezamenlijk minimaal 24 per jaar). Bespreekt waarnemingen ter plaatse met de monteurs. Brengt bevindingen in tijdens het coördinatorenoverleg. Is verantwoordelijk voor WPI's die een monteur onder zijn naam uitvoert"],
    ["Monteur", "Werkt mee aan inspecties. Signaleert onveilige situaties en meldt die volgens de geldende procedures. Voert toegewezen acties uit"],
    ["QHSE-Manager", "Ondersteunend: beheert de kennisbank namens het Hoofd Service & Montage en helpt bij de trendanalyse. Niet verantwoordelijk voor uitvoering of opvolging van inspecties en geen actiehouder (besluit 16)"],
], [2300, 6764], first_bold=True)

h2("5.5 Inspectieprogramma")
p("Elke Montage Coördinator voert minimaal 1 WPI per maand uit op een lopende werklocatie of werksituatie binnen "
  "Service & Montage. Een directielid neemt minimaal eenmaal per kwartaal deel, 4 per kalenderjaar, op een "
  "projectlocatie (besluit 10). Het Hoofd Service & Montage inspecteert aanvullend naar eigen inzicht.")
p("Het programma wordt vastgesteld door het Hoofd Service & Montage, gedeeld met de inspecteurs en bijgehouden in het "
  "WPI-dashboard: per maand en per inspecteur gepland tegenover uitgevoerd. Een gemiste maand wordt in het "
  "eerstvolgende coördinatorenoverleg besproken en in de maand erna ingehaald (besluit 9).")
keuze("Het meeste werk van Service & Montage duurt korter dan een maand; voetnoot 10 is dus op ons van toepassing. "
      "'Naar verhouding' vullen we zo in:\n"
      "1. Een project dat langer dan een maand op dezelfde locatie loopt, krijgt elke maand een WPI.\n"
      "2. Elk kort project met hijswerk, een besloten ruimte of werk op of bij open water krijgt ten minste één WPI.\n"
      "3. Van de overige korte projecten die in een kwartaal starten, krijgt ten minste één op de vier een WPI.\n"
      "De noemer komt uit de projectplanning van Service & Montage: het aantal in het kwartaal gestarte projecten, met "
      "per project de duur en of een van de drie risicokenmerken speelt. Het Hoofd Service & Montage zet elk kwartaal "
      "naast elkaar: gestart, met risicokenmerk, geïnspecteerd. Vraagt regel 2 meer WPI's dan één per coördinator per "
      "maand, dan gaat regel 2 voor. Het aandeel van één op de vier stellen we bij zodra het aantal projecten per "
      "kwartaal uit de planning bekend is.", "Keuze Noardling · besluit 8: programma bij werk van korte duur")

h2("5.6 Voorbereiding en uitvoering")
bl("De inspecteur selecteert een lopende werklocatie volgens het programma en kondigt het bezoek bij voorkeur niet (of slechts kort) van tevoren aan, zodat een representatief beeld ontstaat. Minimaal een derde van de WPI's is onaangekondigd; het rapport vermeldt het (besluit 11).")
bl("Hij opent op zijn telefoon de WPI-projectmap in de Claude-app en start de inspectie. De skill wpi-begeleider leidt hem door de acht stappen uit 2.1; de volgorde is vrij.")
bl("Checklist: de negen algemene onderwerpen, waaronder de naleving van beheersmaatregelen en het gebruik van PBM, orde en netheid, en de staat en keuring van gereedschappen en arbeidsmiddelen, plus de risicoregels uit de kennisbank die horen bij de taak die wordt uitgevoerd.")
bl("Per onderwerp en per regel beschrijft de inspecteur wat hij ziet en geeft hij het oordeel. Claude vraagt ernaar en vult het nooit zelf in. Conform, Afwijking en Verbeterpunt bestaan alleen met een eigen waarneming.")
bl("Positieve bevindingen: elk oordeel Conform, en daarnaast minimaal één ding dat opvallend goed ging of uitdrukkelijk 'niets' (besluit 5).")
bl("De inspecteur bespreekt zijn waarnemingen, ook de positieve, ter plaatse met de aanwezige monteur(s).")
bl("Direct gevaarlijke situaties worden ter plaatse gestopt en, indien nodig, gemeld conform de procedure incidentenrapportage.")
bl("Bij het afsluiten vraagt Claude naar de regels waarover niets is gezegd. Die krijgen 'Geen afwijking waargenomen' of 'Niet beoordeeld'. De inspecteur bevestigt de samenvatting.")
keuze("Een ervaren monteur mag een WPI uitvoeren op een werkplek waar hij zelf niet werkt. In de kop staat dan het "
      "veld 'Verantwoordelijke coördinator': de Montage Coördinator onder wiens verantwoordelijkheid de inspectie "
      "gebeurt. Die leest het rapport na en bevestigt het. Zo'n WPI telt mee voor het programma voor korte projecten, "
      "niet voor de maandnorm van de coördinator.", "Keuze Noardling · besluit 12: inspectie door een monteur (VCA 7.1, derde minimumeis)")

h2("5.7 Inspectieverslag en vastleggen van bevindingen")
p("Claude maakt na de bevestiging het inspectieverslag (WPI-rapport) als Word-document met negen vaste onderdelen: "
  "1 Kop, 2 Samenvatting, 3 Algemene observatie, 4 Taakgerichte toetsing, 5 Positieve bevindingen, 6 Bevindingen en "
  "acties, 7 Gesprek met de monteurs, 8 Foto's met toelichting, 9 Gegevenstabel. Per regel staan er het oordeel, de "
  "waarneming, de classificatie en het niveau (waargenomen, alleen bevestigd, niet beoordeeld). Elke afwijking en elk "
  "verbeterpunt, ook een waarneming buiten de TRA, leidt tot een actie (besluit 5) met de bevinding en de verbeteractie "
  "apart vastgelegd, en actiehouder, toetser, termijn en "
  "prioriteit. Namen van monteurs staan alleen in de kop.")
p("Prioriteit: direct (gevaar dat niet kan wachten; ter plaatse gestopt en opgelost), kort (binnen twee weken) of "
  "planmatig (datum in overleg, uiterlijk einde volgend kwartaal; besluit 14).")

h2("5.8 Opvolging")
bl("Elke actie heeft een nummer (WPI-nummer plus volgnummer) en staat in het actieoverzicht in het WPI-dashboard, met bron: Inspectie of Idee monteurs.")
bl("Bevindingen uit alle WPI's worden besproken in het wekelijkse coördinatorenoverleg op maandag. Daar wordt de status bijgewerkt: het Hoofd Service & Montage, of een coördinator namens hem, geeft per actienummer de nieuwe status door in de WPI-projectmap en Claude werkt het dashboard bij. Het verslag van het overleg vermeldt de besproken actienummers (besluit 15).")
bl("Status: open, in behandeling, afgerond of vervallen (met reden).")
bl("Een actie is pas Afgerond nadat de toetser heeft vastgesteld dat de verbeteractie is uitgevoerd. Hij legt de datum vast (getoetst op) en hoe hij het zag: foto, document of waarneming bij een volgende WPI.")
bl("Toetser (besluit 13): standaard het Hoofd Service & Montage. Is hij zelf actiehouder, dan toetst de inspecteur. Bij een direct gecorrigeerde actie toetst de inspecteur ter plaatse. Toetser en actiehouder zijn nooit dezelfde. De QHSE-Manager is geen actiehouder.")
bl("Is een actie meer dan twee weken te laat, dan beslist het Hoofd Service & Montage over een nieuwe termijn of een andere actiehouder (besluit 14).")

h2("5.9 Classificatie en trendanalyse")
p("Elke beoordeelde regel, positief en negatief, heeft een van veertien klassen (besluit 6). Elke risicoregel heeft een "
  "vaste klasse in de kennisbank; een bevinding op die regel krijgt die klasse. Bij de algemene onderwerpen en bij "
  "waarnemingen buiten de TRA stelt Claude een klasse voor en bevestigt de inspecteur. 'Buiten TRA' is geen klasse maar "
  "een vlag.")
p("De klassen: PBM, Veiligstellen-LOTOTO, Hijsen, Werken op hoogte of bij water, Arbeidsmiddelen en keuring, Orde en "
  "netheid, Gevaarlijke stoffen en hygiëne, Besloten ruimte en gas, Fysieke belasting, Noodvoorzieningen, Documenten "
  "en voorbereiding, Gedrag en werkwijze, Omgeving en afzetting, Milieu.")
p("Het Hoofd Service & Montage maakt minimaal eenmaal per jaar, in januari over het afgelopen kalenderjaar (besluit "
  "19), een trendanalyse op basis van de uitgevoerde WPI's: aantal WPI's ten opzichte van het programma; meest "
  "voorkomende bevindingen per klasse, positief en negatief; TRA-maatregelen die het vaakst afwijken; welk deel is "
  "waargenomen, alleen bevestigd of niet beoordeeld; doorlooptijd van openstaande bevindingen; trends over de tijd; de "
  "te ondernemen acties met actiehouder en termijn; en de stand van de acties uit de vorige analyse. De resultaten "
  "worden besproken in het coördinatorenoverleg en vormen input voor de directiebeoordeling en het volgende "
  "inspectieprogramma. Acties uit de analyse komen in het actieoverzicht.")

h2("5.10 Als Claude niet beschikbaar is (besluit 17)")
p("Geen bereik of een storing is geen reden om een WPI over te slaan. De inspecteur gebruikt dan het terugvalformulier "
  "WPI (één A4, op papier in de bus en als pdf op de telefoon) en voert de inspectie binnen twee werkdagen zelf in via "
  "de skill; het rapport vermeldt 'achteraf ingevoerd'. Is Claude langer dan twee weken niet bruikbaar, dan maakt hij "
  "het rapport met het Word-sjabloon WPI-rapport en de pdf van de kennisbank uit het QMS, en houdt het Hoofd Service & "
  "Montage het actieoverzicht bij in het verslag van het coördinatorenoverleg. Formulier, sjabloon en pdf's worden vóór "
  "de proef gemaakt.")

h2("5.11 Registraties (bewaartermijn: besluit 18)")
tbl([
    ["Registratie", "Omschrijving en plaats", "Beheer", "Bewaartermijn"],
    ["Inspectieprogramma", "Jaarplanning per inspecteur, gepland en uitgevoerd, met het kwartaaloverzicht van korte projecten. WPI-dashboard; jaarlijks als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["WPI-rapport", "Per inspectie, met bevindingen, foto's en acties. Gemaakt in de WPI-projectmap; maandelijks als Word en pdf in het QMS", "Inspecteur; Hoofd S&M slaat op", "5 jaar"],
    ["Actieoverzicht", "Alle acties met actiehouder, toetser, termijn, status, bron en verificatie. WPI-dashboard, wekelijks bijgewerkt in het coördinatorenoverleg; elk kwartaal als pdf in het QMS", "Hoofd S&M", "5 jaar"],
    ["Verslag coördinatorenoverleg", "Bespreking en opvolging, met de besproken actienummers", "Hoofd S&M", "Volgens het QMS"],
    ["Trendanalyse WPI's", "Jaarrapportage met aantallen, bevindingen per klasse, trends, acties en follow-up. QMS", "Hoofd S&M", "5 jaar"],
    ["Kennisbank", "TRA's per product met versiedatum. WPI-projectmap; pdf per product in het QMS. Bijgewerkt binnen twee weken na wijziging van een TRA; regelnummers blijven vast (besluit 16)", "QHSE-Manager namens Hoofd S&M", "Actuele en vorige versie"],
], [1900, 3964, 1600, 1600], first_bold=True)
p("Gerelateerde documenten in het QMS: Methodiek TRA, de product-TRA's, Procedure VGM-projectplan, LMRA-procedure, "
  "Verslagformulier coördinatorenoverleg, procedure incidentenrapportage, Procedure Inkoop van Diensten.")

h2("5.12 Gewijzigd ten opzichte van versie 1.0")
tbl([
    ["Onderdeel", "Versie 1.0", "Versie 2.0", "Waarom"],
    ["Hulpmiddel", "Checklist in AMS", "Claude-app met de skill wpi-begeleider; AMS vervalt na besluit 21", "Oordeel van de auditor"],
    ["Checklist en volgorde", "Eén vaste checklist, stapsgewijs doorlopen", "Negen onderwerpen plus de risicoregels van de taak; volgorde vrij", "De inspectie moet gaan over het werk dat gebeurt"],
    ["Positieve bevindingen", "Niet beschreven", "Oordeel Conform met waarneming; 'wat ging opvallend goed'", "VCA 7.1: procedure en verslag bevatten ze"],
    ["Directie-inspectie", "'conform VCA 7.2'; projectlocatie of werkplaats", "VCA 7.1; op een projectlocatie, 'of in de werkplaats' vervalt (besluit 10)", "Fout in 1.0; de VCA zegt werklocatie en de toetsing aan de TRA kan alleen bij lopend werk"],
    ["Rollen", "Directielid, Hoofd S&M, Montage Coördinator, Monteur", "Taken uitgebreid (toetser, opslag in QMS, trendanalyse, status bijwerken); QHSE-Manager nieuw, ondersteunend", "Nieuwe werkwijze; kennisbank moet beheerd worden"],
    ["Onderaannemers", "Bespreken met de leidinggevende van de onderaannemer", "Vastlegging alleen over eigen monteurs (besluit 3)", "Keuze voor de nieuwe methode"],
    ["Definities", "WPI, VGM-inspectie directie, AMS, bevinding, coördinatorenoverleg", "AMS vervalt; nieuw o.a. operationele werkplek, werk van korte duur, kennisbank, checklist, positieve bevinding, toetser (besluit 7)", "Nodig voor voetnoot 10 en de nieuwe werkwijze"],
    ["Acties en status", "Actiehouder, termijn, prioriteit; open, in behandeling, afgerond", "Daarbij actienummer, toetser (nooit de actiehouder), getoetst op, bron; bevinding en verbeteractie apart; status Vervallen; escalatie bij meer dan twee weken te laat (besluit 14)", "VCA 7.1: verantwoordelijken voor uitvoering en toetsing"],
    ["Programma", "Aantallen per inspecteur", "Daarbij regels voor werk van korte duur en inhalen van een gemiste maand (besluit 8, 9)", "Voetnoot 10 bij VCA 7.1"],
    ["Inspectie door een monteur", "Niet beschreven", "Beschreven (besluit 12)", "Derde minimumeis van VCA 7.1"],
    ["Classificatie en trendanalyse", "'Per categorie', niet benoemd", "Veertien klassen; analyse met acties en follow-up", "VCA 7.2"],
    ["Waargenomen of bevestigd", "Niet aanwezig", "Per regel afgeleid van het oordeel", "Zichtbaar maken waar feitelijk is gekeken"],
    ["Terugvaloptie en registraties", "In AMS; bewaartermijnen leeg", "Terugvalformulier; rapport in het QMS; bewaartermijnen ingevuld (besluit 17, 18)", "Aantoonbaarheid"],
    ["Ongewijzigd", "Frequenties; bezoek bij voorkeur niet of kort van tevoren aankondigen; direct gevaarlijke situaties stoppen en melden; afgerond pas na verificatie; bespreking op maandag; trendanalyse als input voor directiebeoordeling en programma", "Overgenomen", "Voldoet"],
], [1700, 2300, 2964, 2100], first_bold=True)

# ============================================================ 6
h1("6. Dekking van de VCA-eisen 7.1 en 7.2")
p("De eerste kolom geeft de eis verkort weer, met onze eigen letters; de volledige tekst staat in 5.2. 'Rapport' zijn "
  "de negen onderdelen van het WPI-rapport (bijlage 1), 'dashboard' de onderdelen van het WPI-dashboard (bijlage 2, in "
  "aanbouw).")
DW = [2600, 1500, 2664, 2300]
tbl([
    ["Minimumeis (verkort; volledige tekst in 5.2)", "Procedure", "Waar zichtbaar", "Bewijsstuk voor de auditor"],
    ["7.1a-1 Procedure beschrijft de uitvoering van de inspecties", "5.6, 5.10", "Rapport: volgt de negen onderdelen", "Procedure; een rapport dat de werkwijze volgt"],
    ["7.1a-2 Procedure beschrijft de positieve bevindingen", "5.3, 5.6", "Rapport: onderdeel 5. Dashboard: oordelen", "Procedure 5.3 en 5.6; onderdeel 5 van elk rapport"],
    ["7.1a-3 Procedure beschrijft de opvolging van waargenomen verbeterpunten", "5.8", "Rapport: onderdeel 6. Dashboard: acties", "Procedure 5.8; actieoverzicht; verslagen coördinatorenoverleg"],
    ["7.1a-4 Procedure beschrijft het gebruik van de checklist", "5.3, 5.6", "Rapport: onderdelen 3 en 4 met alle regels van de taak. Dashboard: TRA-maatregelen", "Procedure 5.6; kennisbank; onderdelen 3 en 4"],
    ["7.1b Ten minste eenmaal per maand per operationele werkplek door operationeel leidinggevenden", "5.4, 5.5", "Rapport: onderdeel 1 (inspecteur, functie, datum, locatie). Dashboard: programma", "Inspectieprogramma; rapporten per maand per coördinator"],
    ["7.1b voetnoot 10 Programma voor werk van korte duur, naar verhouding, rekening houdend met de risico's", "5.5 (keuzekader)", "Dashboard: programma en blinde vlekken; kwartaaloverzicht gestart, met risicokenmerk, geïnspecteerd", "Procedure 5.5; kwartaaloverzicht met de noemer uit de projectplanning"],
    ["7.1c Kan door operationele medewerkers onder verantwoordelijkheid van een operationeel leidinggevende", "5.6 (keuzekader)", "Rapport: onderdeel 1, veld Verantwoordelijke coördinator (voorgesteld veld)", "Procedure 5.6; rapport met dat veld, als het is toegepast"],
    ["7.1d-1 Verslag met positieve bevindingen", "5.6, 5.7", "Rapport: onderdeel 5; Conform in 3 en 4", "Elk WPI-rapport"],
    ["7.1d-2 Verslag met geconstateerde afwijkingen", "5.7", "Rapport: onderdelen 3, 4 en 6", "Elk WPI-rapport"],
    ["7.1d-3 Verslag met uit te voeren verbeteracties", "5.7", "Rapport: onderdeel 6", "Elk WPI-rapport"],
    ["7.1d-4 Verslag met uitvoeringsverantwoordelijken", "5.7", "Rapport: onderdeel 6, actiehouder", "Elk WPI-rapport"],
    ["7.1d-5 Verslag met de tijdsduur voor de uitvoering", "5.7", "Rapport: onderdeel 6, prioriteit en termijn", "Elk WPI-rapport"],
    ["7.1e-1 Actieplan met actiepunten uit de inspecties", "5.8", "Rapport: onderdelen 6 en 9. Dashboard: acties", "Actieoverzicht (elk kwartaal als pdf in het QMS)"],
    ["7.1e-2 Actieplan met verantwoordelijken voor uitvoering en toetsing", "5.8", "Rapport: onderdeel 6, actiehouder en toetser. Dashboard: acties", "Actieoverzicht; afgeronde acties met toetser en getoetst op"],
    ["7.1e-3 Actieplan met tijdsplanning", "5.7, 5.8", "Rapport: onderdeel 6, termijn. Dashboard: acties (termijn, status, te laat)", "Actieoverzicht; verslagen coördinatorenoverleg met actienummers"],
    ["7.1f Directieleden nemen minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie", "5.4, 5.5", "Rapport: onderdeel 1, soort inspectie. Dashboard: programma", "Per kwartaal een rapport 'VGM-inspectie directie'"],
    ["7.1 Document: procedure en inspectieprogramma", "Geheel; 5.5", "Dashboard: programma", "Procedure versie 2.0 en programma in het QMS"],
    ["7.1 Document: verslagen en de follow-up hiervan", "5.7, 5.8, 5.11", "Rapport zelf. Dashboard: acties", "Rapporten, actieoverzicht en overlegverslagen in het QMS"],
    ["7.2 Trendanalyse van positieve en negatieve bevindingen", "5.9", "Rapport: onderdeel 9 (bron). Dashboard: oordelen, classificatie", "Trendanalyse WPI's [jaar]"],
    ["7.2 Doelstelling: basisoorzaken van structurele verbetermogelijkheden", "5.9", "Dashboard: TRA-maatregelen; oorzaak is een voorgesteld veld", "Trendanalyse: meest afwijkende maatregelen en herhaalde bevindingen"],
    ["7.2a Bevindingen worden geclassificeerd", "5.9", "Rapport: klasse bij elke regel in 3, 4, 6 en 9. Dashboard: classificatie", "Elk rapport; de veertien klassen in 5.9"],
    ["7.2b Jaarlijkse trendanalyse, inclusief te ondernemen acties en follow-up", "5.9", "Dashboard: alle onderdelen; acties uit de analyse onder acties", "Trendanalyse met acties en de stand van de acties van het vorige jaar; verslag directiebeoordeling"],
    ["7.2 Documenten: trendanalyse; overzicht verbeteracties", "5.9, 5.11", "Dashboard: acties", "Trendanalyse en actieoverzicht in het QMS"],
], DW)
p("Twee punten zijn bij de eerstvolgende audit nog niet hard: 7.1c rust op een veld dat nog niet in het voorbeeldrapport "
  "zit, en een trendanalyse over een heel jaar met follow-up bestaat bij invoering per 1 januari 2027 pas in januari "
  "2028. Tot dan tonen we de procedure, het dashboard en een eerste analyse over de periode sinds de start.")

# ============================================================ 7
h1("7. Risico's en open punten")
tbl([
    ["Onderwerp", "Wat er mis kan gaan", "Wat we eraan doen", "Nog open"],
    ["Afhankelijk van AI", "Claude koppelt een waarneming aan de verkeerde regel of vat iets anders samen dan bedoeld", "De inspecteur geeft elk oordeel zelf en bevestigt de samenvatting; zijn waarneming staat in zijn eigen woorden in het rapport", "Hoe vaak het misgaat: in de proef tellen we de correcties per rapport"],
    ["Eén leverancier", "App, prijs of voorwaarden veranderen; de dienst valt uit", "Terugvalformulier en Word-sjabloon (5.10); rapporten maandelijks in het QMS; de kennisbank bestaat uit gewone tekstbestanden", "Formulier en sjabloon bestaan nog niet"],
    ["Eén gedeeld account", "Niet vast te stellen wie een rapport maakte; iedereen kan alle chats en rapporten zien en wijzigen", "De inspecteur noemt zijn naam en bevestigt; de pdf in het QMS is de vaste versie; wachtwoord wijzigen bij vertrek", "Zijn persoonlijke accounts mogelijk, en past dit binnen het AI-beleid van Noardling? Navragen bij IT (besluit 20)"],
    ["AVG: foto's en namen", "Personen herkenbaar op een foto; foto's van de locatie van een opdrachtgever bij een externe dienst; een afwijking in een ploeg van twee is te herleiden", "Geen gezichten in beeld; namen alleen in de kop; acties op functie", "Mag fotograferen bij elke opdrachtgever? Voorwaarden van het account laten toetsen. Monteurs vooraf informeren; nagaan of de OR geïnformeerd moet worden"],
    ["De inspecteur spreekt weinig in", "Een rapport met vooral 'Geen afwijking waargenomen' zegt even weinig als de oude checklist", "Het rapport toont waargenomen, alleen bevestigd en niet beoordeeld; Claude vult niets aan", "Een ondergrens stellen? Eerst zien wat de proef laat zien"],
    ["Spraak en foto's op de telefoon", "Spraakherkenning verstaat vaktermen, dialect en wind slecht; uploaden lukt niet bij zwak bereik; lange chats worden traag", "Terugvalformulier; achteraf invoeren", "Niet getest. In de proef: één WPI bij slecht weer, één bij zwak bereik, één met een lange taak en veel foto's"],
    ["Kennisbank en TRA", "De kennisbank loopt achter op een gewijzigde TRA. Sommige regels hebben een maatregel waar weinig aan te toetsen valt ('Standaard maatregel'). De risicoscore zit niet in de kennisbank", "Bijwerken binnen twee weken (5.11); het rapport gaat de versie van de kennisbank vermelden", "Bijwerken opnemen in de Methodiek TRA; lijst van regels zonder toetsbare maatregel; scores later toevoegen. Eerdere acties tonen bij de start (veld E1) is niet gebouwd en niet getest"],
], [1500, 2600, 2564, 2400], first_bold=True)

# ============================================================ 8
h1("8. Te nemen besluiten en de proef")
h2("8.1 Te nemen besluiten")
p("Alles in deze tabel is een voorstel. De nummers komen terug in de tekst als (besluit n).")
tbl([
    ["Nr", "Besluit", "Voorstel", "Wie beslist"],
    ["1", "Proef", "16 november t/m 18 december 2026; twee Montage Coördinatoren (elk drie WPI's) en één directielid (één): zeven WPI's. Een proef-WPI telt als de WPI van die maand", "Hoofd S&M; directie over eigen deelname"],
    ["2", "Vast te leggen gegevens", "Bijlage A, inclusief de voorgestelde velden; na de proef schrappen wat niet werkt", "Hoofd S&M met coördinatoren"],
    ["3", "Onderaannemers", "Alleen bevindingen over eigen monteurs vastleggen (5.1)", "Hoofd S&M"],
    ["4", "Model voor de oordelen", "Conform, Afwijking en Verbeterpunt alleen met eigen waarneming; 'Geen afwijking waargenomen' alleen via de afsluitvraag", "Hoofd S&M"],
    ["5", "Verplichte uitkomsten", "Elke afwijking en elk verbeterpunt, ook buiten de TRA, leidt tot een actie met bevinding en verbeteractie apart; minimaal één 'wat ging opvallend goed' of uitdrukkelijk 'niets'", "Hoofd S&M"],
    ["6", "Classificatie", "Veertien klassen; vaste klasse per risicoregel; Buiten TRA als vlag", "Hoofd S&M"],
    ["7", "Definities", "Werk van korte duur is korter dan een maand; operationeel leidinggevende is de Montage Coördinator en het Hoofd S&M; overige definities in 5.3", "Hoofd S&M"],
    ["8", "Programma bij werk van korte duur", "Drie regels in 5.5; noemer uit de projectplanning; kwartaaloverzicht. Kan meer WPI's vragen dan één per coördinator per maand", "Hoofd S&M"],
    ["9", "Gemiste maand", "Bespreken in het coördinatorenoverleg en de maand erna inhalen", "Hoofd S&M"],
    ["10", "Directie-inspectie", "Op een projectlocatie; 'of in de werkplaats' uit versie 1.0 vervalt", "Directie"],
    ["11", "Aankondigen", "Minimaal een derde onaangekondigd; het rapport vermeldt het", "Hoofd S&M"],
    ["12", "Inspectie door een monteur", "Toegestaan, met veld Verantwoordelijke coördinator; telt niet voor diens maandnorm", "Hoofd S&M"],
    ["13", "Toetser", "Standaard het Hoofd S&M; is hij zelf actiehouder, dan de inspecteur; bij direct gecorrigeerd de inspecteur ter plaatse. Toetser en actiehouder nooit dezelfde; QHSE-Manager is geen actiehouder", "Hoofd S&M met directie"],
    ["14", "Termijnen en status", "Planmatig uiterlijk einde volgend kwartaal; escalatie bij meer dan twee weken te laat; status Vervallen met reden", "Hoofd S&M"],
    ["15", "Actiestatus bijwerken", "Elke maandag in het coördinatorenoverleg, door het Hoofd S&M of een coördinator namens hem, in de WPI-projectmap", "Hoofd S&M"],
    ["16", "Rol QHSE-Manager en kennisbank", "Ondersteunend: beheert de kennisbank namens het Hoofd S&M, binnen twee weken na wijziging van een TRA; actuele en vorige versie bewaren. Het uitgangspunt was dat QHSE hooguit ondersteunt; dit beheer is een vaste taak", "Hoofd S&M met QHSE-Manager"],
    ["17", "Terugvaloptie", "Formulier en Word-sjabloon maken vóór de start; achteraf invoeren binnen twee werkdagen", "Hoofd S&M"],
    ["18", "Opslag en bewaartermijn", "Rapporten maandelijks en actieoverzicht per kwartaal in het QMS; vijf jaar bewaren (langer dan één certificatieperiode)", "Hoofd S&M met QHSE-Manager"],
    ["19", "Trendanalyse", "In januari over het afgelopen kalenderjaar", "Hoofd S&M; directie"],
    ["20", "Account, foto's en AVG", "Navragen bij IT en laten toetsen; tot dan geen gezichten op foto's", "Directie"],
    ["21", "Evaluatie en AMS", "Evaluatie op maandag 21 december 2026 in het coördinatorenoverleg. Bij een positieve uitkomst vervalt AMS voor WPI's per 1 januari 2027 en wordt de procedure vastgesteld; bij twijfel verlengen met het eerste kwartaal", "Hoofd S&M"],
], [500, 2100, 4564, 1900])

h2("8.2 De proef: waar we op letten")
p("Zeven WPI's over minimaal vier producten, waarvan één bij slecht weer, één bij zwak bereik en één bewust korte. "
  "Vooraf nemen we bij twee WPI's in AMS de tijd op.")
tbl([
    ["Vraag", "Hoe we het meten", "Tevreden als"],
    ["Kost het de inspecteur meer moeite?", "Duur van de inspectie naast de twee gemeten WPI's in AMS; tijd voor nalezen; oordeel van de inspecteur na elke WPI", "Niet langer op locatie dan nu; nalezen binnen tien minuten; inspecteurs vinden het niet zwaarder"],
    ["Gaat het dieper?", "Aantal waargenomen regels per rapport, naast alleen bevestigd en niet beoordeeld", "Elk rapport heeft minimaal één positieve bevinding en één waargenomen TRA-regel"],
    ["Klopt wat Claude vastlegt?", "Aantal correcties per rapport", "Nergens een waarneming of oordeel dat de inspecteur niet gaf"],
    ["Werkt het op de telefoon?", "Opmerkingen van de inspecteur; aantal keren terugvalformulier", "Spraak is buiten bruikbaar, of het formulier vangt het op"],
    ["Voldoet elk rapport aan VCA 7.1?", "Controle op de vijf elementen van het inspectieverslag", "Zeven van de zeven"],
], [2400, 3664, 3000], first_bold=True)
p("Zijn de rapporten goed, dan leggen we er twee met de procedure voor aan de certificerende instelling.", space_after=0)

# ============================================================ Bijlage A
add(pagebreak())
h1("Bijlage A. Vast te leggen gegevens per WPI")
p("'(voorgesteld)' betekent: nog niet in het voorbeeldrapport of de skill; onderdeel van besluit 2. 'Verplicht' betekent "
  "dat Claude het rapport niet afrondt voordat het veld een waarde heeft. 'Bedient' verwijst naar de VCA-eis (letters "
  "zoals in hoofdstuk 6) en naar de trends uit hoofdstuk 4. Er zijn geen velden over onderaannemers of derden.")
VW = [2500, 2764, 1300, 1100, 1400]
KV = ["Veld", "Waarom", "Verplicht", "Bedient", "Kost de inspecteur"]
V = "\n(voorgesteld)"


def veld(titel, rijen):
    add(_kn(para(titel, bold=True, size=20, space_after=40)))
    tbl([KV] + rijen, VW)


veld("A.1 Kop en start", [
    ["K1 WPI-nummer\nWPI-JJJJMMDD-productcode-initialen", "Eén sleutel voor rapport, foto's en acties", "Automatisch", "7.1d, 7.1e", "Niets"],
    ["K2 Inspecteur en functie", "Toont wie inspecteert; nodig omdat iedereen hetzelfde account gebruikt", "Ja", "7.1b, 7.1f; T1", "Naam noemen"],
    ["K3 Soort inspectie\nWPI coördinator / VGM-inspectie directie", "Scheidt de maandelijkse WPI van de kwartaalinspectie van de directie", "Ja", "7.1b, 7.1f; T1", "Eén woord"],
    ["K4 Verantwoordelijke coördinator" + V, "Alleen als een monteur inspecteert: onder wiens verantwoordelijkheid", "Alleen bij inspectie door een monteur", "7.1c", "Eén naam"],
    ["K5 Deelnemend directielid" + V, "Loopt een directielid mee met een coördinator, dan telt de WPI ook voor de kwartaaleis", "Alleen als het speelt", "7.1f; T1", "Eén naam"],
    ["K6 Datum, begin- en eindtijd", "Datum voor het programma; de duur laat zien wat een WPI kost", "Automatisch", "7.1b; T1, T13", "Niets"],
    ["K7 Opdrachtgever, locatie, projectnummer", "Welke werkplek is geïnspecteerd; koppeling met de projectplanning", "Ja", "7.1b; T2", "Inspreken"],
    ["K8 Werk van korte duur" + V + "\nja / nee", "Onderbouwt het programma voor kort werk. Het risicokenmerk (hijsen, besloten ruimte, open water) volgt uit de klassen van de taak", "Ja", "7.1b voetnoot 10; T2", "Eén woord"],
    ["K9 Aangekondigd of niet" + V, "De procedure vraagt dat het rapport het vermeldt. Geen trend: de aantallen zijn te klein", "Ja", "Procedure 5.6", "Eén woord"],
    ["K10 Aanwezige monteurs", "Aantal, en namen voor de terugkoppeling. Namen staan alleen hier", "Ja (aantal)", "7.1d", "Inspreken"],
    ["K11 Omstandigheden", "Context bij bevindingen, bijvoorbeeld een nat dek", "Nee", "Context", "Eén zin"],
    ["K12 Invoerwijze" + V + "\nop locatie / achteraf vanaf terugvalformulier", "Laat zien hoe vaak de terugvaloptie nodig is", "Ja", "T13", "Eén woord"],
    ["E1 Eerdere acties en afwijkingen opnieuw bekeken" + V, "Claude toont open acties en eerdere afwijkingen op dit product of deze locatie. Levert verificatie van acties en herhaalde bevindingen op", "Alleen als er iets openstaat", "7.1e; T9, T11", "Per punt: bekeken ja / nee, en wat hij zag"],
])
veld("A.2 Product, taak en voorbereiding", [
    ["P1 Product", "Bepaalt welke TRA geldt", "Ja", "7.1a-4; T14", "Product noemen"],
    ["P2 Fase en taak", "Bepaalt welke risicoregels de checklist vormen", "Ja", "7.1a-4; T5, T14", "Kiezen uit wat Claude toont"],
    ["P3 Versie van de kennisbank" + V, "Toont tegen welke versie van de TRA is getoetst", "Automatisch", "7.1a-4", "Niets"],
    ["V1 VGM-projectplan op locatie en bekend" + V + "\nja / nee / n.v.t.", "Vaste vraag onder onderwerp A; in het voorbeeldrapport staat dit in de vrije waarneming", "Ja", "T17", "Eén woord"],
    ["V2 TRA van dit product beschikbaar" + V + "\nja / nee", "Een TRA die de monteurs niet kennen, werkt niet", "Ja", "T17", "Eén woord"],
    ["V3 Werkvergunning aanwezig en geldig" + V + "\nja / nee / niet vereist", "Controle op de voorbereiding", "Ja", "T17", "Eén woord"],
    ["V4 LMRA gedaan vóór aanvang" + V + "\nja / nee", "De WPI is het moment waarop we zien of de LMRA gebeurt", "Ja", "T17", "Navragen bij de monteurs"],
])
veld("A.3 Algemene observatie en taakgerichte toetsing", [
    ["O1 Oordeel per onderwerp A t/m I", "Alle negen onderwerpen krijgen een oordeel volgens het model in hoofdstuk 3", "Ja; desnoods via de afsluitvraag", "7.1d; T3, T4", "Eén woord per onderwerp"],
    ["O2 Waarneming per onderwerp", "Wat de inspecteur zag, in zijn woorden", "Bij Conform, Afwijking, Verbeterpunt", "7.1d; T12", "Eén of twee zinnen"],
    ["R1 TRA-regel", "Vast nummer, bijvoorbeeld DAM-2.03; met de vaste klasse uit de kennisbank", "Automatisch", "7.1a-4, 7.2a; T5, T15", "Niets"],
    ["R2 Oordeel per regel", "Komt van de inspecteur; Claude vraagt ernaar", "Ja, voor elke regel van de taak", "7.1d, 7.2a; T3, T5", "Eén woord, of de afsluitvraag"],
    ["R3 Waarneming per regel", "Wat de inspecteur zag", "Bij Conform, Afwijking, Verbeterpunt", "7.1d; T12", "Eén of twee zinnen"],
    ["R4 Betrokken maatregel en niveau" + V + "\ncollectief / individueel / PBM", "Welke maatregel uit de regel ontbrak; het niveau staat in de TRA", "Bij Afwijking en Verbeterpunt", "T6", "Aanwijzen welke maatregel"],
    ["R5 Oorzaak" + V + "\nniet bekend / middel niet beschikbaar / maatregel hier niet werkbaar / niet geregeld in de voorbereiding / tijdsdruk / gewoonte", "De oorzaak bepaalt de soort actie: instructie, middelen, voorbereiding of de TRA aanpassen", "Bij Afwijking", "7.2 doelstelling; T7", "Eén antwoord op één vraag"],
    ["R6 Waarneming buiten de TRA", "Vlag naast een gewone klasse; signaal dat de TRA een risico mist", "Alleen als het speelt", "T8", "Eén of twee zinnen"],
])
veld("A.4 Foto's en gesprek", [
    ["F1 Fotonummer", "Verwijzing in het rapport", "Automatisch", "7.1d", "Niets"],
    ["F2 Toelichting", "Een foto zonder uitleg bewijst niets", "Ja, per foto", "7.1d", "Eén zin per foto"],
    ["F3 Koppeling aan onderwerp of regel", "De foto staat bij de bevinding", "Ja; Claude stelt voor", "7.1d", "Bevestigen"],
    ["F4 Herkenbare personen in beeld" + V, "Claude meldt een herkenbaar gezicht; de inspecteur beslist of de foto blijft", "Automatisch", "AVG", "Alleen bij een melding"],
    ["G1 Wat is besproken en de reactie", "Laat zien dat de bevindingen met de monteurs zijn besproken en of zij ze herkennen", "Ja", "7.1a-1; T16", "Twee of drie zinnen"],
    ["G2 Ideeën van de monteurs", "Verbetervoorstellen van de werkvloer", "Nee", "T16", "Eén zin per idee"],
    ["G3 Idee opnemen als actie\nja / nee", "Een idee dat actie wordt krijgt bron 'Idee monteurs'", "Als G2 is ingevuld", "7.1e; T9, T16", "Eén woord"],
])
veld("A.5 Bevindingen en acties", [
    ["B1 Actienummer\nWPI-nummer plus volgnummer", "Terug te vinden in rapport, dashboard en overleg", "Automatisch", "7.1e; T9", "Niets"],
    ["B2 Bevinding", "Wat er aan de hand is; apart van de verbeteractie vastgelegd", "Ja", "7.1d", "Staat in de waarneming"],
    ["B3 Classificatie", "Vaste klasse van de regel, of bij een algemeen onderwerp door Claude voorgesteld", "Ja", "7.2a; T3", "Niets of bevestigen"],
    ["B4 Prioriteit\ndirect / kort / planmatig", "Bepaalt de termijn; komt van de inspecteur", "Ja", "7.1d; T9", "Eén woord"],
    ["B5 Direct gecorrigeerd\nja / nee", "Opgelost op locatie of nog te doen", "Ja", "7.1d; T10", "Eén woord"],
    ["B6 Werk stilgelegd" + V + "\nja / nee", "De zwaarste ingreep van een inspecteur hoort zichtbaar te zijn", "Bij prioriteit direct", "T10", "Eén woord"],
    ["B7 Verbeteractie", "Wat er moet gebeuren; ook bij direct gecorrigeerd (wat ter plaatse is gedaan)", "Ja", "7.1d, 7.1e", "Eén zin"],
    ["B8 Actiehouder (functie)", "Wie de actie uitvoert; nooit de QHSE-Manager", "Ja", "7.1d, 7.1e; T9", "Eén functie"],
    ["B9 Toetser", "Stelt vast dat de verbeteractie is uitgevoerd. Standaard het Hoofd S&M; is hij actiehouder, dan de inspecteur; bij direct gecorrigeerd de inspecteur ter plaatse. Nooit de actiehouder", "Ja", "7.1e", "Niets, of een andere functie"],
    ["B10 Termijn (datum)", "Wanneer het klaar moet zijn", "Ja", "7.1d, 7.1e; T9", "Eén datum"],
    ["B11 Status\nopen / in behandeling / afgerond / vervallen", "Follow-up; bijgewerkt in het coördinatorenoverleg; afgerond pas na toetsing", "Automatisch 'open'", "7.1e; T9", "Niets tijdens de WPI"],
    ["B12 Bron\nInspectie / Idee monteurs", "Onderscheidt bevindingen van ideeën", "Automatisch", "T16", "Niets"],
    ["B13 Getoetst op (datum)", "Datum waarop de toetser vaststelde dat de verbeteractie is uitgevoerd; pas dan Afgerond", "Bij afronden", "7.1e; T9", "Niets, behalve bij direct gecorrigeerd"],
    ["B15 Wijze van verificatie" + V + "\nfoto / document / gezien bij volgende WPI", "Bewijs hoe de toetser het vaststelde; in het dashboard", "Bij afronden", "7.1e; T9", "Niets tijdens de WPI"],
    ["B14 Wat ging opvallend goed", "Positieve bevinding die niet aan één regel hangt", "Ja: minimaal één, of 'niets'", "7.1a-2, 7.1d; T12", "Eén zin"],
])
veld("A.6 Afsluiting en afgeleide gegevens", [
    ["S1 Antwoord op de afsluitvraag", "Geeft elke overgebleven regel 'Geen afwijking waargenomen' of 'Niet beoordeeld'", "Ja", "7.1d; T13, T15", "Eén antwoord"],
    ["S2 Bevestiging van de samenvatting", "De inspecteur staat in voor de inhoud", "Ja", "7.1d", "Eén woord"],
    ["S3 Opmerking over de methode" + V, "Wat hield op: spraak, volgorde, vragen. Alleen in de proef", "In de proef", "Evaluatie", "Eén zin"],
    ["A1 Niveau per regel\nwaargenomen / alleen bevestigd / niet beoordeeld", "Afgeleid van het oordeel, geen apart veld. Laat zien waar feitelijk is gekeken", "Automatisch", "7.1d; T13, T15", "Niets"],
    ["A2 Aantallen per oordeel en per niveau", "Kopcijfers in de samenvatting", "Automatisch", "7.2; T3, T4", "Niets"],
    ["A3 Herhaalde bevinding" + V, "Zelfde regel of klasse eerder afwijkend op dit product of deze locatie; uit E1 en het dashboard", "Automatisch", "T11", "Niets"],
    ["A4 Risicoscore van de regel" + V + ", voor later", "Om blinde vlekken te wegen: een nooit waargenomen maatregel bij een hoog risico telt zwaarder. De kennisbank bevat de scores nu niet", "Automatisch", "T15", "Niets"],
])
p("Tegenover het voorbeeldrapport vragen de voorgestelde velden van de inspecteur: drie woorden in de kop (K8, K9, "
  "K12), vier keer ja of nee over de voorbereiding (V1–V4) en bij elke afwijking twee korte antwoorden (R4, R5). De "
  "overige zijn automatisch of spelen alleen in bijzondere gevallen. Dit is een verwachting; de proef meet de duur.")

# ============================================================ build
UIT = "/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx"
TPL = f"{BW}/sjabloon_v3.docx"


def maak_sjabloon():
    """Sjabloon met paginanummer in de voettekst en doorlopende nummering vanaf de omslag."""
    d = f"{BW}/_tpl"
    if os.path.exists(d):
        shutil.rmtree(d)
    subprocess.run(["unzip", "-q", f"{BW}/sjabloon.docx", "-d", d], check=True)
    f = f"{d}/word/footer1.xml"
    x = open(f, encoding="utf-8").read()
    rpr = '<w:rPr><w:color w:val="808080"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr>'

    def fld(code):
        return (f'<w:r>{rpr}<w:fldChar w:fldCharType="begin"/></w:r><w:r>{rpr}<w:instrText xml:space="preserve"> {code} </w:instrText></w:r>'
                f'<w:r>{rpr}<w:fldChar w:fldCharType="separate"/></w:r><w:r>{rpr}<w:t>1</w:t></w:r><w:r>{rpr}<w:fldChar w:fldCharType="end"/></w:r>')
    nieuw = (f'<w:r>{rpr}<w:t xml:space="preserve">Pagina </w:t></w:r>'
             + fld("PAGE") + f'<w:r>{rpr}<w:t xml:space="preserve"> van </w:t></w:r>' + fld("NUMPAGES"))
    assert x.count("<w:r><w:tab/></w:r>") == 1
    x = x.replace("<w:r><w:tab/></w:r>", nieuw + "<w:r><w:tab/></w:r>")
    open(f, "w", encoding="utf-8").write(x)
    f = f"{d}/word/document.xml"
    x = open(f, encoding="utf-8").read()
    assert x.count('<w:pgNumType w:start="0"/>') == 1
    x = x.replace('<w:pgNumType w:start="0"/>', "")
    open(f, "w", encoding="utf-8").write(x)
    if os.path.exists(TPL):
        os.remove(TPL)
    subprocess.run(f'cd "{d}" && zip -Xrq "{TPL}" .', shell=True, check=True)


maak_sjabloon()
build(template=TPL, title="Nieuwe methode\nwerkplekinspecties", subtitle="Voorstel voor een proef",
      body_xml="\n".join(B).replace('<w:top w:w="60" w:type="dxa"/>', '<w:top w:w="35" w:type="dxa"/>').replace('<w:bottom w:w="60" w:type="dxa"/>', '<w:bottom w:w="35" w:type="dxa"/>'), output=UIT, cover_size=56, work=f"{BW}/_nb_build")
