import json, os, re, datetime as D
base = '/home/claude/wpi/run/out/dashboard/'
v = json.load(open(base + '../../data/voorbeelddata.json'))
KBRAW = json.load(open(base + '../../data/kennisbank.json'))
KBL = [dict(id=r['id'], code=code, product=p['naam'], klasse=r['klasse'], fase=r['fase'], taak=r['taak'], taakstap=r['taakstap'], risico=r['risico'], maatregelen=' | '.join(r['maatregelen'])) for code, p in KBRAW.items() for r in p['regels']]
kb = {k['id']: k for k in KBL}
W = {w['nr']: w for w in v['wpis']}
out = base + 'data11/'
os.makedirs(out, exist_ok=True)
wpis = []
for w in v['wpis']:
    x = dict(w); x['taken'] = ' | '.join(w['taken']) if isinstance(w['taken'], list) else w['taken']; x['maand'] = w['datum'][:7]
    st = x.pop('getoetste_stappen'); assert w['ingang'] in ('ingepland', 'spontaan')
    x['stappen'] = ' | '.join(g['taak'] + (' › ' + g['taakstap'] if g['taakstap'] else '') for g in st)
    x['n_stappen'] = len(st); x['n_taakstap'] = sum(1 for g in st if g['taakstap']); x['n_taken'] = len({g['taak'] for g in st})
    wpis.append(x)
def verrijk(r, regelnr=None):
    w = W[r['wpi']]; x = dict(r)
    x.update(maand=r['datum'][:7], inspecteur=w['inspecteur'], soort_inspectie=w['soort'], product=w['product'], code=w['code'], fase=w['fase'],
             taak=r.get('taak') or (kb[r['ref']]['taak'] if r['ref'] in kb else ''), taakstap=r.get('taakstap') or '', ingang=w['ingang'])
    if r['ref'] in kb and r.get('taak'): assert kb[r['ref']]['taak'] == r['taak'] and (kb[r['ref']]['taakstap'] or None) == (r.get('taakstap') or None), r
    if regelnr is not None: x['regelnr'] = regelnr
    return x
regels = []
for i, r in enumerate(v['regels']):
    x = verrijk(r, i + 1); x['acties'] = ', '.join(r['acties']) if isinstance(r['acties'], list) else (r['acties'] or '')
    regels.append(x)
acties = [verrijk(a) for a in v['acties']]
projecten = []
for p in v['projecten']:
    x = dict(p); x['fictief'] = True; projecten.append(x)
json.dump(wpis, open(out + 'wpis.json', 'w'), ensure_ascii=False)
json.dump(regels, open(out + 'regels.json', 'w'), ensure_ascii=False)
json.dump(acties, open(out + 'acties.json', 'w'), ensure_ascii=False)
json.dump(projecten, open(out + 'projecten.json', 'w'), ensure_ascii=False)
json.dump(v['programma'], open(out + 'programma.json', 'w'), ensure_ascii=False)
json.dump([{'peildatum': v['peildatum'], 'let_op': v['let_op'], 'versie': str(v['versie']).split()[0]}], open(out + 'peildatum.json', 'w'), ensure_ascii=False)
json.dump(KBL, open(out + 'kennisbank.json', 'w'), ensure_ascii=False)
assert all(r['oordeel'] in ('Conform', 'Afwijking', 'Verbeterpunt', 'Niet van toepassing') for r in regels)
print('versie', v['versie'], len(wpis), len(regels), len(acties), len(projecten))

# ---------- trendacties (fictief voorbeeld), getallen berekend (regels ronde 5) ----------
import collections as C, re
peil = D.date.fromisoformat(v['peildatum']); dd = D.date.fromisoformat
def mend(y, m): return D.date(y + (m == 12), m % 12 + 1, 1) - D.timedelta(days=1)
def wdag(a, b): return sum(1 for i in range((b - a).days + 1) if (a + D.timedelta(i)).weekday() < 5)
pn = lambda s: s.lower().split(' (')[0]
def past(w, p): return w['locatie'] == p['locatie'] and (pn(p['product']).startswith(pn(w['product'])) or pn(w['product']).startswith(pn(p['product'])))
x = y = 0; geen = 0
for p in v['projecten']:
    s_, e = dd(p['start']), dd(p['eind'])
    if s_ > peil: continue
    ws = [dd(w['datum']) for w in v['wpis'] if w['project'] == p['project'] and past(w, p)]
    geen += not ws
    risk = p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']
    if (e - s_).days > 31:
        yy, mm = s_.year, s_.month; eind = min(e, peil)
        while (yy, mm) <= (eind.year, eind.month):
            a = max(s_, D.date(yy, mm, 1)); b = min(e, mend(yy, mm)); ok = any((q.year, q.month) == (yy, mm) for q in ws)
            if wdag(a, b) >= 1 and (ok or b <= peil): y += 1; x += ok   # besluit 8: elke maand waarin gewerkt wordt
            mm += 1
            if mm == 13: yy, mm = yy + 1, 1
    elif risk and (ws or e <= peil): y += 1; x += bool(ws)
