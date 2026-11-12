# Legt elke zin van "In twee minuten" en de conclusie naast een onafhankelijke Python-berekening (geen getallen uit de pagina).
import json, re, datetime as D, collections as C, asyncio, sys
from playwright.async_api import async_playwright
d = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json')); kb = json.load(open('/home/claude/wpi/run/out/dashboard/data11/kennisbank.json'))
W, R, A, PG, P = d['wpis'], d['regels'], d['acties'], d['programma'], d['projecten']; peil = d['peildatum']; dd = D.date.fromisoformat
WI = {w['nr']: w for w in W}
def nl(v, k=0):
    s = f'{v:,.{k}f}'; return s.replace(',', 'X').replace('.', ',').replace('X', '.')
MND = 'jan feb mrt apr mei jun jul aug sep okt nov dec'.split()
mnd = lambda m: MND[int(m[5:7]) - 1] + ' ' + m[:4]
dat = lambda s: s[8:10] + '-' + s[5:7] + '-' + s[:4]
meer = lambda n, e, m: nl(n) + ' ' + (e if n == 1 else m)
pc = lambda a, b: round(100 * a / b + 1e-9) if b else 0
r1 = lambda x: round(x * 10 + 1e-9) / 10
NEG = lambda r: r['oordeel'] in ('Afwijking', 'Verbeterpunt'); WAAR = lambda r: r['oordeel'] in ('Conform', 'Afwijking', 'Verbeterpunt')
assert {r['oordeel'] for r in R} <= {'Conform', 'Afwijking', 'Verbeterpunt', 'Niet van toepassing'}
maand = lambda r: r['datum'][:7]
KL = ['Arbeidsmiddelen en keuring', 'Besloten ruimte en gas', 'Documenten en voorbereiding', 'Fysieke belasting', 'Gedrag en werkwijze', 'Gevaarlijke stoffen en hygiëne', 'Hijsen', 'Milieu', 'Noodvoorzieningen', 'Omgeving en afzetting', 'Orde en netheid', 'PBM', 'Veiligstellen-LOTOTO', 'Werken op hoogte of bij water']
DIRS = 'VGM-inspectie directie'; dirn = {w['inspecteur'] for w in W if w['soort'] == DIRS}
ms = sorted({maand(w) for w in W}); van = ms[0]
V = {}
waar = [r for r in R if WAAR(r)]; conf = sum(r['oordeel'] == 'Conform' for r in R)
V['conf_pct'], V['conform'], V['waar'] = pc(conf, len(waar)), conf, len(waar)
cg = [p for p in PG if p['inspecteur'] not in dirn]; dg = [p for p in PG if p['inspecteur'] in dirn]
V['c_uitg'], V['c_gepl'], V['d_uitg'], V['d_gepl'] = sum(p['uitgevoerd'] for p in cg), sum(p['gepland'] for p in cg), sum(p['uitgevoerd'] for p in dg), sum(p['gepland'] for p in dg)
q = lambda m: 'Q%d %s' % ((int(m[5:7]) + 2) // 3, m[:4])
def qs():
    out = []; y, m = int(van[:4]), int(van[5:7])
    while (y, m) <= (int(peil[:4]), int(peil[5:7])):
        k = q('%d-%02d' % (y, m)); out.append(k) if k not in out else None; y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out
def kwm(k): y, n = k[3:], int(k[1]); return ['%s-%02d' % (y, (n - 1) * 3 + i) for i in (1, 2, 3)]
def vol(k): m = kwm(k); return m[0] >= van and m[2] < peil[:7]
Q = qs(); V['dir_ok'] = len({q(maand(w)) for w in W if w['soort'] == DIRS} & set(Q)); V['dir_tot'] = len(Q)
# programma per werkplek (eigen implementatie van de regel)
def mend(y, m): return D.date(y + (m == 12), m % 12 + 1, 1) - D.timedelta(days=1)
def wdg(a, b): return sum(1 for i in range((b - a).days + 1) if (a + D.timedelta(i)).weekday() < 5)
pn = lambda s: s.lower().split(' (')[0]
past = lambda w, p: w['locatie'] == p['locatie'] and (pn(p['product']).startswith(pn(w['product'])) or pn(w['product']).startswith(pn(p['product'])))
ob = []; P0 = dd(peil)
for p in P:
    s_, e = dd(p['start']), dd(p['eind'])
    if s_ > P0: continue
    ws = [dd(w['datum']) for w in W if w['project'] == p['project'] and past(w, p)]
    if (e - s_).days > 31:
        y, m = s_.year, s_.month; eind = min(e, P0)
        while (y, m) <= (eind.year, eind.month):
            a, b = max(s_, D.date(y, m, 1)), min(e, mend(y, m)); ok = any((x.year, x.month) == (y, m) for x in ws)
            if wdg(a, b) >= 10: ob.append(('lang', '%d-%02d' % (y, m), ok, ok or b <= P0))
            y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    elif p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']:
        ob.append(('risico', (min(ws) if ws else min(e, P0)).strftime('%Y-%m'), bool(ws), bool(ws) or e <= P0))
tel = [o for o in ob if o[3]]
V['pw_x'], V['pw_y'] = sum(o[2] for o in tel), len(tel); V['pw_pct'] = pc(V['pw_x'], V['pw_y'])
for c in ('lang', 'risico'): t = [o for o in tel if o[0] == c]; V['pw_%s_x' % c], V['pw_%s_y' % c] = sum(o[2] for o in t), len(t)
V['pw_overig_n'] = sum(1 for p in P if (dd(p['eind']) - dd(p['start'])).days <= 31 and not (p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']))
geen = [p['project'].replace(' (fictief)', '') for p in P if dd(p['start']) <= P0 and not any(w['project'] == p['project'] and past(w, p) for w in W)]
V['pw_geen'] = len(geen); V['pw_geen_t'] = ', '.join(geen)
V['pw_lm_ok'] = sum(1 for o in ob if o[1] == peil[:7] and o[2]); V['pw_lop'] = sum(1 for o in ob if not o[3]); V['lm'] = mnd(peil[:7])
kl = {c: (sum(NEG(r) for r in R if r['classificatie'] == c), sum(WAAR(r) for r in R if r['classificatie'] == c)) for c in KL + sorted({r['classificatie'] for r in R} - set(KL))}
aant = sorted([c for c in kl if kl[c][0]], key=lambda c: (-kl[c][0], c)); aand = sorted([c for c in kl if kl[c][0] and kl[c][1] >= 5], key=lambda c: (-kl[c][0] / kl[c][1], -kl[c][0], c))
ties = lambda l, k, f: [x for i, x in enumerate(l) if i < k or (len(l) >= k and f(x) == f(l[k - 1]))]
V['risk_a_t'], V['risk_a'], V['risk_a_y'] = aand[0], kl[aand[0]][0], kl[aand[0]][1]; V['risk_c_t'], V['risk_c'] = aant[0], kl[aant[0]][0]
V['top_aantal'] = ', '.join('%s (%d)' % (c, kl[c][0]) for c in ties(aant, 3, lambda c: kl[c][0]))
V['top_aandeel'] = ', '.join('%s %d%% (%d van %d)' % (c, pc(*kl[c]), *kl[c]) for c in ties(aand, 3, lambda c: kl[c][0] / kl[c][1]))
V['klein'] = ', '.join('%s (%s)' % (c, meer(kl[c][1], 'waarneming', 'waarnemingen')) for c in kl if 0 < kl[c][1] < 5) or 'geen'
op = [a for a in A if a['status'] == 'Open']; kl_ = [a for a in A if a['status'] == 'Afgerond']; ov = sorted([a for a in op if a['termijn'] < peil], key=lambda a: a['termijn'])
V['over'], V['over_oudste'], V['over_oudste_t'] = len(ov), (P0 - dd(ov[0]['termijn'])).days, ov[0]['actie']
tr = json.load(open('/home/claude/wpi/run/out/dashboard/data11/trendacties.json'))
V['trend_pw'] = [t['nr'] for t in tr if 'programma' in t['onderwerp'].lower()][0]; V['trend_n'] = len(tr)
nxt = P0 + D.timedelta(days=1)
while nxt.weekday() != 0: nxt += D.timedelta(days=1)
V['overleg'] = nxt.strftime('%d-%m-%Y')
# terugkerend (eigen implementatie)
STOP = set('geen niet door voor werd zijn staat stond hing tijdens binnen daarom alleen blijft wordt naar over onder zonder bovenaan vooraf last gebruikt'.split())
st = lambda t: {w[:6] for w in re.findall('[a-zà-ÿ]+', t.lower()) if len(w) >= 4 and w not in STOP}
par = list(range(len(A)))
def f(i):
    while par[i] != i: i = par[i]
    return i
for i in range(len(A)):
    for j in range(i + 1, len(A)):
        n = len(st(A[i]['bevinding']) & st(A[j]['bevinding']))
        if A[i]['classificatie'] == A[j]['classificatie'] and (n >= 2 or (n and A[i]['ref'] == A[j]['ref'])): par[f(i)] = f(j)
G = C.defaultdict(list)
for i, a in enumerate(A): G[f(i)].append(a)
zp = lambda t: t[:-1] if t.endswith('.') else t
def lab(g): c = C.Counter(zp(a['bevinding']) for a in g); return sorted(c, key=lambda t: (-c[t], len(t), t))[0]
rec = sorted([g for g in G.values() if len({a['wpi'] for a in g}) > 1], key=lambda g: (-len(g), -len({a['wpi'] for a in g}), lab(g)))
V['herh_n'], V['herh_acties'] = len(rec), sum(map(len, rec)); V['acties'] = len(A)
V['herh_top'] = '; '.join('%s (%d× in %s)' % (lab(g), len(g), meer(len({a['wpi'] for a in g}), 'WPI', 'WPI’s')) for g in ties(rec, 3, len))
V['herh_terug'] = sum(any(a['afgerond_op'] and any(a['afgerond_op'] < b['datum'] for b in g) for a in g) for g in rec)
wpm = [sum(maand(w) == m for w in W) for m in ms]
V['wpis'], V['maanden'], V['wpm_min'], V['wpm_max'] = len(W), len(ms), min(wpm), max(wpm)
# kwartalen
def kwn(k):
    if vol(k): return k
    m = [x for x in kwm(k) if van <= x <= peil[:7]]; e = peil if m[-1] == peil[:7] else '%s-%02d' % (m[-1], mend(int(m[-1][:4]), int(m[-1][5:7])).day)
    return '%s (%s t/m %s, onvolledig)' % (k, dat(m[0] + '-01')[:5], dat(e)[:5])
kwt = []
for k in Q:
    rr = [r for r in R if q(maand(r)) == k]; w = len({r['wpi'] for r in rr}); kwt.append('%s: %s per WPI (%s)' % (kwn(k), nl(sum(map(NEG, rr)) / w, 1), meer(w, 'WPI', 'WPI’s')))
nv = sum(vol(k) for k in Q)
V['kw'] = ' · '.join(kwt); V['richting'] = ('Met %s is er nog geen richting vast te stellen; dat kan pas vanaf vier volledige kwartalen.' % meer(nv, 'volledig kwartaal', 'volledige kwartalen')) if nv < 4 else 'Over de laatste vier volledige kwartalen is het verloop hierboven te lezen; vergelijk het met dezelfde kwartalen van vorig jaar.'
gm = [p for p in PG if p['uitgevoerd'] < p['gepland']]
V['gepland'], V['uitgevoerd'] = sum(p['gepland'] for p in PG), sum(p['uitgevoerd'] for p in PG); V['gemist'] = '; '.join(mnd(p['maand']) + ' – ' + p['inspecteur'] for p in gm) or 'geen'
tra = [r for r in R if r['soort'] == 'TRA']; wt = [r for r in tra if WAAR(r)]
V['tra_toets'], V['tra_uniek'], V['tra_neg'], V['tra_neg_uniek'] = len(wt), len({r['ref'] for r in wt}), sum(map(NEG, tra)), len({r['ref'] for r in tra if NEG(r)})
rg = C.defaultdict(lambda: [0, 0])
for r in wt: rg[r['ref']][1] += 1; rg[r['ref']][0] += NEG(r)
hr = sorted([k for k in rg if rg[k][0] > 1], key=lambda k: (-rg[k][0], k)); V['tra_herh_n'] = len(hr); V['tra_herh'] = ', '.join('%s (%d van %d)' % (k, *rg[k]) for k in hr) or 'geen'
# momentopname (eigen berekening uit getoetste_stappen in de brondata, niet uit de gebouwde wpis.json)
ST = {w['nr']: w['getoetste_stappen'] for w in W}
V['stappen'] = sum(len(x) for x in ST.values()); V['stap_ts'] = sum(1 for x in ST.values() for g in x if g['taakstap']); V['stap_pct'] = pc(V['stap_ts'], V['stappen'])
V['stap_gem'] = nl(r1(V['stappen'] / len(W)), 1); V['stap_min'] = min(len(x) for x in ST.values()); V['stap_max'] = max(len(x) for x in ST.values())
V['een_taak'] = sum(len({g['taak'] for g in x}) == 1 for x in ST.values())
tc = C.Counter(t for x in ST.values() for t in {g['taak'] for g in x}); tco = sorted(tc, key=lambda t: (-tc[t], t))
V['taken_uniek'] = len(tc); V['taak_top'] = tc[tco[0]]; V['taak_top_t'] = ', '.join(t for t in tco if tc[t] == tc[tco[0]])
sp = [w['nr'] for w in W if w['ingang'] == 'spontaan']; V['spontaan'], V['spontaan_t'], V['ingepland'] = len(sp), ', '.join(sp), len(W) - len(sp)
V['g_alg'], V['g_tra'], V['g_bui'] = [sum(1 for r in R if r['soort'] == so and WAAR(r)) for so in ('Algemeen', 'TRA', 'Buiten TRA')]
V['nvt'] = sum(r['oordeel'] == 'Niet van toepassing' for r in R)
bt = C.Counter(r['omschrijving'] for r in R if r['soort'] == 'Buiten TRA'); btk = sorted(bt, key=lambda k: (-bt[k], k))
V['buiten'], V['buiten_ond'], V['buiten_top_t'], V['buiten_top'] = sum(bt.values()), len(bt), btk[0], bt[btk[0]]
duur = lambda a: (dd(a['afgerond_op']) - dd(a['datum'])).days; pr = lambda p: [a for a in kl_ if a['prioriteit'] == p]
V['open'], V['afgerond'], V['telaat'] = len(op), len(kl_), sum(a['afgerond_op'] > a['termijn'] for a in kl_)
V['dir_norm_ok'], V['dir_norm_n'] = sum(duur(a) <= 0 for a in pr('direct')), len(pr('direct'))
V['kort_gem'] = nl(r1(sum(map(duur, pr('kort'))) / len(pr('kort'))), 1); V['kort_ok'], V['kort_n'] = sum(duur(a) <= 14 for a in pr('kort')), len(pr('kort'))
V['plan_ok'], V['plan_n'] = sum(a['afgerond_op'] <= a['termijn'] for a in pr('planmatig')), len(pr('planmatig'))
ok_ = [(P0 - dd(a['datum'])).days for a in op if a['prioriteit'] == 'kort']; V['open_kort_n'], V['open_kort_gem'], V['open_kort_max'] = len(ok_), nl(r1(sum(ok_) / len(ok_)), 1), max(ok_)
for b, k in (('Inspectie', 'bron_insp'), ('Buiten TRA', 'bron_buiten'), ('Idee monteurs', 'bron_idee')): V[k] = sum(a['bron'] == b for a in A)
for p_, fl in (('c', lambda w: w['soort'] != DIRS), ('d', lambda w: w['soort'] == DIRS)):
    rr = [r for r in R if fl(WI[r['wpi']])]; w = len({r['wpi'] for r in rr})
    V[p_ + '_wpis'], V[p_ + '_neg'], V[p_ + '_mpw'] = w, nl(r1(sum(map(NEG, rr)) / w), 1), nl(r1(sum(map(WAAR, rr)) / w), 1)
    ws = [x for x in W if fl(x)]; V[p_ + '_spw'] = nl(r1(sum(len(x['getoetste_stappen']) for x in ws) / len(ws)), 1); V[p_ + '_tk'] = sum(1 for x in ws for g in x['getoetste_stappen'] if not g['taakstap']); V[p_ + '_ts'] = sum(1 for x in ws for g in x['getoetste_stappen'] if g['taakstap']); V[p_ + '_spo'] = sum(x['ingang'] == 'spontaan' for x in ws); V[p_ + '_rpw'] = nl(len(rr) / w, 1)
V['afw'], V['verb'] = sum(r['oordeel'] == 'Afwijking' for r in R), sum(r['oordeel'] == 'Verbeterpunt' for r in R)
V['regels'] = len(R)
v = V
VERWACHT = [
 f"{v['conf_pct']}% van wat de inspecteurs zagen was Conform ({v['conform']} van {v['waar']} waarnemingen). De coördinatoren deden {v['c_uitg']} van hun {v['c_gepl']} maandelijkse WPI’s; de directie deed {v['d_uitg']} van {v['d_gepl']} en inspecteerde in {v['dir_ok']} van de {v['dir_tot']} kwartalen.",
 f"Per werkplek is maar {v['pw_x']} van de {v['pw_y']} verplichte WPI’s gedaan ({v['pw_pct']}%); {v['pw_geen']} projecten kregen geen enkele WPI. Inhoudelijk: hoogste aandeel afwijkingen bij {v['risk_a_t']} ({v['risk_a']} van {v['risk_a_y']}), meeste bij {v['risk_c_t']} ({v['risk_c']}).",
 f"Laat het Hoofd S&M voortaan elke maand het inspectieprogramma opstellen uit de projectplanning ({v['trend_pw']}). {v['over']} acties staan over de termijn (oudste {v['over_oudste']} dagen) en {v['herh_n']} bevindingen kwamen terug. Stel op {v['overleg']} de {v['trend_n']} trendacties vast.",
 f"Kleine aantallen. Dit zijn {v['wpis']} WPI’s ({v['ingepland']} ingepland, {v['spontaan']} spontaan) in {v['maanden']} maanden ({v['wpm_min']} tot {v['wpm_max']} per maand). Elke WPI is een momentopname: alleen wat de inspecteur zag, staat erin. Verschillen tussen maanden, inspecteurs en klassen zijn een signaal om op te letten, geen bewezen trend. Onderstreepte getallen openen de onderliggende regels.",
 f"Gegevens. {v['wpis']} WPI’s met {v['regels']} vastgelegde regels: alleen wat de inspecteur zag. Waarnemingen {v['waar']} ({v['g_tra']} TRA-regels · {v['g_alg']} onderwerpen · {v['g_bui']} buiten TRA): Conform {v['conform']}, Afwijking {v['afw']}, Verbeterpunt {v['verb']}; daarnaast {v['nvt']} regels expliciet niet van toepassing. Wat niet gezien is, staat er niet in.",
 f"Kleine aantallen. {v['wpm_min']} tot {v['wpm_max']} WPI’s per maand, {v['d_wpis']} directie-inspecties. Klassen met minder dan 5 waarnemingen zijn te klein voor een conclusie: {v['klein']}.",
 f"Per kwartaal (afwijkingen en verbeterpunten per WPI): {v['kw']}. {v['richting']}",
 f"Programma per werkplek (VCA 7.1). {v['pw_x']} van {v['pw_y']} verplichte WPI’s uitgevoerd ({v['pw_pct']}%): projecten langer dan een maand {v['pw_lang_x']} van {v['pw_lang_y']}, korte projecten met risicokenmerk {v['pw_risico_x']} van {v['pw_risico_y']}; overige korte projecten in de planning: {v['pw_overig_n']}. Geen enkele WPI bij {v['pw_geen']} projecten: {v['pw_geen_t']}. Lopende maand ({v['lm']}): gehaald {v['pw_lm_ok']}, nog niet gehaald {v['pw_lop']} (die tellen pas mee als de maand voorbij is). Hier zit het grootste gat met VCA 7.1.",
 f"Inzet per inspecteur (ondergrens). {v['uitgevoerd']} van {v['gepland']} geplande WPI’s uitgevoerd: coördinatoren {v['c_uitg']} van {v['c_gepl']}, directie {v['d_uitg']} van {v['d_gepl']}; niet uitgevoerd: {v['gemist']}. Directie-inspectie in {v['dir_ok']} van de {v['dir_tot']} kwartalen. Dit zegt niets over de dekking per werkplek.",
 f"Terugkerende bevindingen. {v['herh_n']} bevindingen kwamen in meer dan één WPI terug, samen {v['herh_acties']} van de {v['acties']} acties; het vaakst: {v['herh_top']}. {v['herh_terug']} daarvan kwamen terug nadat een eerdere actie al was afgerond: per WPI afronden lost ze niet op. De trendacties pakken ze daarom bij de bron aan (LMRA, uitrusting van de montagewagen). Bevindingen met een andere formulering maar dezelfde klasse en dezelfde kernwoorden zijn samengenomen.",
 f"Zwaartepunt. Meeste afwijkingen en verbeterpunten in aantal: {v['top_aantal']}. Hoogste aandeel van de waarnemingen in de klasse (bij minstens 5 waarnemingen): {v['top_aandeel']}.",
 f"TRA-toetsing. {v['tra_toets']} toetsingen van {v['tra_uniek']} unieke TRA-regels. Daarvan {v['tra_neg']} toetsingen met een afwijking of verbeterpunt, verdeeld over {v['tra_neg_uniek']} unieke regels. In meer dan één WPI afwijkend ({v['tra_herh_n']} regels, gelijke stand): {v['tra_herh']}.",
 f"Momentopname: wat is getoetst. Getoetst in {v['wpis']} WPI’s: {v['stappen'] - v['stap_ts']} taken · {v['stap_ts']} taakstappen (een taak op taakniveau waar de TRA geen taakstap kent, anders per taakstap). {v['een_taak']} WPI’s toetsten één taak; samen gaat het om {v['taken_uniek']} verschillende taken uit de product-TRA’s, het vaakst {v['taak_top_t']} ({v['taak_top']} WPI’s). Ingang: {v['ingepland']} ingepland, {v['spontaan']} spontaan ({v['spontaan_t']}).",
 f"Buiten TRA. {v['buiten']} waarnemingen over {v['buiten_ond']} onderwerpen, het vaakst: {v['buiten_top_t']} ({v['buiten_top']}). Elke waarneming heeft een actie om de TRA aan te vullen.",
 f"Acties. {v['acties']} acties: {v['open']} open, waarvan {v['over']} over de termijn (oudste {v['over_oudste']} dagen, {v['over_oudste_t']}); {v['afgerond']} afgerond na toetsing, waarvan {v['telaat']} na de termijn. Tegenover de norm: direct {v['dir_norm_ok']} van {v['dir_norm_n']} dezelfde dag; kort (norm 14 dagen) gemiddeld {v['kort_gem']} dagen, {v['kort_ok']} van {v['kort_n']} binnen de norm (alleen afgeronde acties en daardoor te gunstig: {v['open_kort_n']} open acties met prioriteit kort zijn gemiddeld {v['open_kort_gem']} dagen oud, de oudste {v['open_kort_max']}); planmatig {v['plan_ok']} van {v['plan_n']} binnen de eigen termijn. Bron: {v['bron_insp']} inspectie, {v['bron_buiten']} buiten de TRA, {v['bron_idee']} idee van monteurs.",
 f"Coördinator tegenover directie. {v['c_neg']} tegenover {v['d_neg']} afwijkingen en verbeterpunten per WPI; waarnemingen per WPI {v['c_mpw']} tegenover {v['d_mpw']}; getoetst {v['c_tk']} taken · {v['c_ts']} taakstappen tegenover {v['d_tk']} taken · {v['d_ts']} taakstappen. Bij {v['d_wpis']} directie-inspecties bepaalt één WPI het gemiddelde sterk.",
]
sp_ = lambda a, b: nl(100 * a / b) + '%'
TIL = {'waar': v['waar'], 'g_tra': v['g_tra'], 'g_alg': v['g_alg'], 'g_bui': v['g_bui'], 'nvt': v['nvt'], 'pos': v['conform'], 'pos_pct': pc(v['conform'], v['waar']), 'neg': v['afw'] + v['verb'], 'afw': v['afw'], 'verb': v['verb'],
       'ing': v['ingepland'], 'spo': v['spontaan']}
TIL = {k: (str(x) + '%' if k == 'pos_pct' else x if isinstance(x, str) else nl(x)) for k, x in TIL.items()}
TIL['getoetst'] = nl(v['stappen'] - v['stap_ts']) + ' · ' + nl(v['stap_ts'])
for p_ in 'cd':
    for k in ('wpis', 'mpw', 'tk', 'ts', 'spo', 'neg', 'rpw'): TIL[p_ + '_' + k] = str(v[p_ + '_' + k])
KOP = {'mom': f"{v['wpis']} WPI’s · getoetst: {v['stappen'] - v['stap_ts']} taken · {v['stap_ts']} taakstappen · {v['waar']} waarnemingen · {v['ingepland']} ingepland, {v['spontaan']} spontaan",
       'taken': f"{v['taken_uniek']} verschillende taken getoetst; {v['een_taak']} van de {v['wpis']} WPI’s toetsten één taak; vaakst: {tco[0]} ({v['taak_top']} WPI’s)",
       'ingang': f"Ingang: {v['ingepland']} ingepland (uit het programma), {v['spontaan']} spontaan ({v['spontaan_t']}). Een spontane WPI telt mee voor het programma als hij op een verplichte werkplek en maand valt."}
TR7 = f"Getoetst in {v['wpis']} WPI’s: {v['stappen'] - v['stap_ts']} taken · {v['stap_ts']} taakstappen."
fout_x = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(); await pg.goto('file:///home/claude/wpi/run/out/dashboard/test/light.html'); await pg.wait_for_timeout(300)
        z = await pg.evaluate("[...document.querySelectorAll('#boodschappen .w-msg p, #boodschappen .w-let, #conclusie li')].map(e=>e.textContent.replace(/\\s+/g,' ').trim())")
        til = await pg.evaluate("Object.fromEntries([...document.querySelectorAll('[data-draw=t]')].map(e=>[e.dataset.t,e.textContent]))")
        kop = await pg.evaluate("Object.fromEntries([...document.querySelectorAll('[data-draw=m]')].map(e=>[e.dataset.m,e.textContent]))")
        tr = await pg.evaluate("document.querySelector('#trendacties').textContent")
        await b.close()
    for k, x in TIL.items():
        if til.get(k) != x: print('TEGEL', k, 'pagina', til.get(k), 'verwacht', x); fout_x.append(k)
    for k, x in KOP.items():
        if kop.get(k) != x: print('KOP', k, '\n pagina :', kop.get(k), '\n verwacht:', x); fout_x.append(k)
    if TR7 not in tr: print('TREND-7 aanleiding niet gevonden:', TR7); fout_x.append('tr7')
    print('tegels/tabel gecontroleerd:', len(TIL), 'koppen:', len(KOP), 'extra verschillen:', len(fout_x))
    fout = 0
    for i, (pz, vz) in enumerate(zip(z, VERWACHT)):
        if pz != vz: fout += 1; print('VERSCHIL', i, '\n PAGINA :', pz, '\n VERWACHT:', vz)
    print('zinnen gecontroleerd:', len(VERWACHT), 'op pagina:', len(z), 'verschillen:', fout)
    sys.exit(1 if fout or fout_x or len(z) != len(VERWACHT) else 0)
asyncio.run(main())
