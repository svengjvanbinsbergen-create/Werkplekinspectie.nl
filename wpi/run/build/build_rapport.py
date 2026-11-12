#!/usr/bin/env python3
"""Bouwt het voorbeeld-WPI-rapport WPI-20261105-DAM-C2 (fictieve data) in Noardling-huisstijl. Ronde 10 (data 10.4): overzicht op twee pagina's, details compact, toelichting achteraan."""
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
# koers 2 (data v11): momentopname — alleen wat de inspecteur zag staat erin. TRA-regels zijn een deelverzameling van
# de regels van de getoetste taak; geen "alleen bevestigd" of "niet beoordeeld" meer.
assert {r["ref"] for r in trar} <= set(tra), "TRA-regel buiten de getoetste fase"
assert all(r["oordeel"] in ("Conform", "Afwijking", "Verbeterpunt", "Niet van toepassing") for r in regels)
assert all(r["waargenomen"] == "Waargenomen" for r in regels if r["oordeel"] != "Niet van toepassing")
STAPPEN = wpi["getoetste_stappen"]
assert all(r.get("taak") in [s_["taak"] for s_ in STAPPEN] for r in trar)
GETOETST_BEZOEK = "; ".join(
    f"{s_['taak']} (taak; de TRA kent hier geen taakstappen)" if not s_["taakstap"] else f"{s_['taak']}, stap {s_['taakstap']}"
    for s_ in STAPPEN)

# -- TRA-revisie waartegen is getoetst. De bron (TRA-DAM-Damwand.md en Damwand.xltx) heeft geen revisie of
# documentcode; Noardling gebruikt geen documentcodes (documenten staan op naam in het QMS). Daarom een duidelijk
# fictieve revisie: in het QMS rev. 3, in de projectmap op locatie de oudere rev. 2.
TRA_NAAM = f"TRA {wpi['product']}"
# vanaf data 10.5 staat de TRA-revisie in wpis: tra_revisie ("TRA Damwand, rev. 3 (fictief), 15-10-2026") en
# tra_revisie_projectmap ("rev. 2 (fictief)")
_m = re.fullmatch(rf"{re.escape(TRA_NAAM)}, (rev\. \d+ \(fictief\)), (\d{{2}}-\d{{2}}-\d{{4}})", wpi["tra_revisie"])
assert _m, wpi["tra_revisie"]
REV_QMS, REV_DATUM = _m.group(1), _m.group(2)
REV_MAP = wpi["tra_revisie_projectmap"]
REV_QMS_K, REV_MAP_K = REV_QMS.split(" (")[0], REV_MAP.split(" (")[0]   # zonder "(fictief)", voor korte teksten
TRA_GETOETST = f"{wpi['tra_revisie']}; actuele revisie in het QMS"

# -- tekstcorrecties op de dataset (ronde 8). Alleen toegepast zolang de dataset nog de oude tekst heeft; heeft de
# dataset de nieuwe tekst al, dan wordt die gebruikt. Een andere tekst laat het script stoppen. Dezelfde nieuwe tekst
# moet in voorbeelddata.json (en daarmee in het dashboard) komen.
TEKSTFIX = {
    ("9", "bevinding"): (
        "Handenwasset ontbreekt in de montagewagen; de monteurs stellen voor hem vaste uitrusting van elke "
        "montagewagen te maken.",
        "Handenwasset ontbreekt in de montagewagen; de monteurs stellen voor hem tot vaste uitrusting van elke "
        "montagewagen te maken."),
    ("7", "bevinding"): (
        "Er stond drinken in de werkzone, binnen de afzetting.",
        "Er stond drinken in de werkzone: een beker koffie op het stempelschot van de kraan, binnen de afzetting."),
}
DATA_NOG_OUD = []
for a in acties:
    for (k_, veld_), (oud_, nieuw_) in TEKSTFIX.items():
        if a["actie"].rsplit("-", 1)[1] == k_:
            if a[veld_] == oud_:
                a[veld_] = nieuw_
                DATA_NOG_OUD.append(f"actie {k_} {veld_}")
            elif a[veld_] != nieuw_:
                raise SystemExit(f"FOUT: onverwachte tekst in actie {k_} {veld_}: {a[veld_]}")
if DATA_NOG_OUD:
    print("  LET OP: tekstcorrectie in het rapport toegepast; dataset nog bijwerken: " + ", ".join(DATA_NOG_OUD))


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
# Ingesproken door de inspecteur: korte zinnen. Rollen in plaats van namen (AVG): "de monteur in het kanaal" werkt
# beneden; "de mangatwacht" doet bij elk betreden niets anders en is pas aanwijzer of spuit af als niemand in het kanaal
# is; de kraan wordt bediend door de kraanmachinist. Elke waarneming = één kernzin (vet: wat is gezien tegenover de
# maatregel) + details. Wat meer is dan een paar regels staat bij de actie in onderdeel 6.
WAAR = {
    "A": (f"TRA in de projectmap is {REV_MAP}; in het QMS staat {REV_QMS}.",
          "VGM-projectplan, werkvergunning van de opdrachtgever en de LMRA van vanmorgen (door beide getekend) liggen "
          f"in de bus. Ter plaatse: {REV_QMS_K} uit het QMS op mijn telefoon met de ploeg doorgenomen; voor deze taak "
          "geen verschillen."),
    "B": ("Schuif en toevoerpomp vergrendeld met persoonlijk slot en label.",
          "Op de schuif bovenstrooms het slot van de monteur in het kanaal en dat van de opdrachtgever. Pomp in de "
          "schakelkast uit, vergrendeld en gelabeld. De monteur heeft zijn sleutel bij zich."),
    "C": ("PBM passend bij slib, hoogte en afspuiten.",
          "Beiden: helm, veiligheidsschoenen, werkhandschoenen. In het kanaal: laarzen, wasbare overall, waterdichte "
          "handschoenen tot over de pols en harnas (zie H). Bij afspuiten: gelaatsscherm (zie DAM-2.06)."),
    "D": ("Gereedschap en hijsmiddelen gekeurd; 24 V in het natte kanaal.",
          "Slagmoersleutel, kabelhaspel en looplamp met keuringssticker 2026; lamp en haspel via een "
          "scheidingstransformator boven. Vierspronghijsketting en harpsluitingen met de kleurcode van dit jaar; "
          "WLL-label leesbaar."),
    "E": ("Kraan afgestempeld, hijsgebied afgezet, gewicht getoetst aan de WLL.",
          "Mobiele kraan op schotten; hijsgebied en hijspad afgezet met pionnen en ketting tot het kanaalhek. "
          "Kraanboek met geldige keuring in de cabine; het certificaat van de kraanmachinist (mobiele kraan) gezien, "
          "geldig. Tijdens het hijsen staat niemand bij de stempels. Vóór het eerste deel vergelijken monteur en "
          "kraanmachinist het gewicht per deel (850 kg, fictief) met de WLL bij twee parten (2,1 t, fictief)."),
    "G": ("Geen handenwasgelegenheid bij de werkplek.",
          "In de bus ontbreken jerrycan en zeep; de desinfectiegel is leeg. Wassen kan alleen in het bedrijfsgebouw, "
          "200 m verderop. Ter plaatse: water, zeep en papier bij de werkplek gezet voordat ze verder gingen."),
    "H": ("Reddingsmiddelen gekeurd en paraat; mangatwacht zonder andere taken.",
          "Boven de toegang bij de ladder een hijsdriepoot met reddingslier; driepoot, lier en harnas met "
          "keuringssticker 2026. De monteur in het kanaal daalt af in harnas, lijn aangepikt. De mangatwacht blijft "
          "bij de toegang zolang er iemand beneden is, met telefoon; 112 en het noodnummer van de opdrachtgever staan "
          "op de werkvergunning. Zolang er iemand beneden is, hijst de kraan niet (alleen inzekeren, zie DAM-2.08)."),
    "I": ("Eén aanwijzer; elk commando vooraf afgesproken en herhaald.",
          "Zodra niemand in het kanaal is, is de mangatwacht aanwijzer via de portofoon. De kraanmachinist herhaalt "
          "elk commando en hijst pas na “vrij”. De andere monteur stuurt de last met de stuurlijn."),
    "DAM-2.01": ("Werkinstructie voor werken nabij de putrand aanwezig en bekend; rand afgezet.",
                 "De instructie zit in de projectmap; de monteurs noemen uit zichzelf afzetting en aanlijnen. Hekwerk "
                 "rondom; het open veld bij de ladder is afgezet met een ketting die alleen los gaat om af te dalen. "
                 "Afdalen via de vaste ladder, aangelijnd (zie H). Niemand binnen 1 m van de rand zonder harnas."),
    "DAM-2.03": ("Hijsen volgens de TRA, maar niet als stap op de LMRA.",
                 "Vóór het eerste hijsmoment nemen ze met de kraanmachinist de LMRA door; het hijsen alleen "
                 "mondeling. Twee parten in de hijsogen, vrije parten opgehaakt; gewicht en WLL: zie E. Proefhijs van "
                 "een paar centimeter; stuurlijn eraan voordat het deel vrijkomt; hijsgebied afgezet; aanwijzer en "
                 "kraanmachinist met zicht- en spraakcontact."),
    "DAM-2.04": ("Handen blijven van de last tot hij ligt.",
                 "Bij het neerleggen op de bokken brengen ze het deel met de stuurlijn op zijn plek, op commando's van "
                 "de aanwijzer; handen eraf tot de ketting slap hangt."),
    "DAM-2.05": ("Stuurlijn vanaf het roosterpad, buiten de draaicirkel.",
                 "Bij het uithijsen van het tweede deel stuurt de monteur met een lijn van ongeveer vijf meter, achter "
                 "het hek."),
    "DAM-2.06": ("Niet vooraf gereinigd door de opdrachtgever; koffie op het stempelschot, binnen de afzetting.",
                 "De delen komen omhoog met slib en vlechtsel. De mangatwacht spuit pas af als niemand in het kanaal "
                 "is: tuinslang, lage druk, weinig nevel, wind van hem af. Ter "
                 "plaatse: drinken weggehaald; afspraak met de operator over afspuiten (actie 3)."),
    "DAM-2.07": ("4-gasmeter bij het tweede deel niet op werkhoogte; verder volgens de TRA.",
                 "Werkvergunning besloten ruimte aanwezig. Mechanische ventilatie niet nodig: het kanaal is aan de "
                 "bovenzijde open en de meting tot op de bodem (O2, H2S, CO, LEL) was in orde, genoteerd op de "
                 "vergunning. Bij het tweede deel hing de meter bovenaan de ladder; de mangatwacht had zicht op de "
                 "monteur. Ter plaatse: monteur naar boven, meter aan de borstband, op diepte opnieuw gemeten. Geen "
                 "alarm."),
    "DAM-2.08": ("Niemand onder of in de val-zone toen de damwand werd losgekoppeld; damwand ingezekerd aan de kraan.",
                 "Vóór het losnemen van de onderste geleidingsbouten zet de kraanmachinist op aanwijzing van de "
                 "monteur de ketting op spanning. De monteur staat naast de geleiding, buiten de val-zone; niemand "
                 "staat onder de damwand. De kraan blijft daarna in stand. De laatste bevestigingen van de ophanging "
                 "neemt hij los vanaf het roosterpad, achter het hek, met een verlengde dopsleutel."),
}
KERN = {k_: v_[0] for k_, v_ in WAAR.items()}
WAARNEMING = {k_: v_[0] + " " + v_[1] for k_, v_ in WAAR.items()}
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