pct = round(100 * x / y)
A = v['acties']; R = v['regels']
over = sorted([a for a in A if a['status'] == 'Open' and a['termijn'] < v['peildatum']], key=lambda a: a['termijn'])
oud = (peil - dd(over[0]['termijn'])).days
kort = [a for a in A if a['status'] == 'Afgerond' and a['prioriteit'] == 'kort']
kok = sum((dd(a['afgerond_op']) - dd(a['datum'])).days <= 14 for a in kort)
STOP = set('geen niet door voor werd zijn staat stond hing tijdens binnen daarom alleen blijft wordt naar over onder zonder bovenaan vooraf last gebruikt'.split())
def stems(t): return {w[:6] for w in re.findall('[a-zà-ÿ]+', t.lower()) if len(w) >= 4 and w not in STOP}
par = list(range(len(A)))
def f(i):
    while par[i] != i: par[i] = par[par[i]]; i = par[i]
    return i
for i in range(len(A)):
    for j in range(i + 1, len(A)):
        n = len(stems(A[i]['bevinding']) & stems(A[j]['bevinding']))
        if A[i]['classificatie'] == A[j]['classificatie'] and (n >= 2 or (n >= 1 and A[i]['ref'] == A[j]['ref'])): par[f(i)] = f(j)
grp = C.defaultdict(list)
for i, a in enumerate(A): grp[f(i)].append(a)
def g(woord):
    l = [gg for gg in grp.values() if any(woord in a['bevinding'].lower() for a in gg)]; assert len(l) == 1, woord
    return len(l[0]), len({a['wpi'] for a in l[0]})
