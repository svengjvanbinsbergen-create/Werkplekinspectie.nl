import json,random,datetime,sys
random.seed(8)
D=sys.argv[1]; p=D+'/voorbeelddata.json'; d=json.load(open(p))
K='WPI-20261105-DAM-C2'
PAIRS={'Hijsen':[("Hijszone niet volledig afgezet tijdens het hijsen.","Hijszone volledig afzetten met hekwerk of lint vóór elke hijs; afzetting opnemen in de LMRA."),("Geen stuurlijn gebruikt bij het begeleiden van de last.","Stuurlijnen in elke montagewagen leggen en het gebruik instrueren bij het start-werkoverleg."),("Hijsplan niet vooraf doorgenomen met de ploeg.","Hijsplan met gewicht en zwaartepunt vooraf doornemen bij het start-werkoverleg en aftekenen.")],
'Gevaarlijke stoffen en hygiëne':[("Geen handenwasgelegenheid bij de werkplek.","Handenwasset (water, zeep, papier) vast in elke montagewagen en op de voorraadlijst."),("Eten of drinken in de werkzone.","Hygiëneregels opnieuw instrueren in een toolbox; pauzeplek buiten de afzetting aanwijzen."),("Geen gelaatsbescherming gedragen bij spatgevaar.","Gelaatsschermen aanvullen in de montagewagens en het dragen bij afspuiten instrueren.")],
'Besloten ruimte en gas':[("Gasmeter niet op werkhoogte gedragen.","Gasmeter op werkhoogte dragen; opnemen in de instructie besloten ruimte."),("Geen mangatwacht aanwezig bij het betreden.","Mangatwacht verplicht stellen vóór betreden; werkvergunning besloten ruimte controleren bij start.")],
'Veiligstellen-LOTOTO':[("Alleen het slot van de opdrachtgever geplaatst; eigen slot ontbrak.","Eigen LOTOTO-slot en slotenvermeerderaar in elke montagewagen; plaatsen controleren in de LMRA.")],
'Arbeidsmiddelen en keuring':[("Arbeidsmiddel met verlopen keuringsdatum in gebruik.","Arbeidsmiddel uit gebruik nemen en laten keuren; keuringslijst van de montagewagen bijwerken.")],
'Documenten en voorbereiding':[("TRA of VGM-projectplan niet actueel op locatie; LMRA niet aantoonbaar.","Actuele TRA en VGM-projectplan in de projectmap op locatie leggen; LMRA vóór aanvang aantoonbaar uitvoeren.")],
'PBM':[("Voorgeschreven PBM niet of niet goed gedragen.","Ontbrekende PBM aanvullen en het dragen bespreken met de ploeg.")],
'Orde en netheid':[("Materiaal en gereedschap in de looproute.","Looproutes vrijmaken en een vaste opslagplek buiten de werkzone aanwijzen.")],
'Gedrag en werkwijze':[("Werkwijze wijkt af van de afgesproken methode.","Afgesproken werkwijze uit de TRA doornemen met de ploeg en vastleggen in het start-werkoverleg.")],
'Werken op hoogte of bij water':[("Open bassin zonder randbeveiliging of afzetting.","Randbeveiliging of afzetting plaatsen bij open bassin; reddingsmiddelen binnen handbereik.")],
'Omgeving en afzetting':[("Werkplek niet afgezet voor verkeer van de opdrachtgever.","Werkplek afzetten en verkeer langs de werkplek afstemmen met de opdrachtgever.")],
'Noodvoorzieningen':[("EHBO- of blusmiddelen niet compleet of niet bereikbaar.","EHBO- en blusmiddelen aanvullen; vluchtroute bespreken bij het start-werkoverleg.")],
'Fysieke belasting':[("Zware onderdelen met de hand verplaatst zonder hulpmiddel.","Tilhulpmiddel inzetten en taakroulatie afspreken.")]}
BT={'verlichting':"Risico werken in het donker toevoegen aan de product-TRA en de kennisbank; werkverlichting in de montagewagen.",'werkverkeer':"Risico kruisend werkverkeer toevoegen aan de product-TRA en de kennisbank; afspraak met opdrachtgever over afzetting.",'Gladheid':"Risico gladheid door algengroei toevoegen aan de product-TRA en de kennisbank; bordes laten reinigen vóór start.",'Geluid':"Risico communicatie bij lawaai toevoegen aan de product-TRA en de kennisbank; portofoons of vaste handseinen bij hijsen."}
for a in d['acties']:
    if a['wpi']==K: continue
    if a['bron']=='Buiten TRA':
        a['verbeteractie']=next(v for k,v in BT.items() if k in a['omschrijving'])
    else:
        a['bevinding'],a['verbeteractie']=random.choice(PAIRS[a['classificatie']])
    if 'mangatwacht' in a['bevinding'] and a['status']=='Open' or a['actie']=='WPI-20261103-ROO-C1-2':
        pass