# ---- ronde 8: inhoudelijke consistentie tussen waarneming, oordeel en acties
# a. elke direct genomen maatregel staat ook als "Ter plaatse: ..." in de waarneming van zijn regel
for a in acties:
    if a["direct_genomen_maatregel"]:
        assert "Ter plaatse" in WAARNEMING[a["ref"]], (a["actie"], "direct genomen maatregel niet in de waarneming")
# b. de afspraak met de operator (actie 3) wordt bij DAM-2.06 genoemd met verwijzing naar de actie; de volledige
#    tekst staat in onderdeel 6
_a3 = next(a for a in acties if a["actie"].endswith("-3"))
assert "operator" in _a3["direct_genomen_maatregel"] and "operator" in WAARNEMING[_a3["ref"]] \
    and "actie 3" in WAARNEMING[_a3["ref"]], "afspraak met de operator ontbreekt bij DAM-2.06"
# c. Conform alleen als de waarneming de maatregelen dekt: DAM-2.01 noemt de werkinstructie uit de TRA
assert any("Werkinstructie voor werken nabij putrand" in m for m in tra["DAM-2.01"]["maatregelen"])
assert "werkinstructie voor werken nabij de putrand" in WAARNEMING["DAM-2.01"].lower()
# d. DAM-2.08: Conform steunt op de waargenomen TRA-maatregel (niemand onder/in de val-zone, ingezekerd), niet op een
#    eigen veiligheidsredenering; E: certificaat kraanmachinist gezien
assert any("val-zone" in m for m in tra["DAM-2.08"]["maatregelen"])
for woord in ("val-zone", "ingezekerd", "op spanning", "niemand staat onder de damwand", "in stand"):
    assert woord in WAARNEMING["DAM-2.08"], woord
assert "veilig" not in WAARNEMING["DAM-2.08"].lower(), "DAM-2.08: geen eigen veiligheidsredenering"
assert "certificaat van de kraanmachinist" in WAARNEMING["E"]
# d2. DAM-2.07: of mechanische ventilatie nodig was en waarom niet (ronde 9)
assert "Mechanische ventilatie niet nodig" in WAARNEMING["DAM-2.07"] and "open" in WAARNEMING["DAM-2.07"]
# d3. DAM-2.06: geen verzonnen adembescherming; de TRA noemt die niet
assert not any(re.search(r"FFP|adembescherm", m, re.I) for m in tra["DAM-2.06"]["maatregelen"])
assert "adembescherm" not in WAARNEMING["DAM-2.06"].lower()   # ronde 3: geen losse zin zonder opvolging
# d4. kernzin: elke eigen waarneming begint met een korte kernzin; DAM-2.06 blijft kort (rest staat in onderdeel 6)
for k_, v_ in KERN.items():
    assert len(v_) <= 110 and v_.endswith("."), k_
assert len(WAARNEMING["DAM-2.06"]) <= 420, len(WAARNEMING["DAM-2.06"])
assert "bumptest" not in WAARNEMING["DAM-2.07"]   # niet gezien, dus niet in de waarneming
# e. TRA-revisie: projectmap tegenover QMS in bevinding A
assert REV_MAP in WAARNEMING["A"] and REV_QMS in WAARNEMING["A"]
# f. koffie op het stempelschot: hoort bij actie 7 (geen nieuwe actie) en staat in de bevinding van actie 7
_a7 = next(a for a in acties if a["actie"].endswith("-7"))
assert "stempelschot" in WAARNEMING[_a7["ref"]] and "stempelschot" in _a7["bevinding"]
assert sum("stempelschot" in a["bevinding"] for a in acties) == 1

# Bevinding, verbeteractie en de direct genomen maatregel komen ongewijzigd uit de dataset (veld
# direct_genomen_maatregel; leeg = niets tonen), behalve de tekstcorrecties in TEKSTFIX. De actielijst in de
# samenvatting toont per actie een korte bevinding (BEV_KORT) en een korte verbeteractie (VA_KORT).
for a in acties:
    assert a["bevinding"] and a["verbeteractie"] and a["bevinding"] != a["verbeteractie"], a["actie"]

# vaste definitie: precies één keer in het rapport, in de legenda bij de actielijst; elders een verwijzing
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
BEV_KORT = {"1": f"TRA in projectmap verouderd ({REV_MAP_K}, QMS {REV_QMS_K})",
            "2": "Geen handenwasgelegenheid", "3": "Damwand niet vooraf gereinigd",
            "4": "Gasmeter niet op werkhoogte", "5": "Gasmeter zit bij afdalen in de weg",
            "6": "Hijsen niet als stap op de LMRA", "7": "Drinken binnen de afzetting",
            "8": "Andere projectmappen mogelijk verouderd", "9": "Handenwasset geen vaste uitrusting"}
assert set(BEV_KORT) == {kort(a) for a in acties}
for a in acties:
    assert BEV_KORT[kort(a)].lower() not in a["verbeteractie"].lower(), a["actie"]
# korte verbeteractie voor de actielijst in de samenvatting (ronde 8): een inkorting van de verbeteractie uit de
# dataset. Controle: elk woord van 5 letters of meer staat ook in de volledige verbeteractie (geen nieuwe inhoud).
VA_KORT = {"1": "Actuele TRA in projectmap P26-168 plaatsen",
           "2": "Montagewagen van deze ploeg aanvullen met handenwasset",
           "3": "Vooraf reinigen als vaste eis in werkvoorbereiding en VGM-projectplan",
           "4": "4-gasmeter op werkhoogte dragen, op diepte opnieuw meten (ter plaatse uitgevoerd)",
           "5": "Klem of karabijn uitzoeken om 4-gasmeter op borsthoogte te dragen",
           "6": "Voorstel: hijsen als vaste stap op de LMRA",
           "7": "Toolbox hygiëneregels met de monteurs",
           "8": "Alle lopende projectmappen nalopen op actuele TRA",
           "9": "Handenwasset als vaste uitrusting op de voorraadlijst"}
