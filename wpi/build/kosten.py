"""Voorbeeldberekening programma en kosten uit de fictieve projectplanning (voorbeelddata.json).
Alle getallen in het voorstel over programma en kosten komen hieruit; niets met de hand."""
import json, math, datetime as dt
D = json.load(open("/home/claude/wpi/run/data/voorbeelddata.json", encoding="utf-8"))
MAANDEN = ["2026-%02d" % m for m in range(5, 11)]          # mei t/m okt: zes volledige maanden vóór de peildatum 11-11-2026
KW = {"Q2": ["2026-05", "2026-06"], "Q3": ["2026-07", "2026-08", "2026-09"], "Q4": ["2026-10"]}
MIN_WD = 10   # zoals het dashboard: een maand telt bij een lang project pas vanaf tien werkdagen op het project
def d(s): return dt.date.fromisoformat(s)
def kenmerk(p): return p["hijsen_mobiele_kraan"] or p["besloten_ruimte_vergunning"] or p["open_water"]
def lang(p): return (d(p["eind"]) - d(p["start"])).days + 1 > 31
def maanden_van(p, min_wd=None):
    min_wd = MIN_WD if min_wd is None else min_wd
    s, e = d(p["start"]), d(p["eind"]); out = []
    for m in MAANDEN:
        y, mm = map(int, m.split("-")); b = dt.date(y, mm, 1)
        nb = dt.date(y + (mm == 12), mm % 12 + 1, 1)
        if s < nb and e >= b:
            b2, e2 = max(s, b), min(e, nb - dt.timedelta(days=1))
            wd = sum(1 for i in range((e2 - b2).days + 1) if (b2 + dt.timedelta(days=i)).weekday() < 5)
            if wd >= min_wd: out.append(m)
    return out
def kw_van(m): return next(k for k, v in KW.items() if m in v)
start_m = lambda p: max(p["start"][:7], MAANDEN[0])
P = D["projecten"]
R = {k: {"a": 0, "b": 0, "c": 0} for k in KW}
per_maand = {m: 0 for m in MAANDEN}
for p in P:
    if lang(p):
        for m in maanden_van(p): R[kw_van(m)]["a"] += 1; per_maand[m] += 1
    elif p["eind"][:7] > MAANDEN[-1]:
        continue          # kort project dat na oktober eindigt: valt buiten de zes maanden (zoals het dashboard: maand van het einde)
    elif kenmerk(p):
        m = max(p["eind"][:7], MAANDEN[0]); R[kw_van(m)]["b"] += 1; per_maand[m] += 1
    else:
        if p["eind"][:7] <= MAANDEN[-1]: R[kw_van(max(p["eind"][:7], MAANDEN[0]))]["c"] += 1
for k in KW:
    c4 = math.ceil(R[k]["c"] / 4); R[k]["c4"] = c4; R[k]["tot"] = R[k]["a"] + R[k]["b"] + c4
    # steekproef c4 toerekenen aan de eerste maand van het kwartaal
    per_maand[KW[k][0]] += c4
TOT7 = sum(R[k]["tot"] for k in KW)
assert TOT7 == sum(per_maand.values())
v = [per_maand[m] for m in MAANDEN]
drie = [sum(v[i:i + 3]) for i in range(len(v) - 2)]
JAAR_LAAG, JAAR_HOOG = min(drie) * 4, max(drie) * 4
JAAR_MID = round(TOT7 * 12 / len(MAANDEN))
NM = len(MAANDEN)
def _jaar(min_wd):
    pm = {m: 0 for m in MAANDEN}; rr = {k: {"c": 0} for k in KW}
    for p in P:
        if lang(p):
            for m in maanden_van(p, min_wd): pm[m] += 1
        elif p["eind"][:7] > MAANDEN[-1]: continue
        elif kenmerk(p): pm[max(p["eind"][:7], MAANDEN[0])] += 1
        else: rr[kw_van(max(p["eind"][:7], MAANDEN[0]))]["c"] += 1
    for k in KW: pm[KW[k][0]] += math.ceil(rr[k]["c"] / 4)
    vv = [pm[m] for m in MAANDEN]; dd = [sum(vv[i:i + 3]) for i in range(len(vv) - 2)]
    return min(dd) * 4, max(dd) * 4, sum(vv)