hz, sl, hw, ed, mg, gm, gl = g('hijszone'), g('stuurlijn'), g('handenwas'), g('drinken'), g('mangatwacht'), g('gasmeter'), g('geluid')
geluid = [a for a in A if a['bron'] == 'Buiten TRA' and 'lawaai' in a['verbeteractie'] and a['status'] == 'Open']
houders = sorted({a['actiehouder'] for a in geluid}); assert houders == ['Hoofd Service & Montage'], houders
STP = [g for w in v['wpis'] for g in w['getoetste_stappen']]; nst = len(STP); nts = sum(1 for g in STP if g['taakstap'])
zc = C.Counter(g['taak'] for w in v['wpis'] for g in {(x['taak'], x['taakstap']) and x['taak']: x for x in w['getoetste_stappen'] if not x['taakstap']}.values())
assert all('LOTOTO' in g['taak'] for g in STP if g['taakstap'])
zt = sorted([t for t in zc if zc[t] >= 2], key=lambda t: (-zc[t], t))
assert all(not any(k['taakstap'] for k in KBL if k['taak'] == t) for t in zt), zt
idee = [a for a in A if a['bron'] == 'Idee monteurs' and 'gasmeter' in a['bevinding'].lower()][0]['actie']
idee_hw = [a for a in A if a['bron'] == 'Idee monteurs' and 'handenwas' in a['bevinding'].lower()]
HS, WV, DL, C1, C2 = 'Hoofd Service & Montage', 'Werkvoorbereider', 'Directielid (fictief)', 'Coördinator 1 (fictief)', 'Coördinator 2 (fictief)'
ST = '(stand peildatum %s)' % peil.strftime('%d-%m-%Y')
T = [
 dict(nr='TREND-2026-1', onderwerp='Inspectieprogramma per werkplek (VCA 7.1)',
  wat='Het Hoofd S&M stelt elke maand vóór de eerste maandag uit de projectplanning het inspectieprogramma op: per lopend project langer dan een maand één WPI in elke kalendermaand waarin gewerkt wordt, per kort project met hijsen, besloten ruimte of open water ten minste één WPI, van de overige korte projecten één op de vier per kwartaal. Het programma noemt per WPI de inspecteur en een vervanger; projecten zonder WPI en producten zonder WPI krijgen voorrang.',
  aanleiding='%d van %d verplichte WPI’s per werkplek uitgevoerd (%d%%); %d projecten kregen geen enkele WPI %s.' % (x, y, pct, geen, ST),
  doel='Eerste programma (december 2026) vastgesteld uiterlijk 30-11-2026. Vanaf het eerste kwartaal 2027 per kwartaal ten minste 90%% van de verplichte WPI’s per werkplek uitgevoerd (nu %d%%).' % pct,
  actiehouder=HS, toetser=DL, termijn='2026-11-30', controledatum='2027-04-05'),
 dict(nr='TREND-2026-2', onderwerp='Hijsen: communicatie bij lawaai',
  wat='Het Hoofd S&M rondt de %d open TRA-aanvullingen over communicatie bij lawaai af, die op zijn naam staan (%s): het risico komt met de maatregel in de product-TRA’s en de kennisbank. Maatregel: bij hijsen met een mobiele kraan naast draaiende installaties communiceren machinist en aanslager via portofoons met headset; zijn die er niet, dan worden vóór de eerste hijs vaste handseinen afgesproken en in de LMRA vastgelegd. De Werkvoorbereider regelt de portofoons per montagewagen.' % (len(geluid), ', '.join(a['actie'] for a in sorted(geluid, key=lambda a: a['actie']))),
  aanleiding='%d waarnemingen buiten de TRA in %d WPI’s: geluid van een naastgelegen installatie bemoeilijkt de communicatie bij hijsen; de TRA-aanvullingen staan nog open %s.' % (gl[0], gl[1], ST),
  doel='Uiterlijk 14-12-2026: %d van %d TRA-aanvullingen afgerond en getoetst. Eerste halfjaar 2027: bij ten minste 90%% van de WPI’s met hijsen is een communicatieafspraak (portofoon of handseinen) in de LMRA Conform waargenomen.' % (len(geluid), len(geluid)),
  actiehouder=HS, toetser=DL, termijn='2026-12-14', controledatum='2027-07-05'),
 dict(nr='TREND-2026-3', onderwerp='Achterstand acties wegwerken',
  wat='Het directielid bespreekt in het coördinatorenoverleg van 16-11-2026 de %d acties over de termijn met de actiehouders en legt per actie vast: afronden en laten toetsen uiterlijk 14-12-2026, of een nieuwe haalbare termijn met reden. Daarna gaat een actie die meer dan 14 dagen over de termijn is naar de directie.' % len(over),
  aanleiding='%d open acties over de termijn, de oudste %d dagen (%s); van de afgeronde acties met prioriteit kort was %d van %d binnen 14 dagen klaar %s.' % (len(over), oud, over[0]['actie'], kok, len(kort), ST),
  doel='Op 14-12-2026 heeft elke actie die over de termijn is een besluit (afgerond of nieuwe termijn met reden). In het eerste kwartaal 2027 is ten minste 80%% van de acties met prioriteit kort binnen 14 dagen afgerond en getoetst (nu %d van %d).' % (kok, len(kort)),
  actiehouder=DL, toetser=C2, termijn='2026-12-14', controledatum='2027-04-05'),
 dict(nr='TREND-2026-4', onderwerp='Hijsen: hijszone en stuurlijn (terugkerend)',
  wat='Hijszone afzetten en stuurlijn klaarleggen worden twee vaste afvinkpunten in de hijs-LMRA vóór de eerste hijs; de Werkvoorbereider past het LMRA-formulier aan en bespreekt het in een toolbox met alle ploegen.',
  aanleiding='Terugkerende bevindingen: hijszone niet volledig afgezet %d× in %d WPI’s en geen stuurlijn %d× in %d WPI’s, ook nadat eerdere acties waren afgerond %s.' % (hz + sl + (ST,)),
  doel='LMRA-formulier aangepast en toolbox gegeven uiterlijk 15-01-2027. Eerste halfjaar 2027: bij ten minste 90% van de WPI’s met hijsen zijn hijszone en stuurlijn Conform waargenomen.',
  actiehouder=WV, toetser=HS, termijn='2027-01-15', controledatum='2027-07-05'),
 dict(nr='TREND-2026-5', onderwerp='Hygiëne bij afvalwater en slib (terugkerend)',
  wat='Elke montagewagen krijgt een vaste hygiënepost (water, zeep, wegwerpdoekjes) als vaste uitrusting op de voorraadlijst' + (' (idee monteurs, actie ' + idee_hw[0]['actie'] + ')' if idee_hw else '') + '; de LMRA wijst bij werk aan afvalwater en slib een plek buiten de werkzone aan om te wassen, eten en drinken.',
  aanleiding='Terugkerende bevindingen: geen handenwasgelegenheid %d× in %d WPI’s en eten of drinken in de werkzone %d× in %d WPI’s %s.' % (hw + ed + (ST,)),
  doel='Uiterlijk 15-01-2027 een hygiënepost in elke montagewagen. Eerste halfjaar 2027: bij ten minste 90% van de WPI’s bij afvalwater en slib zijn de hygiënepost en een eet- en drinkplek buiten de werkzone Conform waargenomen.',
  actiehouder=WV, toetser=HS, termijn='2027-01-15', controledatum='2027-07-05'),
 dict(nr='TREND-2026-6', onderwerp='Besloten ruimte: vrijgave, gasmeter en mangatwacht',
  wat='Vóór het betreden van een put of inlaatkanaal legt de ploeg in de LMRA de vrijgavemeting met de 4-gasmeter en de naam van de mangatwacht vast; zonder mangatwacht wordt niet betreden. De gasmeter gaat mee op werkhoogte: elke 4-gasmeter krijgt een klem of karabijn (idee monteurs, actie %s).' % idee,
  aanleiding='Terugkerende bevindingen: gasmeter niet op werkhoogte %d× in %d WPI’s en geen mangatwacht %d× in %d WPI’s %s.' % (gm + mg + (ST,)),
  doel='Uiterlijk 15-01-2027 LMRA aangepast en klemmen bij alle gasmeters. Eerste halfjaar 2027: bij elke WPI met een besloten ruimte zijn vrijgavemeting, gasmeter op werkhoogte en mangatwacht Conform waargenomen.',
  actiehouder=WV, toetser=HS, termijn='2027-01-15', controledatum='2027-07-05'),
 dict(nr='TREND-2026-7', onderwerp='Toetsen op taakstap: taakstappen in de TRA’s',
  wat='De Werkvoorbereider vult in de product-TRA’s de taakstappen aan bij de taken die het vaakst getoetst worden en nu alleen op taakniveau in de TRA staan (%s); de kennisbank en de WPI-skill nemen ze over, zodat de inspecteur per taakstap alleen de maatregelen van die stap ziet. Het toetsniveau (taak of taakstap) blijft een keuze van Noardling; dit is een voorstel.' % ', '.join(zt),
  aanleiding='Getoetst in %d WPI’s: %d taken · %d taakstappen. De taakstappen zijn alle LOTOTO; de taken zijn alleen op taakniveau getoetst, omdat de gegeneraliseerde bron-TRA daar geen taakstap kent; %d van %d kennisbankregels hebben er een %s.' % (len(v['wpis']), nst - nts, nts, sum(1 for k in KBL if k['taakstap']), len(KBL), ST),
  doel='Uiterlijk 31-03-2027 taakstappen in de TRA’s van de %d genoemde taken. Tweede kwartaal 2027: ten minste 80%% van wat getoetst wordt per taakstap getoetst (nu %d taken · %d taakstappen, %d%%).' % (len(zt), nst - nts, nts, round(100 * nts / nst)),
  actiehouder=WV, toetser=HS, termijn='2027-03-31', controledatum='2027-07-05'),
]
for t in T: t.update(status='Open', voortgang='', fictief=True)
for t in T:
    for k in ('termijn', 'controledatum'): assert dd(t[k]) > peil
    assert t['actiehouder'] != t['toetser'] and 'QHSE' not in t['actiehouder']
json.dump(T, open(out + 'trendacties.json', 'w'), ensure_ascii=False, indent=0)
print('pw', x, y, pct, 'geen', geen, 'groepen', hz, sl, hw, ed, mg, gm, gl, 'kort', kok, len(kort), 'stappen', nst, nts, zt)