assert set(VA_KORT) == {kort(a) for a in acties}
for a in acties:
    _vol = re.sub(r"[^\w\-]+", " ", a["verbeteractie"].lower()).split()
    for w_ in re.sub(r"[^\w\-]+", " ", VA_KORT[kort(a)].lower()).split():
        if len(w_) >= 5 and not any(w_ in v_ for v_ in _vol):
            raise SystemExit(f"FOUT: korte verbeteractie {kort(a)} bevat '{w_}', niet in de verbeteractie")
# wat bij een direct genomen maatregel nog moet gebeuren (uitleg in onderdeel 6)
NOG_OPEN = {"1": "de actuele TRA moet nog in de projectmap",
            "2": "de handenwasset moet nog in de montagewagen",
            "3": "de eis moet nog in de werkvoorbereiding en het VGM-projectplan",
            "7": "het drinken is weggehaald, maar de toolbox moet nog gebeuren"}
REGEL = {r["ref"]: r for r in regels}
_RANG = {"direct": 0, "kort": 1, "planmatig": 2}
for r in regels:   # prioriteit op regelniveau = hoogste prioriteit van de acties van die regel (zie 9d)
    _pa = [a["prioriteit"] for a in acties if a["ref"] == r["ref"]]
    assert (r.get("prioriteit") or None) == (min(_pa, key=_RANG.get) if _pa else None), r["ref"]
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
    runs = "".join(_runs(t, **{"size": size, **o}) for t, o in parts)
    jc = f'<w:jc w:val="{align}"/>' if align else ""
    return (f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>'
            f'{KN if keep else STIJL}<w:spacing w:after="{space_after}"/>{jc}</w:pPr>{runs}</w:p>')


# -- niet-afbrekend koppelteken in alle codes (TRA-ID's, WPI-nummers, actienummers, projectnummers).
# In de data en bij het opzoeken blijft het gewone koppelteken; pas bij het schrijven van de XML wordt elk koppelteken
# binnen een code een <w:noBreakHyphen/> (Words eigen niet-afbrekend koppelteken, U+2011).
CODE_RE = re.compile(r"(?<![\d\-])\d{2}-\d{2}-\d{4}(?!\d)"                # datum dd-mm-jjjj breekt niet af
                     r"|WPI-\d{8}-[A-Z]{2,4}-[A-Z0-9]+(?:-\d+)?"      # WPI-nummer, met of zonder actievolgnummer
                     r"|(?<![A-Za-z])[A-Z]{2,4}-\d\.\d{2}"           # TRA-ID, bv. DAM-2.06
                     r"|(?<![A-Za-z0-9])P\d{2}-\d{3}"                 # projectnummer, bv. P26-168
                     r"|(?<![\w\-\u2011])-\d{1,2}(?!\d|[.,]\d)"      # kort actienummer, bv. -5
                     rf"|(?<![\w\-\u2011]){re.escape(NR.rsplit('-', 1)[1])}-\d{{1,2}}(?!\d)"   # kort actienr., bv. C2-5
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
        wees=False, los=False, minrijen=2, splits=False, licht=False):
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
        if licht:   # rustige tabel: geen verticale lijnen, kop met blauwe tekst en blauwe onderlijn
            b = ""
        trpr = ("<w:trPr>" + ("" if (splits is True or (splits and i in splits)) and not kop_ else "<w:cantSplit/>") + ("<w:tblHeader/>" if kop_ else "")
                + "</w:trPr>")
        cellen = ""
        for j, cel in enumerate(rij):
            # een korte rij: de laatste cel loopt door tot de rechterkant van de tabel
            span = len(widths) - j if (j == len(rij) - 1 and len(rij) < len(widths)) else None
            cw = sum(widths[j:]) if span else widths[j]
            if isinstance(cel, str):
                cel = [p(cel, bold=kop_, color=(nb.BLAUW if licht else "FFFFFF") if kop_ else None, size=hsize)]
            x = "".join(cel)
            controleer(x, cw, f"{naam} r{i} k{j}", 125 if smal else 260)
            x = x.replace('<w:spacing w:after="', '<w:spacing w:before="0" w:after="')
            if smal:   # bijlage: geen rechterinspringing uit de stijl
                x = x.replace('<w:spacing w:before="0" w:after="0"/>',
                              '<w:spacing w:before="0" w:after="0"/><w:ind w:left="0" w:right="0"/>')
            # regelafstand in tabellen iets krapper dan de 1,22 van de stijl (lopende tekst houdt de huisstijl)
            x = x.replace('<w:spacing w:before="0" w:after="', (f'<w:spacing w:before="0" w:line="200" w:lineRule="exact" w:after="' if smal else
                           f'<w:spacing w:before="0" w:line="{LIJN}" w:lineRule="auto" w:after="'))
            # kop blijft bij de eerste rij; behalve bij los=True (hoge rijen) ook de eerste rij bij de tweede
            if (keep and i < len(rows) - 1) or (header and i < (1 if los else minrijen) and len(rows) > 2) or \
                    (wees and i == len(rows) - 2):
                x = x.replace(STIJL, KN)
            cx_ = _cel([x], cw, fill=(None if licht else nb.BLAUW) if kop_ else fills.get((i, j)), span=span,
                       valign="center" if kop_ else valign)
            if licht:
                onder = (f'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="{nb.BLAUW}"/>' if kop_ else
                         '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>')
                cx_ = re.sub(r"<w:tcBorders>.*?</w:tcBorders>", '<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/>'
                             + onder + '<w:right w:val="nil"/></w:tcBorders>', cx_)
                if not smal:
                    cx_ = cx_.replace('<w:top w:w="60" w:type="dxa"/>', '<w:top w:w="70" w:type="dxa"/>').replace(
                        '<w:bottom w:w="60" w:type="dxa"/>', '<w:bottom w:w="70" w:type="dxa"/>')
            if smal:
                cx_ = cx_.replace('<w:top w:w="60" w:type="dxa"/>', '<w:top w:w="20" w:type="dxa"/>').replace(
                    '<w:bottom w:w="60" w:type="dxa"/>', '<w:bottom w:w="20" w:type="dxa"/>')
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




def oordeel_label(o, size=SZ, space_after=0):
    # alleen het woord, in de oordeelkleur: geen code die uitleg nodig heeft
    _, _, kleur = OORDEEL[o]
    return rich([(o, dict(bold=True, color=kleur))], size=size, space_after=space_after)




def kv(rows, widths, licht=False):
    body, fills = [], {}
    for i, rij in enumerate(rows):
        cellen = []
        for j, c_ in enumerate(rij):
            if j % 2 == 0:
                cellen.append([p(c_, bold=True, color="595959" if licht else LABELTEKST)])
                if not licht:
                    fills[(i, j)] = LABEL
            else:
                cellen.append([p(c_)])
        body.append(cellen)
    return tbl(body, list(widths), header=False, fills=fills, valign="center", naam="kop", licht=licht)


def banner():
    ppr = ('<w:pBdr>' + "".join(f'<w:{z} w:val="double" w:sz="6" w:space="3" w:color="{MARKKLEUR}"/>'
                                 for z in ("top", "left", "bottom", "right")) + '</w:pBdr>'
           '<w:spacing w:before="0" w:after="120"/>'
           '<w:ind w:left="140" w:right="140"/><w:jc w:val="center"/>')
    runs = (_runs(MARK + ". ", bold=True, color=MARKKLEUR, size=20) +
            _runs("Demo van de nieuwe WPI-methode: alle gegevens in dit rapport zijn verzonnen.", size=16))
    return f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>{STIJL}{ppr}</w:pPr>{runs}</w:p>'


def kader(label, regels_, lijn, vulling, SZT=SZT):
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
                '<w:pgSz w:w="11900" w:h="16840"/><w:pgMar w:top="1300" w:right="1418" w:bottom="1560" w:left="1418" '
                'w:header="709" w:footer="1200" w:gutter="0"/><w:cols w:space="708"/><w:titlePg/>'
                '<w:docGrid w:linePitch="360"/></w:sectPr>')