# mangatwacht -> direct
insp={w['nr']:w['inspecteur'] for w in d['wpis']}
for a in d['acties']:
    if a['wpi']!=K and 'mangatwacht' in a['bevinding']:
        a.update(prioriteit='direct',direct_gecorrigeerd=True,termijn=a['datum'],status='Afgerond',afgerond_op=a['datum'],getoetst_op=a['datum'],actiehouder='Monteurs ter plaatse',toetser=insp[a['wpi']]+' (ter plaatse)',direct_genomen_maatregel='Betreden gestaakt tot een mangatwacht aanwezig was.')
        for r in d['regels']:
            if a['actie'] in r.get('acties',[]): r['prioriteit']='direct'
    a.setdefault('direct_genomen_maatregel',None)
# projecten
FL={'POM':(0,0,1),'IDV':(1,0,0),'ROO':(1,0,1),'BAN':(1,0,1),'DAM':(1,1,1)}
proj={}
for w in d['wpis']:
    pn=w['project'].split(' ')[0]; dt=datetime.date.fromisoformat(w['datum'])
    proj.setdefault(pn,{'project':pn,'product':w['product'],'code':w['code'],'locatie':w['locatie'],'opdrachtgever':w['opdrachtgever'],'wpis':[]})['wpis'].append(dt)
out=[]
for pn,v in proj.items():
    first=min(v['wpis']); last=max(v['wpis'])
    lang=random.random()<0.45 or pn in('P26-379',)
    start=first-datetime.timedelta(days=random.randint(2,10))
    eind=(last+datetime.timedelta(days=random.randint(45,80))) if lang else (last+datetime.timedelta(days=random.randint(3,15)))
    if pn=='P26-168': start=datetime.date(2026,10,12); eind=datetime.date(2026,12,18)
    h,b,o=FL[v['code']]
    out.append({'project':pn+' (fictief)','product':v['product'],'locatie':v['locatie'],'opdrachtgever':v['opdrachtgever'],'start':str(start),'eind':str(min(eind,datetime.date(2026,12,23))),'hijsen_mobiele_kraan':bool(h),'besloten_ruimte_vergunning':bool(b),'open_water':bool(o)})
# extra projecten zonder WPI
LOC=[('Waterschap Voorbeeld-Noord','RWZI Voorbeeldstad'),('Waterschap Voorbeeld-Zuid','RWZI Testdorp'),('Gemeente Voorbeeldhaven','Poldergemaal Proefsluis'),('Waterschap Voorbeeld-Zuid','Rioolgemaal Demowijk')]
PR=[('Dompelpompen','POM'),('Roosterreiniger','ROO'),('Beluchter','BEL'),('Microfilter','MIC'),('Kettingreiniger','KET'),('Slibindikker','SLI')]
for i in range(9):
    s=datetime.date(2026,random.randint(5,10),random.randint(1,25)); lang=random.random()<0.35
    e=s+datetime.timedelta(days=random.randint(40,90) if lang else random.randint(2,12))
    prd,c=random.choice(PR); og,loc=random.choice(LOC)
    out.append({'project':f"P26-{500+i*7} (fictief)",'product':prd,'locatie':loc,'opdrachtgever':og,'start':str(s),'eind':str(min(e,datetime.date(2026,12,23))),'hijsen_mobiele_kraan':random.random()<0.4,'besloten_ruimte_vergunning':random.random()<0.2,'open_water':random.random()<0.4})
out.sort(key=lambda x:x['start'])
d['projecten']=out
d['versie']='8'
d['toelichting']['projecten']='Fictieve projectplanning: per project start, eind en risicokenmerken van het geplande werk. Regel (voorstel procedure 5.5): project langer dan een maand op één locatie = elke kalendermaand een WPI; kort project met minstens één risicokenmerk = ten minste één WPI; overige korte projecten = één op de vier per kwartaal.'
json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
# quick compliance calc
pdate=datetime.date.fromisoformat(d['peildatum'])
wp={}
for w in d['wpis']: wp.setdefault(w['project'],[]).append(datetime.date.fromisoformat(w['datum']))
for pr in out:
    s=datetime.date.fromisoformat(pr['start']); e=min(datetime.date.fromisoformat(pr['eind']),pdate)
    if s>pdate: continue
    lang=(datetime.date.fromisoformat(pr['eind'])-s).days>31
    risk=pr['hijsen_mobiele_kraan'] or pr['besloten_ruimte_vergunning'] or pr['open_water']
    ws=wp.get(pr['project'],[])
    if lang:
        ms=[]; y,m=s.year,s.month
        while (y,m)<=(e.year,e.month): ms.append((y,m)); m+=1; y,m=(y+1,1) if m==13 else (y,m)
        ok=sum(1 for ym in ms if any((x.year,x.month)==ym for x in ws))
        print(pr['project'],'lang',f"{ok}/{len(ms)} maanden",pr['start'],pr['eind'])
    else: print(pr['project'],'kort','risico' if risk else 'overig',len(ws),'WPI')
print(len(out),'projecten')
