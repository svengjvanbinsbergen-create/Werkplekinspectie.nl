#!/usr/bin/env python3
"""Bouwt het voorbeeld-WPI-rapport WPI-20261105-DAM-C2 (fictieve data) in Noardling-huisstijl. Ronde 6 (data 9.2)."""
import json, os, re, shutil, subprocess, sys
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

SKILL = ("/root/.claude/skills/synced/134f4af9-00ba-492e-80f4-f185b433f298_"
         "fafc370e-ca1f-402c-83bc-47a084adb998/noardling-docx-bouwer")
sys.path.insert(0, SKILL + "/scripts")
import noardling_docx as nb
from noardling_docx import para, heading, pagebreak, _cel, _runs, _rpr, _next_id, _esc

RUN = "/home/claude/wpi/run"
WORK = RUN + "/build"
NR = "WPI-20261105-DAM-C2"
OUT = f"{RUN}/out/{NR} Voorbeeldrapport.docx"
MARK = "VOORBEELD — fictieve data"
W = 9064     # tekstbreedte staand
WL = 15840   # tekstbreedte liggend (marges 500)
NB = " "

d = json.load(open(RUN + "/data/voorbeelddata.json", encoding="utf-8"))
kb = json.load(open(RUN + "/data/kennisbank.json", encoding="utf-8"))
wpi = next(w for w in d["wpis"] if w["nr"] == NR)
regels = [r for r in d["regels"] if r["wpi"] == NR]
acties = [a for a in d["acties"] if a["wpi"] == NR]
tra = {r["id"]: r for r in kb["DAM"]["regels"] if r["fase"] == wpi["fase"]}
alg = [r for r in regels if r["soort"] == "Algemeen"]
trar = [r for r in regels if r["soort"] == "TRA"]
assert {r["ref"] for r in trar} == set(tra), "niet alle TRA-regels van de fase aanwezig"


def dmy(s):
    return f"{s[8:10]}-{s[5:7]}-{s[0:4]}" if s else ""


def kort(a):
    return a["actie"].rsplit("-", 1)[1]


# ---------------------------------------------------------------- oordelen
OORDEEL = {  # code, vulling, tekstkleur (label = code + tekst, dus niet alleen kleur)
    "Conform": ("C", "DCEFD9", "1E6B34"),                       # groen
    "Afwijking": ("A", "F8D7D4", "A11B12"),                     # rood
    "Verbeterpunt": ("V", "E9DEF4", "5B2C86"),                  # paars
    "Geen afwijking waargenomen": ("GA", "E4E4E4", "474747"),   # grijs
    "Niet beoordeeld": ("NB", "C6C6C6", "1A1A1A"),              # donkergrijs
    "Niet van toepassing": ("NVT", "FFFFFF", "6B6B6B"),
}
# oranje en blauw blijven voor de kaders (oranje = keuze Noardling, blauw = VCA); de oordeeltinten komen nergens
# anders voor. Labelcellen zijn neutraal grijs; de VOORBEELD-markering is donkerrood met rand, zonder vulling.
LABEL = "F5F5F5"
LABELTEKST = "262626"
MARKKLEUR = "7A0C0C"
NIVEAU = {"Conform": "Waargenomen", "Afwijking": "Waargenomen", "Verbeterpunt": "Waargenomen",
          "Geen afwijking waargenomen": "Alleen bevestigd", "Niet beoordeeld": "Niet beoordeeld"}
VOLGORDE = list(OORDEEL)
STATUSKLEUR = {"Open": "000000", "Afgerond": "595959"}   # Open zwart vet: geen oordeelkleur en niet het blauw van koppen
PRIO = {"direct": "Direct", "kort": "Kort (binnen 2 weken)", "planmatig": "Planmatig"}
DEKKING = {"Ja": "Waargenomen", "Nee": "Niet beoordeeld"}   # oudere dataversies; nieuwere geven de tekst zelf

# ------------------------------------------------- fictieve inhoud inspecteur
TIJD = "09:40–10:50\u00a0uur"   # vaste spatie: "uur" breekt niet af
WAARNEMING = {   # ingesproken door de inspecteur: korte zinnen, eerste persoon. Rollen in plaats van namen (AVG):
                 # "de monteur in het kanaal" werkt beneden; "de mangatwacht" doet bij elk betreden niets anders en is
                 # pas aanwijzer of spuit af als niemand in het kanaal is; de kraan wordt bediend door de kraanmachinist.
    "A": "In de bus liggen het VGM-projectplan, de werkvergunning van de opdrachtgever en de TRA Damwand. De LMRA van "
         "vanmorgen is ingevuld en door beide monteurs getekend. Ik zie dat de TRA in de projectmap een oudere revisie "
         "is dan die in het QMS. Ze werken op deze klus dus met een verouderde TRA.",
    "B": "Ik zie dat de schuif bovenstrooms dicht staat. Erop zitten het persoonlijk slot van de monteur in het kanaal "
         "en het slot van de opdrachtgever, met label. De toevoerpomp staat in de schakelkast uit, vergrendeld en "
         "gelabeld. De monteur heeft zijn sleutel bij zich.",
    "C": "Beide monteurs dragen helm, veiligheidsschoenen en werkhandschoenen. De monteur in het kanaal draagt laarzen, "
         "een wasbare overall, waterdichte handschoenen tot over de pols en het harnas voor de reddingslier (zie H). "
         "Bij het afspuiten draagt de mangatwacht een gelaatsscherm (zie DAM-2.06).",
    "D": "Slagmoersleutel, kabelhaspel en looplamp hebben een keuringssticker van 2026. Looplamp en haspel in het natte "
         "kanaal werken op 24 V, via een scheidingstransformator die boven staat. De vierspronghijsketting en de "
         "harpsluitingen hebben de kleurcode van dit jaar. De WLL op het label is leesbaar.",
    "E": "De mobiele kraan van het kraanbedrijf staat naast het kanaal, volledig afgestempeld op schotten. Hijsgebied en "
         "hijspad zijn afgezet met pionnen en ketting tot aan het kanaalhek. Het kraanboek met geldige keuring ligt in "
         "de cabine. Ik zie dat de monteur en de kraanmachinist vóór het eerste deel het gewicht per deel van de "
         "tekening (850 kg, fictief) vergelijken met de WLL op het label van de ketting bij twee parten (2,1 t, "
         "fictief).",
    "G": "Bij de werkplek is geen handenwasgelegenheid. In de bus ontbreken de jerrycan met water en de zeep, en de "
         "desinfectiegel is leeg. Handen wassen kan alleen in het bedrijfsgebouw, zo'n 200 meter lopen. Ter plaatse: "
         "water, zeep en papier uit het bedrijfsgebouw gehaald en bij de werkplek gezet voordat ze verder gingen.",
    "H": "Boven de toegang bij de ladder staat een hijsdriepoot met reddingslier. Driepoot, lier en harnas hebben een "
         "keuringssticker van 2026. De monteur in het kanaal gaat in harnas naar beneden, met de lijn aangepikt. De "
         "mangatwacht staat bij de toegang en doet niets anders zolang er iemand beneden is. Hij heeft een telefoon met "
         "bereik; 112 en het noodnummer van de opdrachtgever staan op de werkvergunning. De kraan staat dan stil.",
    "I": "Ze spreken elke hijsbeweging vooraf af. Zodra niemand meer in het kanaal is, is de mangatwacht aanwijzer voor "
         "de kraanmachinist, via de portofoon. De kraanmachinist herhaalt elk commando en hijst pas na “vrij”. De "
         "andere monteur stuurt de last met de stuurlijn.",
    "DAM-2.01": "Er staat hekwerk rondom het kanaal. Het ene open veld bij de ladder is afgezet met een ketting; die gaat "
                "alleen los om af te dalen of op te klimmen. De monteur gaat via de vaste ladder, aangelijnd (zie H). "
                "Ik zie niemand binnen 1 m van de rand zonder harnas.",
    "DAM-2.03": "Vóór het eerste hijsmoment nemen de monteurs met de kraanmachinist de LMRA van vanmorgen door. Het "
                "hijsen bespreken ze ook, maar alleen mondeling. Op het LMRA-formulier staat hijsen niet als stap. De "
                "vierspronghijsketting hangt met twee parten in de hijsogen; de twee vrije parten zijn opgehaakt in de "
                "hoofdring. Gewicht en WLL: zie E. Eerst een proefhijs van een paar centimeter. De stuurlijn zit eraan "
                "voordat het deel vrijkomt. Het hijsgebied is afgezet. Aanwijzer en kraanmachinist hebben zicht- en "
                "spraakcontact.",
    "DAM-2.04": "Bij het neerleggen op de bokken brengen de monteurs het deel met de stuurlijn op zijn plek. De "
                "aanwijzer geeft de commando's. Hun handen blijven eraf tot het deel ligt en de ketting slap hangt.",
    "DAM-2.05": "Bij het uithijsen van het tweede deel stuurt de monteur de last met een stuurlijn van ongeveer vijf "
                "meter. Hij staat op het roosterpad, achter het hek en buiten de draaicirkel.",
    "DAM-2.06": "De delen komen omhoog met een laag slib en vlechtsel. Werkplek en damwand zijn niet vooraf door de "
                "opdrachtgever gereinigd; de TRA noemt dat als collectieve maatregel. Pas als niemand meer in het "
                "kanaal is, spuit de mangatwacht de delen op de bokken af vanaf het roosterpad: tuinslang, lage druk, "
                "geen hogedrukreiniger. Ik zie weinig nevel. Het spoelwater loopt terug in het kanaal, naar de inlaat "
                "van de RWZI; de opdrachtgever heeft daar toestemming voor gegeven. Hij draagt laarzen, wasbare "
                "overall, waterdichte handschoenen en een gelaatsscherm. Op het stempelschot, binnen de afzetting, "
                "staat een beker koffie. Ter plaatse: het drinken uit de werkzone gehaald.",
    "DAM-2.07": "Werkvergunning besloten ruimte is aanwezig; het kanaal is van boven open. Vóór het eerste betreden meet "
                "de mangatwacht met de slang tot op de bodem: O2, H2S, CO en LEL in orde, genoteerd op de vergunning. "
                "Bij het eerste deel draagt de monteur in het kanaal de 4-gasmeter bij zich. Bij het tweede deel hangt "
                "de meter bovenaan de ladder, niet op werkhoogte. De mangatwacht heeft zicht op de monteur. Ter "
                "plaatse: monteur naar boven gehaald, meter aan de borstband, op diepte opnieuw gemeten voordat hij "
                "weer afdaalde. Geen alarm; bumptest van vanmorgen.",
    "DAM-2.08": "Bij het tweede deel pikt de monteur in het kanaal de ketting aan en neemt hij de geleidingsbouten "
                "onderin los. De ophanging bovenin blijft vast en de kraan staat stil. Daarna klimt hij eruit. Pas dan "
                "zet de kraanmachinist de ketting op lichte spanning en neemt de monteur de laatste bevestigingen van "
                "de ophanging los vanaf het roosterpad, achter het hek, met een verlengde dopsleutel. Er is dan "
                "niemand in het kanaal, onder of naast het deel. Na het uithijsen daalt hij weer af voor het volgende "
                "deel.",
}
BEVESTIGD = ("Alleen bevestigd: geen eigen waarneming ingesproken; bij de afsluitvraag bevestigd dat op dit onderwerp "
             "niets aan te merken is.")
