#!/usr/bin/env python3
# Voorstel nieuwe methode werkplekinspecties, ronde 4. Gebruik: bouw_v4.py [toc.json]
import sys, os, json, re, shutil, subprocess
S = "/root/.claude/skills/synced/134f4af9-00ba-492e-80f4-f185b433f298_fafc370e-ca1f-402c-83bc-47a084adb998/noardling-docx-bouwer/scripts"
sys.path.insert(0, S)
from noardling_docx import *
from noardling_docx import _cel, _runs, _rpr, _next_id, _esc

W = 9064
BODY = 18      # 9 pt
TAB = int(os.environ.get("TAB", "18"))   # 9 pt; 17 = 8,5 pt
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
    kw.setdefault("space_after", 80)
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


def kader(text, lijn, vulling, label, heel=True, inline=False):
    kl = "<w:keepLines/>" if heel else ""
    ppr = (f'<w:pStyle w:val="{STIJL_BODY}"/>{kl}<w:pBdr>'
           f'<w:top w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/>'
           f'<w:left w:val="single" w:sz="18" w:space="8" w:color="{lijn}"/>'
           f'<w:bottom w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/>'
           f'<w:right w:val="single" w:sz="4" w:space="4" w:color="{lijn}"/></w:pBdr>'
           f'<w:shd w:val="clear" w:color="auto" w:fill="{vulling}"/>'
           f'<w:spacing w:before="40" w:after="100"/><w:ind w:left="140" w:right="140"/>')
    sep = _runs(" ", size=BODY) if inline else f'<w:r>{_rpr()}<w:br/></w:r>'
    runs = _runs(label, bold=True, color=lijn, size=BODY) + sep + _runs(text, size=BODY)
    add(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{ppr}</w:pPr>{runs}</w:p>')


def vca(t, label, inline=False, heel=True):
    kader(t, BLAUW, VULLING_BLAUW, label, heel=heel, inline=inline)


def keuze(t, label, inline=False):
    kader(t, LIJN_ORANJE, VULLING_ORANJE, label, heel=True, inline=inline)


def toc():
    """Echt TOC-veld met vooraf ingevulde regels; paginanummers uit de vorige render."""
    regels = [(k, TOCNR.get(k, "")) for k in TOC_KOPPEN]
    sub = set(TOC_SUB)
    out = []
    for i, (k, nr) in enumerate(regels):
        ppr = (f'<w:pPr><w:pStyle w:val="{STIJL_BODY}"/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="{W}"/></w:tabs>'
               '<w:spacing w:after="10"/>' + ('<w:ind w:left="300"/>' if k in sub else '') + '</w:pPr>')
        begin = ""
        if i == 0:
            begin = ('<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                     '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r>'
                     '<w:r><w:fldChar w:fldCharType="separate"/></w:r>')
        eind = '<w:r><w:fldChar w:fldCharType="end"/></w:r>' if i == len(regels) - 1 else ""
        run = (f'<w:r>{_rpr(size=18)}<w:t xml:space="preserve">{_esc(k)}</w:t></w:r>'
               f'<w:r>{_rpr(size=18)}<w:tab/><w:t>{nr}</w:t></w:r>')
        out.append(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777">{ppr}{begin}{run}{eind}</w:p>')
    add("".join(out))


TOC_SUB = ["5.1 Eisen uit de VCA", "5.2 Doel en toepassingsgebied", "5.3 Definities en oordelen",
           "5.4 Verantwoordelijkheden", "5.5 Inspectieprogramma per werkplek", "5.6 Uitvoering in negen stappen",
           "5.7 Inspectie door een monteur", "5.8 Inspectieverslag en opvolging van acties",
           "5.9 Classificatie en trendanalyse", "5.10 Als Claude niet beschikbaar is", "5.11 Registraties",
           "5.12 Gewijzigd ten opzichte van versie 1.0"]
TOC_KOPPEN = (["Samenvatting", "1. Aanleiding en wat er verandert", "2. Zo verloopt een WPI",
               "3. Wat we per WPI vastleggen", "4. Welke trenddata dit oplevert",
               "5. Procedure Werkplekinspecties, versie 2.0 concept"] + TOC_SUB +
              ["6. Dekking van de VCA-eisen 7.1 en 7.2", "7. Risico's en randvoorwaarden",
               "8. Te nemen besluiten en de proef", "Bijlage A. Vast te leggen gegevens per WPI"])
json.dump(TOC_KOPPEN, open(f"{BW}/toc_keys.json", "w"), ensure_ascii=False)


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



# ============================================================ velden en trends (één bron, wederkerig)
V = " (voorgesteld)"
# code: (titel, waarden, waarom, verplicht, vca, kost, voorgesteld)
VELDEN = {
 "E.1 Kop en start": [
  ("K1", "WPI-nummer", "WPI + datum + productcode + initialen", "Eén sleutel voor rapport, foto's, acties en de chatnaam", "Automatisch", "7.1d, 7.1e", "Niets", False),
  ("K2", "Inspecteur en functie", "", "Toont wie inspecteert en wie het rapport bevestigt", "Ja", "7.1b, 7.1f", "Naam noemen", False),
  ("K3", "Soort inspectie", "WPI coördinator / WPI Hoofd S&M / WPI monteur / VGM-inspectie directie", "Scheidt de normen per inspecteur; 'WPI monteur' en 'WPI Hoofd S&M' zijn nieuw", "Ja", "7.1b, 7.1c, 7.1f", "Eén woord", False),
  ("K4", "Verantwoordelijke coördinator", "", "Bij een WPI door een monteur: onder wiens verantwoordelijkheid", "Bij WPI monteur", "7.1c", "Eén naam", True),
  ("K5", "Deelnemend directielid", "", "Loopt een directielid mee, dan telt de WPI voor de coördinator, het directielid en de werkplek (besluit 12)", "Als het speelt", "7.1f", "Eén naam", True),
  ("K6", "Datum, begin- en eindtijd", "", "Datum voor het programma; de duur laat zien wat een WPI kost", "Automatisch", "7.1b", "Niets", False),
  ("K7", "Opdrachtgever, locatie, projectnummer", "bij service zonder project: order- of klantnummer", "Welke werkplek is geïnspecteerd, ook in het buitenland; koppeling met het programma. Opdrachtgever en locatie leidt Claude af uit het project", "Ja (projectnummer)", "7.1b", "Inspreken", False),
  ("K8", "Werk van korte duur", "ja / nee", "Bepaalt welke regel van het programma geldt", "Ja", "7.1b voetnoot 10", "Eén woord", True),
  ("K9", "Risicokenmerk van het geplande werk", "mobiele kraan / besloten ruimte met vergunning / open water zonder vaste randbeveiliging / geen", "Onderbouwt het programma voor korte projecten (A.5)", "Ja", "7.1b voetnoot 10", "Eén woord", True),
  ("K10", "Aangekondigd of niet", "", "De procedure vraagt dat het rapport het vermeldt (A.6). Geen trend: de aantallen zijn te klein", "Ja", "", "Eén woord", True),
  ("K11", "Aanwezige monteurs", "", "Aantal, en namen voor de terugkoppeling. Namen staan alleen hier", "Nee; aantal afgeleid of ingesproken", "7.1d", "Inspreken", False),
  ("K12", "Omstandigheden", "", "Context bij bevindingen, bijvoorbeeld een nat dek", "Nee", "", "Eén zin", False),
  ("K15", "Ingang", "ingepland / spontaan", "Ingepland: kop vooraf gevuld uit het programma. Spontaan: telt mee voor het programma als hij op een verplichte werkplek en maand valt", "Ja", "7.1b", "Eén woord", False),
  ("K13", "Invoerwijze", "op locatie / achteraf vanaf terugvalformulier", "Laat zien hoe vaak de terugvaloptie nodig is", "Ja", "", "Eén woord", True),
  ("K14", "Eerdere acties en afwijkingen opnieuw bekeken", "", "Claude leest het actieoverzicht in de projectmap en toont open acties en eerdere afwijkingen op dit product of deze locatie", "Als er iets openstaat", "7.1e", "Per punt: bekeken ja / nee en wat hij zag", True),
 ],
 "E.2 Product, taak en voorbereiding": [
  ("P1", "Product", "", "Bepaalt welke TRA geldt", "Ja", "7.1a-4", "Product noemen", False),
  ("P2", "Taak en taakstap (getoetst tijdens bezoek)", "taakstap alleen waar de TRA die kent", "Bepaalt welke risicoregels Claude toont; komt als 'getoetst tijdens bezoek' in het rapport", "Ja", "7.1a-4", "Bevestigen wat Claude voorstelt", False),
  ("P3", "Versie van de kennisbank", "", "Toont tegen welke versie van de TRA is getoetst", "Automatisch", "7.1a-4", "Niets", True),
  ("V1", "VGM-projectplan op locatie en bekend", "ja / nee / n.v.t.", "Vraag onder onderwerp A, als geheugensteun; in het voorbeeldrapport staat dit in de vrije waarneming", "Nee: alleen als gezien", "", "Eén woord", True),
  ("V2", "TRA van dit product beschikbaar", "ja / nee", "Een TRA die de monteurs niet kennen, werkt niet","Nee: alleen als gezien", "", "Eén woord", True),
  ("V3", "Werkvergunning aanwezig en geldig", "ja / nee / niet vereist", "Controle op de voorbereiding","Nee: alleen als gezien", "", "Eén woord", True),
  ("V4", "LMRA gedaan vóór aanvang", "ja / nee", "De WPI is het moment waarop we zien of de LMRA gebeurt","Nee: alleen als gezien", "", "Navragen bij de monteurs", True),
 ],
 "E.3 Algemene observatie en taakgerichte toetsing": [
  ("O1", "Oordeel per algemeen onderwerp", "Conform / Afwijking / Verbeterpunt", "De onderwerpen A tot en met I zijn een geheugensteun; alleen wat gezien is krijgt een oordeel (A.3)", "Alleen bij wat gezien is", "7.1d", "Eén woord", False),
  ("O2", "Waarneming per onderwerp", "", "Wat de inspecteur zag, in zijn woorden", "Bij elk oordeel", "7.1d", "Eén of twee zinnen", False),
  ("TR1", "TRA-regel", "", "Vast nummer, bijvoorbeeld DAM-2.03, met de vaste klasse uit de kennisbank", "Automatisch", "7.1a-4, 7.2a", "Niets", False),
  ("TR2", "Oordeel per risicoregel die de inspecteur ziet", "Conform / Afwijking / Verbeterpunt / Niet van toepassing", "Komt van de inspecteur: één oordeel per regel. Bij meerdere maatregelen in de regel telt de slechtste (A > V > C). Wat hij niet ziet, wordt niet vastgelegd", "Bij elke regel die hij ziet", "7.1d, 7.2a", "Eén woord", False),
  ("TR3", "Waarneming per regel", "", "Wat de inspecteur zag", "Bij elk oordeel", "7.1d", "Eén of twee zinnen", False),
  ("TR4", "Gezien maatregel(en) en welke het oordeel bepaalde; niveau", "collectief / individueel / PBM", "Per regel: welke maatregel(en) de inspecteur zag en welke het oordeel bepaalde; het niveau staat in de TRA", "Bij elk oordeel", "", "Aanwijzen welke maatregel", True),
  ("TR5", "Oorzaak (vanaf de proef)", "niet bekend / middel niet beschikbaar / maatregel hier niet werkbaar / niet geregeld in de voorbereiding / tijdsdruk / gewoonte", "De oorzaak bepaalt de soort actie; bron voor de basisoorzaken in de trendanalyse", "Bij Afwijking", "7.2-doel", "Eén antwoord op één vraag", True),
  ("TR6", "Waarneming buiten de TRA", "", "Vlag naast een gewone klasse; signaal dat de TRA een risico mist", "Als het speelt", "", "Eén of twee zinnen", False),
 ],
 "E.4 Foto's en gesprek": [
  ("FO1", "Fotonummer", "", "Verwijzing in het rapport", "Automatisch", "7.1d", "Niets", False),
  ("FO2", "Toelichting", "", "Een foto zonder uitleg bewijst niets", "Ja, per foto", "7.1d", "Eén zin per foto", False),
  ("FO3", "Koppeling aan onderwerp of regel", "", "De foto staat bij de bevinding", "Ja; Claude stelt voor", "7.1d", "Bevestigen", False),
  ("FO4", "Herkenbare personen in beeld", "", "Claude meldt een herkenbaar gezicht; de inspecteur beslist of de foto blijft", "Automatisch", "", "Alleen bij een melding", True),
  ("GS1", "Wat is besproken en de reactie", "", "Laat zien dat de bevindingen met de monteurs zijn besproken", "Ja", "7.1a-1", "Twee of drie zinnen", False),
  ("GS2", "Ideeën van de monteurs", "", "Verbetervoorstellen van de werkvloer", "Nee", "", "Eén zin per idee", False),
  ("GS3", "Idee opnemen als actie", "ja / nee", "Een idee dat actie wordt krijgt bron 'Idee monteurs' en het oordeel van de regel waar het bij hoort", "Als GS2 is ingevuld", "7.1e", "Eén woord", False),
 ],
 "E.5 Bevindingen en acties": [
  ("AC1", "Actienummer", "WPI-nummer plus volgnummer", "Terug te vinden in rapport, dashboard en overleg", "Automatisch", "7.1e", "Niets", False),
  ("AC2", "Bevinding", "", "Wat er aan de hand is; apart van de verbeteractie. Eén actie is één verbeteractie", "Ja", "7.1d", "Niets extra", False),
  ("AC3", "Oordeel en classificatie", "", "Altijd die van de regel waar de actie bij hoort, ook bij een idee van de monteurs. Klasse vast per regel; bij een algemeen onderwerp of buiten de TRA voorgesteld door Claude", "Ja", "7.2a", "Niets of bevestigen", False),
  ("AC4", "Prioriteit", "direct / kort / planmatig (definities in A.8)", "Bepaalt de termijn; 'direct' betekent dat het werk stopt tot het is opgelost", "Ja", "7.1d", "Eén woord", False),
  ("AC5", "Direct gecorrigeerd", "ja / nee", "Ja alleen als de verbeteractie zelf ter plaatse is uitgevoerd (definitie boven deze tabel)", "Ja", "7.1d", "Eén woord", False),
  ("AC6", "Direct genomen maatregel", "", "Wat ter plaatse is gedaan om het lopende werk veilig te maken; de actie blijft dan open (A.8)", "Als het speelt", "7.1d", "Eén zin", False),
  ("AC7", "Verbeteractie", "", "Wat er moet gebeuren. Een structureel vervolg is altijd een aparte actie", "Ja", "7.1d, 7.1e", "Eén zin", False),
  ("AC8", "Actiehouder (functie)", "", "Wie de actie uitvoert; nooit de QHSE-Manager", "Ja", "7.1d, 7.1e", "Eén functie", False),
  ("AC9", "Toetser", "", "Stelt vast dat de verbeteractie is uitgevoerd; regels in A.8. Nooit de actiehouder", "Ja", "7.1e", "Niets, of een andere functie", False),
  ("AC10", "Termijn (datum)", "", "Zoals de inspecteur hem noemt; Claude zet 'binnen twee weken' om in een datum en past hem niet aan", "Ja", "7.1d, 7.1e", "Eén datum", False),
  ("AC11", "Status", "open / in behandeling / afgerond / vervallen (besluit 15)", "Follow-up; afgerond pas na toetsing", "Automatisch 'open'", "7.1e", "Niets tijdens de WPI", False),
  ("AC12", "Bron", "Inspectie / Idee monteurs / Buiten TRA", "Onderscheidt bevindingen, ideeën en risico's die de TRA niet noemt", "Automatisch", "", "Niets", False),
  ("AC13", "Getoetst op (datum)", "", "Datum waarop de toetser vaststelde dat de verbeteractie is uitgevoerd", "Bij afronden", "7.1e", "Alleen bij direct gecorrigeerd", False),
  ("AC14", "Wijze van verificatie", "foto / document / gezien bij volgende WPI", "Regel uit A.8; nog niet als veld in het voorbeeldrapport", "Bij afronden", "7.1e", "Niets tijdens de WPI", True),
  ("AC15", "Wat ging opvallend goed", "", "Positieve bevinding; staat in onderdeel 5 van het rapport. Hoort ze bij een regel, dan is die regel Conform; anders stelt Claude een klasse voor en bevestigt de inspecteur", "Ja: elk rapport minimaal één positieve bevinding (een regel Conform of iets dat opvallend goed ging); Claude rondt anders niet af", "7.1a-2, 7.1d, 7.2a", "Eén zin", False),
 ],
 "E.6 Afronden en afgeleide gegevens": [
  ("S1", "Getoetst tijdens bezoek", "taak en taakstap(pen)", "Wat er tijdens het bezoek is bekeken; het rapport noemt alleen dit en de regels die gezien zijn, geen 'regel x van y'", "Automatisch", "7.1a-4, 7.1d", "Niets", False),
  ("S2", "Bevestiging door de inspecteur", "naam, datum, tijd", "De inspecteur staat in voor de inhoud; vastgelegd in het rapport. Het voorbeeldrapport vermeldt naam en datum, nog geen tijd", "Ja", "7.1d", "Eén woord", False),
  ("S3", "Opmerking over de methode", "", "Wat hield op: spraak, volgorde, vragen. Alleen in de proef", "In de proef", "", "Eén zin", True),
  ("AF1", "Aantal gezien regels en getoetste stappen", "TRA-regels en algemene onderwerpen", "Laat zien hoeveel er tijdens het bezoek is bekeken", "Automatisch", "7.1d", "Niets", False),
  ("AF2", "Aantallen per oordeel", "", "Kopcijfers in de samenvatting van het rapport", "Automatisch", "7.2", "Niets", False),
  ("AF3", "Herhaalde bevinding", "", "Zelfde regel of klasse eerder afwijkend op dit product of deze locatie", "Automatisch", "7.2-doel", "Niets", True),
  ("AF4", "Risicoscore van de regel (later)", "", "Om nooit getoetste regels te wegen. De kennisbank bevat de scores nu niet", "Automatisch", "", "Niets", True),
 ],
}
TRENDS = [
 ("T1", "Uitvoering van het programma", ["K2", "K3", "K5", "K6", "K7", "K15"], "Elk lang project elke maand een WPI, ingepland of spontaan? Elke coördinator elke maand, elk directielid elk kwartaal?", "Coördinatorenoverleg, auditor"),
 ("T2", "Dekking van korte projecten", ["K7", "K8", "K9"], "Alle korte projecten met kenmerk bezocht, en welk deel van de overige? Alleen met planningcijfers", "Hoofd S&M, auditor"),
 ("T3", "Bevindingen per classificatie", ["O1", "TR2", "AC3", "AF2"], "Waar zitten afwijkingen en positieve bevindingen, en hoe verandert dat over de tijd?", "Directiebeoordeling, auditor"),
 ("T4", "Oordelen per algemeen onderwerp", ["O1", "AF2"], "Welke algemene onderwerpen worden gezien, en scoren ze goed of slecht?", "Coördinatorenoverleg, toolbox"),
 ("T5", "Meest afwijkende TRA-regels", ["P2", "TR1", "TR2", "TR4"], "Welke regels wijken het vaakst af, en welke maatregel bepaalde dat?", "TRA-beheer"),
 ("T6", "Afwijkingen per maatregelniveau", ["TR4"], "Telling van afwijkingen: collectief, individueel of PBM; geen maat voor naleving", "Hoofd S&M"),
 ("T7", "Oorzaken", ["TR5"], "Onbekendheid, ontbrekende middelen, voorbereiding of een onwerkbare maatregel?", "Hoofd S&M, directiebeoordeling"),
 ("T8", "Waarnemingen buiten de TRA", ["TR6", "AC12"], "Welke risico's ziet de inspecteur die de TRA niet noemt?", "TRA-beheer"),
 ("T9", "Opvolging van acties", ["K14", "AC1", "AC4", "AC8", "AC9", "AC10", "AC11", "AC12", "AC13", "AC14"], "Open en te laat; doorlooptijd; bij welke functie blijft het liggen?", "Coördinatorenoverleg, auditor"),
 ("T10", "Direct gecorrigeerd", ["AC4", "AC5", "AC6"], "Welk deel van de acties is direct gecorrigeerd (de verbeteractie zelf ter plaatse uitgevoerd), bij welk deel is alleen een maatregel voor het lopende werk genomen, en hoe vaak stopte het werk?", "Directiebeoordeling"),
 ("T11", "Herhaalde bevindingen", ["K14", "TR1", "AC3", "AF3"], "Komt dezelfde afwijking terug nadat de actie is gesloten?", "Hoofd S&M, auditor"),
 ("T12", "Positieve bevindingen", ["O2", "TR2", "TR3", "AC15"], "Wat gaat aantoonbaar goed?", "Toolbox, auditor"),
 ("T13", "Diepgang", ["K6", "K13", "S1", "AF1"], "Hoeveel regels en stappen worden per WPI gezien; duur van een WPI", "Hoofd S&M, auditor, proef"),
 ("T14", "Per product en fase", ["P1", "P2", "TR2"], "Bij welk product of in welke fase zitten de afwijkingen?", "TRA-beheer, werkvoorbereiding"),
 ("T15", "Nooit getoetst", ["P2", "TR1", "S1", "AF4"], "Welke taken en TRA-regels zijn in een periode nooit gezien? Later gewogen met de risicoscore", "Hoofd S&M, TRA-beheer, auditor"),
 ("T16", "Inbreng van de monteurs", ["GS2", "GS3", "AC12"], "Welke ideeën kwamen van de werkvloer en wat is ermee gedaan?", "Coördinatorenoverleg"),
 ("T17", "Voorbereiding op orde", ["V1", "V2", "V3", "V4"], "Hoe vaak ontbreken projectplan, TRA, vergunning of LMRA?", "Hoofd S&M, werkvoorbereiding"),
]
ALLE = {v[0]: v for groep in VELDEN.values() for v in groep}
VOORG = {c for c, v in ALLE.items() if v[7]}
for t in TRENDS:
    for f in t[2]:
        assert f in ALLE, (t[0], f)
TREND_VAN = {c: [t[0] for t in TRENDS if c in t[2]] for c in ALLE}
VOL = [t[0] for t in TRENDS if all(f in VOORG for f in t[2])]
DEELS = [t[0] for t in TRENDS if any(f in VOORG for f in t[2]) and t[0] not in VOL]


def nlijst(xs):
    return ", ".join(xs[:-1]) + " en " + xs[-1] if len(xs) > 1 else "".join(xs)


def wpinr(xml):
    """WPI-nummers en actienummers niet laten afbreken: vaste koppeltekens."""
    def sub(m):
        return m.group(0).replace("-", '</w:t><w:noBreakHyphen/><w:t xml:space="preserve">')
    xml = re.sub(r"WPI-\d{8}-[A-Z]+-[A-Z0-9]+(?:-\d)?", sub, xml)
    # ook alle andere koppeltekens binnen een woord, code of datum (QHSE-Manager, 12-11-2026, DAM-2.06):
    # niet afbreken op een regeleinde
    NB = '</w:t><w:noBreakHyphen/><w:t xml:space="preserve">'
    def tekst(m):
        return m.group(1) + re.sub(r"(?<=[0-9A-Za-zÀ-ÿ'’])-(?=[0-9A-Za-zÀ-ÿ])", NB, m.group(2)) + m.group(3)
    xml = re.sub(r"(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)", tekst, xml)
    # in cursieve runs geeft LibreOffice het vaste koppelteken met een zichtbaar gat weer: daar het gewone
    # koppelteken houden (de PDF-controle bewaakt dat zo'n code niet op een regeleinde breekt)
    def cursief(m):
        r = m.group(0)
        return r.replace(NB, "-") if "<w:i/>" in r else r
    xml = re.sub(r"<w:r>(?:(?!</w:r>).)*</w:r>", cursief, xml, flags=re.S)
    # weduwen en wezen voorkomen (het sjabloon zet dit uit)
    return re.sub(r'(<w:pStyle w:val="[^"]+"/>(?:<w:keepNext/>)?(?:<w:keepLines/>)?(?:<w:pageBreakBefore/>)?)', r'\1<w:widowControl/>', xml)



# ---- afbeeldingen (worden bij de bouw aan het sjabloon toegevoegd)
from PIL import Image as _Im
RATIO_B1 = (lambda i: i.size[0] / i.size[1])(_Im.open(f"{BW}/beeld/rapport_p2b.png"))
BEELDEN = {"rIdWpiBeeld1": f"{BW}/beeld/rapport_p2b.png"}
def _drawing(rid, breedte_twips, ratio, nr, naam):
    cx = breedte_twips * 635; cy = int(cx / ratio)
    return ('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
            f'<wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{900+nr}" name="{naam}"/>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{900+nr}" name="{naam}"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
            '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>')
def beelden(items, kolom=4400):
    cellen = []
    for rid, ratio, nr, naam, bijschrift in items:
        pimg = f'<w:p><w:pPr><w:spacing w:after="40"/><w:jc w:val="center"/></w:pPr>{_drawing(rid, kolom - 160, ratio, nr, naam)}</w:p>'
        cap = para(bijschrift, italic=True, size=15, color=GRIJS, space_after=0)
        cellen.append(f'<w:tc><w:tcPr><w:tcW w:w="{kolom}" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>{pimg}{cap}</w:tc>')
    grid = "".join(f'<w:gridCol w:w="{kolom}"/>' for _ in items)
    add(f'<w:tbl><w:tblPr><w:tblW w:w="{kolom*len(items)}" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>{grid}</w:tblGrid>'
        f'<w:tr><w:trPr><w:cantSplit/></w:trPr>{"".join(cellen)}</w:tr></w:tbl>' + para("", space_after=40, size=6))

# ============================================================ ronde 9: helpers voor een rustiger opmaak
def tblm(rows, widths, size=18, mar=90, **kw):
    """Tabel in samenvatting en hoofddocument: iets groter lettertype en meer lucht in de cellen."""
    tbl(rows, widths, size=size, **kw)
    B[-1] = B[-1].replace('<w:top w:w="60" w:type="dxa"/>', f'<w:top w:w="{mar}" w:type="dxa"/>').replace('<w:bottom w:w="60" w:type="dxa"/>', f'<w:bottom w:w="{mar}" w:type="dxa"/>')


def h1m(t, nieuwe_pagina=True):
    KOPPEN.append(t)
    x = _kn(para(t, style="Kop1", size=28, space_after=160))
    if nieuwe_pagina:
        x = x.replace("<w:keepNext/>", "<w:keepNext/><w:pageBreakBefore/>", 1)
    add(x)


def h2m(t):
    add(_kn(para(t, style="Kop2", size=22, indent_left=0, space_after=80)).replace("<w:spacing ", '<w:spacing w:before="200" ', 1))


def bijlage(t):
    KOPPEN.append(t)
    add(_kn(para(t, style="Kop1", size=24, space_after=100)).replace("<w:keepNext/>", "<w:keepNext/><w:pageBreakBefore/>", 1))


def pmix(delen, size=None, space_after=120, ind=None):
    """Alinea met wisselende opmaak: delen = [(tekst, {'bold':True}), ...]."""
    size = size or BODY
    ppr = f'<w:pStyle w:val="{STIJL_BODY}"/><w:spacing w:after="{space_after}"/>' + (f'<w:ind w:left="{ind}"/>' if ind else "")
    runs = "".join(_invul(t, size) if o.get("invul") else _runs(t, size=size, **o) for t, o in delen)
    add(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{ppr}</w:pPr>{runs}</w:p>')


def _invul(t, size):
    """Invulplek: vet, oranje gemarkeerd."""
    return (f'<w:r><w:rPr><w:b/><w:bCs/><w:color w:val="8A3B00"/><w:sz w:val="{size}"/><w:szCs w:val="{size}"/>'
            f'<w:shd w:val="clear" w:color="auto" w:fill="FBD3A8"/><w:lang w:val="nl-NL"/></w:rPr><w:t xml:space="preserve">{_esc(t)}</w:t></w:r>')


_GEEN = ('<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>'
         '<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>')


def _rij(cellen):
    return f'<w:tr><w:trPr><w:cantSplit/></w:trPr>{"".join(cellen)}</w:tr>'


def _vrij_tbl(rijen, widths):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    add(f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/>{_GEEN}<w:tblLayout w:type="fixed"/></w:tblPr>'
        f'<w:tblGrid>{grid}</w:tblGrid>{"".join(rijen)}</w:tbl>' + para("", space_after=60, size=6))


def punten(items, size=20):
    """Genummerde punten met grote cijfers, zonder kaders."""
    rijen = []
    for nr, kop, tekst in items:
        c1 = _cel([para(str(nr), bold=True, color=BLAUW, size=30, space_after=0)], 650, valign="top", rand="FFFFFF")
        c2 = _cel([para(kop, bold=True, size=size, space_after=20), para(tekst, size=size, space_after=100)], W - 650, valign="top", rand="FFFFFF")
        rijen.append(_rij([c1, c2]))
    _vrij_tbl(rijen, [650, W - 650])


def kerngetallen(items):
    """Drie kerngetallen naast elkaar: groot getal met een korte uitleg eronder."""
    bw = W // len(items)
    cellen = [_cel([para(g, bold=True, color=BLAUW, size=32, space_after=20), para(u, size=17, color=GRIJS, space_after=0)],
                   bw, valign="top", rand="FFFFFF") for g, u in items]
    _vrij_tbl([_rij(cellen)], [bw] * len(items))


def slab(t):
    """Tussenkop in de samenvatting."""
    add(_kn(para(t, bold=True, color=BLAUW, size=22, space_after=60)).replace("<w:spacing ", '<w:spacing w:before="220" ', 1))


def dialoog(regels):
    tblpr = ('<w:tblPr><w:tblW w:w="9064" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
             '<w:tblLook w:val="04A0" w:firstRow="0" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>')
    trs = []
    for wie, tekst in regels:
        fill = "F4F7FB" if wie == "Claude" else None
        if wie == "…":
            c1 = _cel([para("…", size=TAB, space_after=0, color=GRIJS)], 1200, valign="top")
            c2 = _cel([para(tekst, size=TAB, space_after=0, color=GRIJS)], 7864, valign="top")
        else:
            c1 = _cel([para(wie, bold=True, size=TAB, space_after=0, color=BLAUW if wie == "Claude" else None)], 1200, fill=fill, valign="top")
            c2 = _cel([para(tekst, size=TAB, space_after=0, italic=(wie == "Inspecteur"))], 7864, fill=fill, valign="top")
        trs.append(f"<w:tr><w:trPr><w:cantSplit/></w:trPr>{c1}{c2}</w:tr>")
    add(f'<w:tbl>{tblpr}<w:tblGrid><w:gridCol w:w="1200"/><w:gridCol w:w="7864"/></w:tblGrid>{"".join(trs)}</w:tbl>'
        + para("", space_after=60, size=6))


# ============================================================ kennisbank (niveau taakstap)
_KB = json.load(open("/home/claude/wpi/run/data/kennisbank.json", encoding="utf-8"))
_KT = sum(len(v["regels"]) for v in _KB.values()); _KS = sum(1 for v in _KB.values() for x in v["regels"] if x.get("taakstap"))
assert (_KT, _KS) == (666, 128)

# ============================================================ TOC
TOC_SUB = []
TOC_KOPPEN = ["Managementsamenvatting", "1. Aanleiding en wat er verandert", "2. Zo werkt de nieuwe methode",
              "3. De procedure en de VCA-eisen", "4. Risico's en randvoorwaarden", "5. De proef",
              "6. Te nemen besluiten",
              "Bijlage A. Concept-procedure Werkplekinspecties, versie 2.0",
              "Bijlage D. Voorbeeld van de dialoog",
              "Bijlage E. Vast te leggen gegevens en de trends die ze voeden",
              "Bijlage F. De 21 product-TRA's als checklistbron",
              "Bijlage G. Programma en kosten: rekenvoorbeeld",
              "Bijlage H. Besluitenlijst",
              "Bijlage I. Account en platform: opties en bronnen"]
json.dump(TOC_KOPPEN, open(f"{BW}/toc_keys.json", "w"), ensure_ascii=False)

sys.path.insert(0, BW)
import kosten as KO
N1 = KO.nl

# ============================================================ MANAGEMENTSAMENVATTING (max. 2 pagina's, geen codes)
BODY = 20
add(pagebreak())
h1m("Managementsamenvatting", nieuwe_pagina=False)
p("Noardling behaalde de hercertificering tegen VCA 2026/6.1; op de werkplekinspecties is geen openstaande bevinding. "
  "Toch kan de huidige opzet beter: de vaste checklist in AMS zegt niets over het werk dat de monteurs op dat moment "
  "doen, en een trendanalyse ontbreekt.", space_after=120)
pmix([("Aanleiding: ", {"bold": True}), ("een eigen verbetering, geen corrigerende maatregel. Er loopt geen termijn "
      "vanuit de certificerende instelling.", {})], space_after=120)
pmix([("Dit voorstel vraagt om een proef met een nieuwe methode, die wordt afgerond en geëvalueerd vóór ", {}),
      ("[einddatum proef, in te vullen]", {"invul": True}), (".", {})], space_after=60)

slab("Wat verandert er")
punten([
    (1, "Werken wij zoals we zeggen dat we werken?", "Een momentopname: de inspecteur toetst of de monteurs op dat moment "
        "werken volgens de maatregelen uit de TRA van hun taak. Alleen wat hij ziet, telt."),
    (2, "De inspecteur spreekt in, Claude schrijft", "Op zijn telefoon spreekt de inspecteur in wat hij ziet en maakt hij "
        "foto's. Claude stelt de vragen en maakt het rapport. Het oordeel komt altijd van de inspecteur."),
    (3, "Elke afwijking en elk verbeterpunt krijgt een actie", "Met nummer, actiehouder, toetser en termijn. Ook wat goed gaat, wordt vastgelegd."),
    (4, "Het programma gaat per werkplek", "Elk project dat langer dan een maand loopt, krijgt elke maand een "
        "inspectie. Korte projecten krijgen er een naar risico."),
    (5, "Er komt een trendanalyse", "Elke bevinding krijgt een klasse. Een dashboard telt alle rapporten op. "
        "De eerste analyse is in januari 2027."),
])

slab("Waarom")
pmix([("VCA. ", {"bold": True}), ("Eisen 7.1 en 7.2 vragen om verslagen met positieve bevindingen, een actieplan en een "
      "jaarlijkse trendanalyse. De methode maakt dat aantoonbaar. ", {}), ("Kwaliteit. ", {"bold": True}),
      ("De inspectie gaat over het echte werk en laat zien welke TRA-maatregelen niet werken of ontbreken.", {})], space_after=60)

slab("Wat het kost")
add(_kn(para("Volgt uit het programma: VCA 7.1 plus onze eigen keuzes", bold=True, size=18, space_after=40)))
kerngetallen([
    (f"{KO.JAAR_LAAG}–{KO.JAAR_HOOG}", "inspecties per jaar"),
    (f"{N1(KO.UPM_L)}–{N1(KO.UPM_H)} uur", "per coördinator per maand"),
    (f"{N1(KO.HSM_PM_L)}–{N1(KO.HSM_PM_H)} uur", "per maand voor het Hoofd S&M"),
])
p(f"Per coördinator {N1(KO.WPM_L)}–{N1(KO.WPM_H)} inspecties per maand: bijna twee tot tweeënhalf keer de huidige norm van één. "
  f"{KO.JAAR_LAAG}–{KO.JAAR_HOOG} rust op onze keuze dat een maand pas telt vanaf tien werkdagen; een auditor kan dat anders zien. "
  f"Telt elke maand waarin gewerkt wordt: {KO.ELKE_L}–{KO.ELKE_H} per jaar (besluit 8).", size=18, space_after=60)
p(f"Het Hoofd S&M: programma, overleg, trendanalyse en zo'n {round(KO.TOETS_PM_L)}–{round(KO.TOETS_PM_H)} toetsingen per maand. "
  f"Niet meegeteld: zijn eigen acties ({KO.N_ACT_HSM_AH} van {KO.N_ACT} in de voorbeelddata).",
  size=18, space_after=100)
add(_kn(para("Extra door deze methode", bold=True, size=18, space_after=40)))
p(f"Eenmalig ca. {round(KO.INR_TOT)} uur inrichten, waarvan {round(KO.PROEF_INR)} vóór de proef. Daarbovenop kost de proef "
  f"{round(KO.PROEF_WPI_L)}–{round(KO.PROEF_WPI_H)} uur voor de zeven inspecties. Of een inspectie langer duurt dan in AMS, meet de proef. Inspecties liften mee op bezoeken die er "
  "al zijn; reistijd en service- en onderhoudsbezoeken zijn niet meegerekend. Fictieve planning en aannames: bijlage G.",
  size=18, space_after=100)
add(_kn(para("Licenties: Noardling gebruikt zijn bestaande Claude Team-seats", bold=True, size=18, space_after=40)))
p("Noardling heeft al een Claude Team-account. De inspecteurs werken met hun eigen Team-seat; die is persoonlijk en "
  "wordt niet gedeeld (een seat is voor één persoon, bijlage I). Voor de proef zijn alleen seats nodig voor inspecteurs "
  "die er nog geen hebben — wie al een seat heeft, kost niets extra.", size=18, space_after=100)
pmix([("Kosten: ", {"bold": True}), ("alleen extra seats voor nieuwe inspecteurs — ", {}),
      ("[aantal extra seats, in te vullen]", {"invul": True}),
      (f" × ${KO.LIC['team_seat_mnd']} per seat per maand (maandbetaling) of ${KO.LIC['team_seat_jaar']} bij jaarbetaling. "
       "Dollars excl. belasting, stand 12-11-2026 (bijlage I).", {})], size=18, space_after=60)

slab("Wat er nu besloten moet worden (de rest na de proef; alles in bijlage H)")
pmix([("De proef starten. ", {"bold": True}), ("Vanaf 23-11-2026, met twee Montage Coördinatoren en één directielid. "
      "De proef eindigt na zeven inspecties, uiterlijk ", {}), ("[einddatum proef, in te vullen]", {"invul": True}),
      ("; let op de kerstperiode. Evaluatie een week daarna. Intussen worden de overige werkplekken geïnspecteerd "
       "zoals nu, in AMS. ", {}),
      ("Beslissen: Hoofd S&M en directie.", {"italic": True})])
pmix([("De werkwijze voor de proef vaststellen. ", {"bold": True}), ("Reikwijdte (eigen monteurs, ook service en "
      "buitenland), oordelen, acties en actiestatus, toetser, taakverdeling, opslag en terugvaloptie. ", {}),
      ("Beslissen: Hoofd S&M (toetser met directie, taakverdeling met QHSE-Manager).", {"italic": True})])
pmix([("Account en planning. ", {"bold": True}), ("Het account is geregeld: de inspecteurs gebruiken Noardlings "
      "bestaande Claude Team-seats (per persoon, niet delen); alleen voor wie nog geen seat heeft komt er een bij. "
      "Toetsen aan de AVG en zo nodig de OR. Verder: planningcijfers 2026, de veertien klassen en de "
      "nulmeting in januari 2027. ", {}),
      ("Beslissen: directie, ICT-manager en Hoofd S&M.", {"italic": True})], space_after=60)


# ============================================================ documentgegevens + inhoud
BODY = 19
add('<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>')
rijen = [["Document", "Voorstel nieuwe methode werkplekinspecties, met concept-procedure versie 2.0"],
         ["Versie en datum", "0.6 concept, 12-11-2026"],
         ["Opgesteld door", "Sven van Binsbergen (stagiair QHSE), in overleg met de QHSE-Manager"],
         ["Goedgekeurd door", ""]]
t = table([[[para(a, bold=True, size=TAB, space_after=0)],
            [para(b, size=TAB, space_after=0) if b else para("in te vullen", italic=True, color=GRIJS, size=TAB, space_after=0)]]
           for a, b in rijen], widths=[2000, 7064], header=False)
add(t[:t.rfind("<w:p ")] + para("", space_after=240, size=6))
add(_kn(para("Inhoud", bold=True, color=BLAUW, size=24, space_after=100)))
toc()
gap(200)
add(_kn(para("Bijlagen B en C zijn aparte bestanden", bold=True, size=18, space_after=40)))
p("B  Voorbeeldrapport van één inspectie (VOORBEELD — fictieve data)", size=18, space_after=20)
p("C  WPI-dashboard met actieoverzicht en trends (VOORBEELD — fictieve data)", size=18, space_after=160)
p("Het hoofddocument geeft het overzicht. Details staan in de bijlagen: de volledige procedure (A), de "
  "voorbeelddialoog (D), alle gegevens per inspectie (E), de TRA-lijst (F), de rekentabel (G) en de besluitenlijst (H).",
  size=18, color=GRIJS)

# ============================================================ 1
h1m("1. Aanleiding en wat er verandert")
p("Noardling is VCA**-gecertificeerd en behaalde de hercertificering tegen VCA 2026/6.1. Op de werkplekinspecties "
  "(WPI's) is geen openstaande bevinding; we willen ze zelf verbeteren, omdat ze nu niet duidelijk genoeg zijn en niet "
  "doen wat een WPI zou moeten doen.")
p("Nu vult de inspecteur in de app AMS een vaste checklist in. Die checklist is voor elk werk hetzelfde en heeft geen "
  "verband met de taak die de monteurs op dat moment uitvoeren. Een trendanalyse van de bevindingen, die VCA 7.2 "
  "vraagt, ontbreekt.")
p("Tegelijk hebben we 21 product-TRA's met samen 666 risicoregels. Ze beschrijven per taak de risico's en de "
  "afgesproken maatregelen. De WPI gebruikt ze nu niet. De nieuwe methode hangt de inspectie eraan op.", space_after=200)
tblm([
    ["", "Nu (AMS)", "Nieuwe methode"],
    ["Waarop we toetsen", "Een vaste checklist voor elk werk", "De risicoregels uit de TRA van de taak die op dat moment wordt uitgevoerd, met hun maatregelen; algemene onderwerpen als geheugensteun"],
    ["Positief en acties", "Score per item; wat goed gaat wordt niet beschreven", "Elke regel die in orde is; elke actie met nummer, actiehouder, toetser en termijn"],
    ["Programma", "Per inspecteur", "Per werkplek, met een regel voor korte projecten"],
    ["Trendanalyse", "Ontbreekt", "Een klasse bij elke bevinding; het dashboard telt over alle rapporten"],
], [1900, 2900, 4264], first_bold=True, zebra=False)

# ============================================================ 2
h1m("2. Zo werkt de nieuwe methode")
p("De inspecteur is een Montage Coördinator, het Hoofd Service & Montage of een directielid, of onder voorwaarden een "
  "ervaren monteur onder verantwoordelijkheid van een coördinator (bijlage A). Hij plant een WPI in vanuit het programma, of hij begint er "
  "spontaan een als hij toevallig langskomt. Op locatie opent hij op "
  "zijn telefoon de Claude-app in de WPI-projectmap. Een vaste instructie (de skill wpi-begeleider) leidt hem door de "
  "inspectie. Hij spreekt in wat hij ziet en maakt foto's; Claude zet alles op de juiste plek en maakt het rapport.")

h2m("Een inspectie in negen stappen")
_vrij_tbl([_rij([_cel([para(nr, bold=True, color=BLAUW, size=BODY, space_after=0)], 500, valign="top", rand="FFFFFF"),
                 _cel([para(k, bold=True, size=BODY, space_after=0)], 2400, valign="top", rand="FFFFFF"),
                 _cel([para(t, size=BODY, space_after=60)], W - 2900, valign="top", rand="FFFFFF")])
           for nr, k, t in [
    ("0", "Kop", "Projectnummer, inspecteur en datum. Bij een ingeplande WPI staat de kop al klaar; de rest leidt Claude af uit het project."),
    ("1", "Wat doen ze nu?", "De taak, en de taakstap waar de TRA die kent. Claude stelt voor, de inspecteur bevestigt."),
    ("2", "Toetsen aan de TRA", "Claude toont alleen de risicoregels van die taak of stap, met hun maatregelen. Per regel die hij ziet geeft de inspecteur één oordeel en zegt welke maatregel hij zag."),
    ("3", "Algemene onderwerpen", "PBM, orde en netheid, LMRA, documenten en meer: een geheugensteun, niet verplicht."),
    ("4", "Foto's", "Genummerd, met uitleg, gekoppeld aan een onderwerp of regel. Geen herkenbare personen."),
    ("5", "Gesprek met de monteurs", "Kort: wat is besproken, hoe reageerden ze, welke ideeën hebben ze."),
    ("6", "Bevindingen en acties", "Per afwijking en verbeterpunt een actie. Elk rapport bevat minstens één positieve bevinding."),
    ("7", "Afronden", "De inspecteur bevestigt de samenvatting. Wat hij niet heeft gezien, komt er niet in."),
    ("8", "Rapport", "Claude maakt het Word-rapport. De inspecteur zet het dezelfde dag als PDF in het QMS."),
]], [500, 2400, W - 2900])
p("De volgorde is vrij. Een korte inspectie is net zo geldig als een lange; het rapport noemt wat er is getoetst: "
  "'getoetst tijdens bezoek: taak X, stap Y' en de regels die gezien zijn. Een voorbeeld van het gesprek staat in bijlage D, het rapport dat eruit komt in bijlage B.")

h2m("Wie oordeelt")
p("Claude stelt vragen en noteert, maar verzint niets. Elk oordeel en elke waarneming komt van de inspecteur. Er zijn drie "
  "oordelen, altijd met een eigen waarneming: conform, afwijking en verbeterpunt. De eenheid is de risicoregel uit de TRA: "
  "per regel die hij ziet één oordeel. Hij zegt welke maatregel(en) hij zag en welke het oordeel bepaalde; bij meerdere "
  "telt de slechtste. Ziet hij dat een regel niet van toepassing is, dan kan hij dat zeggen. Wat hij niet ziet, legt hij "
  "niet vast; er is geen afsluitvraag die de rest dichtzet.")

h2m("Acties en opvolging")
p("Elke afwijking en elk verbeterpunt krijgt een actie met een nummer, een actiehouder, een toetser en een termijn. Eén "
  "actie is één verbeteractie.")
p("Direct gecorrigeerd: de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter plaatse. Een direct "
  "genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en "
  "getoetst.")
p("De acties komen elke maandag terug in het coördinatorenoverleg. Daar wordt per actie de nieuwe status vastgesteld. Een "
  "actie is pas afgerond als de toetser heeft gezien dat ze is uitgevoerd.")

h2m("Trendanalyse")
p("Elke bevinding krijgt een van veertien klassen, zoals PBM, hijsen of orde en netheid. Elk rapport eindigt met een "
  "gegevenstabel en het dashboard telt die tabellen op. Zo zien we waar afwijkingen zich herhalen, welke "
  "TRA-regels het vaakst afwijken en welke nooit worden bekeken. De eerste analyse is een nulmeting "
  "over 2026, in januari 2027. Welke gegevens we vastleggen en welke trends het dashboard maakt, staat in bijlage E.")

h2m("Zo ziet het eruit")
add(f'<w:p><w:pPr><w:keepNext/><w:spacing w:after="40"/><w:jc w:val="center"/></w:pPr>{_drawing("rIdWpiBeeld1", 8400, RATIO_B1, 1, "Voorbeeldrapport")}</w:p>')
add(para("Uitsnede van de samenvatting op pagina 2 van het voorbeeldrapport (bijlage B): oordelen, wat ging goed, wat moet beter. Voorbeeld, fictieve data", italic=True, size=16, color=GRIJS, space_after=80, align="center"))

# ============================================================ 3
h1m("3. De procedure en de VCA-eisen")
p("De methode krijgt een nieuwe versie van de Procedure Werkplekinspecties. De volledige concepttekst staat in bijlage "
  "A, met de letterlijke VCA-eisen. Na de proef wordt het een apart document in het QMS. Eigenaar is het Hoofd Service "
  "& Montage. Dit zijn de hoofdregels.", space_after=160)
tblm([
    ["Onderwerp", "Hoofdregel"],
    ["Voor wie", "Werkplekken van onze eigen monteurs: projecten, service- en onderhoudsbezoeken, ook in het buitenland"],
    ["Hoe vaak", "Elk project langer dan een maand: elke kalendermaand een WPI. Kort project met een risicokenmerk (mobiele kraan, besloten ruimte, open water): minstens één. Van de overige korte projecten voorlopig één op de vier"],
    ["Wie", "Elke Montage Coördinator minstens één per maand; elk operationeel directielid minstens één per kwartaal op een werklocatie. Een ervaren monteur mag onder voorwaarden inspecteren, onder verantwoordelijkheid van een coördinator"],
    ["Programma", "Het Hoofd S&M stelt elke maand vast welke werkplekken een WPI krijgen en door wie. Een gemiste WPI wordt ingehaald"],
    ["Uitvoering", "Ingepland of spontaan; een spontane WPI telt mee als hij op een verplichte werkplek en maand valt. Bij voorkeur onaangekondigd, minstens een derde. Alleen wat gezien wordt, telt. Direct gevaar: werk stoppen en melden"],
    ["Verslag", "Rapport dezelfde dag als PDF in het QMS; die PDF is het bewijsstuk"],
    ["Acties", "Status elke maandag in het coördinatorenoverleg. Toetser is standaard het Hoofd S&M, nooit de actiehouder"],
    ["Trendanalyse", "Nulmeting januari 2027, halfjaar juli 2027, daarna elk jaar in januari. Bij herhaalde afwijkingen de basisoorzaak en een structurele actie"],
    ["Als de app niet werkt", "Papieren terugvalformulier; binnen twee werkdagen alsnog invoeren"],
], [2000, 7064], first_bold=True, zebra=False)

h2m("Hoe we aan VCA 7.1 en 7.2 voldoen")
B[-1] = B[-1].replace("<w:keepNext/>", "<w:keepNext/><w:pageBreakBefore/>", 1)
p("Per minimumeis, verkort. De letterlijke eistekst en een uitgebreide tabel met wat in rapport en "
  "dashboard zichtbaar is, staan in bijlage A.", space_after=100)
tblm([
    ["Minimumeis (verkort)", "Zo is het geregeld", "Bewijsstuk"],
    ["7.1 Procedure: uitvoering, positieve bevindingen, opvolging, checklist", "Negen stappen; oordeel alleen met eigen waarneming; acties met toetser; checklist uit de TRA van de taak", "Procedure 2.0; rapporten"],
    ["7.1 Elke maand per werkplek, door leidinggevenden", "Programma per werkplek; directielid dat inspecteert is dan leidinggevende", "Maandprogramma met WPI-nummers"],
    ["7.1 voetnoot 10: korte duur, naar risico", "Regel voor korte projecten met en zonder risicokenmerk", "Maandprogramma's; planningcijfers"],
    ["7.1 Door medewerkers onder verantwoordelijkheid", "WPI door een monteur, met verantwoordelijke coördinator", "Rapport met beide namen"],
    ["7.1 Verslag met positief, afwijkingen, acties, verantwoordelijken, tijdsduur", "Rapport met negen vaste onderdelen", "Elk rapport als PDF"],
    ["7.1 Actieplan met verantwoordelijken voor uitvoering en toetsing, planning", "Actieoverzicht met actiehouder, toetser en termijn", "Actieoverzicht; overlegverslagen"],
    ["7.1 Directie elk kwartaal bij een WPI op een werklocatie", "Kwartaalnorm per directielid", "Rapport met directielid"],
    ["7.2 Bevindingen geclassificeerd", "Veertien klassen; vaste klasse per TRA-regel", "Elk rapport"],
    ["7.2 Jaarlijkse trendanalyse met acties en follow-up", "Nulmeting, halfjaar, daarna jaarlijks; acties in het actieoverzicht", "Trendanalyse; actieoverzicht"],
], [3000, 3664, 2400], size=17, mar=70, first_bold=False, zebra=False)
p("Nog niet hard: de inspectie door een monteur rust op velden die nog niet gebouwd zijn, en de regel voor korte "
  "projecten op planningcijfers die nog niet geteld zijn. De TRA's kennen bij de meeste regels geen taakstap; we "
  "toetsen daarom op het niveau van de taak (4.5). Een maand met minder dan tien werkdagen op een lang "
  "project telt in ons voorstel niet mee; een auditor kan dat anders zien (bijlage H). De follow-up van de acties uit de nulmeting is pas in juli 2027 "
  "te tonen, en een volledig jaar met de nieuwe methode in januari 2028.", size=18)

# ============================================================ 4
h1m("4. Risico's en randvoorwaarden")
h2m("4.1 Wat bestaat en wat nog moet worden gemaakt")
O = "Opsteller"
tblm([
    ["Onderdeel", "Stand op 11-11-2026", "Wie maakt het", "Klaar", "Nodig voor de proef"],
    ["Kennisbank", "Bestaat: 21 producten, 666 regels, klasse per regel", "–; eigenaar Hoofd S&M", "Klaar", "Ja"],
    ["Skill wpi-begeleider", "Bestaat; getest met fictieve data, niet op locatie", O, "Proefvelden (bijlage E): 20-11-2026", "Ja"],
    ["Voorbeeldrapport (bijlage B)", "Bestaat, op fictieve data", "–", "Klaar", "Ja, als uitleg"],
    ["Actieoverzicht in de projectmap", "Bestaat niet", O, "20-11-2026", "Ja"],
    ["Dashboard (bijlage C)", "Bestaat op voorbeelddata; nog niet op echte rapporten", O, "Vóór de evaluatie", "Nee"],
    ["Nulmeting: AMS-WPI's 2026 in klassen", "Bestaat niet", "Hoofd S&M (eigenaar); QHSE-Manager ondersteunt", "15-01-2027", "Nee"],
    ["Terugvalformulier", "Bestaat niet", O, "20-11-2026", "Ja"],
    ["Instructie inspecteurs", "Bestaat niet", O, "20-11-2026", "Ja"],
    ["QMS-map voor WPI-rapporten", "Bestaat niet", "QHSE-Manager", "20-11-2026", "Ja"],
    ["Word-sjabloon en kennisbank-PDF's", "Bestaan niet", O, "Vóór vaststelling van de procedure", "Nee"],
    ["Bestaande Team-seats bevestigen en extra seats regelen", "Inspecteurs gebruiken Noardlings bestaande Claude Team-seats (per persoon, niet delen); extra seats voor wie er nog geen heeft (bijlage I); AVG en zo nodig OR", "Directie, ICT-manager", "Vóór de start", "Ja: go/no-go"],
], [2100, 2700, 1500, 1700, 1064], first_bold=True, size=17, mar=70, zebra=False)
p("De proef start pas als alles met 'Ja' klaar is en de Team-seats zijn geregeld; is dat op 20 november 2026 niet zo, dan schuift de start per week op.")
h2m("4.2 Actieoverzicht en status in de proef: handwerk")
p("Claude kan vanuit een chat geen bestand in de projectmap wijzigen. In de proef is het actieoverzicht daarom één "
  "Excel-bestand in de WPI-projectmap; bij stap 0 leest Claude het in en toont open acties en eerdere afwijkingen. Na "
  "elke WPI maakt Claude een bijgewerkte versie die de inspecteur dezelfde dag plaatst; na het maandagoverleg doet de "
  "Hoofd S&M, of een coördinator namens hem, dat met de vastgestelde statussen. Handwerk: bestand vervangen, statussen doorgeven, PDF's in het QMS "
  "zetten. De proef toont of dat houdbaar is.")

h2m("4.3 Account en seats")
p("Noardling heeft een Claude Team-account. In de proef werkt elke inspecteur met een eigen Team-seat; die mag niet "
  "worden gedeeld en is voor één persoon (bijlage I). Zo is ook herleidbaar wie een rapport maakte. De bevestiging met "
  "naam, datum en tijd en de PDF in het QMS blijven het bewijsstuk. Alleen voor inspecteurs die nog geen seat hebben "
  "komt er een bij; de kosten staan op pagina 3.")
p("Claude Team draait naast de bedrijfsstandaard Microsoft 365. Een eventuele latere beproeving van Microsoft 365 "
  "Copilot is een apart ICT-traject buiten deze proef; de vergelijking die daarbij hoort staat ter achtergrond in "
  "bijlage I.")

h2m("4.4 Taken van het Hoofd Service & Montage")
p("Voorstel: de inspecteur zet zijn rapport in het QMS en geeft in het overleg de status van zijn "
  "acties door; het Hoofd S&M blijft standaard toetser en kan per actie een coördinator aanwijzen; programma en "
  "trendanalyse blijven bij het Hoofd S&M, met ondersteuning van de QHSE-Manager.")
h2m("4.5 Toetsniveau: taak in plaats van taakstap")
p(f"De kennisbank is gemaakt van de gegeneraliseerde '(2)'-versies van de TRA's. Daarin heeft maar {_KS} van de {_KT} "
  "regels een taakstap, vooral bij LOTOTO en inschakelen. Bij de meeste taken toetst de inspecteur dus op het niveau van "
  "de taak: hij ziet de risicoregels van de hele taak en kiest wat hij ziet gebeuren. Waar de TRA een taakstap kent, kiest "
  "hij die ook. Per regel legt hij één oordeel vast; een oordeel per maatregel is een uitbreiding, waarin de schermen van "
  "de app al voorzien.")
p("Te nemen besluit: de taakstappen terugbrengen in de TRA's, zodat de inspectie scherper wordt, of de taak als "
  "toetsniveau accepteren. In de proef geldt de taak (bijlage H, besluit 23).")
h2m("4.6 Overige risico's")
tblm([
    ["Onderwerp", "Wat er mis kan gaan", "Wat we eraan doen", "Nog open"],
    ["AI en leverancier", "Verkeerde regel gekoppeld; app of voorwaarden veranderen; storing", "Inspecteur geeft elk oordeel; terugvalformulier; PDF's in QMS", "Correcties tellen in de proef"],
    ["AVG", "Herkenbare personen; foto's bij een externe dienst; herleidbaar in een kleine ploeg", "Geen gezichten; namen alleen in de kop; acties op functie", "Navragen per opdrachtgever; monteurs en zo nodig OR informeren"],
    ["Weinig gezien", "Rapporten met maar een paar regels", "Rapport noemt de getoetste taak en stappen en de gezien regels; dashboard telt per WPI", "Ondergrens na de proef"],
    ["Telefoon", "Spraak bij wind en vaktermen; zwak bereik; lange chats", "Terugvalformulier; achteraf invoeren", "Niet getest; zie hoofdstuk 5"],
    ["Kennisbank en TRA", "Loopt achter op een TRA; maatregelen nauwelijks toetsbaar", "Bijwerken binnen twee weken; versie in het rapport", "Opnemen in de Methodiek TRA; lijst van niet-toetsbare regels"],
], [1500, 2700, 2664, 2200], first_bold=True, size=17, mar=70, zebra=False)

# ============================================================ 5
h1m("5. De proef")
p("Tijdens de proef worden de overige werkplekken geïnspecteerd zoals nu, met de bestaande AMS-werkwijze; ook die tellen "
  "voor het programma.")
p("Zeven WPI's over minimaal vier producten, waarvan drie bewust bijzonder: buiten bij slecht weer, bij zwak bereik "
  "(met het terugvalformulier) en bij een lange taak met veel foto's. Vooraf nemen we bij twee WPI's in AMS de tijd op; "
  "na elke WPI noteert de inspecteur wat ophield. Na een goede evaluatie leggen we twee rapporten met de procedure "
  "voor aan de certificerende instelling.")
tblm([
    ["Vraag", "Hoe we het meten", "Tevreden als"],
    ["Kost het de inspecteur meer moeite?", "Duur naast twee gemeten WPI's in AMS; tijd voor nalezen en opslaan; oordeel van de inspecteur", "Niet langer op locatie; nalezen en opslaan binnen een kwartier"],
    ["Gaat het dieper en voldoet het aan VCA 7.1?", "Aantal gezien regels en getoetste stappen per rapport; de vijf elementen van het verslag", "Elk rapport een positieve bevinding, een waargenomen TRA-regel en alle vijf elementen"],
    ["Klopt wat Claude vastlegt?", "Aantal correcties per rapport", "Nergens een oordeel dat de inspecteur niet gaf"],
    ["Werkt het op de telefoon?", "Opmerkingen; gebruik van het terugvalformulier", "Spraak is buiten bruikbaar, of het formulier vangt het op"],
    ["Werkt het actieoverzicht als bestand?", "Bij de evaluatie elke actie uit de rapporten terugzoeken in het bestand; tijd voor het vervangen", "Geen actie zoek; minder dan tien minuten per week"],
    ["Komen de statussen op tijd binnen?", "Per maandagoverleg: besproken actienummers tegenover de open acties", "Elke open actie minstens eens per maand besproken"],
    ["Wordt 'direct gecorrigeerd' goed gebruikt?", "Per actie nalezen of 'ja' alleen staat waar de verbeteractie zelf ter plaatse is uitgevoerd", "Geen actie ten onrechte afgerond"],
], [2400, 3864, 2800], first_bold=True, size=17, mar=80, zebra=False)


p("De evaluatie, een week na de laatste proefinspectie, legt per vraag de uitkomst vast en is de basis voor het besluit over AMS en de vaststelling van de procedure; wat niet werkt, gaat "
  "eruit of wordt aangepast vóór de procedure wordt vastgesteld.", space_after=0)

# ============================================================ 6
h1m("6. Te nemen besluiten")
p("Alles in dit voorstel is een voorstel tot erover is beslist. We vragen nu drie besluiten. De volledige lijst, met "
  "per besluit het voorstel en wie beslist, staat in bijlage H.", space_after=140)
punten([
    (1, "De proef starten", "Vanaf 23-11-2026, als alles wat nodig is klaar is (hoofdstuk 4). Twee Montage "
        "Coördinatoren doen elk drie inspecties, één directielid doet er één. De proef eindigt na die zeven inspecties, "
        "uiterlijk [einddatum proef, in te vullen]; de kerstperiode valt erin. "
        "Evaluatie een week daarna. "
        "Beslissen: Hoofd S&M en directie."),
    (2, "De werkwijze voor de proef vaststellen", "Voor wie de procedure geldt, de oordelen, de acties, wie toetst, hoe de "
        "status wordt bijgehouden, de taakverdeling met de QHSE-Manager, de opslag en de terugvaloptie, zoals in "
        "hoofdstuk 3 en 4 en bijlage A. Beslissen: Hoofd S&M; de toetser samen met de directie, de taakverdeling samen met de QHSE-Manager."),
    (3, "Account, seats en planning", "Voorwaarde vóór de start: de inspecteurs gebruiken Noardlings bestaande Claude "
        "Team-seats (per persoon, niet delen; pagina 3 en bijlage I), met extra seats voor wie er nog geen heeft. Met "
        "toets aan de AVG, zo nodig met de OR. Zonder geregelde seats start de proef niet. Verder: de planning levert de "
        "projectcijfers van 2026 vóór 11-12-2026; de veertien klassen, die de nulmeting over 2026 in januari 2027 nodig "
        "heeft. Beslissen: directie, ICT-manager en Hoofd S&M."),
], size=BODY)
p("Na de proef: de lijst met gegevens, het toetsniveau (taak of taakstap), de definities, de regel voor korte projecten, het programma, "
  "aankondigen, de telling, de inspectie door een monteur, de bewaartermijn, en of AMS daarna vervalt.")

# ============================================================ BIJLAGE A
BODY = 18
bijlage("Bijlage A. Concept-procedure Werkplekinspecties, versie 2.0")
p("Herziening van versie 1.0. Eigenaar: Hoofd Service, Montage & Aftersales (hierna Hoofd Service & Montage). "
  "Reviewfrequentie: jaarlijks. Na de proef wordt deze bijlage een afzonderlijk document in het QMS, met bijlage E. "
  "Wat is gewijzigd ten opzichte van versie 1.0 staat in A.12.", italic=True, color=BLAUW)
vca("wat de VCA-checklist 2026/6.1 eist, in de woorden van de checklist.", "Blauw kader:", inline=True)
keuze("keuze van Noardling, ook elke verwijzing (besluit n); een voorstel tot er in bijlage H over is beslist.",
      "Oranje kader:", inline=True)
gap(60)
add(para("A.1 Eisen uit de VCA", style="Kop2", size=20, indent_left=0, space_after=60))  # zonder keepNext: het kader mag doorlopen
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
    "VCA 2026/6.1, vraag 7.1", heel=False)
vca("7.2 Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)? (-/□/P)\n"
    "Doelstelling: Het identificeren van basisoorzaken van structurele verbetermogelijkheden.\n"
    "Minimumeisen: • Bevindingen worden geclassificeerd. • Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te "
    "ondernemen acties en follow-up.\n"
    "Documenten: • Trendanalyse • Overzicht verbeteracties",
    "VCA 2026/6.1, vraag 7.2")

h2("A.2 Doel en toepassingsgebied")
p("Deze procedure beschrijft hoe Noardling B.V. werkplekinspecties uitvoert binnen Service & Montage. Zij waarborgt dat "
  "VGM-risico's tijdig worden gesignaleerd en gecorrigeerd, dat leidinggevenden en directie aantoonbaar betrokken zijn "
  "bij het toezicht, en dat bevindingen worden opgevolgd en gebruikt voor verbetering van het VGM-beheersysteem. Zij "
  "geldt voor het werk van de monteurs van Service & Montage op locatie: projecten, en ook service- en "
  "onderhoudsbezoeken (met het order- of klantnummer als werkplek) en werk in het buitenland, zoals Duitsland.")
keuze("Versie 1.0 gold voor werk 'door of namens' Service & Montage. Wij kiezen: het programma omvat de werkplekken "
      "van onze eigen monteurs en het rapport legt alleen bevindingen over hen vast; er is geen veld voor onderaannemers "
      "of derden. Een werkplek waar alleen een onderaannemer namens ons werkt, valt buiten het programma. Bij direct gevaar "
      "blijft gelden: de inspecteur laat het stoppen, spreekt de betrokkene of diens "
      "leidinggevende aan en meldt het volgens de procedure incidentenrapportage. Onderaannemers worden beoordeeld via "
      "de Procedure Inkoop van Diensten.", "Keuze Noardling · besluit 3: toepassingsgebied en eigen monteurs")

h2("A.3 Definities en oordelen")
tbl([
    ["Begrip", "Betekenis in deze procedure (besluit 7)"],
    ["WPI", "Geplande, vastgelegde inspectie van een werkplek, gericht op de naleving van VGM-afspraken: een algemene observatie plus een toetsing van het lopende werk aan de maatregelen uit de TRA"],
    ["VGM-inspectie directie", "WPI waaraan een directielid deelneemt of die een directielid uitvoert, conform VCA 7.1"],
    ["Operationele werkplek", "Een project of een service- of onderhoudsbezoek (order- of klantnummer) op één locatie, in Nederland of in het buitenland, waar monteurs van Service & Montage aan het werk zijn"],
    ["Coördinatorenoverleg", "Wekelijks overleg op maandagochtend onder leiding van het Hoofd Service & Montage, waarin de WPI-bevindingen worden besproken en de opvolging wordt vastgelegd (zoals in versie 1.0)"],
    ["Werk van korte duur", "Een project dat korter dan een maand op dezelfde locatie loopt"],
    ["Risicokenmerk", "Gepland werk met hijsen met een mobiele kraan, betreden van een besloten ruimte met vergunning, of werken boven of naast open water zonder vaste randbeveiliging. Vastgesteld uit de planning en het VGM-projectplan, niet uit de TRA-klassen"],
    ["Operationeel leidinggevende", "De Montage Coördinator en het Hoofd Service & Montage. Een operationeel directielid dat zelf een WPI uitvoert, is op dat moment operationeel leidinggevende voor die werkplek: hij heeft zeggenschap over het werk en kan het laten stoppen. Daarom telt zijn WPI ook voor de werkplek"],
    ["Checklist", "De risicoregels uit de kennisbank, met hun maatregelen, bij de taak die wordt uitgevoerd, en bij de taakstap waar de TRA die kent, plus de standaardmaatregelen (LMRA, PBM). De negen algemene onderwerpen A tot en met I (A.6) zijn een geheugensteun. Kennisbank: de 21 product-TRA's met per risicoregel een vast nummer, taak, taakstap (waar aanwezig), de maatregelen en een vaste klasse"],
    ["Ingeplande WPI", "WPI uit het programma; de kop staat vooraf klaar"],
    ["Spontane WPI", "WPI die de inspecteur begint als hij toevallig langskomt. Telt mee voor het programma als hij op een verplichte werkplek en maand valt"],
    ["Getoetst tijdens bezoek", "De taak en taakstap(pen) die tijdens de WPI zijn bekeken. Het rapport noemt alleen deze en de regels die gezien zijn; geen 'regel x van y'"],
    ["Bevinding", "Positief: oordeel Conform of 'wat ging opvallend goed' (beide met een klasse). Afwijking en verbeterpunt: zie hieronder. Buiten TRA: vlag bij een risico dat de TRA niet noemt, naast een gewone klasse"],
    ["Actieoverzicht", "Alle acties uit WPI's en uit de trendanalyse met actiehouder, toetser, termijn, status en bron (Inspectie, Idee monteurs, Buiten TRA of Trendanalyse); dit is het actieplan uit VCA 7.1. In de proef een bestand in de WPI-projectmap (4.2)"],
    ["Toetser", "Degene die vaststelt dat de verbeteractie is uitgevoerd; nooit dezelfde als de actiehouder (A.8)"],
], [2300, 6764], first_bold=True)
add(_kn(para("De oordelen (besluit 4). Eén oordeel per risicoregel die de inspecteur ziet, altijd met een eigen waarneming; wat niet gezien is, wordt niet vastgelegd. De inspecteur noemt welke maatregel(en) hij zag; bij meerdere telt de slechtste (A > V > C). Een actie heeft altijd het oordeel van de regel waar ze bij hoort.", bold=True, size=BODY, space_after=40)))
tbl([
    ["Oordeel", "Wanneer", "Telt als"],
    ["Conform [C]", "De inspecteur beschrijft wat hij zag en heeft niets aan te merken", "Positieve bevinding"],
    ["Afwijking [A]", "De inspecteur beschrijft dat een afgesproken maatregel ontbreekt of niet wordt nageleefd", "Negatieve bevinding, met actie"],
    ["Verbeterpunt [V]", "De inspecteur beschrijft iets dat voldoet maar veiliger kan", "Negatieve bevinding, met actie"],
    ["Niet van toepassing [NVT]", "Optioneel: de inspecteur ziet dat een regel bij dit werk niet speelt", "Telt niet mee"],
], [2400, 4664, 2000], first_bold=True)

h2("A.4 Verantwoordelijkheden")
tbl([
    ["Functie", "Verantwoordelijkheid"],
    ["Operationeel directielid", "Neemt minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie, zelfstandig of met een coördinator. Geeft de status van acties uit zijn WPI's door via een coördinator. Ziet toe op de opvolging van bevindingen"],
    ["Hoofd Service & Montage", "Eigenaar van de procedure en de kennisbank; eindverantwoordelijk voor de uitvoering van het inspectieprogramma. Stelt elke maand het programma vast en deelt het met de inspecteurs. Leidt het coördinatorenoverleg en bewaakt de opvolging. Is standaard toetser en mag per actie een andere coördinator aanwijzen. Stelt de trendanalyses op. Voert aanvullend WPI's uit"],
    ["Montage Coördinator", "Voert minimaal 1 WPI per maand uit, volgens het programma. Bespreekt waarnemingen ter plaatse met de monteurs. Zet het rapport dezelfde dag als PDF in het QMS. Brengt de bevindingen van zijn WPI's in het coördinatorenoverleg in en geeft de status van de acties door. Is verantwoordelijk voor WPI's die een monteur onder zijn naam uitvoert"],
    ["Monteur", "Werkt mee aan inspecties; signaleert en meldt onveilige situaties; voert toegewezen acties uit. Kan onder voorwaarden zelf een WPI uitvoeren (A.7)"],
    ["QHSE-Manager", "Ondersteunt het Hoofd Service & Montage bij het bijwerken van de kennisbank en bij de trendanalyse. Niet verantwoordelijk voor uitvoering of opvolging van inspecties en geen actiehouder (besluit 16)"],
], [2300, 6764], first_bold=True)

h2("A.5 Inspectieprogramma per werkplek")
vca("• Inspecties worden ten minste eenmaal per maand per operationele werkplek uitgevoerd door operationeel "
    "leidinggevenden.(10)\n(10) Bij werkzaamheden van korte duur werkt het bedrijf een programma uit waarbij de "
    "bovenstaande frequentie naar verhouding wordt behaald, rekening houdend met de risico's.", "VCA 7.1, tweede minimumeis en voetnoot 10")
p("Hoofdregel. Elk project dat langer dan een maand op één locatie loopt, krijgt elke kalendermaand ten minste één "
  "WPI. Die WPI doet een Montage Coördinator of het Hoofd Service & Montage, of een monteur onder hun "
  "verantwoordelijkheid (A.7). Een spontane WPI telt mee als hij op een werkplek en in een maand valt waarvoor het "
  "programma een WPI vraagt.")
p("Normen per inspecteur. Daarnaast doet elke Montage Coördinator minimaal 1 WPI per maand (samen minimaal 24 per "
  "jaar) en neemt elk operationeel directielid minimaal eenmaal per kwartaal deel (4 per jaar). Een WPI met een "
  "deelnemend directielid telt voor de coördinator, het directielid en de werkplek; een WPI die een directielid "
  "zelfstandig uitvoert, telt voor zijn kwartaalnorm en voor de werkplek (besluit 12). Deze normen zijn een ondergrens; "
  "het benodigde aantal volgt uit het programma per werkplek.")
keuze("Een kalendermaand telt bij een lang project als het project er ten minste tien werkdagen loopt. Reden: in een "
      "maand met een paar werkdagen aan het begin of eind van het project is de aanwezigheid kort en ligt de WPI van de "
      "maand ervoor of erna dicht bij. Auditrisico: VCA vraagt 'ten minste eenmaal per maand per operationele werkplek'; "
      "een auditor kan zo'n maand toch meetellen. Alternatief: elke kalendermaand waarin op het project gewerkt wordt, "
      "krijgt een WPI. Dit blijft een besluit. Een kort project "
      "met ten minste één risicokenmerk (A.3) krijgt ten minste één WPI, op een dag waarop het "
      "kenmerkende werk gepland is. Van de overige korte projecten die in een kwartaal eindigen, krijgt voorlopig één op de "
      "vier een WPI. Het risicokenmerk wordt bij de planning vastgesteld, niet uit de TRA-klassen: die raken vrijwel elk "
      "project. Het aandeel van één op de vier is niet onderbouwd en wordt vastgesteld als de aantallen uit de "
      "projectplanning bekend zijn.", "Keuze Noardling · besluit 8: voetnoot 10 bij werk van korte duur")
p("Service- en onderhoudsbezoeken zijn werkplekken (met het order- of klantnummer) en vallen, omdat ze korter dan een "
  "maand duren, onder de regel voor korte projecten; de planningcijfers (besluit 9) tellen ze apart. Ze zijn niet "
  "meegeteld in het rekenvoorbeeld van deze regels met de kosten in bijlage G.")
p("Het Hoofd Service & Montage stelt in het eerste coördinatorenoverleg van elke maand het document 'Inspectieprogramma "
  "[maand]' vast en deelt het met de inspecteurs: de lopende projecten langer dan een maand, de korte projecten met "
  "risicokenmerk, de steekproef uit de overige korte projecten, en per project de inspecteur. Na de maand staat bij elk project het WPI-nummer of de "
  "reden waarom het niet is gelukt. Een gemiste WPI wordt in het volgende overleg besproken en ingehaald zolang het "
  "project loopt (besluit 10). Het document staat als PDF in het QMS (A.11).")

h2("A.6 Uitvoering in negen stappen")
p("Er zijn twee ingangen. Ingepland: de inspecteur selecteert een werkplek uit het programma; de kop staat dan klaar. "
  "Spontaan: hij komt toevallig langs en begint een WPI met projectnummer, naam en datum. Een ingeplande WPI kondigt hij "
  "bij voorkeur niet (of slechts kort) van tevoren aan, zodat een representatief beeld ontstaat; minimaal een derde van de WPI's is onaangekondigd en het "
  "rapport vermeldt het (besluit 11). In de WPI-projectmap leidt de skill wpi-begeleider hem door negen stappen (0–8), "
  "in vrije volgorde; Claude vraagt naar waarneming en oordeel en vult ze nooit zelf in.")
tbl([
    ["Stap", "Wat de inspecteur doet", "Wat Claude doet"],
    ["0. Kop", "Noemt projectnummer, zijn naam en, bij een spontane WPI, dat hij spontaan langskomt", "Vult datum en tijd in; leidt opdrachtgever, locatie, product en monteurs af uit het project of vraagt ernaar; leest het actieoverzicht in de projectmap en toont open acties en eerdere afwijkingen op dit product of deze locatie"],
    ["1. Wat doen ze nu?", "Zegt of kiest de taak, en de taakstap waar de TRA die kent", "Stelt taak en stap voor (te bevestigen); maakt het WPI-nummer en geeft de chat die naam"],
    ["2. Toetsen aan de TRA", "Geeft bij elke risicoregel die hij ziet één oordeel en zegt welke maatregel(en) hij zag en welke het oordeel bepaalde; bij een afwijking ook de oorzaak. Bij meerdere stappen: herhalen", "Toont alleen de risicoregels, met maatregelen, van de gekozen taak of stap en de standaardmaatregelen; vraagt naar het oordeel; legt niets vast over regels die niet gezien zijn"],
    ["3. Algemene onderwerpen", "Noemt wat hij ziet bij de onderwerpen A tot en met I; niet verplicht", "Toont de onderwerpen als geheugensteun; legt alleen gezien onderwerpen vast"],
    ["4. Foto's", "Maakt foto's, zonder herkenbare personen, en zegt wat erop staat", "Nummert en koppelt de foto aan een onderwerp of regel"],
    ["5. Gesprek", "Bespreekt kort de waarnemingen, ook de positieve, ter plaatse met de monteurs", "Legt reactie en ideeën vast; vraagt of een idee een actie wordt"],
    ["6. Bevindingen en acties", "Noemt per afwijking of verbeterpunt de verbeteractie, actiehouder, termijn en prioriteit, en minimaal één positieve bevinding: een regel Conform of iets dat opvallend goed ging (VCA 7.1 vraagt positieve bevindingen in het verslag)", "Nummert de actie, vraagt of de verbeteractie ter plaatse is uitgevoerd, noemt de toetser volgens A.8 en neemt de termijn over zoals de inspecteur hem noemt"],
    ["7. Afronden", "Bevestigt de samenvatting", "Vat samen wat gezien is; geen afsluitvraag over wat niet gezien is; legt naam, datum en tijd van de bevestiging vast"],
    ["8. Rapport", "Leest het rapport na en zet het dezelfde dag als PDF in het QMS", "Maakt het Word-rapport met negen vaste onderdelen; vermeldt 'getoetst tijdens bezoek: taak, stap(pen)'"],
], [1900, 3700, 3464], first_bold=True)
p("De negen algemene onderwerpen, een geheugensteun: A Voorbereiding en documenten (VGM-projectplan, TRA, "
  "werkvergunning, LMRA); B Veiligstellen (LOTOTO); C PBM; D Arbeidsmiddelen en gereedschap (staat, keuring); E Hijsen en "
  "kraan; F Werkplek en omgeving; G Gevaarlijke stoffen, hygiëne en milieu; H Noodvoorzieningen; I Gedrag en "
  "samenwerking.")
p("Direct gevaarlijke situaties worden ter plaatse gestopt en, indien nodig, gemeld conform de procedure "
  "incidentenrapportage. Een korte WPI is geldig; het rapport noemt de getoetste taak en stappen en de gezien regels. Namen van "
  "monteurs staan alleen in de kop.")

h2("A.7 Inspectie door een monteur")
keuze("Een monteur mag een WPI uitvoeren als hij VOL-VCA heeft, minstens twee jaar bij Service & Montage werkt en door "
      "een Montage Coördinator in de methode is geïnstrueerd (vastgelegd), en als hij zelf niet op die werkplek werkt. "
      "Soort inspectie is dan 'WPI monteur'; in de kop staat de verantwoordelijke coördinator, die het rapport naleest en "
      "mee bevestigt. Zo'n WPI telt voor de werkplek, niet voor de maandnorm van de coördinator.",
      "Keuze Noardling · besluit 13: inspectie door een monteur (VCA 7.1, derde minimumeis)")

h2("A.8 Inspectieverslag en opvolging van acties")
p("Na de bevestiging maakt Claude het inspectieverslag (WPI-rapport) met negen vaste onderdelen: 1 Kop, 2 Samenvatting, "
  "3 Algemene observatie, 4 Taakgerichte toetsing (getoetst tijdens bezoek), 5 Positieve bevindingen, 6 Bevindingen en acties, 7 Gesprek met de "
  "monteurs, 8 Foto's met toelichting, 9 Gegevenstabel. Elke afwijking en elk verbeterpunt, ook buiten de TRA, krijgt "
  "een actie met bevinding en verbeteractie apart, actiehouder, toetser, termijn, prioriteit en bron: Inspectie, Idee "
  "monteurs of Buiten TRA. Het oordeel van een actie is altijd dat van de regel waar ze bij hoort, ook bij een idee "
  "van de monteurs. De termijn is wat de inspecteur noemt; Claude zet die om in een datum en past hem niet aan.")
keuze("Eén actie is één verbeteractie. Direct gecorrigeerd: de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter plaatse. Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en getoetst. "
      "In bijlage B is -4 ter plaatse uitgevoerd; bij -1, -2, -3 en -7 is direct een maatregel genomen; de actie blijft open. "
      "Een idee van de monteurs (-9) en een structureel vervolg (-8) zijn aparte acties. Prioriteit: direct (het werk stopt tot het ter plaatse is opgelost), kort (binnen twee "
      "weken) of planmatig (uiterlijk einde volgend kwartaal). Statussen: open, in behandeling, afgerond, of vervallen met "
      "reden. Is een actie meer dan twee weken te laat, dan beslist het Hoofd Service & Montage over een nieuwe termijn "
      "of een andere actiehouder.", "Keuze Noardling · besluiten 5 en 15: acties, prioriteiten en status")
bl("De inspecteur zet het rapport dezelfde dag als PDF in het QMS; die PDF is het bewijsstuk. Een latere wijziging wordt een nieuwe versie met reden (besluit 17).")
bl("In het coördinatorenoverleg op maandag brengen de coördinatoren de bevindingen uit hun WPI's in; ze worden besproken en per actienummer wordt de nieuwe status vastgesteld. Het Hoofd Service & Montage, of een coördinator namens hem, zet de statussen in de WPI-projectmap en Claude werkt het actieoverzicht bij. Voorstel (besluit 15): elke inspecteur geeft de status van zijn eigen acties door; een directielid via een coördinator. Het verslag vermeldt de besproken actienummers.")
bl("Een actie is pas Afgerond nadat de toetser heeft vastgesteld dat de verbeteractie is uitgevoerd; hij legt de datum (getoetst op) en de wijze vast: foto, document of waarneming bij een volgende WPI.")
bl("Toetser (besluit 14): standaard het Hoofd Service & Montage, of een coördinator die hij per actie aanwijst. Is het Hoofd S&M actiehouder, dan toetst de inspecteur. Is het Hoofd S&M zowel inspecteur als actiehouder, dan toetst een Montage Coördinator die geen actiehouder is, of het directielid. Hebben de monteurs de verbeteractie direct uitgevoerd, dan toetst de inspecteur ter plaatse. Toetser en actiehouder zijn nooit dezelfde; de QHSE-Manager is geen actiehouder.")

h2("A.9 Classificatie en trendanalyse")
p("Elke beoordeelde regel heeft een van veertien klassen (besluit 6): PBM, Veiligstellen-LOTOTO, Hijsen, Werken op "
  "hoogte of bij water, Arbeidsmiddelen en keuring, Orde en netheid, Gevaarlijke stoffen en hygiëne, Besloten ruimte en "
  "gas, Fysieke belasting, Noodvoorzieningen, Documenten en voorbereiding, Gedrag en werkwijze, Omgeving en afzetting, "
  "Milieu. Een risicoregel heeft een vaste klasse in de kennisbank; bij de algemene onderwerpen en buiten de TRA stelt "
  "Claude een klasse voor en bevestigt de inspecteur.")
keuze("Januari 2027: nulmeting over 2026. De AMS-WPI's van 2026 worden achteraf ingedeeld in de veertien klassen en "
      "samen met de proef-WPI's geanalyseerd. Juli 2027: halfjaaranalyse. Vanaf januari 2028: elk jaar in januari, over "
      "het afgelopen kalenderjaar. Acties uit een analyse komen in het actieoverzicht als TREND-2027-1, -2 enzovoort, met "
      "actiehouder, toetser en termijn, en volgen dezelfde opvolging als WPI-acties.",
      "Keuze Noardling · besluit 18: trendanalyse vanaf januari 2027")
p("Het Hoofd Service & Montage maakt elke analyse, met ondersteuning van de QHSE-Manager: aantal WPI's tegenover het "
  "programma, per werkplek; bevindingen per klasse, positief en negatief; trends over de tijd, per kwartaal en tegenover "
  "de vorige analyse; meest afwijkende TRA-maatregelen; getoetste taken en regels die nooit gezien zijn; ingepland en spontaan; doorlooptijd "
  "van acties; de te ondernemen acties; en de stand van de acties uit de vorige analyse.")
p("Basisoorzaken. Vanaf de proef vraagt Claude bij elke afwijking de oorzaak (veld TR5). Wijkt een klasse of TRA-regel "
  "in het jaar meer dan eens af, dan benoemt de trendanalyse de basisoorzaak, op basis van TR5 en de herhaalde "
  "bevindingen, en stelt een structurele actie voor. De uitkomsten worden besproken in het coördinatorenoverleg, "
  "vastgesteld in de directiebeoordeling en gebruikt voor het volgende inspectieprogramma.")

h2("A.10 Als Claude niet beschikbaar is")
p("Geen bereik of een storing is geen reden om een WPI over te slaan. De inspecteur gebruikt dan het terugvalformulier "
  "WPI (één A4, op papier in de bus en als PDF op de telefoon) en voert de inspectie binnen twee werkdagen zelf in via "
  "de skill; het rapport vermeldt 'achteraf ingevoerd'. Is Claude langer dan twee weken niet bruikbaar, dan maakt hij "
  "het rapport met het Word-sjabloon WPI-rapport en de PDF van de kennisbank uit het QMS, en houdt het Hoofd Service & "
  "Montage het actieoverzicht bij in het verslag van het coördinatorenoverleg (besluit 19; stand van deze onderdelen "
  "in 4.1).")

h2("A.11 Registraties")
tbl([
    ["Registratie", "Omschrijving en plaats", "Beheer", "Bewaren"],
    ["Inspectieprogramma [maand]", "Per maand de werkplekken uit A.5 met inspecteur en, achteraf, WPI-nummer of reden. PDF in het QMS", "Hoofd S&M", "5 jaar"],
    ["WPI-rapport", "Per inspectie, met bevindingen, foto's, acties en de bevestiging van de inspecteur. Dezelfde dag als PDF in het QMS; de PDF is het bewijsstuk", "Inspecteur", "5 jaar"],
    ["Actieoverzicht", "Alle acties uit WPI's en trendanalyses met actiehouder, toetser, termijn, status, bron en verificatie. Wekelijks bijgewerkt (in de proef: bestand in de projectmap); elk kwartaal als PDF in het QMS", "Hoofd S&M", "5 jaar"],
    ["Verslag coördinatorenoverleg", "Bespreking en opvolging, met de besproken actienummers", "Hoofd S&M", "Volgens QMS"],
    ["Trendanalyse WPI's", "Nulmeting 2026 (januari 2027), halfjaar (juli 2027), daarna elk jaar: aantallen, klassen, trends, oorzaken, acties en follow-up. QMS", "Hoofd S&M", "5 jaar"],
    ["Kennisbank", "TRA's per product met versiedatum; bijgewerkt binnen twee weken na wijziging van een TRA (besluit 16); regelnummers blijven vast. WPI-projectmap en PDF per product in het QMS", "Hoofd S&M; QHSE-Manager ondersteunt", "Actuele en vorige versie"],
], [2000, 4564, 1500, 1000], first_bold=True)
p("Bewaartermijn vijf jaar: keuze van Noardling (besluit 20). Gerelateerd: Methodiek TRA, product-TRA's, Procedure "
  "VGM-projectplan, LMRA-procedure, Verslagformulier coördinatorenoverleg, procedure incidentenrapportage, Procedure "
  "Inkoop van Diensten.")

h2("A.12 Gewijzigd ten opzichte van versie 1.0")
tbl([
    ["Onderdeel", "Versie 1.0", "Versie 2.0", "Waarom"],
    ["Checklist", "Vaste checklist in AMS", "Claude-app; risicoregels uit de TRA van de taak, alleen wat gezien is; onderwerpen A tot en met I als geheugensteun; ingepland of spontaan; volgorde vrij", "Oordeel auditor"],
    ["Programma", "Per inspecteur", "Per werkplek; regel voor korte projecten; maanddocument; inhalen", "VCA 7.1, voetnoot 10"],
    ["Directie", "4 per jaar, 'VCA 7.2', ook werkplaats", "Elk operationeel directielid één per kwartaal op een werklocatie", "VCA 7.1f"],
    ["Positief en acties", "Score per item; positief niet beschreven; prioriteit zonder definitie", "Conform, afwijking en verbeterpunt alleen met waarneming; prioriteiten met termijn; één actie per verbeteractie; toetser, getoetst op, bron; Vervallen; escalatie", "VCA 7.1"],
    ["Opslag en rollen", "In AMS; directielid, Hoofd S&M, coördinator, monteur", "PDF in het QMS dezelfde dag; QHSE-Manager ondersteunend; monteur kan inspecteren; minimaal een derde onaangekondigd", "Bewijsstuk; toetsbaar"],
    ["Reikwijdte", "Door of namens S&M", "Werkplekken van eigen monteurs, ook service en buitenland (besluit 3)", "Keuze"],
    ["Trendanalyse", "Jaarlijks, per categorie, trends over de tijd", "Nulmeting januari 2027, halfjaar juli 2027, daarna jaarlijks; veertien klassen; trends over de tijd; basisoorzaken; TREND-acties. Nieuw: definities, terugvaloptie, bewaartermijn", "VCA 7.2"],
    ["Ongewijzigd", "Overgenomen", "Hoofd S&M eindverantwoordelijk; programma gedeeld met de inspecteurs; 1 WPI per coördinator per maand; bevindingen in het maandagoverleg; direct gevaar stoppen en melden", "Voldoet"],
], [1500, 2300, 3964, 1300], first_bold=True)

h2("A.13 Dekking per minimumeis: waar zichtbaar in rapport en dashboard")
B[-1] = B[-1].replace("<w:keepNext/>", "<w:keepNext/><w:pageBreakBefore/>", 1)
tbl([
    ["Minimumeis (verkort; volledige tekst in A.1)", "Procedure", "Waar zichtbaar", "Bewijsstuk voor de auditor"],
    ["7.1a-1 Procedure beschrijft de uitvoering van de inspecties", "A.6, A.10", "Rapport: volgt de negen onderdelen", "Procedure; rapporten die de werkwijze volgen"],
    ["7.1a-2 Procedure beschrijft de positieve bevindingen", "A.3, A.6", "Rapport: onderdeel 5. Dashboard: oordelen", "Procedure; onderdeel 5 van elk rapport"],
    ["7.1a-3 Procedure beschrijft de opvolging van waargenomen verbeterpunten", "A.8", "Rapport: onderdeel 6. Dashboard: acties", "Procedure; actieoverzicht; overlegverslagen"],
    ["7.1a-4 Procedure beschrijft het gebruik van de checklist", "A.3, A.6", "Rapport: onderdelen 3 en 4, met getoetst tijdens bezoek (taak, stap). Dashboard: TRA-maatregelen", "Procedure; kennisbank; onderdelen 3 en 4"],
    ["7.1b Ten minste eenmaal per maand per operationele werkplek door operationeel leidinggevenden", "A.3, A.5", "Rapport: onderdeel 1 (project-, order- of klantnummer). Dashboard: programma", "Inspectieprogramma per maand met per werkplek het WPI-nummer, ook van spontane WPI's. Auditrisico: een maand met minder dan tien werkdagen op een lang project telt in ons voorstel niet mee (A.5, besluit 8)"],
    ["7.1b voetnoot 10 Programma voor korte duur, naar verhouding, met de risico's", "A.5", "Inspectieprogramma per maand; rekenregel per kwartaal", "Programma's met korte projecten en risicokenmerk; planningcijfers"],
    ["7.1c Door operationele medewerkers onder verantwoordelijkheid van een leidinggevende", "A.7", "Rapport: onderdeel 1, soort 'WPI monteur' en verantwoordelijke coördinator (voorgesteld)", "Rapport met beide namen, als het is toegepast; instructie vastgelegd"],
    ["7.1d Verslag met positieve bevindingen, afwijkingen, verbeteracties, uitvoeringsverantwoordelijken en tijdsduur", "A.6, A.8", "Rapport: onderdeel 5; onderdelen 3, 4 en 6 met verbeteractie, actiehouder, prioriteit en termijn", "Elk WPI-rapport (PDF in het QMS)"],
    ["7.1e Actieplan met actiepunten uit de inspecties, verantwoordelijken voor uitvoering en toetsing, en tijdsplanning", "A.8", "Rapport: onderdelen 6 en 9 (actiehouder, toetser, termijn). Dashboard: acties (termijn, status, te laat)", "Actieoverzicht met toetser en getoetst op (kwartaal-PDF); overlegverslagen met actienummers"],
    ["7.1f Directieleden minimaal eenmaal per kwartaal bij een WPI op een werklocatie", "A.4, A.5", "Rapport: soort inspectie, deelnemend directielid. Dashboard: programma", "Per kwartaal een rapport met een directielid"],
    ["7.1 Documenten: procedure en inspectieprogramma; verslagen en de follow-up", "Geheel; A.5, A.8, A.11", "Rapport zelf. Dashboard: programma, acties", "Procedure 2.0, maandprogramma's, rapporten, actieoverzicht en overlegverslagen in het QMS"],
    ["7.2 Trendanalyse van positieve en negatieve bevindingen", "A.9", "Rapport: onderdeel 9 (bron). Dashboard: oordelen, classificatie", "Nulmeting 2026 (januari 2027); halfjaaranalyse juli 2027"],
    ["7.2 Doelstelling: basisoorzaken van structurele verbetermogelijkheden", "A.9", "Veld oorzaak (vanaf de proef); dashboard: TRA-maatregelen", "Trendanalyse met basisoorzaken bij herhaalde afwijkingen"],
    ["7.2a Bevindingen worden geclassificeerd", "A.9", "Rapport: klasse bij elke regel. Dashboard: classificatie", "Elk rapport; de veertien klassen"],
    ["7.2b Jaarlijkse trendanalyse, inclusief te ondernemen acties en follow-up", "A.9", "Dashboard: alle onderdelen; TREND-acties in het actieoverzicht", "Nulmeting met TREND-2027-acties; in juli 2027 hun stand; directiebeoordeling"],
    ["7.2 Documenten: trendanalyse; overzicht verbeteracties", "A.9, A.11", "Dashboard: acties", "Trendanalyse en actieoverzicht in het QMS"],
], [2800, 1100, 2664, 2500])
p("Nog niet hard: 7.1c rust op velden die nog niet gebouwd zijn en voetnoot 10 op planningcijfers die nog niet geteld "
  "zijn. De nulmeting van januari 2027 rust deels op achteraf ingedeelde AMS-gegevens; de follow-up van de acties daaruit "
  "is pas in juli 2027 te tonen, en een volledig jaar met de nieuwe methode in januari 2028.")

# ============================================================ BIJLAGE D
bijlage("Bijlage D. Voorbeeld van de dialoog")
add(_kn(para("VOORBEELD — fictieve data", bold=True, color=ROOD, size=BODY, space_after=40)))
p("Fragmenten uit de inspectie waarvan het volledige rapport bijlage B is. Actienummers volgen de volgorde waarin de "
  "acties in het gesprek ontstaan. Locatie, project en personen zijn verzonnen; de risicoregels komen uit de TRA Damwand.",
  italic=True, space_after=60)
dialoog([
    ("Inspecteur", "Start WPI, project P26-168. Twee monteurs halen de damwand eruit. Droog, weinig wind, het betondek is nat."),
    ("Claude", "Ingepland: Coördinator 2, RWZI Voorbeeldstad. Voorstel: Damwand, fase Demontage, taak 'Verwijderen damwand'. De TRA kent bij deze taak geen taakstappen; ik toon de acht risicoregels van de taak, met hun maatregelen. Noem alleen wat je ziet. Dat wordt WPI-20261105-DAM-C2. Klopt dat?"),
    ("…", "Weggelaten: de bevestiging, de algemene onderwerpen die hij zag (A tot en met E, G, H en I; acties -1 en -2, elk met een direct genomen maatregel) en DAM-2.01, 2.03, 2.04 en 2.05 (foto 1 bij onderwerp E, foto 2 bij D, foto 3 bij DAM-2.05 en foto 6 bij G); bij DAM-2.03 gaf de inspecteur een verbeterpunt en wilde hij de actie aan het eind noemen."),
    ("Claude", "DAM-2.06, afvalwater en slib: vooraf reinigen door de opdrachtgever, handen wassen, niet eten of drinken in de werkzone; wat zie je?"),
    ("Inspecteur", "Afwijking. Er is niet vooraf gereinigd, de delen komen onder het slib omhoog. En er stond drinken binnen de afzetting; dat heb ik meteen laten weghalen. Foto."),
    ("Claude", "Welke verbeteractie hoort bij het niet reinigen: wie, wanneer, welke prioriteit? Is die ter plaatse uitgevoerd?"),
    ("Inspecteur", "Reiniging vooraf vast opnemen in de werkvoorbereiding en het VGM-projectplan. Werkvoorbereider, binnen twee weken, kort. Niet uitgevoerd. Ik heb met de operator afgesproken dat hij de rest afspuit vóór het uithijsen, terwijl er niemand in het kanaal is; de mangatwacht spuit op de bokken na."),
    ("Claude", "Actie -3, termijn 19-11-2026, foto 4, met jouw afspraak als direct genomen maatregel. Toetser is standaard het Hoofd Service & Montage; akkoord?"),
    ("Inspecteur", "Akkoord. DAM-2.07: de gasmeter hing boven aan de ladder, niet bij de monteur in het kanaal. Ik heb ze hem laten omhangen. Foto."),
    ("Claude", "Foto 5 hangt aan DAM-2.07. Welk oordeel, welke verbeteractie, wie, welke prioriteit, en is die ter plaatse uitgevoerd?"),
    ("Inspecteur", "Afwijking. Meter op werkhoogte aan de borstband en op diepte opnieuw meten. De monteurs, direct; ja, uitgevoerd: hij hangt nu aan de borstband en ze hebben opnieuw gemeten."),
    ("Claude", "Actie -4, direct gecorrigeerd en door jou ter plaatse getoetst op 05-11-2026; status Afgerond. Klopt dat?"),
    ("Inspecteur", "Klopt. De monteurs zeggen dat de meter bij het afdalen in de weg zit. Hun idee: een klem of karabijn."),
    ("Claude", "Wordt het idee een actie? Zo ja: wie, wanneer, en is het ter plaatse uitgevoerd?"),
    ("Inspecteur", "Ja. Ik zelf: klem of karabijn bij elke gasmeter in de wagens, eind december, planmatig. Niet ter plaatse uitgevoerd."),
    ("Claude", "Ik noteer het idee als extra actie bij DAM-2.07, bron idee monteurs: -5, termijn 31-12-2026, oordeel Afwijking zoals de regel. Welke verbeteracties horen bij het verbeterpunt van DAM-2.03 en bij het drinken, en zijn ze ter plaatse uitgevoerd?"),
    ("Inspecteur", "2.03: hijsen als vaste stap op het LMRA-formulier; ik werk een voorstel uit, eind december, planmatig. Drinken: toolbox over hygiëne, ik zelf, binnen twee weken, kort. Geen van beide uitgevoerd; het drinken is wel weggehaald."),
    ("Claude", "Actie -6, termijn 31-12-2026, en -7, termijn 19-11-2026, met als direct genomen maatregel: drinken uit de werkzone gehaald. Komt er bij -1 (TRA) of -2 (handenwasset) nog een vervolg of een idee van de monteurs als actie bij?"),
    ("Inspecteur", "Ja. Andere projectmappen kunnen ook een oude TRA hebben: Werkvoorbereider loopt ze na, binnen twee weken, kort. Idee van de monteurs: handenwasset vast op de voorraadlijst van elke montagewagen; ik zelf, eind december, planmatig. Niet uitgevoerd."),
    ("Claude", "Actie -8, bron inspectie, termijn 19-11-2026, en -9, bron idee monteurs, termijn 31-12-2026. Wat ging er opvallend goed?"),
    ("Inspecteur", "Onderwerp I: één aanwijzer, elk commando vooraf afgesproken."),
    ("Claude", "Dat staat bij onderwerp I als Conform, klasse 'Gedrag en werkwijze', en komt in onderdeel 5 van het rapport. Samenvatting: getoetst tijdens bezoek: taak 'Verwijderen damwand'. Gezien: 7 TRA-regels en 8 onderwerpen, samen 15; 10 conform, 4 afwijkingen (onderwerpen A en G, DAM-2.06, DAM-2.07), 1 verbeterpunt (DAM-2.03); 9 acties (1 direct, 5 kort, 3 planmatig; 8 open, 1 afgerond). Bevestig je dit?"),
    ("Inspecteur", "Bevestigd."),
])
p("Claude sluit niets af en legt geen oordeel, termijn of status vast zonder dat de inspecteur het zegt of bevestigt. Wat de inspecteur niet zag, zoals DAM-2.02 en onderwerp F, staat niet in het rapport. Wat het rapport per regel en per actie bevat en wat wij daaraan willen toevoegen, staat in bijlage E.")

# ============================================================ BIJLAGE E
bijlage("Bijlage E. Vast te leggen gegevens en de trends die ze voeden")
add(_kn(para("Overzicht: wat in het voorbeeldrapport staat en wat we voorstellen toe te voegen", bold=True, size=20, space_after=40)))
p("De rechterkolom is ons voorstel voor uitbreiding (besluit 2). De oordelen staan in A.3.")
tbl([
    ["Onderdeel", "In het voorbeeldrapport (bijlage B)", "Voorgesteld, nog niet in het voorbeeldrapport"],
    ["Kop", "WPI-nummer, inspecteur en functie, soort inspectie, datum en tijd, opdrachtgever, locatie, project, monteurs, ingang, getoetst tijdens bezoek, omstandigheden", "Verantwoordelijke coördinator, deelnemend directielid, korte duur, risicokenmerk, aangekondigd, invoerwijze; twee extra soorten inspectie"],
    ["Start, product en taak", "Product, fase, taak", "Eerdere acties en afwijkingen tonen (K14); versie van de kennisbank; vier ja/nee-vragen over de voorbereiding"],
    ["Per onderwerp en regel", "Oordeel (C, A, V of NVT), waarneming, classificatie; alleen wat gezien is", "Bij een afwijking: welke maatregel ontbrak en de oorzaak (vanaf de proef). Later: de risicoscore"],
    ["Foto's en gesprek", "Nummer, toelichting, koppeling; besproken, reactie, ideeën", "Melding als een persoon herkenbaar in beeld is"],
    ["Acties", "Nummer, oordeel (gelijk aan de regel), bevinding, direct genomen maatregel, verbeteractie, prioriteit, direct gecorrigeerd, actiehouder, toetser, termijn, status, getoetst op, bron. Wat ging opvallend goed (AC15): onderdeel 5", "Wijze van verificatie"],
    ["Afronden", "Bevestiging met naam en datum; aantallen", "Tijd bij de bevestiging; opmerking over de methode (proef)"],
], [1500, 3800, 3764], first_bold=True)
add(_kn(para("Alle velden", bold=True, size=20, space_after=40)))
p("'(voorgesteld)': nog niet in het voorbeeldrapport (bijlage B); onderdeel van besluit 2. 'Proef': ja als de skill "
  "het veld vóór de start van de proef vraagt (4.1). 'Verplicht': Claude rondt "
  "het rapport niet af zolang het veld leeg is. 'Bedient': de VCA-eis (letters als in A.13) en de trends uit "
  "E.7. Er zijn geen velden over onderaannemers of derden. De voorgestelde velden vragen van de inspecteur vier "
  "woorden in de kop (K8, K9, K10, K13), vier keer ja of nee (V1–V4) en per afwijking twee korte antwoorden (TR4, TR5); "
  "de proef meet de duur.")
VW = [2250, 2300, 1350, 1200, 1264, 700]
NIET_IN_PROEF = {"K4", "AF3", "AF4"}
CELM = int(os.environ.get('CELM', '110'))
for titel, groep in VELDEN.items():
    rows = [["Veld", "Waarom", "Verplicht", "Bedient", "Kost de inspecteur", "Proef"]]
    for c, n, w, wr, vp, vca_, kost, vg in groep:
        naam = f"{c} {n}" + (V if vg else "") + (f"\n{w}" if w else "")
        bed = "; ".join(x for x in [vca_, ", ".join(TREND_VAN[c])] if x) or "–"
        rows.append([naam, wr, vp, bed, kost, "nee" if c in NIET_IN_PROEF else "ja"])
    add(_kn(para(titel, bold=True, size=20, space_after=40)))
    if titel.startswith("E.5"):
        add(_kn(para("Direct gecorrigeerd: de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter plaatse. Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en getoetst.", size=17, space_after=40)))
    tbl(rows, VW, size=17)
    # iets meer lucht in de cellen van de bijlage (de algemene verkleining naar 35 geldt hier niet)
    B[-1] = B[-1].replace('<w:top w:w="60" w:type="dxa"/>', f'<w:top w:w="{CELM}" w:type="dxa"/>').replace('<w:bottom w:w="60" w:type="dxa"/>', f'<w:bottom w:w="{CELM}" w:type="dxa"/>')


add(_kn(para("E.7 Trends: welke vraag en voor wie", bold=True, size=20, space_after=40)))
p("Elk rapport eindigt met een gegevenstabel; het dashboard (bijlage C, in aanbouw) telt die op. Bij de aantallen uit "
  "A.5 zeggen alleen T1 en T9 per maand of kwartaal iets; de andere trends lezen we per half jaar of jaar. De nulmeting "
  "over 2026 (A.9) vult T1, T3, T9 en T12 uit de AMS-WPI's; de TRA-trends komen dan alleen uit de proef. "
  f"T1, T3, T9 en T12 zijn nodig voor VCA 7.1 en 7.2. T5, T8, T14 en T15 bestaan alleen doordat de WPI aan de TRA "
  f"hangt. Geheel op voorgestelde velden rusten {nlijst(VOL)}; deels {nlijst(DEELS)}.", size=17)
tbl([["Trend", "Welke vraag beantwoordt hij", "Voor wie"]] +
    [[f"{c} {n}", v, w] for c, n, fs, v, w in TRENDS],
    [2300, 4664, 2100], size=17, first_bold=True)

# ============================================================ BIJLAGE F
bijlage("Bijlage F. De 21 product-TRA's als checklistbron")
# ---- checklistbron checklistbron: de 21 product-TRA's (uit de kennisbank)
_KB = json.load(open("/home/claude/wpi/run/data/kennisbank.json", encoding="utf-8"))
_IDX = {}
for _r in open("/home/claude/wpi/kb/WPI-kennisbank-index.md", encoding="utf-8"):
    _c = [x.strip() for x in _r.strip().strip("|").split("|")]
    if len(_c) == 5 and _c[0] in _KB: _IDX[_c[0]] = (_c[1], int(_c[2]), int(_c[3]))
assert len(_IDX) == len(_KB) == 21
for _k, (_n, _f, _g) in _IDX.items(): assert _g == len(_KB[_k]["regels"]), _k
_TOT = sum(len(v["regels"]) for v in _KB.values()); assert _TOT == 666
p(f"Bron: de WPI-kennisbank (kennisbank.json en de index), opgebouwd uit de gegeneraliseerde '(2)'-versies van de 21 "
  f"product-TRA's: {_TOT} risicoregels, elk met een vast nummer, taak, maatregelen en een vaste klasse. Maar {_KS} regels "
  "hebben een taakstap (kolom 'Stap'); bij de andere is de taak het toetsniveau (4.5). De kennisbank legt per product geen revisie van de TRA vast; die komt "
  "er bij het bijwerken bij en het rapport toont hem (veld P3, besluit 16). De WPI toetst altijd tegen de actuele TRA in "
  "het QMS: wijkt de kennisbank daarvan af, dan geldt het QMS en wordt de kennisbank binnen twee weken bijgewerkt.", size=17)
_L = sorted(_IDX.items())
_h = (len(_L) + 1) // 2
_ST = {k: sum(1 for x in v["regels"] if x.get("taakstap")) for k, v in _KB.items()}
_rows = [["Code", "Product", "Regels / stap", "Code", "Product", "Regels / stap"]]
for i in range(_h):
    l = _L[i]; rr = _L[i + _h] if i + _h < len(_L) else None
    _rows.append([l[0], l[1][0], f"{l[1][2]} / {_ST[l[0]]}"] + ([rr[0], rr[1][0], f"{rr[1][2]} / {_ST[rr[0]]}"] if rr else ["", "Totaal", f"{_TOT} / {_KS}"]))
if len(_L) % 2 == 0: _rows.append(["", "", "", "", "Totaal", f"{_TOT} / {_KS}"])
tbl(_rows, [750, 2782, 1000, 750, 2782, 1000], size=17)



# ============================================================ BIJLAGE G
bijlage("Bijlage G. Programma en kosten: rekenvoorbeeld")
p("De regels voor het programma staan in A.5. Hieronder zijn ze ingevuld met de fictieve projectplanning van mei tot en "
  "met oktober 2026 (24 projecten). Service- en onderhoudsbezoeken zitten niet in die planning en zijn niet meegeteld. "
  "Alle getallen zijn berekend in kosten.py, niet met de hand ingevuld.")
add(_kn(para("Rekenregel per kwartaal, voorbeeldmatig ingevuld (VOORBEELD — fictieve planning; echte cijfers: besluit 9)", bold=True, size=BODY, space_after=40)))
_R = KO.R
tbl([
    ["Regel", "Telling", "Q2 (mei–jun)", "Q3", "Q4 (okt)", "Benodigde WPI's"],
    ["a", "Projectmaanden van projecten langer dan een maand", *[str(_R[q]["a"]) for q in ("Q2", "Q3", "Q4")], "a"],
    ["b", "Korte projecten met risicokenmerk, geëindigd in het kwartaal", *[str(_R[q]["b"]) for q in ("Q2", "Q3", "Q4")], "b"],
    ["c", "Overige korte projecten, geëindigd in het kwartaal", *[str(_R[q]["c"]) for q in ("Q2", "Q3", "Q4")], "c ÷ 4, naar boven afgerond (voorlopig)"],
    ["Totaal", "Benodigd", *[str(_R[q]["tot"]) for q in ("Q2", "Q3", "Q4")], f"{KO.TOT7} in zes maanden"],
], [800, 3064, 1300, 650, 1050, 2200], first_bold=True)
add(_kn(para("Wat het programma kost (VOORBEELD — fictieve planning; tijd per WPI is een aanname)", bold=True, size=BODY, space_after=40)))
tbl([
    ["Onderdeel", "Voorbeeld", "Hoe berekend"],
    ["WPI's per jaar", f"{KO.JAAR_LAAG}–{KO.JAAR_HOOG} (midden {KO.JAAR_MID})", f"Rustigste en drukste drie maanden × 4; midden: {KO.TOT7} × 12 ÷ {KO.NM}"],
    ["Waarvan coördinatoren", f"{KO.CJ_L}–{KO.CJ_H}: {N1(KO.WPM_L)}–{N1(KO.WPM_H)} per coördinator per maand", f"Min de {KO.NORM_DIR} van het directielid, minimaal {KO.N_COORD * KO.NORM_COORD}; {KO.N_COORD} coördinatoren"],
    ["Tijd per WPI", f"{KO.MIN_L}–{KO.MIN_H} minuten", f"{KO.MIN_LOC_L} min (korte WPI) tot {KO.MIN_LOC_H} min (voorbeeld-WPI DAM-C2) op locatie, plus {KO.MIN_AF} min afronden (proefnorm, hoofdstuk 5); zonder reistijd"],
    ["Uren per coördinator", f"{N1(KO.UPM_L)}–{N1(KO.UPM_H)} per maand; {N1(KO.UPJ_L)}–{N1(KO.UPJ_H)} per jaar", "WPI's per maand × tijd per WPI"],
    ["Directielid", f"{KO.NORM_DIR} WPI's; {N1(KO.UDIR_L)}–{N1(KO.UDIR_H)} uur per jaar", "Minimumeis 7.1f"],
    ["Eenmalige inrichting", f"ca. {round(KO.INR_TOT)} uur", f"Onderdelen uit 4.1 (aanname): opsteller ca. {round(KO.INR_OPST)} uur, Hoofd S&M ca. {round(KO.INR_HSM)} uur (nulmeting), inspecteurs ca. {round(KO.INR_INSP)} uur (uitleg), QHSE-Manager ca. {round(KO.INR_QHSE)} uur"],
], [1900, 3100, 4064], first_bold=True)
p(f"In het voorbeeld zijn in zes maanden {KO.GEDAAN_ALL} WPI's gedaan ({KO.GEDAAN} door de coördinatoren, {KO.GEDAAN_ALL - KO.GEDAAN} door het "
  f"directielid); het programma per werkplek vroeg er {KO.TOT7}. Telt elke maand waarin op een project gewerkt wordt, dan "
  f"vraagt het er {KO.ELKE_TOT} in zes maanden en {KO.ELKE_L}–{KO.ELKE_H} per jaar (besluit 8). "
  "Elk kort project in het voorbeeld heeft een risicokenmerk, meestal open water: de steekproef van één op de vier speelt "
  "dan niet, en de afbakening van open water bepaalt het aantal (besluit 8).")
add(_kn(para("Structurele last van het Hoofd Service & Montage (aanname per onderdeel)", bold=True, size=BODY, space_after=40)).replace("<w:keepNext/>", "<w:keepNext/><w:pageBreakBefore/>", 1))
p(f"In de voorbeelddata leveren {KO.N_WPI_DATA} WPI's {KO.N_ACT} acties op ({N1(KO.ACT_PER_WPI)} per WPI). Het Hoofd S&M toetst er "
  f"{KO.N_ACT_HSM}; de rest toetst een coördinator of directielid, omdat het Hoofd S&M zelf actiehouder is ({KO.N_ACT_HSM_AH}) of de "
  f"actie ter plaatse is getoetst. Geschaald naar {KO.JAAR_LAAG}–{KO.JAAR_HOOG} WPI's per jaar ({N1(KO.WPI_PM_L)}–{N1(KO.WPI_PM_H)} per "
  f"maand): {N1(KO.ACT_PM_L)}–{N1(KO.ACT_PM_H)} acties per maand, waarvan hij er {N1(KO.TOETS_PM_L)}–{N1(KO.TOETS_PM_H)} toetst en "
  f"{N1(KO.AH_PM_L)}–{N1(KO.AH_PM_H)} zelf uitvoert. Niet meegeteld: zijn eigen WPI's en de acties waarvan hij actiehouder is.")
def _rng(l, h): return N1(l) if N1(l) == N1(h) else f"{N1(l)}–{N1(h)}"
tbl([["Onderdeel", "Aanname", "Uur per maand"],
     ["Programma vaststellen en delen", f"{KO.HSM_MIN_PROG} minuten per maand", _rng(*KO.HSM_LAST[0][1:])],
     ["Acties toetsen", f"{KO.HSM_MIN_TOETS} minuten per actie × {N1(KO.TOETS_PM_L)}–{N1(KO.TOETS_PM_H)} per maand", _rng(*KO.HSM_LAST[1][1:])],
     ["WPI-deel maandagoverleg", f"{KO.HSM_MIN_OVERLEG_WEEK} minuten per week", _rng(*KO.HSM_LAST[2][1:])],
     ["Trendanalyse (halfjaar en jaar)", f"{KO.HSM_UUR_TREND_JAAR} uur per jaar; nulmeting zit in de inrichting", _rng(*KO.HSM_LAST[3][1:])],
     ["Totaal", "", _rng(KO.HSM_PM_L, KO.HSM_PM_H)]], [3000, 4364, 1700], first_bold=False)
add(_kn(para("Kosten van de proef", bold=True, size=BODY, space_after=40)))
p(f"Alleen wat vóór de start nodig is (4.1, 'Nodig voor de proef: Ja'): ca. {N1(KO.PROEF_INR, 2).rstrip('0').rstrip(',')} uur "
  f"inrichting, plus {KO.PROEF_N} WPI's × {KO.MIN_L}–{KO.MIN_H} minuten = {N1(KO.PROEF_WPI_L)}–{N1(KO.PROEF_WPI_H)} uur. "
  f"Samen ca. {N1(KO.PROEF_L)}–{N1(KO.PROEF_H)} uur. De nulmeting, het Word-sjabloon en de dashboardkoppeling vallen erbuiten.")
add(_kn(para("Eenmalige inrichting (aanname per onderdeel)", bold=True, size=BODY, space_after=40)))
tbl([["Onderdeel", "Uren", "Wie"]] + [[o, N1(u, 2).rstrip("0").rstrip(","), w] for o, u, w in KO.INRICHTING] + [["Totaal", N1(KO.INR_TOT, 2).rstrip("0").rstrip(","), ""]],
    [5064, 1200, 2800], first_bold=False)

# ============================================================ BIJLAGE H
bijlage("Bijlage H. Besluitenlijst")
add(_kn(para("Alles in deze tabel is een voorstel. De nummers komen terug in bijlage A en E als (besluit n); hoofdstuk 6 groepeert de besluiten die nu nodig zijn.", size=BODY, space_after=80)))
NU, NA = "Nu", "Na de proef"
tbl([
    ["Nr", "Besluit", "Voorstel", "Wie beslist", "Wanneer"],
    ["1", "Proef", "Vanaf 23-11-2026 (als 4.1 klaar is) tot de zevende WPI, uiterlijk [datum binnen de termijn van de CI]; 2 coördinatoren × 3 WPI's, directielid 1; kerstperiode valt erin", "Hoofd S&M, directie", NU],
    ["2", "Gegevens", "Bijlage E; na de proef schrappen wat niet werkt", "Hoofd S&M, coördinatoren", NA],
    ["3", "Reikwijdte", "Eigen monteurs, ook service en buitenland (A.2)", "Hoofd S&M", NU],
    ["4", "Oordelen", "Model in A.3", "Hoofd S&M", NU],
    ["5", "Acties", "Elke afwijking en elk verbeterpunt een actie; één verbeteractie per actie; prioriteiten (A.8)", "Hoofd S&M", NU],
    ["6", "Classificatie", "Veertien klassen; vaste klasse per regel; Buiten TRA als vlag. Nu nodig, omdat de nulmeting (besluit 18) ermee werkt", "Hoofd S&M", NU],
    ["7", "Definities", "A.3: korte duur, risicokenmerk, operationeel leidinggevende", "Hoofd S&M", NA],
    ["8", "Voetnoot 10 en maandtelling", "Kenmerk uit de planning; kort met kenmerk één WPI; overige één op vier. Maand telt vanaf tien werkdagen, of (alternatief) elke maand waarin gewerkt wordt (A.5)", "Hoofd S&M", NA],
    ["9", "Planningcijfers", "Projecten 2026 per kwartaal: lang, kort met en zonder kenmerk", "Hoofd S&M; planning levert vóór 11-12-2026", NU],
    ["10", "Programma", "Maanddocument; gemiste WPI inhalen; directie op werklocatie", "Hoofd S&M, directie", NA],
    ["11", "Aankondigen", "Minimaal een derde onaangekondigd", "Hoofd S&M", NA],
    ["12", "Telling", "WPI met directielid telt voor coördinator, directielid en werkplek (A.5)", "Hoofd S&M, directie", NA],
    ["13", "WPI door monteur", "Voorwaarden uit A.7", "Hoofd S&M", NA],
    ["14", "Toetser", "Regels in A.8", "Hoofd S&M, directie", NU],
    ["15", "Actiestatus", "Status via de inspecteur (directielid via coördinator); Vervallen; escalatie", "Hoofd S&M", NU],
    ["16", "Taakverdeling", "Verdeling uit 4.4; QHSE-Manager ondersteunt; kennisbank binnen twee weken bij", "Hoofd S&M, QHSE-Manager", NU],
    ["17", "Opslag", "Bevestiging en opslag volgens A.8; handwerk in de proef volgens 4.2", "Hoofd S&M", NU],
    ["18", "Trendanalyse", "Nulmeting over 2026 in januari 2027, halfjaar juli 2027, daarna jaarlijks; TREND-acties", "Hoofd S&M, directie", NU],
    ["19", "Terugvaloptie", "Formulier vóór de proef; achteraf invoeren binnen twee werkdagen", "Hoofd S&M", NU],
    ["20", "Bewaartermijn", "Vijf jaar (langer dan één certificatieperiode)", "Hoofd S&M, QHSE-Manager", NA],
    ["21", "Account en seats", "Inspecteurs gebruiken Noardlings bestaande Claude Team-seats (per persoon, niet delen; bijlage I); extra seats voor wie er nog geen heeft; AVG toetsen, zo nodig met de OR. Een latere beproeving van Copilot is een apart ICT-traject", "Directie, ICT-manager", "Nu; vóór de proef (go/no-go)"],
    ["22", "Evaluatie en AMS", "Evaluatie een week na de laatste proef-WPI; bij succes AMS weg en procedure vastgesteld", "Hoofd S&M", NA],
    ["23", "Toetsniveau", "Taakstappen terugbrengen in de TRA's, of de taak als toetsniveau accepteren (4.5). In de proef: de taak, en de taakstap waar de TRA die kent", "Hoofd S&M", NA],
 ], [520, 1450, 4494, 1500, 1100])

# ============================================================ BIJLAGE I
bijlage("Bijlage I. Account en platform: opties en bronnen")
p("Voorbereiding van besluit 21. Alles hieronder komt uit de genoemde bronnen, geraadpleegd op 12-11-2026; de citaten "
  "zijn vertaald, het Engelse origineel staat tussen aanhalingstekens. Prijzen in Amerikaanse dollars, exclusief belasting.")
add(_kn(para("Wat de bronnen zeggen", bold=True, size=20, space_after=40)))
tbl([["Onderwerp", "Wat de bron zegt", "Bron"],
     ["Delen van een account (consumentenvoorwaarden)", "Inloggegevens niet delen en het account niet aan anderen beschikbaar stellen: \"You may not share your Account login information […] with anyone else. You also may not make your Account available to anyone else.\" Deze voorwaarden gelden voor Claude.ai en Claude Pro.", "[1]"],
     ["Delen van een seat (Team)", "Een seat is voor één persoon: \"Each seat on a Team plan is assigned to one named individual, and only that person may use it.\"", "[2]"],
     ["Prijs Claude", "Pro: $17 per maand bij jaarbetaling, $20 bij maandbetaling. Team, standard seat: $20 per seat per maand bij jaarbetaling, $25 bij maandbetaling; 2 tot 150 seats. Team, premium seat: $100 / $125. Enterprise: US$20 per seat per maand plus gebruik tegen API-tarieven, jaarlijks, minimaal 20 seats. Prijzen exclusief belasting", "[3]"],
     ["Prijs Microsoft 365 Copilot Business", "$21 per gebruiker per maand bij jaarbetaling; actieprijs $18 voor het eerste jaar bij aankoop tussen 1 juli en 31 december 2026; $25,20 bij maandbetaling. Alleen voor bestaande klanten met een geschikt Microsoft 365 Business-abonnement. Copilot Chat zit zonder extra kosten in geschikte Microsoft 365-abonnementen; Copilot Studio voor eigen agents zit in de Copilot-licentie", "[4]"],
     ["Claude-modellen in Copilot", "Beschikbaar in onder meer Microsoft Copilot, Researcher en Copilot Studio. In de EU, EFTA en het VK staan ze standaard uit (opt-in door de beheerder) en ze vallen buiten de EU Data Boundary", "[5]"]],
    [2000, 6164, 900], size=17, first_bold=True)
add(_kn(para("De opties uitgewerkt (3 inspecteurs in de proef, daarna ± 5 gebruikers)", bold=True, size=20, space_after=40)))
tbl([["Optie", "Kosten", "Voor", "Tegen of open"],
     ["A. Gedeeld Claude-account, zoals nu", "–", "Werkt nu al", "Niet toegestaan volgens [1] en [2]; inspecteur niet herleidbaar"],
     ["B. Claude Team, eigen standard seat per inspecteur", f"Proef: 3 × $25 = ${KO.LIC['team_proef_mnd']} per maand bij maandbetaling, of ${KO.LIC['team_proef_jaar']} per jaar. Daarna: 5 × $20 × 12 = ${KO.LIC['team_na_jaar']:,} per jaar".replace(",", "."), "De skill, projectmap en het rapport werken hier al; elke inspecteur herleidbaar", "Wat voor account Noardling nu heeft, is niet in dit voorstel nagegaan; past naast de bedrijfsstandaard Copilot"],
     ["C. Microsoft 365 Copilot", f"Proef: 3 × $21 × 12 = ${KO.LIC['cop_proef_jaar']} per jaar (actie jaar 1: ${KO.LIC['cop_proef_promo']}). Daarna: ${KO.LIC['cop_na_jaar']:,} per jaar (actie: ${KO.LIC['cop_na_promo']:,}). Niets extra voor wie al een licentie heeft".replace(",", "."), "Bedrijfsstandaard; beheer en gegevensbescherming via Microsoft", "De methode bestaat niet in Copilot en moet als agent opnieuw worden gebouwd en getest; Claude-modellen in de EU standaard uit; welke inspecteurs al een licentie hebben, is na te gaan"]],
    [2000, 2600, 2000, 2464], size=17, first_bold=True)
p("Advies (voorstel): optie B voor de proef, met maandbetaling, zodat er na de evaluatie niets vastligt. ICT verkent "
  "intussen optie C met dezelfde inspectie. Na de evaluatie kiest de directie voor de periode daarna.", size=17)
add(_kn(para("Bronnen", bold=True, size=20, space_after=40)))
tbl([["Nr", "Bron"],
     ["[1]", "Anthropic, Consumer Terms of Service, versie van 8 oktober 2025, paragraaf 2. https://www.anthropic.com/legal/consumer-terms"],
     ["[2]", "Claude Help Center, Purchasing and managing seats. https://support.claude.com/en/articles/12004354-purchasing-and-managing-seats"],
     ["[3]", "Claude, Pricing. https://claude.com/pricing"],
     ["[4]", "Microsoft, Microsoft 365 Copilot for business. https://www.microsoft.com/en-us/microsoft-365/copilot/business"],
     ["[5]", "Microsoft Learn, Claude models from Anthropic in Microsoft Online Services. https://learn.microsoft.com/en-us/microsoft-365/copilot/connect-to-ai-subprocessor"]],
    [700, 8364], size=17)

# slotalinea na de laatste tabel minimaal, zodat hij geen lege pagina opent
_i = B[-1].rfind("</w:tbl>") + len("</w:tbl>")
B[-1] = B[-1][:_i] + '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>'

# ============================================================ build
UIT = "/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx"
TPL = f"{BW}/sjabloon_v3.docx"
maak_sjabloon()
import zipfile
TPL2 = f"{BW}/sjabloon_v3_beeld.docx"
with zipfile.ZipFile(TPL) as zin, zipfile.ZipFile(TPL2, "w", zipfile.ZIP_DEFLATED) as zout:
    for it in zin.infolist():
        data = zin.read(it.filename)
        if it.filename == "word/_rels/document.xml.rels":
            rels = "".join(f'<Relationship Id="{k}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{k}.png"/>' for k in BEELDEN)
            data = data.replace(b"</Relationships>", rels.encode() + b"</Relationships>")
        if it.filename == "[Content_Types].xml" and b'Extension="png"' not in data:
            data = data.replace(b"<Default ", b'<Default Extension="png" ContentType="image/png"/><Default ', 1)
        zout.writestr(it, data)
    for k, pad in BEELDEN.items():
        zout.write(pad, f"word/media/{k}.png")
TPL = TPL2
body = "\n".join(B).replace('<w:top w:w="60" w:type="dxa"/>', '<w:top w:w="25" w:type="dxa"/>').replace('<w:bottom w:w="60" w:type="dxa"/>', '<w:bottom w:w="25" w:type="dxa"/>')
build(template=TPL, title="Nieuwe methode\nwerkplekinspecties", subtitle="Voorstel voor een proef",
      body_xml=wpinr(body), output=UIT, cover_size=56, work=f"{BW}/_nb_build")