assert _jaar(MIN_WD) == (JAAR_LAAG, JAAR_HOOG, TOT7)
ELKE_L, ELKE_H, ELKE_TOT = _jaar(1)        # variant: elke kalendermaand waarin op het project gewerkt wordt
UITGEV = {m: sum(r['uitgevoerd'] for r in D['programma'] if r['maand'] == m and r['inspecteur'].startswith('Co')) for m in MAANDEN}
# aannames (expliciet in het voorstel genoemd)
MIN_LOC_L, MIN_LOC_H, MIN_AF = 45, 70, 15   # korte WPI 45 min; voorbeeld-WPI DAM-C2 09:40-10:50 = 70 min; afronden: proefnorm 8.2
MIN_L, MIN_H = MIN_LOC_L + MIN_AF, MIN_LOC_H + MIN_AF
N_COORD, N_DIR, NORM_COORD, NORM_DIR = 2, 1, 12, 4   # norm per coördinator 12 per jaar (samen 24); directielid 4
def coord_per_jaar(benodigd): return max(benodigd - N_DIR * NORM_DIR, N_COORD * NORM_COORD)
CJ_L, CJ_H = coord_per_jaar(JAAR_LAAG), coord_per_jaar(JAAR_HOOG)
WPM_L, WPM_H = CJ_L / N_COORD / 12, CJ_H / N_COORD / 12          # WPI's per coördinator per maand
UPM_L, UPM_H = WPM_L * MIN_L / 60, WPM_H * MIN_H / 60            # uren per coördinator per maand
UPJ_L, UPJ_H = UPM_L * 12, UPM_H * 12
UDIR_L, UDIR_H = NORM_DIR * MIN_L / 60, NORM_DIR * MIN_H / 60     # uren per directielid per jaar
GEDAAN = sum(UITGEV.values())
INRICHTING = [  # (onderdeel, uren, wie) -- aannames
    ("Skill: proefvelden toevoegen en testen", 8, "Opsteller"),
    ("Actieoverzicht in de projectmap", 4, "Opsteller"),
    ("Terugvalformulier", 4, "Opsteller"),
    ("Instructie inspecteurs, opstellen", 4, "Opsteller"),
    ("Uitleg aan drie inspecteurs (2 uur elk)", 6, "Inspecteurs (de opsteller geeft de uitleg)"),
    ("QMS-map voor WPI-rapporten", 2, "QHSE-Manager"),
    ("Nulmeting: AMS-WPI's 2026 in klassen", 16, "Hoofd S&M (eigenaar); QHSE-Manager ondersteunt"),
    ("Word-sjabloon en kennisbank-PDF's", 12, "Opsteller"),
    ("Dashboard koppelen aan echte rapporten", 8, "Opsteller"),
]
INR_TOT = sum(u for _, u, _ in INRICHTING)
def nl(x, n=1):
    s = f"{x:.{n}f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s
if __name__ == "__main__":
    print("per kwartaal", R); print("per maand", per_maand, "3-mnd", drie)
    print("6 mnd", TOT7, "jaar", JAAR_LAAG, JAAR_MID, JAAR_HOOG, "coord gedaan", GEDAAN)
    print("coord/jaar", CJ_L, CJ_H, "wpi pc pm", WPM_L, WPM_H, "min", MIN_L, MIN_H)
    print("uur pc pm", UPM_L, UPM_H, "pj", UPJ_L, UPJ_H, "dir", UDIR_L, UDIR_H, "inrichting", INR_TOT)
INR_OPST = sum(u for _, u, w in INRICHTING if w.startswith("Opsteller"))
INR_QHSE = sum(u for _, u, w in INRICHTING if w.startswith("QHSE"))
INR_HSM = sum(u for _, u, w in INRICHTING if w.startswith("Hoofd"))
INR_INSP = sum(u for _, u, w in INRICHTING if w.startswith("Inspecteurs"))
assert INR_OPST + INR_QHSE + INR_HSM + INR_INSP == INR_TOT
# ---- de proef: alleen wat vóór de start nodig is (4.1, kolom 'Nodig voor de proef' = Ja) plus de zeven proef-WPI's
VOOR_PROEF = {"Skill: proefvelden toevoegen en testen", "Actieoverzicht in de projectmap", "Terugvalformulier",
              "Instructie inspecteurs, opstellen", "Uitleg aan drie inspecteurs (2 uur elk)", "QMS-map voor WPI-rapporten"}
