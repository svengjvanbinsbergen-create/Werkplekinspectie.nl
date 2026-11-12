import json, random, datetime, sys, runpy
random.seed(23)
D=sys.argv[1]
kb=json.load(open(D+'/kennisbank.json')); v2=json.load(open(D+'/voorbeelddata_v2.json'))
KEEP='WPI-20261105-DAM-C2'
ALG=[('A','Voorbereiding en documenten','Documenten en voorbereiding'),('B','Veiligstellen (LOTOTO)','Veiligstellen-LOTOTO'),('C','PBM','PBM'),('D','Arbeidsmiddelen en gereedschap','Arbeidsmiddelen en keuring'),('E','Hijsen en kraan','Hijsen'),('F','Werkplek en omgeving','Orde en netheid'),('G','Gevaarlijke stoffen, hygiëne en milieu','Gevaarlijke stoffen en hygiëne'),('H','Noodvoorzieningen','Noodvoorzieningen'),('I','Gedrag en samenwerking','Gedrag en werkwijze')]
def kl(r):
    s=r['risico'].lower()
    for keys,v in [(('fysieke','werkhouding','tillen'),'Gedrag en werkwijze'),(('besloten','gas','zuurstof','verstikking'),'Besloten ruimte en gas'),(('lototo','spanning','elektr','inschakel','onverwacht'),'Veiligstellen-LOTOTO'),(('kraan','vallen van de last','hijs','zwaaiende','aanslaan'),'Hijsen'),(('vallen van hoogte','vallen in','verdrink','uitglijden','struikel'),'Werken op hoogte of bij water'),(('stof','biolog','afvalwater','slib','chemi'),'Gevaarlijke stoffen en hygiëne'),(('trilling','gereedschap','slijp','las','gehoor'),'Arbeidsmiddelen en keuring'),(('beknel','draaiende'),'Gedrag en werkwijze'),(('aanrijd','verkeer','omstanders','derden'),'Omgeving en afzetting')]:
        if any(k in s for k in keys): return v
    return 'Gedrag en werkwijze'
INSP=[('Coördinator 1 (fictief)','WPI coördinator','C1'),('Coördinator 2 (fictief)','WPI coördinator','C2'),('Directielid (fictief)','VGM-inspectie directie','DL')]
LOC=[('Waterschap Voorbeeld-Noord','RWZI Voorbeeldstad'),('Waterschap Voorbeeld-Noord','Gemaal Fictiefpolder'),('Waterschap Voorbeeld-Zuid','RWZI Testdorp'),('Waterschap Voorbeeld-Zuid','Rioolgemaal Demowijk'),('Gemeente Voorbeeldhaven','Poldergemaal Proefsluis')]
ACT=['Montage Coördinator','Hoofd Service & Montage','Werkvoorbereider','QHSE-Manager','Monteur (voorman)']
today=datetime.date(2026,11,11)
PROD=['DAM','BAN','IDV','ROO','POM']; W=[3,3,4,3,2]
def fasen(code):
    fs=[]
    for r in kb[code]['regels']:
        if r['fase'] not in fs: fs.append(r['fase'])
    return fs
# hot rules: systematisch vaker afwijkend
hot={}
for c in PROD:
    for f in fasen(c):
        regs=[r for r in kb[c]['regels'] if r['fase']==f]
        cand=[r['id'] for r in regs if kl(r) in('Hijsen','Gevaarlijke stoffen en hygiëne','Besloten ruimte en gas')]
        for x in random.sample(cand,min(2,len(cand))): hot[x]=0.62