NB_TEKST = {
    "DAM-2.02": "Niet beoordeeld. De inspecteur heeft niet op werkhouding en tillen gelet en heeft dit bij de "
                "afsluitvraag niet bevestigd.",
}
# het niveau waargenomen / alleen bevestigd / niet beoordeeld komt uit de dataset; de teksten moeten daarbij passen
for r in regels:
    dk = DEKKING.get(r["waargenomen"], r["waargenomen"])
    assert dk in ("Waargenomen", "Alleen bevestigd", "Niet beoordeeld"), dk
    assert (dk == "Waargenomen") == (r["ref"] in WAARNEMING), r["ref"]
    assert (dk == "Niet beoordeeld") == (r["ref"] in NB_TEKST), r["ref"]
    assert dk == NIVEAU[r["oordeel"]], r["ref"]

# Bevinding, verbeteractie en de direct genomen maatregel komen ongewijzigd uit de dataset (veld
# direct_genomen_maatregel; leeg = niets tonen). Ook de actielijst in de samenvatting toont het veld "bevinding" letterlijk,
# nooit de verbeteractie.
for a in acties:
    assert a["bevinding"] and a["verbeteractie"] and a["bevinding"] != a["verbeteractie"], a["actie"]

# vaste definitie (letterlijk in de legenda van de actielijst en in onderdeel 6)
DEF_DIRECT = ("Direct gecorrigeerd: de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter "
              "plaatse. Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de "
              "verbeteractie is uitgevoerd en getoetst.")
for a in acties:
    if a["direct_gecorrigeerd"]:   # verbeteractie ter plaatse uitgevoerd: afgerond en ter plaatse getoetst
        assert a["status"] == "Afgerond" and a["getoetst_op"] == a["datum"] and "ter plaatse" in a["toetser"], a["actie"]
    elif a["direct_genomen_maatregel"]:
        assert a["status"] == "Open", a["actie"]