assert VOOR_PROEF <= {o for o, _, _ in INRICHTING}
PROEF_INR = sum(u for o, u, _ in INRICHTING if o in VOOR_PROEF)
PROEF_N = 2 * 3 + 1                                   # 2 coördinatoren x 3 WPI's + directielid 1 (besluit 1)
PROEF_WPI_L, PROEF_WPI_H = PROEF_N * MIN_L / 60, PROEF_N * MIN_H / 60
PROEF_L, PROEF_H = PROEF_INR + PROEF_WPI_L, PROEF_INR + PROEF_WPI_H
# ---- structurele last Hoofd Service & Montage (aannames, per maand; zonder eigen WPI's en acties als actiehouder)
_d0 = dt.date.fromisoformat(min(w["datum"] for w in D["wpis"])); _d1 = dt.date.fromisoformat(D["peildatum"])
MND_DATA = (_d1 - _d0).days / 30.44                    # looptijd van de voorbeelddata in maanden
N_ACT = len(D["acties"]); N_WPI_DATA = len(D["wpis"])
N_ACT_HSM = sum(1 for a in D["acties"] if a["toetser"] == "Hoofd Service & Montage")        # hij toetst
N_ACT_HSM_AH = sum(1 for a in D["acties"] if a["actiehouder"] == "Hoofd Service & Montage")  # hij voert uit
ACT_PER_WPI = N_ACT / N_WPI_DATA
# geschaald naar het geplande aantal WPI's (JAAR_LAAG..JAAR_HOOG per jaar)
WPI_PM_L, WPI_PM_H = JAAR_LAAG / 12, JAAR_HOOG / 12
ACT_PM_L, ACT_PM_H = ACT_PER_WPI * WPI_PM_L, ACT_PER_WPI * WPI_PM_H
TOETS_PM_L, TOETS_PM_H = ACT_PM_L * N_ACT_HSM / N_ACT, ACT_PM_H * N_ACT_HSM / N_ACT
AH_PM_L, AH_PM_H = ACT_PM_L * N_ACT_HSM_AH / N_ACT, ACT_PM_H * N_ACT_HSM_AH / N_ACT
HSM_MIN_PROG = 60          # programma per maand vaststellen en delen (aanname)
HSM_MIN_TOETS = 15         # per getoetste actie: foto of document bekijken, status vastleggen (aanname)
HSM_MIN_OVERLEG_WEEK = 15  # WPI-deel van het maandagoverleg (aanname)
HSM_UUR_TREND_JAAR = 16    # halfjaar- en jaaranalyse samen; de nulmeting zit in de inrichting (aanname)
HSM_LAST = [("Programma vaststellen en delen", HSM_MIN_PROG / 60, HSM_MIN_PROG / 60),
            ("Acties toetsen", TOETS_PM_L * HSM_MIN_TOETS / 60, TOETS_PM_H * HSM_MIN_TOETS / 60),
            ("WPI-deel maandagoverleg", HSM_MIN_OVERLEG_WEEK * 52 / 12 / 60, HSM_MIN_OVERLEG_WEEK * 52 / 12 / 60),
            ("Trendanalyse", HSM_UUR_TREND_JAAR / 12, HSM_UUR_TREND_JAAR / 12)]
HSM_PM_L = sum(l for _, l, _ in HSM_LAST); HSM_PM_H = sum(h for _, _, h in HSM_LAST)
# ---- splitsing: wat VCA 7.1/7.2 hoe dan ook vraagt, en wat deze methode extra kost t.o.v. AMS
# verplicht (ook met AMS): de WPI's volgens het programma per werkplek, toetsing en opvolging van acties, trendanalyse
# extra door de methode: de eenmalige inrichting; of een WPI langer duurt dan in AMS, meet de proef
if __name__ == "__main__":
    print("proef", PROEF_INR, PROEF_WPI_L, PROEF_WPI_H, "| HSM", N_WPI_DATA, N_ACT, N_ACT_HSM, N_ACT_HSM_AH, ACT_PM_L, ACT_PM_H, TOETS_PM_L, TOETS_PM_H, AH_PM_L, AH_PM_H, HSM_LAST, HSM_PM_L, HSM_PM_H, "| inr", INR_OPST, INR_QHSE, INR_HSM)

# ---- licenties (prijzen uit de bronnen in bijlage I, geraadpleegd 12-11-2026; USD, excl. belasting)
TEAM_JR, TEAM_MND = 20, 25          # Claude Team, standard seat, per maand: jaarbetaling / maandbetaling; minimaal 2 seats
COP_JR, COP_PROMO, COP_MND = 21, 18, 25.20   # Microsoft 365 Copilot Business per gebruiker per maand: jaar / actie jaar 1 / maandbetaling
N_PROEF, N_NA = 3, 5
LIC = {
    "team_seat_mnd": TEAM_MND, "team_seat_jaar": TEAM_JR,   # per seat per maand: maand- / jaarbetaling
    "team_proef_jaar": N_PROEF * TEAM_JR * 12, "team_proef_mnd": N_PROEF * TEAM_MND,
    "team_na_jaar": N_NA * TEAM_JR * 12,
    "cop_proef_jaar": N_PROEF * COP_JR * 12, "cop_proef_promo": N_PROEF * COP_PROMO * 12,
    "cop_na_jaar": N_NA * COP_JR * 12, "cop_na_promo": N_NA * COP_PROMO * 12,
}
if __name__ == "__main__":
    print("elke maand", ELKE_L, ELKE_H, ELKE_TOT, "| inr", INR_TOT, PROEF_INR, "| lic", LIC)
GEDAAN_ALL = sum(r["uitgevoerd"] for r in D["programma"] if r["maand"] in MAANDEN)