LIGGEND_SECT = ('<w:sectPr><w:headerReference w:type="default" r:id="rIdWpiKopL"/>'
                '<w:footerReference w:type="default" r:id="rIdWpiVoetL"/>'
                '<w:pgSz w:w="16840" w:h="11900" w:orient="landscape"/><w:pgMar w:top="1250" w:right="500" '
                'w:bottom="680" w:left="500" w:header="520" w:footer="380" w:gutter="0"/><w:cols w:space="708"/>'
                '<w:docGrid w:linePitch="360"/></w:sectPr>')


COVER_KERN = []


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

    # liggende kop: dezelfde kop met logo als de staande pagina's (kopie van header1 met liggende achtergrond)
    kopl = open(t + "/word/header1.xml", encoding="utf-8").read()
    assert kopl.count('cx="7560000" cy="10684800"') == 2
    kopl = kopl.replace('cx="7560000" cy="10684800"', 'cx="10684800" cy="7560000"')
    kopl = kopl.replace('wp14:anchorId="476DA75B"', 'wp14:anchorId="476DA75C"').replace(
        'id="1374485306"', 'id="1374485307"')
    open(t + "/word/header3.xml", "w", encoding="utf-8").write(kopl)
    open(t + "/word/_rels/header3.xml.rels", "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.'
        'org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/'
        'officeDocument/2006/relationships/image" Target="media/image_ligg.png"/></Relationships>')
    voetl = wortel + '<w:p><w:pPr><w:pStyle w:val="Voettekst"/></w:pPr>' + nbh_xml(voet_runs()) + "</w:p></w:ftr>"
    open(t + "/word/footer2.xml", "w", encoding="utf-8").write(voetl)

    # -- achtergrond staand (header1, image1.png): golf met merknamen onderaan half zo hoog, zodat het tekstvlak
    # ruim 2 cm langer wordt. Merknamen blijven op ware grootte; alleen de golflijn wordt platter.
    import numpy as np
    bg_pad = t + "/word/media/image1.png"
    bg = Image.open(bg_pad).convert("RGB")
    a_ = np.array(bg)
    TXT = (1710, 3370, 2330, 3485)            # merknamen (x0, y0, x1, y1) in px
    G0, G1 = 3150, 3520                       # band met golf
    merk = bg.crop(TXT)
    a_[TXT[1]:TXT[3], TXT[0]:TXT[2]] = 255
    band = Image.fromarray(a_[G0:G1]).resize((bg.width, (G1 - G0) // 2), Image.LANCZOS)
    a_[G0:G1] = 255
    nieuw = Image.fromarray(a_)
    nieuw.paste(band, (0, G1 - band.height))
    nieuw.paste(merk, (TXT[0], 3400))
    nieuw.save(bg_pad, optimize=True)
    # -- achtergrond liggend (header3): alleen het logo, op dezelfde plek en grootte als staand
    ligg = Image.new("RGB", (bg.height, bg.width), "white")
    ligg.paste(bg.crop((100, 90, 700, 280)), (100, 90))
    ligg.save(t + "/word/media/image_ligg.png", optimize=True)

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
    # omslag: markering, WPI-nummer en de kerngegevens (datum, werkplek/project, inspecteur, open acties)
    wit = '<w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>'
    kern = [f"Datum: {dmy(wpi['datum'])}, {TIJD.replace(chr(160), ' ')}",
            f"Werkplek: {wpi['locatie']}, {wpi['opdrachtgever']}",
            f"Project: {wpi['project']}; {wpi['product'].lower()}, {wpi['taken'][0].lower()}",
            f"Inspecteur: {wpi['inspecteur']}, Montage Coördinator",
            f"Acties: {n_open} open van {len(acties)}"]
    COVER_KERN.extend(kern)
    kern_xml = "<w:br/>".join(f"<w:t xml:space=\"preserve\">{_esc(k_)}</w:t>" for k_ in kern)
    x = x.replace("<w:t>Screwpumps</w:t>", nbh_xml(
        f"<w:t>{MARK}</w:t><w:br/><w:t>{NR}</w:t></w:r></w:p>"
        f'<w:p><w:pPr><w:spacing w:before="240" w:after="0" w:line="300" w:lineRule="auto"/></w:pPr>'
        f"<w:r>{wit}{kern_xml}"))
    x = x.replace('cx="5401945" cy="1704975"', 'cx="5401945" cy="3300000"')
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
# ronde 9 (data 10.4): actie 8 is kort met termijn 19-11-2026; tellingen 1 direct, 5 kort, 3 planmatig; 8 open
_a8 = next(a for a in acties if a["actie"].endswith("-8"))
assert (_a8["prioriteit"], _a8["termijn"]) == ("kort", "2026-11-19"), (_a8["prioriteit"], _a8["termijn"])
assert (prio["direct"], prio["kort"], prio["planmatig"]) == (1, 5, 3), prio
assert n_open == 8
n_af = len(acties) - n_open
bevestigd_refs = [r["ref"] for r in regels if dekking(r) == "Alleen bevestigd"]
nb_refs = [r["ref"] for r in regels if dekking(r) == "Niet beoordeeld"]




B = [pagebreak(), banner()]

# =====================================================================================================================
# OVERZICHT (pagina 1–2 na de omslag): wat het maandagoverleg en de auditor als eerste lezen. Weinig lopende tekst,
# veel witruimte, geen codes zonder uitleg. Details staan vanaf onderdeel 3; toelichting, legenda's en VCA-kader in de
# toelichting achteraan.
# =====================================================================================================================
SZK = 16   # 8 pt voor kleine grijze bijschriften
GRIJS_T = "595959"


def lucht(xml, voor=0, na=None):
    """Zet ruimte vóór (en eventueel na) een alinea."""
    if na is not None:
        xml = re.sub(r'<w:spacing w:after="\d+"/>', f'<w:spacing w:after="{na}"/>', xml, count=1)
    return xml.replace("<w:spacing w:after", f'<w:spacing w:before="{voor}" w:after', 1)


def subkop_(tekst, voor=220):
    """Blauwe tussenkop binnen een onderdeel (geen Kop1: de negen onderdeelkoppen blijven de enige Kop1)."""
    return lucht(rich([(tekst, dict(bold=True, color=nb.BLAUW))], size=20, space_after=80, keep=True), voor)


def punt(delen, na=80, keep=False):
    """Opsommingspunt met hangende inspringing; delen = [(tekst, opmaak)]."""
    x = rich([("–\t", dict(bold=True, color=nb.BLAUW))] + delen, size=SZT, space_after=na, keep=keep)
    x = x.replace("–\t</w:t>", '–</w:t><w:tab/><w:t xml:space="preserve"></w:t>', 1)
    x = x.replace('<w:spacing w:after', '<w:tabs><w:tab w:val="left" w:pos="280"/></w:tabs><w:spacing w:after', 1)
    return re.sub(r'(<w:spacing w:after="\d+"/>)', r'\1<w:ind w:left="280" w:right="0" w:hanging="280"/>', x, count=1)


def klein(tekst, na=0, **kw):
    return p(tekst, size=SZK, color=GRIJS_T, space_after=na, **kw)


# ---- 1 Kop: kerngegevens (wie, waar, wanneer, taak, getoetst tegen)
B.append(kop("1. Kop"))
B_KOP = kv([
    ["Datum en tijd", f"{dmy(wpi['datum'])}, {TIJD}", "WPI-nummer", NR],
    ["Inspecteur", f"{wpi['inspecteur']}, Montage Coördinator", "Soort", wpi["soort"]],
    ["Opdrachtgever", wpi["opdrachtgever"], "Locatie", wpi["locatie"]],
    ["Project", wpi["project"], "Monteurs", f"{wpi['monteurs']} eigen monteurs (fictief)"],
    ["Ingang", wpi["ingang"]],
    ["Getoetst tijdens bezoek", GETOETST_BEZOEK],
    ["Werk", f"{wpi['product']}, fase {wpi['fase'].lower()}. Eén monteur werkt in het "
             "kanaal, één is mangatwacht."],
    ["Getoetst tegen", f"{TRA_GETOETST}. In de projectmap lag {REV_MAP_K} (zie actie{NB}1)."],
    ["Omstandigheden", "Droog, 8 °C; kanaal drooggezet. Mobiele kraan met machinist van het kraanbedrijf."],
], widths=(1800, 3420, 1450, 2394), licht=True)
B.append(B_KOP)

# ---- 2 Samenvatting
B.append(kop("2. Samenvatting").replace('w:before="160"', 'w:before="320"', 1))
n_w = dek_alg["Waargenomen"] + dek_tra["Waargenomen"]
refs_van = {o: [r["ref"] for r in regels if r["oordeel"] == o] for o in OORDEEL}
assert refs_van["Conform"] == ["B", "C", "D", "E", "H", "I", "DAM-2.01", "DAM-2.04", "DAM-2.05", "DAM-2.08"]
assert refs_van["Afwijking"] == ["A", "G", "DAM-2.06", "DAM-2.07"] and refs_van["Verbeterpunt"] == ["DAM-2.03"]
assert not refs_van["Geen afwijking waargenomen"] and not refs_van["Niet beoordeeld"]
assert (tel["Conform"], tel["Afwijking"], tel["Verbeterpunt"], len(regels)) == (10, 4, 1, 15), tel

# betekenis van de oordelen: staat in de tegels zelf (en in de toelichting achteraan)
LEG = {"Conform": "zelf gezien, in orde",
       "Afwijking": "zelf gezien, niet (goed) toegepast",
       "Verbeterpunt": "zelf gezien, kan beter",
       "Geen afwijking waargenomen": "niet zelf gezien; bevestigd bij de afsluitvraag",
       "Niet beoordeeld": "niet gezien, niet bevestigd",
       "Niet van toepassing": "maatregel speelt niet bij dit werk"}


def tegels(items):
    """Rustige tegels: groot getal, oordeel, korte uitleg; alleen een gekleurde lijn boven, geen vulling."""
    n = len(items)
    gat = 160
    tw = min((W - gat * (n - 1)) // n, 2200)   # drie rustige tegels, niet over de volle breedte uitgerekt
    widths, cellen = [], []
    for k, (o, aantal) in enumerate(items):
        _, _, kleur = OORDEEL[o]
        lijn = kleur
        inhoud = (rich([(str(aantal), dict(bold=True, color=kleur))], size=44, space_after=0)
                  + rich([(o, dict(bold=True, color="262626"))], size=SZT, space_after=20)
                  + p(LEG[o], size=SZK, color=GRIJS_T))
        cellen.append(f'<w:tc><w:tcPr><w:tcW w:w="{tw}" w:type="dxa"/><w:tcBorders>'
                      f'<w:top w:val="single" w:sz="24" w:space="0" w:color="{lijn}"/><w:left w:val="nil"/>'
                      '<w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders><w:tcMar>'
                      '<w:top w:w="90" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/>'
                      '<w:right w:w="40" w:type="dxa"/></w:tcMar></w:tcPr>' + inhoud + "</w:tc>")
        widths.append(tw)
        if k < n - 1:
            cellen.append(f'<w:tc><w:tcPr><w:tcW w:w="{gat}" w:type="dxa"/><w:tcBorders><w:top w:val="nil"/>'
                          '<w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders></w:tcPr>'
                          + p("", size=4) + "</w:tc>")
            widths.append(gat)
    grid = "".join(f'<w:gridCol w:w="{w_}"/>' for w_ in widths)
    return (f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
            '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>'
            f'<w:tblGrid>{grid}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>{"".join(cellen)}</w:tr></w:tbl>')


B.append(subkop_("Oordelen", 120))
B.append(tegels([(o, tel[o]) for o in ("Conform", "Afwijking", "Verbeterpunt")]))

# wat ging goed / wat moet beter: de kernzinnen uit onderdeel 3/4 letterlijk, met het oordeel als woord en de acties
GOED_REFS = ["E", "B", "DAM-2.08"]
assert set(GOED_REFS) <= set(refs_van["Conform"])
BETER_REFS = refs_van["Afwijking"] + refs_van["Verbeterpunt"]      # A, G, DAM-2.06, DAM-2.07, DAM-2.03
OVERZICHT = {}   # ref -> zin zoals in het overzicht; gecontroleerd tegen de kernzin


def act_tekst(a_):
    a_ = sorted(a_, key=int)
    return ("acties " + ", ".join(a_[:-1]) + " en " + a_[-1]) if len(a_) > 1 else f"actie{NB}{a_[0]}"


B.append(subkop_("Wat ging goed"))
for ref_ in GOED_REFS:
    OVERZICHT[ref_] = KERN[ref_]
    B.append(punt([("Conform: ", dict(bold=True, color=OORDEEL["Conform"][2])), (OVERZICHT[ref_], {})]))
B.append(klein(f"De {len(refs_van['Conform'])} positieve bevindingen staan in onderdeel 5.", na=0))
B.append(subkop_("Wat moet beter"))
for ref_ in BETER_REFS:
    o_ = REGEL[ref_]["oordeel"]
    OVERZICHT[ref_] = KERN[ref_]
    B.append(punt([(f"{o_}: ", dict(bold=True, color=OORDEEL[o_][2])), (OVERZICHT[ref_], {}),
                   (f"  → {act_tekst(ACTIE_BIJ[ref_])}", dict(bold=True, color=nb.BLAUW))]))
# check: elke overzichtszin is letterlijk de kernzin van zijn regel; elke actie komt precies één keer voor
assert all(OVERZICHT[k_] == KERN[k_] for k_ in OVERZICHT)
assert sorted(x for r_ in BETER_REFS for x in ACTIE_BIJ[r_]) == sorted(kort(a) for a in acties)

# ---- actielijst kort (ID, verbeteractie, houder, toetser, termijn, status); volledig in onderdeel 6, velden in 9b
B.append(subkop_("Actielijst", 360))
B.append(rich([(f"{len(acties)} acties", dict(bold=True)),
               (f": {prio['direct']} direct, {prio['kort']} kort (binnen 2 weken), {prio['planmatig']} planmatig; ", {}),
               (f"{n_open} open", dict(bold=True, color=STATUSKLEUR["Open"])), (", ", {}),
               (f"{n_af} afgerond", dict(bold=True, color=STATUSKLEUR["Afgerond"])), (".", {})],
              size=SZT, space_after=100, keep=True))
rows = [[[p(k_, bold=True, color=nb.BLAUW, size=SZK)] for k_ in
         ("Nr.", "Ref", "Verbeteractie", "Actiehouder", "Toetser", "Termijn, prioriteit", "Status")]]
for a in sorted(acties, key=lambda a: int(kort(a))):
    toetser = "" if a["toetser"] == "Hoofd Service & Montage" else a["toetser"]   # zie voetnoot
    rows.append([[p(kort(a), bold=True, size=SZK)], [p(a["ref"], color=nb.BLAUW, size=SZK)],
                 [p(VA_KORT[kort(a)], size=SZK)], [p(a["actiehouder"], size=SZK)], [p(toetser, size=SZK)],
                 [p(dmy(a["termijn"]), size=SZK), p(a["prioriteit"], size=SZK, color=GRIJS_T)],
                 [p(a["status"], bold=True, color=STATUSKLEUR[a["status"]], size=SZK)]])
_al = tbl(rows, [480, 1080, 2504, 1600, 1150, 1150, 1100], valign="center", naam="actielijst", wees=True,
          minrijen=2, licht=True)
B.append(_al[:_al.rindex("<w:p ")])
B.append(lucht(klein("Toetser: Hoofd Service & Montage, tenzij anders vermeld. Actienummer voluit: WPI-nummer + "
                     f"volgnummer, bijvoorbeeld {NR}-1. Bevinding en volledige verbeteractie: onderdeel 6.", na=0), 80))

# ---- bevestiging en bespreking (afsluiting van het overzicht)
B.append(subkop_("Bevestiging en bespreking", 360))
B.append(tbl([
    ["", "Naam of functie", "Datum", "Paraaf"],
    [[p("Samenvatting bevestigd door de inspecteur")], wpi["inspecteur"], dmy(wpi["datum"]),
     [p("(fictief)", color="808080", italic=True)]],
    [[p("Besproken in het coördinatorenoverleg")],
     [rich([("datum overleg ", {}), ("________", dict(color="808080")), ("  ·  acties ", {}),
            ("________", dict(color="808080")), ("  ·  afgetekend ", {}), ("________", dict(color="808080"))])]],
], [3100, 3064, 1700, 1200], valign="center", keep=True, naam="ondertekening", licht=True))

# =====================================================================================================================
# DETAILS: onderdeel 3 t/m 9, compact
# =====================================================================================================================




def zie_staart(ref):
    a_ = ACTIE_BIJ.get(ref, [])
    f_ = FOTO_BIJ.get(ref, [])
    zie_ = ([("actie " if len(a_) == 1 else "acties ") + ", ".join(a_)] if a_ else []) + \
           ([("foto " if len(f_) == 1 else "foto's ") + ", ".join(str(n) for n in f_)] if f_ else [])
    return [p("→ " + " · ".join(zie_), bold=True, color=nb.BLAUW, size=SZK, space_after=0)] if zie_ else []


def waarneming_cel(r):
    """Volledige waarneming: kernzin vet bovenaan, daarna de details; verwijzing naar acties/foto's eronder."""
    if dekking(r) == "Waargenomen":
        cel = [rich([(KERN[r["ref"]], dict(bold=True))], space_after=30), p(WAAR[r["ref"]][1], space_after=20)]
    else:
        cel = [p(waarneming(r), color="4D4D4D", italic=True, space_after=20)]
    return cel + zie_staart(r["ref"])


# ---- 3 Algemene observatie
B.append(kop("3. Algemene waarnemingen", nieuwe_pagina=True))
B.append(intro(f"Alleen wat de inspecteur zag, los van de taak: {len(alg)} van de negen vaste onderwerpen (de lijst is "
               "een geheugensteun, niet verplicht). De kernzin staat vet bovenaan.", space_after=100))
rows = [["", "Onderwerp en oordeel", "Waarneming van de inspecteur"]]
for r in alg:
    rows.append([[p(r["ref"], bold=True, color=nb.BLAUW)],
                 [p(r["omschrijving"], bold=True, space_after=30), oordeel_label(r["oordeel"])],
                 waarneming_cel(r)])
B.append(tbl(rows, [450, 2350, W - 2800], naam="algemeen", licht=True, los=True))

# ---- 4 Taakgerichte toetsing
RISICO_KORT = {"DAM-2.01": "Vallen van hoogte bij de rand van het kanaal",
               "DAM-2.02": "Fysieke belasting: werkhouding en zware objecten",
               "DAM-2.03": "Vallen van de last bij hijswerk",
               "DAM-2.04": "Beknelling van handen tussen last en constructie",
               "DAM-2.05": "Begeleiden van de last vanaf een onveilige positie",
               "DAM-2.06": "Biologische agentia: contact met afvalwater en slib",
               "DAM-2.07": "Besloten ruimte: gasbewaking en ventilatie",
               "DAM-2.08": "Damwand kan verschuiven als bevestigingsmiddelen worden losgekoppeld"}
assert {r["ref"] for r in trar} <= set(RISICO_KORT) <= set(tra)
for k_, v_ in RISICO_KORT.items():   # inkorting van het TRA-risico: geen nieuwe woorden
    _vol = re.sub(r"[^\w\-]+", " ", tra[k_]["risico"].lower()).split()
    for w_ in re.sub(r"[^\w\-]+", " ", v_.lower()).split():
        if len(w_) >= 5 and not any(w_ in x_ for x_ in _vol):
            raise SystemExit(f"FOUT: kort risico {k_} bevat '{w_}', niet in de TRA")
B.append(kop("4. Taakgerichte toetsing"))
B_ONDERDEEL4 = intro(f"Getoetst tegen {TRA_GETOETST}; in de projectmap lag {REV_MAP_K} (actie{NB}1). Getoetst tijdens "
                     f"bezoek: {GETOETST_BEZOEK}. Hieronder de {len(trar)} TRA-regels waarvan de inspecteur het werk zag, "
                     "met de maatregelen letterlijk uit de TRA (risico voluit: 9c). De vraag: werken de monteurs volgens "
                     "die maatregelen?", space_after=100)
B.append(B_ONDERDEEL4)
rows = [["TRA-regel", "Risico (kort) en maatregelen volgens de TRA", "Waarneming van de inspecteur"]]
for r in trar:
    t = tra[r["ref"]]
    midden = [p(RISICO_KORT[r["ref"]], bold=True, space_after=30)]
    for m in t["maatregelen"]:
        soort, _, rest = m.partition(":")
        midden.append(rich([(f"{soort.capitalize()}:", dict(bold=True, color=nb.BLAUW)), (rest, {})],
                           size=SZK, space_after=20))
    rows.append([[p(r["ref"], bold=True, color=nb.BLAUW, space_after=30), oordeel_label(r["oordeel"])], midden,
                 waarneming_cel(r)])
B.append(tbl(rows, [1450, 3400, W - 4850], naam="tra", licht=True, los=True))
B.append(lucht(rich([("Buiten TRA: ", dict(bold=True)),
                     ("geen; al het geziene werk valt onder de TRA-regels van deze taak (afspuiten: DAM-2.06).",
                      {})], size=SZT), 60))

# ---- 5 Positieve bevindingen: dezelfde formulering als de kernzin in onderdeel 3 en 4
B.append(kop("5. Positieve bevindingen"))
pos = [r for r in regels if r["oordeel"] == "Conform"]
POS = {r["ref"]: KERN[r["ref"]] for r in pos}
B.append(intro(f"De {len(pos)} regels met het oordeel Conform, met de kernzin uit onderdeel 3 en 4.", space_after=100))
rows = [["", "Wat ging goed", "Classificatie", "Foto"]]
for r in pos:
    rows.append([[p(r["ref"], bold=True, color=nb.BLAUW)], POS[r["ref"]], r["classificatie"],
                 ", ".join(str(n) for n in FOTO_BIJ.get(r["ref"], [])) or "–"])
B.append(tbl(rows, [1150, 5214, 2000, 700], valign="center", naam="positief", licht=True))

# ---- 6 Bevindingen en acties
B.append(kop("6. Bevindingen en acties"))
gecorr = [kort(a) for a in acties if a["direct_gecorrigeerd"]]
alleen_maatregel = [kort(a) for a in acties if a["direct_genomen_maatregel"] and not a["direct_gecorrigeerd"]]
assert gecorr == ["4"], gecorr
assert set(alleen_maatregel) == set(NOG_OPEN), alleen_maatregel
B.append(intro(f"Direct gecorrigeerd: actie{NB}{', '.join(gecorr)}. Direct genomen maatregel, actie nog open: "
               f"acties {', '.join(alleen_maatregel[:-1])} en {alleen_maatregel[-1]} (betekenis: 9d).",
               space_after=100))
rows = [["Nr.", "Bevinding en verbeteractie", "Actiehouder, termijn, toetser"]]
for a in acties:
    direct = a["direct_genomen_maatregel"]
    bev, act = a["bevinding"], a["verbeteractie"]
    kl = OORDEEL[a["oordeel"]][2]
    links = [p(kort(a), bold=True, size=24)]
    _fo = "".join(f" · foto{NB}{n}" for n in FOTO_ACTIE.get(kort(a), []))
    midden = [rich([(a["ref"] + _fo + "   ", dict(bold=True, color=nb.BLAUW, size=SZK)),
                    (f"{a['oordeel']}: ", dict(bold=True, color=kl)), (bev, {})], space_after=40)]
    if kort(a) == "1":   # TRA-revisie: projectmap tegenover QMS
        midden.append(rich([("TRA: ", dict(bold=True)), (f"projectmap {REV_MAP}, QMS {REV_QMS}.", {})], space_after=40))
    if direct:
        midden.append(rich([("Direct genomen maatregel: ", dict(bold=True, color=GRIJS_T)), (direct, dict(color=GRIJS_T))]
                           + ([(" Actie blijft open: " + NOG_OPEN[kort(a)] + ".", dict(italic=True, color=GRIJS_T))]
                              if kort(a) in NOG_OPEN else []), size=SZK, space_after=40))
    midden.append(rich([("Verbeteractie: ", dict(bold=True, color=nb.BLAUW)), (act, dict(bold=True))],
                       space_after=40 if a["direct_gecorrigeerd"] else 0))
    if a["direct_gecorrigeerd"]:   # geen "direct genomen maatregel": de verbeteractie zelf is ter plaatse uitgevoerd
        assert not direct, a["actie"]
        midden.append(rich([("Ter plaatse uitgevoerd en getoetst", dict(bold=True)),
                            (f" op {dmy(a['getoetst_op'])}.", {})]))
    meta = [p(a["actiehouder"], bold=True),
            rich([(dmy(a["termijn"]), dict(bold=True)), (" · " + a["prioriteit"], {}),
                  ("  " + a["status"], dict(bold=True, color=STATUSKLEUR[a["status"]]))]),
            p("Toetser: " + a["toetser"] + (f", getoetst {dmy(a['getoetst_op'])}" if a["getoetst_op"] else ""))]
    # classificatie en bron staan in 9b
    rows.append([links, midden, meta])
    if kort(a) == "1":
        B_ACTIE1 = "".join(midden)
    if kort(a) == "4":
        B_ACTIE4 = midden
B.append(tbl(rows, [560, 5804, 2700], naam="acties", licht=True, los=True))   # actieblokken breken nooit (cantSplit)

# VCA-kader (7.1 d en e) en de keuze van Noardling voor de opvolging: klein, aan het eind van onderdeel 6
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
# één blauw kader (letterlijke eistekst 7.1 d en e) en één oranje kader (keuze Noardling), elk over de volle breedte
_vca_e = " ".join(t_ for _, t_ in VCA_EIS[2:])
WAAR_IN_RAPPORT = [   # per element van 7.1 d en e: waar het in dit rapport staat
    "positieve bevindingen → onderdeel 5 (en 3, 4)",
    "geconstateerde afwijkingen → onderdeel 3, 4 en 6",
    "uit te voeren verbeteracties → onderdeel 6 (kort: actielijst in 2)",
    "uitvoeringsverantwoordelijken → onderdeel 6, actiehouder",
    "tijdsduur voor de uitvoering → onderdeel 6, termijn",
    "actiepunten uit de inspecties → actielijst in 2, onderdeel 6, 9b",
    "verantwoordelijken voor uitvoering en toetsing → onderdeel 6, actiehouder en toetser",
    "tijdsplanning → onderdeel 6 en 9b, termijn",
]
for el_ in ("positieve bevindingen", "geconstateerde afwijkingen", "verbeteracties", "uitvoeringsverantwoordelijken",
            "tijdsduur voor de uitvoering"):
    assert el_ in VCA_EIS[0][1], el_
for el_ in ("actiepunten", "verantwoordelijken voor de uitvoering en toetsing", "tijdsplanning"):
    assert el_ in _vca_e, el_
B.append(kader("VCA 7.1 · minimumeisen inspectieverslag en actieplan (letterlijk)",
               [(False, "Inspectieverslag: " + VCA_EIS[0][1])] + [(False, "→ " + x_) for x_ in WAAR_IN_RAPPORT[:5]] +
               [(False, "Actieplan: " + _vca_e)] + [(False, "→ " + x_) for x_ in WAAR_IN_RAPPORT[5:]],
               nb.BLAUW, nb.VULLING_BLAUW, SZB)
         .replace('w:before="80" w:after="120"', 'w:before="160" w:after="80"')
         .replace("<w:keepLines/>", "<w:keepNext/><w:keepLines/>", 1))   # blijft bij het oranje kader
B.append(kader("Opvolging, keuze van Noardling", [(False,
    "Een actie gaat pas op Afgerond als de toetser heeft vastgesteld dat hij is uitgevoerd. Toetser is het Hoofd "
    "Service & Montage; is hij zelf actiehouder, dan de inspecteur. Bij direct gecorrigeerd toetst de inspecteur ter "
    "plaatse (zie 9d). Open acties "
    "staan met hun nummer in het actieoverzicht (tijdens de proef een Excel-bestand in de projectmap; later het "
    "dashboard) en komen elke maandag in het coördinatorenoverleg. Geen namen van "
    "monteurs bij bevindingen (AVG).")], nb.LIJN_ORANJE, nb.VULLING_ORANJE, SZB)
         .replace('w:before="80" w:after="120"', 'w:before="0" w:after="120"'))

# ---- 7 Gesprek met de monteurs
B.append(kop("7. Gesprek met de monteurs"))
B.append(intro("Na het uithijsen van het tweede deel kort nabesproken met beide monteurs bij de bus.", space_after=100))


def lijst(regels_):
    return [p("– " + t, space_after=20) for t in regels_]


GESPREK = [
    ("Besproken", ["Wat beter moet: de punten uit de actielijst, één voor één.",
                   "Wat goed ging: de punten uit onderdeel 5, met nadruk op hijsen (afzetting, gewicht, stuurlijn), de "
                   "reddingsmiddelen en het inzekeren van de damwand vóór het losnemen."]),
    ("Reactie van de monteurs", ["Ze herkennen de punten.",
                                 "De TRA in de map is bij de start geprint, vóór de laatste revisie.",
                                 "De handenwasset is na de vorige klus niet aangevuld.",
                                 "De opdrachtgever reinigt op meer locaties niet vooraf; dan spuiten ze zelf af.",
                                 "De gasmeter hing boven omdat hij bij het afdalen in de weg zit."]),
    # letterlijk de verbeteractie van de actie waar het idee in is overgenomen (bron Idee monteurs)
    ("Ideeën van de monteurs", [a["verbeteractie"].replace("Idee van de monteurs uitwerken: ", "").rstrip(".")
                                .capitalize() + f" (overgenomen als actie{NB}{kort(a)})."
                                for a in acties if a["bron"] == "Idee monteurs"]),
]
B.append(tbl([[[p(k_, bold=True, color=GRIJS_T)], lijst(v_)] for k_, v_ in GESPREK],
             [1800, 7264], header=False, keep=True, naam="gesprek", licht=True))

# ---- 8 Foto's
B.append(kop("8. Foto's met toelichting"))
B.append(intro("Geen echte foto's: de vlakken staan waar in een echt rapport de foto's van de inspecteur komen.",
               space_after=100))
CX = int(3.2 / 2.54 * 914400); CY = int(CX * 600 / 900)
rows = []
for k in range(0, len(FOTOS), 3):
    rij = []
    for n, ref, acts, toont, toel in FOTOS[k:k + 3]:
        r = next(r for r in regels if r["ref"] == ref)
        act = "".join(f", actie{NB}{x}" for x in acts)
        rij.append([image_par(f"rIdWpiFoto{n}", n, CX, CY, f"Voorbeeldfoto {n} (fictief)"),
                    rich([(f"Foto {n}", dict(bold=True, color=nb.BLAUW)), (f" bij {ref}{act}  ", dict(bold=True)),
                          (r["oordeel"], dict(bold=True, color=OORDEEL[r['oordeel']][2]))], space_after=20),
                    p(toel)])
    rows.append(rij)
fototbl = tbl(rows, [3022, 3021, 3021], header=False, naam="fotos", licht=True, minrijen=1)
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
        print(f"  {naam}: flexkolom {widths[flex]} dxa {widths}")
    rows = [[[pb(k, bold=True, color="FFFFFF")] for k in koppen]]
    rows += [[[pb(v)] for v in rij] for rij in data]
    return tbl(rows, widths, valign="center", naam=naam, totaal=WL, smal=True)


def nr(x):   # kort actienummer: initialen inspecteur + volgnummer, bv. C2-1 (voluit WPI-...-C2-1)
    return x.rsplit("-", 2)[1] + "-" + x.rsplit("-", 1)[1]


def bijkop(titel, aantal):
    return rich([(titel, dict(bold=True)), (f"  ({aantal})", {}),
                 (f"   Geldt voor elke rij: WPI-nummer {NR}, datum {dmy(wpi['datum'])}.", dict(color="4D4D4D"))],
                size=SZT, space_after=40, keep=True)


B.append(kop("9. Gegevenstabel"))
B.append(intro("Platte tabellen, gelijk in elk WPI-rapport; bron voor dashboard en trendanalyse (VCA 7.2). Acties met kort "
               f"nummer, bv. {nr(NR + '-1')} = {NR}-1. Hoofd S&M = Hoofd Service & Montage.", space_after=60))
B.append(rich([("9a. Inspectie", dict(bold=True)), ("  (1 record)", {})], size=SZT, space_after=40, keep=True))
B_9A = (btbl(["WPI-nummer", "Datum en tijd", "Inspecteur", "Soort inspectie", "Ingang", "Opdrachtgever", "Locatie",
               "Project", "Product", "Code", "TRA-revisie", "Fase", "Getoetste stappen", "Monteurs"],
              [[wpi["nr"], dmy(wpi["datum"]) + "\n" + TIJD.split("\u00a0")[0], wpi["inspecteur"], wpi["soort"],
                wpi["ingang"], wpi["opdrachtgever"], wpi["locatie"], wpi["project"], wpi["product"], wpi["code"],
                f"QMS: {REV_QMS}, {REV_DATUM}\nprojectmap: {REV_MAP}", wpi["fase"],
                "; ".join(s_["taak"] + (f" / {s_['taakstap']}" if s_["taakstap"] else " (taak)") for s_ in STAPPEN),
                str(wpi["monteurs"])]], "9a", flex=12, vast=(0, 1, 4, 9, 13)))
B.append(B_9A)

B.append(bijkop("9b. Acties: registratie", f"{len(acties)} acties"))
# korte direct genomen maatregel (uit het dataveld direct_genomen_maatregel; geen nieuwe woorden, zie controle)
DGM_KORT = {"1": "Actuele TRA uit het QMS met de ploeg doorgenomen",
            "2": "Water, zeep en papier bij de werkplek gezet",
            "3": "Met de operator afgesproken dat hij afspuit",
            "7": "Drinken direct uit de werkzone gehaald"}
assert set(DGM_KORT) == {kort(a) for a in acties if a["direct_genomen_maatregel"]}
for a in acties:
    if kort(a) in DGM_KORT:
        _vol = re.sub(r"[^\w\-]+", " ", a["direct_genomen_maatregel"].lower()).split()
        for w_ in re.sub(r"[^\w\-]+", " ", DGM_KORT[kort(a)].lower()).split():
            if len(w_) >= 5 and not any(w_ in v_ for v_ in _vol):
                raise SystemExit(f"FOUT: korte maatregel {kort(a)} bevat '{w_}', niet in de data")


def sm(x):   # in de smalle tabel: Hoofd S&M (uitgelegd in de intro van onderdeel 9)
    return x.replace("Hoofd Service & Montage", "Hoofd\u00a0S&M")


# de kolom "direct genomen maatregel (kort)" past niet naast de andere velden (9b wordt dan te smal); DGM_KORT blijft
# gecontroleerd voor later gebruik, de volledige tekst staat in onderdeel 6
B.append(btbl(["Actie", "Ref", "Oordeel", "Bevinding (kort)", "Verbeteractie (kort)",
               "Classificatie", "Prioriteit",
               "Direct gecorr.", "Actiehouder", "Toetser", "Termijn", "Status", "Afgerond op / getoetst op", "Bron"],
              [[nr(a["actie"]), a["ref"], a["oordeel"], BEV_KORT[kort(a)], VA_KORT[kort(a)],
                a["classificatie"],
                a["prioriteit"], "ja" if a["direct_gecorrigeerd"] else "nee", sm(a["actiehouder"]), sm(a["toetser"]),
                dmy(a["termijn"]), a["status"],
                (dmy(a["afgerond_op"]) + " / " + dmy(a["getoetst_op"])) if a["afgerond_op"] or a["getoetst_op"] else "",
                a["bron"]]
               for a in acties],
              "9b", flex=4, vast=(0, 1, 2, 6, 7, 10, 11),
              minw={3: "Andere projectmappen", 8: "Werkvoorbereider", 9: "Hoofd\u00a0S&M", 12: "05-11-2026 /"}))
B.append(bijkop("9c. Regels", f"{len(regels)} regels").replace('<w:spacing w:after', '<w:spacing w:before="160" w:after', 1))
B.append(btbl(["Ref", "Soort", "Omschrijving", "Taak / taakstap", "Oordeel", "Classificatie", "Prioriteit", "Acties"],
              [[r["ref"], r["soort"], r["omschrijving"],
                (r.get("taak") or "") + (f" / {r['taakstap']}" if r.get("taakstap") else ""), r["oordeel"],
                r["classificatie"], r.get("prioriteit") or "", "; ".join(nr(x) for x in r.get("acties", []))]
               for r in regels],
              "9c", flex=2, vast=(0, 4, 5, 6, 7)))   # classificatie en oordeel breken niet af; omschrijving smaller

# 9d: betekenis van de codevelden, zodat de platte tabel zonder de rest van het rapport te lezen is
B.append(rich([("9d. Velden", dict(bold=True)), ("  betekenis van de vaste waarden in 9a–9c", dict(color="4D4D4D"))],
              size=SZT, space_after=40, keep=True).replace('<w:spacing w:after', '<w:spacing w:before="160" w:after', 1))
VELDEN = [
    ("Soort", "Algemeen = een van de negen vaste onderwerpen A–I (alleen wat gezien is); TRA = risicoregel uit de product-TRA; Buiten TRA = "
              "waarneming die bij geen TRA-regel past (signaal dat de TRA een risico mist)."),
    ("Oordeel", "Conform, Afwijking of Verbeterpunt, altijd met een eigen waarneming van de inspecteur (eventueel Niet "
                "van toepassing als hij dat expliciet ziet). Wat niet gezien is, staat niet in het rapport."),
    ("Ingang", "ingepland (uit het inspectieprogramma) of spontaan."),
    ("Taak / taakstap", "Het werk dat de monteurs deden; taakstap alleen waar de TRA die kent."),
    ("Classificatie", "Een van de 14 vaste klassen; bij een TRA-regel de vaste klasse van die regel in de kennisbank."),
    ("Prioriteit", "direct; kort = binnen 2 weken; planmatig. Bij een regel (9c): de hoogste prioriteit van de acties "
                   "van die regel."),
    ("Direct gecorr.", "ja of nee. " + DEF_DIRECT),
    ("Status, getoetst op", "Open, Uitgevoerd gemeld, Afgerond of Vervallen (zoals in de procedure); in dit rapport "
                            "komen alleen Open en Afgerond voor. Afgerond pas na toetsing; de toetser is nooit de "
                            "actiehouder."),
    ("Bron", "Inspectie, Idee monteurs of Buiten TRA."),
    ("TRA-revisie", "De revisie van de TRA in het QMS waartegen is getoetst."),
]
# compact: veldnaam vet, betekenis erachter, als doorlopende alinea's (twee velden per alinea)
for k_ in range(0, len(VELDEN), 3):
    _r = []
    for j_, (n_, v_) in enumerate(VELDEN[k_:k_ + 3]):
        _r += [(("     " if j_ else "") + n_ + ": ", dict(bold=True)), (v_, {})]
    B.append(rich(_r, size=SZB, space_after=40))

# laatste element van het document: een minimale alinea, zodat er geen lege pagina achteraan komt
B.append(f'<w:p w14:paraId="{_next_id()}" w14:textId="77777777"><w:pPr>'
         '<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>')

body = "\n".join(B)
# niet-afbrekend koppelteken in alle codes; daarna controleren dat er geen code met een gewoon koppelteken over is
body = nbh_xml(body)
n_kt = body.count("<w:noBreakHyphen/>")
controleer_codes(body, "de hoofdtekst")
body = body.replace("actie -", "actie\u00a0-")
body = body.replace("Hoofd Service &amp; Montage", "Hoofd\u00a0Service\u00a0&amp;\u00a0Montage")
print(f"  niet-afbrekende koppeltekens in codes: {n_kt}")

# ---- controles ronde 8 op de platte tekst van het rapport
def platte_tekst(xml):
    return re.sub(r"<[^>]+>", "", xml.replace("<w:noBreakHyphen/>", "-")).replace("&amp;", "&").replace(NB, " ")
_pt = platte_tekst(body)
_n_def = _pt.count(DEF_DIRECT)
assert _n_def == 1, f"definitie direct gecorrigeerd staat {_n_def} keer in het rapport (moet 1)"
assert _pt.count("ter plaatse uitgevoerd; de inspecteur toetst") == 1
_dubbel = re.findall(r"\([^()]*\)\s*\(", _pt)
assert not _dubbel, f"dubbele haakjes: {_dubbel}"
assert "Direct genomen maatregel: " not in "".join(B_ACTIE4), "actie 4 heeft geen direct genomen maatregel"
for waar_, stuk_ in (("kop", B_KOP), ("onderdeel 4", B_ONDERDEEL4), ("actie 1", B_ACTIE1)):
    assert REV_QMS in platte_tekst(stuk_), f"TRA-revisie ontbreekt in {waar_}"
assert REV_MAP in platte_tekst(B_ACTIE1) and REV_MAP_K in platte_tekst(B_ONDERDEEL4)
assert REV_QMS in platte_tekst(B_9A) and REV_MAP in platte_tekst(B_9A) and "09:40–10:50" in platte_tekst(B_9A), \
    "TRA-revisie, projectmap of tijd ontbreekt in 9a"
print("  controles ronde 8: definitie 1x, geen dubbele haakjes, TRA-revisie in kop/4/actie 1/9a")

sjabloon = bereid_sjabloon()
nb.build(template=sjabloon, title="WPI-rapport", subtitle=None, body_xml=body, output=OUT, cover_size=80,
         work=WORK + "/_nb_build")

# ---- controle: precies de negen vaste onderdeelkoppen, in deze volgorde
import zipfile
VAST = ["1. Kop", "2. Samenvatting", "3. Algemene waarnemingen", "4. Taakgerichte toetsing", "5. Positieve bevindingen",
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
_cov = re.sub(r"<[^>]+>", "", zf.read("word/document.xml").decode("utf-8").replace("<w:noBreakHyphen/>", "-"))
for k_ in COVER_KERN:
    assert _esc(k_).replace("&amp;", "&") in _cov.replace("&amp;", "&"), f"omslag mist: {k_}"
assert f"Acties: {n_open} open van {len(acties)}" in COVER_KERN
print("  controle omslag: datum, werkplek, project, inspecteur en open acties staan erop")