# één actie = één verbeteractie. Controle: precies één zin; en een verbeteractie met " en " moet in deze handmatig
# nagelopen lijst staan (beide delen horen bij dezelfde actiehouder en termijn). Een nieuwe of gewijzigde tekst met
# " en " laat het script stoppen tot iemand hem heeft nagelopen of de actie heeft gesplitst.
EN_NAGELOPEN = {
    "3": "Vooraf reinigen door de opdrachtgever als vaste eis opnemen in de werkvoorbereiding en het VGM-projectplan "
         "voor demontage in afvalwater.",                                   # één handeling, twee documenten
    "4": "4-gasmeter op werkhoogte aan de borstband dragen en op diepte opnieuw meten vóór verder werken — ter plaatse "
         "uitgevoerd.",                                                     # één handeling ter plaatse, al uitgevoerd
    "5": "Idee van de monteurs uitwerken: klem of karabijn uitzoeken om de 4-gasmeter op borsthoogte te dragen en bij "
         "elke 4-gasmeter in de montagewagens leggen.",                      # uitzoeken en uitdelen: één houder, één termijn
    "6": "Voorstel uitwerken om hijsen als vaste stap op de LMRA te zetten en bespreken in het coördinatorenoverleg.",
}
for a in acties:
    va = a["verbeteractie"]
    zinnen = [z for z in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", va.strip()) if z]
    if len(zinnen) != 1 or not va.rstrip().endswith("."):
        raise SystemExit(f"FOUT: verbeteractie van {a['actie']} is niet precies één zin: {va}")
    if " en " in va and EN_NAGELOPEN.get(kort(a)) != va:
        raise SystemExit(f"FOUT: verbeteractie van {a['actie']} bevat ' en ' en is niet nagelopen (mogelijk twee "
                         f"acties met verschillende actiehouder of termijn): {va}")

# korte bevinding voor de actielijst in de samenvatting (een bevinding, nooit de verbeteractie); de volledige tekst
# staat alleen in onderdeel 6
BEV_KORT = {"1": "TRA in de projectmap verouderd", "2": "Geen handenwasgelegenheid", "3": "Damwand niet vooraf gereinigd",
            "4": "Gasmeter niet op werkhoogte", "5": "Gasmeter zit bij afdalen in de weg",
            "6": "Hijsen niet als stap op de LMRA", "7": "Drinken binnen de afzetting",
            "8": "Andere projectmappen mogelijk verouderd", "9": "Handenwasset geen vaste uitrusting"}
assert set(BEV_KORT) == {kort(a) for a in acties}
for a in acties:
    assert BEV_KORT[kort(a)].lower() not in a["verbeteractie"].lower(), a["actie"]
# wat bij een direct genomen maatregel nog moet gebeuren (uitleg in onderdeel 6)
NOG_OPEN = {"1": "de actuele TRA moet nog in de projectmap",
            "2": "de handenwasset moet nog in de montagewagen",
            "3": "de eis moet nog in de werkvoorbereiding en het VGM-projectplan",
            "7": "het drinken is weggehaald, maar de toolbox moet nog gebeuren"}
REGEL = {r["ref"]: r for r in regels}
for a in acties:
    # regel: het oordeel van een actie is altijd gelijk aan het oordeel van zijn regel
    if a["oordeel"] != REGEL[a["ref"]]["oordeel"]:
        raise SystemExit(f"FOUT: oordeel van actie {a['actie']} ({a['oordeel']}) wijkt af van regel {a['ref']} "
                         f"({REGEL[a['ref']]['oordeel']})")
    assert a["actiehouder"] != a["toetser"], a["actie"]
    assert (a["status"] == "Afgerond") == bool(a["getoetst_op"]), a["actie"]
    assert a["actiehouder"] != "QHSE-Manager", a["actie"]
    assert not (a["direct_gecorrigeerd"] and a["status"] != "Afgerond"), a["actie"]
FOTOS = [  # nr, ref, acties die de foto aantoont, wat de foto zou tonen, toelichting inspecteur
    (1, "E", [], "Afgezet hijsgebied naast het kanaal, kraan op schotten",
     "Afzetting van hijsgebied en hijspad met pionnen en ketting. Zo hoort het."),
    (2, "D", [], "Kleurcode en WLL-label op de hijsketting",
     "Kleurcode van dit jaar en leesbare WLL op de ketting voor de damwanddelen."),
    (3, "DAM-2.05", [], "Monteur met stuurlijn op het roosterpad",
     "Begeleiden met stuurlijn vanaf het roosterpad, achter het hek, buiten de draaicirkel."),
    (4, "DAM-2.06", ["3"], "Damwanddeel op bokken, vol slib en vlechtsel",
     "Zo komen de delen omhoog: niet vooraf gereinigd."),
    (5, "DAM-2.07", ["4", "5"], "4-gasmeter bovenaan de ladder, monteur beneden",
     "Tweede deel: de meter hangt bovenaan de ladder. Daarna aan de borstband."),
    (6, "G", ["2"], "Lege plek in de bus waar de handenwasset hoort",
     "Jerrycan en zeep ontbreken, desinfectiegel is leeg."),
]
FOTO_BIJ, ACTIE_BIJ = {}, {}
FOTO_ACTIE = {}   # actie -> foto's; een foto hoort alleen bij de acties die hij aantoont
for n, ref, acts, _, _ in FOTOS:
    FOTO_BIJ.setdefault(ref, []).append(n)
    for x in acts:
        FOTO_ACTIE.setdefault(x, []).append(n)
for a in acties:
    ACTIE_BIJ.setdefault(a["ref"], []).append(kort(a))
for n, ref, acts, _, _ in FOTOS:   # een foto toont alleen acties van zijn eigen regel
    assert set(acts) <= set(ACTIE_BIJ.get(ref, [])), (n, ref, acts)
for r in regels:   # de lijst acties per regel in de dataset moet gelijk zijn aan de acties die naar de regel wijzen
    assert [x.rsplit("-", 1)[1] for x in r.get("acties", [])] == ACTIE_BIJ.get(r["ref"], []), r["ref"]


def dekking(r):
    return DEKKING.get(r["waargenomen"], r["waargenomen"])


def waarneming(r):
    if dekking(r) == "Niet beoordeeld":
        return NB_TEKST[r["ref"]]
    return WAARNEMING.get(r["ref"], BEVESTIGD)


def zie(ref):
    delen = [f"actie{NB}{n}" for n in ACTIE_BIJ.get(ref, [])] + [f"foto{NB}{n}" for n in FOTO_BIJ.get(ref, [])]
    return ("Zie " + ", ".join(delen) + ".") if delen else ""


# ---------------------------------------------------------------- xml-helpers
SZ = 18   # 9 pt in hoofdtabellen (broodtekst 9–9,5 pt)
SZT = 18  # 9 pt lopende tekst
SZB = 16  # 8 pt in de bijlage (minimaal 8 pt)
LIJN = 240       # regelafstand in tabellen (240 = enkel; de stijl heeft 292)
LIJN_SMAL = 240  # regelafstand in de bijlage
STIJL = '<w:pStyle w:val="bodytekstMULI8"/>'
KN = STIJL + "<w:keepNext/>"


def p(text, size=SZ, **kw):
    kw.setdefault("space_after", 0)
    return para(text, size=size, **kw)


def rich(parts, size=SZ, space_after=0, align=None, keep=False):
    runs = "".join(_runs(t, size=size, **o) for t, o in parts)
    jc = f'<w:jc w:val="{align}"/>' if align else ""
    return (f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>'
            f'{KN if keep else STIJL}<w:spacing w:after="{space_after}"/>{jc}</w:pPr>{runs}</w:p>')


# -- niet-afbrekend koppelteken in alle codes (TRA-ID's, WPI-nummers, actienummers, projectnummers).
# In de data en bij het opzoeken blijft het gewone koppelteken; pas bij het schrijven van de XML wordt elk koppelteken
# binnen een code een <w:noBreakHyphen/> (Words eigen niet-afbrekend koppelteken, U+2011).
CODE_RE = re.compile(r"WPI-\d{8}-[A-Z]{2,4}-[A-Z0-9]+(?:-\d+)?"      # WPI-nummer, met of zonder actievolgnummer
                     r"|(?<![A-Za-z])[A-Z]{2,4}-\d\.\d{2}"           # TRA-ID, bv. DAM-2.06
                     r"|(?<![A-Za-z0-9])P\d{2}-\d{3}"                 # projectnummer, bv. P26-168
                     r"|(?<![\w\-\u2011])-\d{1,2}(?!\d|[.,]\d)"      # kort actienummer, bv. -5
                     r"|(?<![\w])4-gas")                              # 4-gasmeter / 4-gasmeting
NBH = "\u2011"


def codes_vast(tekst):
    """Vervangt in een platte tekst elk koppelteken binnen een code door U+2011."""
    return CODE_RE.sub(lambda m: m.group(0).replace("-", NBH), tekst)


def nbh_xml(xml):
    """Zet in alle <w:t>-teksten van een XML-stuk de koppeltekens binnen codes om naar <w:noBreakHyphen/>."""
    def t_(m):
        tekst = codes_vast(m.group(2))
        if NBH not in tekst:
            return m.group(0)
        open_ = m.group(1) if "xml:space" in m.group(1) else '<w:t xml:space="preserve">'
        return open_ + tekst.replace(NBH, '</w:t><w:noBreakHyphen/><w:t xml:space="preserve">') + "</w:t>"
    return re.sub(r"(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)", t_, xml)


def controleer_codes(xml, waar):
    """Stopt als ergens een code met een gewoon koppelteken staat (per alinea, dus ook in elke tabelcel)."""
    fout = []
    for par in re.findall(r"<w:p[ >].*?</w:p>", xml, flags=re.S):
        tekst = "".join(NBH if x == "<w:noBreakHyphen/>" else re.sub(r"<[^>]+>", "", x)
                        for x in re.findall(r"<w:t(?: [^>]*)?>[^<]*</w:t>|<w:noBreakHyphen/>", par))
        fout += [m.group(0) for m in CODE_RE.finditer(tekst) if "-" in m.group(0)]
    if fout:
        raise SystemExit(f"FOUT: code(s) met gewoon koppelteken in {waar}: {sorted(set(fout))}")
    return True


# -- controle: geen woord breder dan zijn kolom (gemeten met Muli, het font van het sjabloon en van de PDF)
_F = {}


def breedte(tekst, half_pt, vet=False):
    f = _F.setdefault(vet, ImageFont.truetype(f"/root/.fonts/Muli-{'Bold' if vet else 'Regular'}.ttf", 200))
    return f.getlength(tekst.replace(NBH, "-")) / 200 * (half_pt / 2) * 20


def controleer(cel_xml, kolom, waar, speling=260):
    for par in re.findall(r"<w:p [^>]*>.*?</w:p>", cel_xml, flags=re.S):
        woord, b = "", 0.0
        for rpr, inhoud in re.findall(r"<w:r>(<w:rPr>.*?</w:rPr>)((?:<w:t[^>]*>[^<]*</w:t>|<w:br/>)+)</w:r>", par,
                                      flags=re.S):
            m = re.search(r'<w:sz w:val="(\d+)"', rpr)
            sz, vet = int(m.group(1)) if m else 17, "<w:b/>" in rpr
            tekst = codes_vast(" ".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", inhoud)).replace("&amp;", "&"))
            for ch in tekst:
                if ch == " ":
                    woord, b = "", 0.0
                else:
                    woord += ch
                    b += breedte(ch, sz, vet)
                    if b > kolom - speling:
                        print(f"  LET OP te smal ({waar}): '{woord}…' past niet in {kolom}")
                        woord, b = "", -1e9
                    if ch in "-/–":
                        woord, b = "", 0.0


def tbl(rows, widths, header=True, fills=None, valign="top", keep=False, naam="", totaal=W, hsize=SZ, smal=False,
        wees=False, los=False, minrijen=2, splits=False):
    """rows: lijst van rijen; cel = str of lijst alinea-xml. fills: {(rij, kol): hex}."""
    fills = fills or {}
    assert sum(widths) <= totaal + 2, (naam, sum(widths))
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    b = "".join(f'<w:{z} w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>'
                for z in ("top", "left", "bottom", "right", "insideH", "insideV"))
    tblpr = (f'<w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/><w:tblBorders>{b}</w:tblBorders>'
             '<w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" '
             'w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>')
    out = []
    for i, rij in enumerate(rows):
        kop_ = header and i == 0
        # splits=True: een lange rij mag over de pagina doorlopen (kop herhaalt); alleen voor de TRA-tabel
        trpr = ("<w:trPr>" + ("" if (splits is True or (splits and i in splits)) and not kop_ else "<w:cantSplit/>") + ("<w:tblHeader/>" if kop_ else "")
                + "</w:trPr>")
        cellen = ""
        for j, cel in enumerate(rij):
            # een korte rij: de laatste cel loopt door tot de rechterkant van de tabel
            span = len(widths) - j if (j == len(rij) - 1 and len(rij) < len(widths)) else None
            cw = sum(widths[j:]) if span else widths[j]
            if isinstance(cel, str):
                cel = [p(cel, bold=kop_, color="FFFFFF" if kop_ else None, size=hsize)]
            x = "".join(cel)
            controleer(x, cw, f"{naam} r{i} k{j}", 125 if smal else 260)
            x = x.replace('<w:spacing w:after="', '<w:spacing w:before="0" w:after="')
            if smal:   # bijlage: geen rechterinspringing uit de stijl
                x = x.replace('<w:spacing w:before="0" w:after="0"/>',
                              '<w:spacing w:before="0" w:after="0"/><w:ind w:left="0" w:right="0"/>')
            # regelafstand in tabellen iets krapper dan de 1,22 van de stijl (lopende tekst houdt de huisstijl)
            x = x.replace('<w:spacing w:before="0" w:after="', f'<w:spacing w:before="0" w:line="{LIJN_SMAL if smal else LIJN}" w:lineRule="auto" w:after="')
            # kop blijft bij de eerste rij; behalve bij los=True (hoge rijen) ook de eerste rij bij de tweede
            if (keep and i < len(rows) - 1) or (header and i < (1 if los else minrijen) and len(rows) > 2) or \
                    (wees and i == len(rows) - 2):
                x = x.replace(STIJL, KN)
            cx_ = _cel([x], cw, fill=nb.BLAUW if kop_ else fills.get((i, j)), span=span,
                       valign="center" if kop_ else valign)
            if smal:
                cx_ = cx_.replace('<w:top w:w="60" w:type="dxa"/>', '<w:top w:w="30" w:type="dxa"/>').replace(
                    '<w:bottom w:w="60" w:type="dxa"/>', '<w:bottom w:w="30" w:type="dxa"/>')
                cx_ = cx_.replace('<w:left w:w="80" w:type="dxa"/>', '<w:left w:w="50" w:type="dxa"/>').replace(
                    '<w:right w:w="80" w:type="dxa"/>', '<w:right w:w="50" w:type="dxa"/>')
            cellen += cx_
        out.append(f"<w:tr>{trpr}{cellen}</w:tr>")
    return f"<w:tbl>{tblpr}<w:tblGrid>{grid}</w:tblGrid>{''.join(out)}</w:tbl>" + para("", space_after=0, size=8)


def intro(text, **kw):
    kw.setdefault("space_after", 80)
    kw.setdefault("size", SZT)
    return para(text, **kw).replace(STIJL, KN, 1)


KOPSZ = 24  # onderdeelkoppen 12 pt: duidelijk groter dan labels (9 pt vet)


def kop(text, nieuwe_pagina=False):
    return para(text, style="Kop1", size=KOPSZ, space_after=60).replace(
        '<w:spacing w:after="60"/>', '<w:spacing w:before="160" w:after="60"/>').replace('<w:pStyle w:val="Kop1"/>', '<w:pStyle w:val="Kop1"/><w:keepNext/>' +
                                 ("<w:pageBreakBefore/>" if nieuwe_pagina else ""))


def naast(links, rechts, wl=4500, wr=4564):
    def c_(x, w):
        return (f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/><w:tcMar><w:left w:w="0" w:type="dxa"/>'
                f'<w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>{x}</w:tc>')
    return (f'<w:tbl><w:tblPr><w:tblW w:w="{wl + wr}" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
            '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            f'<w:tblGrid><w:gridCol w:w="{wl}"/><w:gridCol w:w="{wr}"/></w:tblGrid>'
            f'<w:tr><w:trPr><w:cantSplit/></w:trPr>{c_(links, wl)}{c_(rechts, wr)}</w:tr></w:tbl>'
            + para("", space_after=0, size=4))


def oordeel_label(o, size=SZ, space_after=0):
    code, _, kleur = OORDEEL[o]
    return rich([(f"[{code}] {o}", dict(bold=True, color=kleur))], size=size, space_after=space_after)


def oordeel_cel(r):
    # "Alleen bevestigd" volgt uit het oordeel GA (zie legenda) en staat in de waarnemingskolom; geen extra regel hier
    return [oordeel_label(r["oordeel"])]


def kv(rows, widths):
    body, fills = [], {}
    for i, rij in enumerate(rows):
        cellen = []
        for j, c_ in enumerate(rij):
            if j % 2 == 0:
                cellen.append([p(c_, bold=True, color=LABELTEKST)])
                fills[(i, j)] = LABEL
            else:
                cellen.append([p(c_)])
        body.append(cellen)
    return tbl(body, list(widths), header=False, fills=fills, valign="center", naam="kop")


def banner():
    ppr = ('<w:pBdr>' + "".join(f'<w:{z} w:val="double" w:sz="6" w:space="3" w:color="{MARKKLEUR}"/>'
                                 for z in ("top", "left", "bottom", "right")) + '</w:pBdr>'
           '<w:spacing w:before="0" w:after="120"/>'
           '<w:ind w:left="140" w:right="140"/><w:jc w:val="center"/>')
    runs = (_runs(MARK + ". ", bold=True, color=MARKKLEUR, size=20) +
            _runs("Demo van de nieuwe WPI-methode: alle gegevens in dit rapport zijn verzonnen.", size=16))
    return f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{STIJL}{ppr}</w:pPr>{runs}</w:p>'


def kader(label, regels_, lijn, vulling):
    ppr = ('<w:pBdr>' + "".join(f'<w:{z} w:val="single" w:sz="{18 if z == "left" else 4}" w:space="{8 if z == "left" else 4}" '
                                 f'w:color="{lijn}"/>' for z in ("top", "left", "bottom", "right")) + '</w:pBdr>'
           f'<w:shd w:val="clear" w:color="auto" w:fill="{vulling}"/><w:spacing w:before="80" w:after="120"/>'
           '<w:ind w:left="140" w:right="140"/>')
    runs = _runs(label, bold=True, color=lijn, size=SZT)
    for vet, tekst in regels_:
        runs += f"<w:r>{_rpr(size=SZT)}<w:br/></w:r>" + _runs(tekst, bold=vet, size=SZT)
    return (f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{STIJL}<w:keepLines/>{ppr}</w:pPr>'
            f'{runs}</w:p>')


def image_par(rid, idx, cx, cy, naam):
    return (f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{STIJL}'
            f'<w:spacing w:after="40"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
            f'<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
            f'<wp:docPr id="{900 + idx}" name="{_esc(naam)}" descr="{_esc(naam)}"/>'
            f'<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            f'<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:nvPicPr><pic:cNvPr id="{900 + idx}" name="{_esc(naam)}"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
            f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
            f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
            f'</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>')


def veld(instr):
    rp = _rpr(color="808080", size=14)
    return (f'<w:r>{rp}<w:fldChar w:fldCharType="begin"/></w:r>'
            f'<w:r>{rp}<w:instrText xml:space="preserve"> {instr} </w:instrText></w:r>'
            f'<w:r>{rp}<w:fldChar w:fldCharType="separate"/></w:r>' + _runs("1", color="808080", size=14) +
            f'<w:r>{rp}<w:fldChar w:fldCharType="end"/></w:r>')


def voet_runs():
    return (_runs(MARK, bold=True, color=MARKKLEUR, size=14) +
            _runs(f"  ·  WPI-rapport {NR}  ·  pagina ", color="808080", size=14) + veld("PAGE") +
            _runs(" van ", color="808080", size=14) + veld("NUMPAGES"))


# ------------------------------------------------------------ placeholderfoto's
def maak_fotos(map_):
    os.makedirs(map_, exist_ok=True)
    fb = "/root/.fonts/Muli-Bold.ttf"      # zelfde lettertype als het rapport
    fr = "/root/.fonts/Muli-Regular.ttf"
    paden = []
    for n, ref, _, toont, _ in FOTOS:
        im = Image.new("RGB", (900, 600), "#E3E7EC")
        dr = ImageDraw.Draw(im)
        for x in range(-600, 900, 50):
            dr.line([(x, 600), (x + 600, 0)], fill="#D9DEE5", width=2)
        dr.rectangle([5, 5, 894, 594], outline="#8A94A3", width=5)
        # tekst in Muli en groot genoeg om op 4,9 cm breedte leesbaar te blijven; één markering per vlak (het
        # omkaderde VOORBEELD-label). Ref en toelichting staan in het bijschrift onder het vlak.
        f1, f2, f3 = ImageFont.truetype(fb, 80), ImageFont.truetype(fr, 60), ImageFont.truetype(fb, 52)
        bw = dr.textlength(MARK, font=f3)
        dr.rectangle([450 - bw / 2 - 30, 22, 450 + bw / 2 + 30, 108], outline="#" + MARKKLEUR, width=5)
        dr.text((450, 65), MARK, font=f3, fill="#" + MARKKLEUR, anchor="mm")
        dr.text((450, 205), f"Foto {n}", font=f1, fill="#2B3A4F", anchor="mm")
        rgls, cur = [], ""
        for w_ in toont.split():
            if dr.textlength((cur + " " + w_).strip(), font=f2) > 820:
                rgls.append(cur); cur = w_
            else:
                cur = (cur + " " + w_).strip()
        rgls.append(cur)
        assert len(rgls) <= 4, toont
        y = 330 + (3 - len(rgls)) * 36
        for r_ in rgls:
            dr.text((450, y), r_, font=f2, fill="#2B3A4F", anchor="mm"); y += 76
        pad = f"{map_}/wpi_foto{n}.png"
        im.save(pad, optimize=True)
        paden.append(pad)
    return paden


# ------------------------------------------------------------ sjabloon voorbereiden
PORTRET_SECT = ('<w:sectPr><w:headerReference w:type="default" r:id="rId9"/>'
                '<w:footerReference w:type="default" r:id="rId10"/><w:headerReference w:type="first" r:id="rId11"/>'
                '<w:pgSz w:w="11900" w:h="16840"/><w:pgMar w:top="1418" w:right="1418" w:bottom="2380" w:left="1418" '
                'w:header="709" w:footer="1950" w:gutter="0"/><w:cols w:space="708"/><w:titlePg/>'
                '<w:docGrid w:linePitch="360"/></w:sectPr>')
LIGGEND_SECT = ('<w:sectPr><w:headerReference w:type="default" r:id="rIdWpiKopL"/>'
                '<w:footerReference w:type="default" r:id="rIdWpiVoetL"/>'
                '<w:pgSz w:w="16840" w:h="11900" w:orient="landscape"/><w:pgMar w:top="1100" w:right="500" '
                'w:bottom="850" w:left="500" w:header="520" w:footer="450" w:gutter="0"/><w:cols w:space="708"/>'
                '<w:docGrid w:linePitch="360"/></w:sectPr>')


def bereid_sjabloon():
    """Kopie van het sjabloon: voettekst, omslag-ondertitel, liggende eindsectie, placeholderfoto's."""
    t = WORK + "/tpl"
    shutil.rmtree(t, ignore_errors=True)
    os.makedirs(t)
    subprocess.run(["unzip", "-q", SKILL + "/assets/Noardling_Sjabloon_document.docx", "-d", t], check=True)
    subprocess.run(f"find {t} -type l -delete", shell=True, check=True)

    f = t + "/word/footer1.xml"            # voettekst staand: één regel, boven de golflijn
    x = open(f, encoding="utf-8").read()
    oud = "<w:r><w:tab/></w:r></w:p></w:ftr>"
    assert oud in x
    open(f, "w", encoding="utf-8").write(x.replace(oud, nbh_xml(voet_runs()) + "</w:p></w:ftr>"))
    wortel = re.match(r"(<\?xml.*?\?>\s*<w:ftr [^>]*>)", x, flags=re.S).group(1)

    lijn = '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="3171B5"/></w:pBdr>'
    kopl = (wortel.replace("<w:ftr ", "<w:hdr ") + f'<w:p><w:pPr><w:pStyle w:val="Koptekst"/>{lijn}</w:pPr>' +
            _runs("Noardling B.V.", bold=True, color=nb.BLAUW, size=16) +
            _runs(f"  ·  WPI-rapport {NR}  ·  Bijlage: gegevenstabel", color="808080", size=16) + "</w:p></w:hdr>")
    kopl = nbh_xml(kopl)
    open(t + "/word/header3.xml", "w", encoding="utf-8").write(kopl)
    voetl = wortel + '<w:p><w:pPr><w:pStyle w:val="Voettekst"/></w:pPr>' + nbh_xml(voet_runs()) + "</w:p></w:ftr>"
    open(t + "/word/footer2.xml", "w", encoding="utf-8").write(voetl)

    os.makedirs(t + "/word/media", exist_ok=True)
    rels = t + "/word/_rels/document.xml.rels"
    x = open(rels, encoding="utf-8").read()
    basis = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/"
    add = (f'<Relationship Id="rIdWpiKopL" Type="{basis}header" Target="header3.xml"/>'
           f'<Relationship Id="rIdWpiVoetL" Type="{basis}footer" Target="footer2.xml"/>')
    for n, pad in enumerate(maak_fotos(WORK + "/fotos"), 1):
        shutil.copy(pad, t + f"/word/media/wpi_foto{n}.png")
        add += f'<Relationship Id="rIdWpiFoto{n}" Type="{basis}image" Target="media/wpi_foto{n}.png"/>'
    open(rels, "w", encoding="utf-8").write(x.replace("</Relationships>", add + "</Relationships>"))

    ct = t + "/[Content_Types].xml"
    x = open(ct, encoding="utf-8").read()
    ctb = "application/vnd.openxmlformats-officedocument.wordprocessingml."
    x = x.replace("</Types>", f'<Override PartName="/word/header3.xml" ContentType="{ctb}header+xml"/>'
                              f'<Override PartName="/word/footer2.xml" ContentType="{ctb}footer+xml"/></Types>')
    open(ct, "w", encoding="utf-8").write(x)

    doc = t + "/word/document.xml"
    x = open(doc, encoding="utf-8").read()
    assert x.count("<w:t>Screwpumps</w:t>") == 2
    x = x.replace("<w:t>Screwpumps</w:t>", nbh_xml(f"<w:t>{MARK}</w:t><w:br/><w:t>{NR}</w:t>"))
    i = x.rfind("<w:sectPr")
    j = x.index("</w:sectPr>", i) + len("</w:sectPr>")
    x = x[:i] + LIGGEND_SECT + x[j:]
    open(doc, "w", encoding="utf-8").write(x)

    uit = WORK + "/sjabloon_wpi.docx"
    if os.path.exists(uit):
        os.remove(uit)
    subprocess.run(f'cd "{t}" && zip -Xrq "{uit}" .', shell=True, check=True)
    return uit


# ===================================================================== tellingen
tel = Counter(r["oordeel"] for r in regels)
tel_alg = Counter(r["oordeel"] for r in alg)
tel_tra = Counter(r["oordeel"] for r in trar)
dek_alg = Counter(dekking(r) for r in alg)
dek_tra = Counter(dekking(r) for r in trar)
prio = Counter(a["prioriteit"] for a in acties)
n_open = sum(a["status"] == "Open" for a in acties)
n_af = len(acties) - n_open
bevestigd_refs = [r["ref"] for r in regels if dekking(r) == "Alleen bevestigd"]
nb_refs = [r["ref"] for r in regels if dekking(r) == "Niet beoordeeld"]


def c(x, **kw):
    return [p(str(x), align="center", **kw)]


B = [pagebreak(), banner()]

# ---- 1 Kop
B.append(kop("1. Kop"))
B.append(kv([
    ["WPI-nummer", NR, "Soort inspectie", wpi["soort"]],
    ["Datum en tijd", f"{dmy(wpi['datum'])}, {TIJD}", "Projectnummer", wpi["project"]],
    ["Opdrachtgever", wpi["opdrachtgever"], "Locatie", wpi["locatie"]],
    ["Inspecteur", f"{wpi['inspecteur']}, Montage Coördinator"],
    ["Monteurs", f"{wpi['monteurs']} eigen monteurs (fictief): één werkt in het kanaal, één is mangatwacht"],
    ["Product en taak", f"{wpi['product']} (TRA {wpi['code']}), fase {wpi['fase'].lower()}, taak "
                        f"“{wpi['taken'][0].lower()}”"],
    ["Omstandigheden", "Droog, 8 °C; kanaal drooggezet. Mobiele kraan met machinist van het kraanbedrijf."],
], widths=(1760, 3020, 1580, 2704)))

# ---- 2 Samenvatting
B.append(kop("2. Samenvatting"))
n_w = dek_alg["Waargenomen"] + dek_tra["Waargenomen"]
B.append(intro(
    f"Getoetst: 9 algemene onderwerpen en alle {len(trar)} TRA-regels van de taak. Van de {len(regels)} regels zijn er "
    f"{n_w} zelf waargenomen, {len(bevestigd_refs)} alleen "
    f"bevestigd ({' en '.join(bevestigd_refs)}) en {len(nb_refs)} niet beoordeeld ({' en '.join(nb_refs)}).",
    space_after=60, size=SZT))
refs_van = {o: [r["ref"] for r in regels if r["oordeel"] == o] for o in OORDEEL}
assert refs_van["Conform"] == ["B", "C", "D", "E", "H", "I", "DAM-2.01", "DAM-2.04", "DAM-2.05", "DAM-2.08"]
assert refs_van["Afwijking"] == ["A", "G", "DAM-2.06", "DAM-2.07"] and refs_van["Verbeterpunt"] == ["DAM-2.03"]
assert refs_van["Geen afwijking waargenomen"] == ["F"] and refs_van["Niet beoordeeld"] == ["DAM-2.02"]
for lead, tekst in (
    ("Goed: ", "B t/m E, H, I, DAM-2.01, DAM-2.04, DAM-2.05 en DAM-2.08; zie onderdeel 5."),
    ("Afwijkingen en verbeterpunt: ", "A, G, DAM-2.06 en DAM-2.07 (afwijking), DAM-2.03 (verbeterpunt); zie de "
                                      "actielijst hieronder en onderdeel 6."),
):
    _x = rich([(lead, dict(bold=True)), (tekst, {})], size=SZT, space_after=30)
    _x = _x if lead != "Afwijkingen en verbeterpunt: " else _x.replace('<w:spacing w:after="30"/>', '<w:spacing w:after="100"/>')
    B.append(_x.replace("<w:spacing", "<w:keepNext/><w:keepLines/><w:spacing", 1))


rows, fills = [["Oordeel", "Dekking", "Algemeen", "TRA", "Totaal"]], {}


def telrij(o):
    rows.append([[oordeel_label(o)], NIVEAU.get(o, "n.v.t."), c(tel_alg[o]), c(tel_tra[o]), c(tel[o], bold=True)])
    fills[(len(rows) - 1, 0)] = OORDEEL[o][1]


for o in ("Conform", "Afwijking", "Verbeterpunt"):
    telrij(o)
rows.append([[p("Subtotaal met eigen waarneming", bold=True)], [p("Waargenomen", bold=True)],
             c(dek_alg["Waargenomen"], bold=True), c(dek_tra["Waargenomen"], bold=True), c(n_w, bold=True)])
for j in range(5):
    fills[(len(rows) - 1, j)] = LABEL
for o in ("Geen afwijking waargenomen", "Niet beoordeeld"):
    telrij(o)
rows.append([[p("Totaal", bold=True)], "", c(len(alg), bold=True), c(len(trar), bold=True),
             c(len(regels), bold=True)])
B.append(tbl(rows, [3100, 2364, 1250, 1100, 1250], fills=fills, valign="center", naam="oordelen"))

# eigen kop en een zin met de tellingen; kop, zin en actielijst blijven bij elkaar. Kort: nummer, bevinding,
# actiehouder, toetser, termijn, status. Het volledige actieblok staat in onderdeel 6, de gegevensvelden in onderdeel 9b.
B.append(rich([("Actielijst", dict(bold=True, color=nb.BLAUW))], size=SZT, space_after=20, keep=True)
         .replace("<w:spacing w:after", '<w:spacing w:before="120" w:after', 1))
B.append(rich([(f"{len(acties)} acties", dict(bold=True)),
               (f": {prio['direct']} direct, {prio['kort']} kort (binnen 2 weken), {prio['planmatig']} planmatig; ", {}),
               (f"{n_open} open", dict(bold=True, color=STATUSKLEUR["Open"])), (", ", {}),
               (f"{n_af} afgerond", dict(bold=True, color=STATUSKLEUR["Afgerond"])),
               (". Gesorteerd op actienummer; de volledige tekst per actie staat in onderdeel 6.", {})],
              size=SZT, space_after=60, keep=True))
rows, fills = [["Nr.", "Bevinding", "Actiehouder", "Toetser", "Termijn", "Status"]], {}
for i, a in enumerate(sorted(acties, key=lambda a: int(kort(a))), 1):
    # in deze smalle kolom mag "Hoofd Service & Montage" na "Service" afbreken (elders blijft het één geheel)
    toetser = a["toetser"].replace("Hoofd Service & Montage", "Hoofd\u00a0Service &\u00a0Montage")
    rows.append([[p(kort(a), bold=True)],
                 [rich([(f"[{OORDEEL[a['oordeel']][0]}] ", dict(bold=True, color=OORDEEL[a['oordeel']][2])),
                        (BEV_KORT[kort(a)], {})])],
                 a["actiehouder"], toetser, dmy(a["termijn"]),
                 [p(a["status"], bold=True, color=STATUSKLEUR[a["status"]])]])
_al = tbl(rows, [520, 2814, 1780, 1600, 1280, 1070], fills=fills, valign="center", naam="actielijst", wees=True,
           minrijen=3)   # breekt nooit na één rij: minstens drie rijen bij de kop, de laatste twee samen
B.append(_al[:_al.rindex("<w:p ")])   # tabel blijft in zijn geheel bij kop en zin; legenda direct eronder
B.append(rich([("Legenda. ", dict(bold=True)), (DEF_DIRECT, {})], size=SZT, space_after=60)
         .replace("<w:spacing w:after", '<w:spacing w:before="60" w:after', 1))

# ---- afsluiting van de samenvatting (geen eigen onderdeelnummer)
B.append(rich([("Bevestiging en bespreking", dict(bold=True, color=nb.BLAUW))], size=SZT, space_after=40, keep=True)
         .replace("<w:spacing w:after", '<w:spacing w:before="80" w:after', 1))
B.append(tbl([
    ["", "Naam of functie", "Datum", "Paraaf"],
    [[p("Samenvatting bevestigd door de inspecteur", bold=True)], wpi["inspecteur"], dmy(wpi["datum"]),
     [p("(fictief)", color="808080", italic=True)]],
    [[p("Besproken in het coördinatorenoverleg", bold=True)],
     [p("Hoofd Service & Montage", color="808080", italic=True)],
     [p("nog in te vullen", color="808080", italic=True)], ""],
], [3700, 2764, 1500, 1100], valign="center", keep=True, naam="ondertekening"))

# ---- 3 Algemene observatie
B.append(kop("3. Algemene observatie"))
B.append(intro("Negen vaste onderwerpen, los van de taak. Betekenis van de oordelen:", space_after=60))
LEG = {"Conform": "Zelf gezien, in orde.",
       "Afwijking": "Zelf gezien, niet (goed) toegepast.",
       "Verbeterpunt": "Zelf gezien, kan beter.",
       "Geen afwijking waargenomen": "Niet zelf gezien; bevestigd bij de afsluitvraag.",
       "Niet beoordeeld": "Niet gezien, niet bevestigd.",
       "Niet van toepassing": "Maatregel speelt niet bij dit werk."}
leg = [o for o in LEG if tel[o] or o in ("Conform", "Afwijking", "Verbeterpunt")]
LEGW = {"Conform": 1450, "Afwijking": 1950, "Verbeterpunt": 1700, "Geen afwijking waargenomen": 2464,
        "Niet beoordeeld": 1500, "Niet van toepassing": 1500}
lw = [LEGW[o] for o in leg]
lw[-1] += W - sum(lw)
B.append(tbl([[[oordeel_label(o, space_after=20), p(LEG[o])] for o in leg]], lw, header=False, keep=True,
             fills={(0, j): OORDEEL[o][1] for j, o in enumerate(leg)}, naam="legenda"))

rows, fills = [["Ref", "Onderwerp en oordeel", "Waarneming van de inspecteur"]], {}
for i, r in enumerate(alg, 1):
    grijs = dekking(r) != "Waargenomen"
    w_ = [p(waarneming(r), color="4D4D4D" if grijs else None, italic=grijs)]
    if zie(r["ref"]):
        w_.append(p(zie(r["ref"]), bold=True, color=nb.BLAUW))
    rows.append([[p(r["ref"], bold=True, color=nb.BLAUW)], [p(r["omschrijving"], bold=True, space_after=30)]
                 + oordeel_cel(r), w_])
    fills[(i, 1)] = OORDEEL[r["oordeel"]][1]
_ow3 = max(breedte(f"[{OORDEEL[r['oordeel']][0]}] {r['oordeel']}", SZ, True) for r in alg) + 160 + 60
_ow3 = max(int(_ow3 // 10 * 10 + 10), 2250)
B.append(tbl(rows, [600, _ow3, W - 600 - _ow3], fills=fills, naam="algemeen", los=True))

# ---- 4 Taakgerichte toetsing
B.append(kop("4. Taakgerichte toetsing"))
B.append(intro(f"Alle {len(trar)} risicoregels van de TRA {wpi['product']} voor de taak “{wpi['taken'][0]}”, met "
               "de maatregelen letterlijk uit de TRA. Getoetst: werken de monteurs op dat moment volgens die "
               "maatregelen?", space_after=80))
rows, fills = [["TRA-regel en oordeel", "Risico en maatregelen volgens de TRA", "Waarneming van de inspecteur"]], {}
for i, r in enumerate(trar, 1):
    t = tra[r["ref"]]
    grijs = dekking(r) != "Waargenomen"
    links = [p(r["ref"], bold=True, color=nb.BLAUW)] + oordeel_cel(r)
    midden = [rich([("Risico: ", dict(bold=True)), (t["risico"], {})], space_after=50)]
    for m in t["maatregelen"]:
        soort, _, rest = m.partition(":")
        midden.append(rich([(f"Maatregel, {soort.lower()}:", dict(bold=True, color=nb.BLAUW)), (rest, {})],
                           space_after=30))
    rechts = [p(waarneming(r), color="4D4D4D" if grijs else None, italic=grijs)]
    if zie(r["ref"]):
        rechts.append(p(zie(r["ref"]), bold=True, color=nb.BLAUW))
    rows.append([links, midden, rechts])
    fills[(i, 0)] = OORDEEL[r["oordeel"]][1]
# smalle kolom zo breed dat het langste oordeel uit deze tabel op één regel past (cel-marges 2 x 80)
_ow = max(breedte(f"[{OORDEEL[r['oordeel']][0]}] {r['oordeel']}", SZ, True) for r in trar) + 160 + 60
_ow = int(_ow // 10 * 10 + 10)
_mid = 3400   # risico en maatregelen; de waarneming (meestal de langste tekst) krijgt de rest
B.append(tbl(rows, [_ow, _mid, W - _ow - _mid], fills=fills, naam="tra", los=True,
             splits={i_ for i_, r in enumerate(trar, 1) if len(waarneming(r)) > 450}))
# alleen hoge rijen (lange waarneming) mogen over een pagina doorlopen; korte rijen blijven heel
_bt = rich([("Buiten TRA: ", dict(bold=True)),
            ("geen. De inspecteur heeft geen werk of situatie gezien die buiten de acht TRA-regels van deze taak "
             "valt. Het afspuiten van de damwanddelen met de tuinslang staat bij DAM-2.06.", {})], size=SZT)
B.append(_bt.replace('<w:spacing w:after="0"/>',
                     '<w:pBdr>' + "".join(f'<w:{z} w:val="single" w:sz="4" w:space="4" w:color="BFBFBF"/>'
                                          for z in ("top", "left", "bottom", "right")) + '</w:pBdr>'
                     f'<w:shd w:val="clear" w:color="auto" w:fill="{LABEL}"/>'
                     '<w:spacing w:before="120" w:after="160"/><w:ind w:left="80" w:right="80"/>', 1))

# ---- 5 Positieve bevindingen
B.append(kop("5. Positieve bevindingen"))
POS = {"B": "Schuif en pomp vergrendeld met persoonlijk slot en label.",
       "C": "PBM passend bij slib, harnas en afspuiten.",
       "D": "Gereedschap en hijsmiddelen gekeurd; 24 V in het kanaal.",
       "E": "Kraan goed opgesteld, afgezet; gewicht getoetst aan WLL.",
       "H": "Gekeurde reddingslier; mangatwacht zonder andere taken.",
       "I": "Eén aanwijzer; elk commando vooraf afgesproken.",
       "DAM-2.01": "Hekwerk rondom; niemand zonder harnas aan de rand.",
       "DAM-2.04": "Handen blijven van de last tot hij ligt.",
       "DAM-2.05": "Stuurlijn vanaf het roosterpad, buiten de draaicirkel.",
       "DAM-2.08": "Ophanging los terwijl niemand in het kanaal is."}
pos = [r for r in regels if r["oordeel"] == "Conform"]
assert {r["ref"] for r in pos} <= set(POS)
B.append(intro(f"{len(pos)} regels met het oordeel Conform; de volledige waarneming staat bij dezelfde ref in "
               "onderdeel 3 of 4.", space_after=60))
rows, fills = [["Ref", "Wat ging goed", "Classificatie", "Foto"]], {}
for i, r in enumerate(pos, 1):
    rows.append([[p(r["ref"], bold=True, color="1E6B34")], POS[r["ref"]], r["classificatie"],
                 ", ".join(str(n) for n in FOTO_BIJ.get(r["ref"], [])) or "geen"])
    fills[(i, 0)] = OORDEEL["Conform"][1]
B.append(tbl(rows, [1150, 4914, 2300, 700], fills=fills, valign="center", naam="positief"))

# ---- 6 Bevindingen en acties
B.append(kop("6. Bevindingen en acties"))
VCA_EIS = [
    (False, "“Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, "
            "uit te voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de "
            "uitvoering.”"),
    (True, "Minimumeis actieplan:"),
    (False, "“Er is een actieplan met daarin:"),
    (False, "– actiepunten, voortkomende uit de inspecties;"),
    (False, "– de verantwoordelijken voor de uitvoering en toetsing;"),
    (False, "– tijdsplanning.”"),
]
_bron = open(RUN + "/data/vca_7_letterlijk.md", encoding="utf-8").read()
for vet, t_ in VCA_EIS:   # letterlijkheid controleren tegen de bron
    if not vet:
        kern = t_.strip("“”– ").rstrip("”")
        assert kern in _bron, kern
B.append(kader("VCA 2026/6.1, vraag 7.1, minimumeis inspectieverslagen", VCA_EIS, nb.BLAUW, nb.VULLING_BLAUW)
         )
B.append(intro("In dit rapport: positieve bevindingen in onderdeel 5; afwijkingen, verbeteracties, actiehouder, "
               "termijn en toetser per actie hieronder en als platte tabel in onderdeel 9b, de bron voor het "
               "actieoverzicht in het WPI-dashboard.", space_after=60).replace(KN, STIJL))
gecorr = [kort(a) for a in acties if a["direct_gecorrigeerd"]]
alleen_maatregel = [kort(a) for a in acties if a["direct_genomen_maatregel"] and not a["direct_gecorrigeerd"]]
assert gecorr == ["4"], gecorr
assert set(alleen_maatregel) == set(NOG_OPEN), alleen_maatregel
B.append(intro(f"{len(acties)} acties: {n_open} open, {n_af} afgerond. Volledig actienummer: {NR}-1 t/m "
               f"-{len(acties)}. " + DEF_DIRECT + f" Direct gecorrigeerd: actie{NB}{', '.join(gecorr)}. Direct genomen "
               f"maatregel, actie nog open: actie{NB}{', '.join(alleen_maatregel[:-1])} en {alleen_maatregel[-1]}.",
               space_after=80))
rows, fills = [["Actie en status", "Bevinding, direct genomen maatregel en verbeteractie",
                "Actiehouder, termijn, toetser, classificatie"]], {}
for i, a in enumerate(acties, 1):
    direct = a["direct_genomen_maatregel"]
    bev, act = a["bevinding"], a["verbeteractie"]
    kl = OORDEEL[a["oordeel"]][2]
    links = [p(kort(a), bold=True, size=22), p(a["ref"], bold=True, color=nb.BLAUW)]
    for n in FOTO_ACTIE.get(kort(a), []):
        links.append(p(f"foto{NB}{n}", color=nb.BLAUW, space_after=40))
    links.append(p(a["status"], bold=True, color=STATUSKLEUR[a["status"]]))
    midden = [rich([(f"[{OORDEEL[a['oordeel']][0]}] {a['oordeel']}: ", dict(bold=True, color=kl)), (bev, {})],
                   space_after=30)]
    if direct:
        midden.append(rich([("Direct genomen maatregel: ", dict(bold=True)), (direct, {})]
                           + ([(" Actie blijft open: " + NOG_OPEN[kort(a)] + ".", dict(italic=True))]
                              if kort(a) in NOG_OPEN else []), space_after=30))
    midden.append(rich([("Verbeteractie: ", dict(bold=True)), (act, {})]))
    meta = [p(a["actiehouder"], bold=True),
            rich([("Termijn: ", {}), (dmy(a["termijn"]), dict(bold=True)), (", " + a["prioriteit"], {})]),
            p("Toetser: " + a["toetser"] + (f", getoetst {dmy(a['getoetst_op'])}" if a["getoetst_op"] else "")),
            p(a["classificatie"], italic=True),
            p(f"Direct gecorrigeerd: {'ja' if a['direct_gecorrigeerd'] else 'nee'}; bron: {a['bron'].lower()}")]
    rows.append([links, midden, meta])
B.append(tbl(rows, [1180, 4384, 3500], fills=fills, naam="acties"))
B.append(kader("Opvolging, keuze van Noardling", [(False,
    "Een actie gaat pas op Afgerond als de toetser heeft vastgesteld dat hij is uitgevoerd. Toetser is het Hoofd "
    "Service & Montage; is hij zelf actiehouder, dan toetst de inspecteur. Bij een direct gecorrigeerde actie toetst de "
    f"inspecteur ter plaatse (actie{NB}{', '.join(gecorr)}). Open acties gaan met hun nummer naar het actieoverzicht in het "
    "WPI-dashboard en komen elke maandag in het coördinatorenoverleg. Bij bevindingen staan geen namen van monteurs "
    "(AVG).")], nb.LIJN_ORANJE, nb.VULLING_ORANJE))

# ---- 7 Gesprek met de monteurs
B.append(kop("7. Gesprek met de monteurs"))
B.append(intro("Na het uithijsen van het tweede deel kort nabesproken met beide monteurs bij de bus.", space_after=60))


def lijst(regels_):
    return [p("– " + t, space_after=20) for t in regels_]


GESPREK = [
    ("Wat goed ging", ["Afzetting van hijsgebied en hijspad, en de gewichtscontrole vóór het eerste deel.",
                       "Werken met de stuurlijn vanaf het roosterpad.",
                       "Reddingslier, harnas en een mangatwacht zonder andere taken.",
                       "De ophanging pas losnemen als niemand meer in het kanaal is."]),
    ("Wat beter moet", ["De punten uit de actielijst, één voor één doorgelopen."]),
    ("Reactie van de monteurs", ["Ze herkennen de punten.",
                                 "De TRA in de map is bij de start geprint, vóór de laatste revisie.",
                                 "De handenwasset is na de vorige klus niet aangevuld.",
                                 "De opdrachtgever reinigt op meer locaties niet vooraf; dan spuiten ze zelf af.",
                                 "De gasmeter hing boven omdat hij bij het afdalen in de weg zit."]),
    # letterlijk de verbeteractie van de actie waar het idee in is overgenomen (bron Idee monteurs)
    ("Ideeën van de monteurs", [a["verbeteractie"].replace("Idee van de monteurs uitwerken: ", "").rstrip(".")
                                .capitalize().replace("4-gasmeter", "4-gasmeter") + f" (overgenomen als actie{NB}{kort(a)})."
                                for a in acties if a["bron"] == "Idee monteurs"]),
]
B.append(tbl([[[p(k_, bold=True, color=LABELTEKST)], lijst(v_)] for k_, v_ in GESPREK],
             [2000, 7064], header=False, keep=True, fills={(i_, 0): LABEL for i_ in range(len(GESPREK))},
             naam="gesprek"))

# ---- 8 Foto's
B.append(kop("8. Foto's met toelichting"))
B.append(intro("Er zijn geen echte foto's. De vlakken staan op de plek waar in een echt rapport de foto's van de "
               "inspecteur komen.", space_after=60))
CX = int(4.9 / 2.54 * 914400); CY = int(CX * 600 / 900)
rows = []
for k in range(0, len(FOTOS), 3):
    rij = []
    for n, ref, acts, toont, toel in FOTOS[k:k + 3]:
        r = next(r for r in regels if r["ref"] == ref)
        act = "".join(f", actie{NB}{x}" for x in acts)
        rij.append([image_par(f"rIdWpiFoto{n}", n, CX, CY, f"Voorbeeldfoto {n} (fictief)"),
                    rich([(f"Foto {n}", dict(bold=True, color=nb.BLAUW)), (f" bij {ref}{act}  ", dict(bold=True)),
                          (f"[{OORDEEL[r['oordeel']][0]}]", dict(bold=True, color=OORDEEL[r['oordeel']][2]))],
                         space_after=20),
                    p(toel)])
    rows.append(rij)
fototbl = tbl(rows, [3022, 3021, 3021], header=False, naam="fotos")
B.append(fototbl[:fototbl.rindex("<w:p ")])

# einde staande sectie
B.append(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>'
         f'<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>'
         f'<w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr>{PORTRET_SECT}</w:pPr></w:p>')


# ---- 9 Gegevenstabel (liggende bijlage)
def pb(text, **kw):
    return p(text, size=SZB, **kw)


def btbl(koppen, data, naam, flex=None, vast=(), widths=None, minw=None):
    """Kolombreedtes automatisch: elke kolom zo breed als zijn langste woord, of als zijn hele tekst bij 'vast'
    (die tekst breekt dan niet af). De rest gaat naar de flex-kolom. Of vaste breedtes via widths."""
    if widths is None:
        widths = []
        for j, k in enumerate(koppen):
            w = max(breedte(x, SZB, True) for x in k.split())
            for rij in data:
                for regel in str(rij[j]).split("\n"):
                    stukken = [regel] if j in vast else regel.split()
                    w = max([w] + [breedte(x, SZB) for x in stukken])
            if minw and j in minw:
                w = max(w, breedte(minw[j], SZB))
            widths.append(int(w) + 150)
        widths[flex] = 0
        widths[flex] = WL - sum(widths)
        assert widths[flex] > 900, (naam, widths)
        print(f"  {naam}: flexkolom {widths[flex]} dxa")
    rows = [[[pb(k, bold=True, color="FFFFFF")] for k in koppen]]
    rows += [[[pb(v)] for v in rij] for rij in data]
    return tbl(rows, widths, valign="center", naam=naam, totaal=WL, smal=True)


def nr(x):
    return "-" + x.rsplit("-", 1)[1]


def bijkop(titel, aantal):
    return rich([(titel, dict(bold=True)), (f"  ({aantal})", {}),
                 (f"   Geldt voor elke rij: WPI-nummer {NR}, datum {dmy(wpi['datum'])}.", dict(color="4D4D4D"))],
                size=SZT, space_after=40, keep=True)


B.append(kop("9. Gegevenstabel"))
B.append(intro("Platte tabellen met dezelfde kolommen in elk WPI-rapport. Het dashboard en de jaarlijkse trendanalyse "
               "(VCA 7.2) lezen deze tabellen uit alle rapporten. Alleen gegevensvelden: bevinding en verbeteractie per "
               "actie staan in onderdeel 6. Acties staan met hun korte nummer; het volledige nummer is het "
               f"WPI-nummer ervoor, bijvoorbeeld {NR}-1.", space_after=80))
B.append(rich([("9a. Inspectie", dict(bold=True)), ("  (1 record)", {})], size=SZT, space_after=40, keep=True))
B.append(btbl(["WPI-nummer", "Datum", "Inspecteur", "Soort inspectie", "Opdrachtgever", "Locatie", "Project",
               "Product", "Code", "Fase", "Taken", "Monteurs"],
              [[wpi["nr"], dmy(wpi["datum"]), wpi["inspecteur"], wpi["soort"], wpi["opdrachtgever"], wpi["locatie"],
                wpi["project"], wpi["product"], wpi["code"], wpi["fase"], "; ".join(wpi["taken"]),
                str(wpi["monteurs"])]], "9a", flex=10, vast=(0, 1, 6, 7, 8, 9, 11)))

B.append(bijkop("9b. Acties: registratie", f"{len(acties)} acties"))
B.append(btbl(["Actie", "Ref", "Oordeel", "Classificatie", "Prioriteit", "Direct gecorrigeerd", "Actiehouder",
               "Toetser", "Termijn", "Status", "Afgerond op", "Getoetst op", "Bron"],
              [[nr(a["actie"]), a["ref"], a["oordeel"], a["classificatie"], a["prioriteit"],
                "ja" if a["direct_gecorrigeerd"] else "nee", a["actiehouder"], a["toetser"], dmy(a["termijn"]),
                a["status"], dmy(a["afgerond_op"]), dmy(a["getoetst_op"]), a["bron"]] for a in acties],
              "9b", flex=3, vast=(0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12), minw={7: "Hoofd Service & Montage"}))
B.append(bijkop("9c. Regels", f"{len(regels)} regels").replace('<w:spacing w:after', '<w:spacing w:before="160" w:after', 1))
B.append(btbl(["Ref", "Soort", "Omschrijving", "Oordeel", "Waargenomen", "Classificatie", "Prioriteit", "Acties"],
              [[r["ref"], r["soort"], r["omschrijving"], r["oordeel"], r["waargenomen"], r["classificatie"],
                r.get("prioriteit") or "", "; ".join(nr(x) for x in r.get("acties", []))] for r in regels],
              "9c", flex=2, vast=(0, 7)))

B.append(pb(f"{MARK}. Einde van het rapport.", italic=True, color="808080"))

body = "\n".join(B)
# niet-afbrekend koppelteken in alle codes; daarna controleren dat er geen code met een gewoon koppelteken over is
body = nbh_xml(body)
n_kt = body.count("<w:noBreakHyphen/>")
controleer_codes(body, "de hoofdtekst")
body = body.replace("actie -", "actie\u00a0-")
body = body.replace("Hoofd Service &amp; Montage", "Hoofd\u00a0Service\u00a0&amp;\u00a0Montage")
print(f"  niet-afbrekende koppeltekens in codes: {n_kt}")

sjabloon = bereid_sjabloon()
nb.build(template=sjabloon, title="WPI-rapport", subtitle=None, body_xml=body, output=OUT, cover_size=80,
         work=WORK + "/_nb_build")

# ---- controle: precies de negen vaste onderdeelkoppen, in deze volgorde
import zipfile
VAST = ["1. Kop", "2. Samenvatting", "3. Algemene observatie", "4. Taakgerichte toetsing", "5. Positieve bevindingen",
        "6. Bevindingen en acties", "7. Gesprek met de monteurs", "8. Foto's met toelichting", "9. Gegevenstabel"]
doc = zipfile.ZipFile(OUT).read("word/document.xml").decode("utf-8")
koppen = ["".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", par))
          for par in re.findall(r"<w:p [^>]*>(?:(?!</w:p>).)*?<w:pStyle w:val=\"Kop1\"/>.*?</w:p>", doc, flags=re.S)]
koppen = [k.replace("&apos;", "'") for k in koppen]
if koppen != VAST:
    raise SystemExit(f"FOUT: onderdeelkoppen kloppen niet: {koppen}")
print("  controle onderdeelkoppen: 9 vaste koppen in de juiste volgorde")

# ---- controle: geen code met een gewoon koppelteken, in hoofdtekst, omslag, kop- en voetteksten
zf = zipfile.ZipFile(OUT)
for naam in zf.namelist():
    if re.match(r"word/(document|header\d*|footer\d*)\.xml$", naam):
        controleer_codes(zf.read(naam).decode("utf-8"), naam)
print("  controle codes: overal niet-afbrekende koppeltekens")