hot['DAM-2.06']=0.62; hot['DAM-2.07']=0.5
weak={'Hijsen':0.22,'Gevaarlijke stoffen en hygiëne':0.20,'PBM':0.15,'Documenten en voorbereiding':0.22}
plan=[(m,i) for m in range(5,12) for i in (0,1)]+[(m,2) for m in (6,9,11)]
skip={(7,1),(8,0)}
wpis=[];rows=[];acties=[]
for (m,i) in plan:
    if (m,i) in skip: continue
    if (m,i)==(11,1):
        wpis+= [w for w in v2['wpis'] if w['nr']==KEEP]
        for r in v2['regels']:
            if r['wpi']==KEEP:
                r=dict(r); o=r['oordeel']
                r['waargenomen']= 'Ja' if o in('Conform','Afwijking','Verbeterpunt') or (o=='Geen afwijking waargenomen' and r['ref'] in('B','C','I','DAM-2.03','DAM-2.04')) else ('Alleen bevestigd' if o=='Geen afwijking waargenomen' else 'Nee')
                rows.append(r)
        acties+=[a for a in v2['acties'] if a['wpi']==KEEP]
        acties.append({'actie':KEEP+'-5','wpi':KEEP,'datum':'2026-11-05','ref':'DAM-2.07','omschrijving':'Idee van de monteurs: klem of karabijn om de gasmeter op borsthoogte te dragen','oordeel':'Verbeterpunt','classificatie':'Besloten ruimte en gas','prioriteit':'planmatig','direct_gecorrigeerd':False,'actiehouder':'Montage Coördinator','termijn':'2026-12-31','status':'Open','afgerond_op':None,'bron':'Idee monteurs'})
        continue
    naam,soort,ini=INSP[i]
    d=datetime.date(2026,m,random.randint(2,10 if m==11 else 26))
    while d.weekday()>4: d+=datetime.timedelta(1)
    code=random.choices(PROD,W)[0]; p=kb[code]
    fs=[f for f in fasen(code) if not f.lower().startswith('elektr')]
    wf=[4 if ('emont' in f or 'ontage' in f) else 1 for f in fs]
    fase=random.choices(fs,wf)[0]
    regs=[r for r in p['regels'] if r['fase']==fase]
    og,loc=random.choice(LOC); nr=f"WPI-{d:%Y%m%d}-{code}-{ini}"
    while any(w['nr']==nr for w in wpis): d+=datetime.timedelta(1); nr=f"WPI-{d:%Y%m%d}-{code}-{ini}"
    improve=(m-5)*0.02; diep= 0.75 if i==0 else (0.45 if i==1 else 0.3)  # aandeel waargenomen verschilt per inspecteur
    wpis.append({'nr':nr,'datum':str(d),'inspecteur':naam,'soort':soort,'opdrachtgever':og,'locatie':loc,'project':f"P26-{random.randint(100,499)} (fictief)",'product':p['naam'],'code':code,'fase':fase,'taken':sorted({r['taak'] for r in regs}),'monteurs':random.choice([2,2,3,4])})
    def add(ref,oms,k,pa,srt):
        x=random.random(); pa=max(0.03,pa-improve) if ref not in hot else max(0.3,pa-improve)
        if x<pa: o='Afwijking' if random.random()<0.6 else 'Verbeterpunt'
        elif x<pa+0.30: o='Conform'
        elif srt=='TRA' and x<pa+0.34: o='Niet van toepassing'
        elif x<0.93: o='Geen afwijking waargenomen'
        else: o='Niet beoordeeld'
        wg='Ja' if o in('Conform','Afwijking','Verbeterpunt') else ('Nee' if o in('Niet beoordeeld','Niet van toepassing') else ('Ja' if random.random()<diep else 'Alleen bevestigd'))
        row={'wpi':nr,'datum':str(d),'ref':ref,'soort':srt,'omschrijving':oms,'oordeel':o,'classificatie':k,'waargenomen':wg}
        if o in('Afwijking','Verbeterpunt'):
            prio=random.choices(['direct','kort','planmatig'],[0.25,0.5,0.25] if o=='Afwijking' else [0,0.4,0.6])[0]
            dg= prio=='direct'; term=d+datetime.timedelta({'direct':0,'kort':14,'planmatig':56}[prio])
            if dg: status='Afgerond'; af=d
            else:
                af=d+datetime.timedelta(random.randint(5,70)); status='Afgerond' if af<=today else 'Open'
                if status=='Open': af=None
            a={'actie':f"{nr}-{sum(1 for z in acties if z['wpi']==nr)+1}",'wpi':nr,'datum':str(d),'ref':ref,'omschrijving':oms,'oordeel':o,'classificatie':k,'prioriteit':prio,'direct_gecorrigeerd':dg,'actiehouder':random.choice(ACT),'termijn':str(term),'status':status,'afgerond_op':str(af) if af else None,'bron':'Inspectie'}
            acties.append(a); row.update(prioriteit=prio,actie=a['actie'])
        rows.append(row)
    for c,n,k in ALG: add(c,n,k,weak.get(k,0.10),'Algemeen')
    for r in regs: add(r['id'],r['risico'][:110],kl(r),hot.get(r['id'],weak.get(kl(r),0.08)),'TRA')
    if random.random()<0.35:
        rows.append({'wpi':nr,'datum':str(d),'ref':'Buiten TRA','soort':'Buiten TRA','omschrijving':random.choice(['Werken in het donker bij uitloop van het werk: geen werkverlichting in de TRA','Werken in het donker bij uitloop van het werk: geen werkverlichting in de TRA','Kruisend werkverkeer van de opdrachtgever langs de werkplek','Gladheid op het bordes door algengroei','Geluid van naastgelegen installatie bemoeilijkt communicatie bij hijsen']),'oordeel':'Verbeterpunt','classificatie':'TRA onvolledig','prioriteit':'planmatig','waargenomen':'Ja'})
for a in acties: a.setdefault('bron','Inspectie')
wpis.sort(key=lambda w:w['datum'])
progr=[{'maand':f"2026-{m:02d}",'inspecteur':INSP[i][0],'gepland':1,'uitgevoerd':0 if (m,i) in skip else 1} for (m,i) in plan]
json.dump({'let_op':'FICTIEVE VOORBEELDDATA - geen echte inspecties, personen of locaties','versie':'3','peildatum':str(today),'wpis':wpis,'regels':rows,'acties':acties,'programma':progr},open(D+'/voorbeelddata.json','w'),ensure_ascii=False,indent=1)
from collections import Counter
print(len(wpis),len(rows),len(acties)); print(Counter(r['oordeel'] for r in rows)); print(Counter(r['waargenomen'] for r in rows)); print(Counter(a['status'] for a in acties))
print(sorted(Counter((w['code'],w['fase']) for w in wpis).items()))
c=Counter(r['ref'] for r in rows if r['soort']=='TRA' and r['oordeel'] in('Afwijking','Verbeterpunt')); n=Counter(r['ref'] for r in rows if r['soort']=='TRA')
print([(k,v,n[k]) for k,v in c.most_common(8)])
