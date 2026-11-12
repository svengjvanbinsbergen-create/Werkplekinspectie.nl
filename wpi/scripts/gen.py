import re, glob, json, random, datetime, os, sys
random.seed(11)
kbdir, out = sys.argv[1], sys.argv[2]
prods={}
for f in sorted(glob.glob(kbdir+'/TRA-*.md')):
    t=open(f).read(); code=re.search(r'\((\w{3})\)',t).group(1); name=re.search(r'— (.+?) \(',t).group(1)
    rows=[]; fase=None
    for blk in re.split(r'\n(?=## Fase \d|### )',t):
        m=re.match(r'## Fase (\d+) — (.+)',blk)
        if m: fase=m.group(2).strip(); continue
        m=re.match(r'### (\S+)',blk)
        if m:
            g=lambda k:(re.search(r'- %s: (.+)'%k,blk) or [None,''])[1]
            rows.append({'id':m.group(1),'fase':fase,'taak':g('Taak'),'risico':g('Risico'),'maatregelen':re.findall(r'\n  - (.+)',blk)})
    prods[code]={'naam':name,'regels':rows}
json.dump(prods,open(out+'/kennisbank.json','w'),ensure_ascii=False)
ALG=[('A','Voorbereiding en documenten','Documenten en voorbereiding'),('B','Veiligstellen (LOTOTO)','Veiligstellen-LOTOTO'),('C','PBM','PBM'),('D','Arbeidsmiddelen en gereedschap','Arbeidsmiddelen en keuring'),('E','Hijsen en kraan','Hijsen'),('F','Werkplek en omgeving','Orde en netheid'),('G','Gevaarlijke stoffen, hygiëne en milieu','Gevaarlijke stoffen en hygiëne'),('H','Noodvoorzieningen','Omgeving en afzetting'),('I','Gedrag en samenwerking','Gedrag en werkwijze')]
def klasse(r):
    s=(r['risico']+' '+r['fase']+' '+r['taak']).lower()
    for k,v in [('lototo','Veiligstellen-LOTOTO'),('spanning','Veiligstellen-LOTOTO'),('elektr','Veiligstellen-LOTOTO'),('kraan','Hijsen'),('last','Hijsen'),('hijs','Hijsen'),('vallen van hoogte','Werken op hoogte of bij water'),('vallen in','Werken op hoogte of bij water'),('verdrink','Werken op hoogte of bij water'),('stof','Gevaarlijke stoffen en hygiëne'),('biolog','Gevaarlijke stoffen en hygiëne'),('gas','Gevaarlijke stoffen en hygiëne'),('trilling','Arbeidsmiddelen en keuring'),('fysieke','Gedrag en werkwijze'),('beknel','Gedrag en werkwijze')]:
        if k in s: return v
    return 'Gedrag en werkwijze'
INSP=[('Coördinator 1 (fictief)','WPI coördinator','C1'),('Coördinator 2 (fictief)','WPI coördinator','C2'),('Directielid (fictief)','VGM-inspectie directie','DL')]
LOC=[('Waterschap Voorbeeld-Noord','RWZI Voorbeeldstad'),('Waterschap Voorbeeld-Noord','Gemaal Fictiefpolder'),('Waterschap Voorbeeld-Zuid','RWZI Testdorp'),('Waterschap Voorbeeld-Zuid','Rioolgemaal Demowijk'),('Gemeente Voorbeeldhaven','Poldergemaal Proefsluis')]
ACT=['Montage Coördinator','Hoofd Service & Montage','Werkvoorbereider','QHSE-Manager','Monteur (voorman)']
# planned: each coordinator 1/month May-Nov 2026, directie 1/quarter; a few missed
wpis=[]; rows=[]; acties=[]
today=datetime.date(2026,11,11)
plan=[]
for m in range(5,12):
    for i in (0,1):
        plan.append((m,i))
for m in (6,9,11): plan.append((m,2))
skip={(7,1),(8,0)}  # gemiste inspecties
weak={'Hijsen':0.30,'Gevaarlijke stoffen en hygiëne':0.26,'PBM':0.18,'Documenten en voorbereiding':0.20}
for (m,i) in plan:
    if (m,i) in skip: continue
    naam,soort,ini=INSP[i]
    d=datetime.date(2026,m,random.randint(2,10 if m==11 else 26))
    while d.weekday()>4: d+=datetime.timedelta(1)
    code=random.choice(list(prods)); p=prods[code]
    fasen=[]
    for r in p['regels']:
        if r['fase'] not in fasen: fasen.append(r['fase'])
    fase=random.choice([f for f in fasen if not f.lower().startswith('elektr')])
    regs=[r for r in p['regels'] if r['fase']==fase]
    taken=sorted({r['taak'] for r in regs})
    og,loc=random.choice(LOC)
    nr=f"WPI-{d:%Y%m%d}-{code}-{ini}"
    improve=(m-5)*0.02  # lichte verbetering door het jaar
    w={'nr':nr,'datum':str(d),'inspecteur':naam,'soort':soort,'opdrachtgever':og,'locatie':loc,'project':f"P26-{random.randint(100,499)} (fictief)",'product':p['naam'],'code':code,'fase':fase,'taken':taken,'monteurs':random.choice([2,2,3,4])}
    wpis.append(w)
    def add(ref,oms,kl,pa,soortregel):
        x=random.random(); pa=max(0.03,pa-improve)
        if x<pa: o='Afwijking'
        elif x<pa+0.08: o='Verbeterpunt'
        elif x<pa+0.08+0.38: o='Conform'
        elif x<pa+0.08+0.38+0.05 and soortregel=='TRA': o='Niet van toepassing'
        elif x<0.93: o='Geen afwijking waargenomen'
        else: o='Niet beoordeeld'
        row={'wpi':nr,'datum':str(d),'ref':ref,'soort':soortregel,'omschrijving':oms,'oordeel':o,'classificatie':kl}
        if o in('Afwijking','Verbeterpunt'):
            prio=random.choices(['direct','kort','planmatig'],[0.2,0.5,0.3] if o=='Afwijking' else [0,0.4,0.6])[0]
            dg= prio=='direct' or random.random()<0.25
            term=d+datetime.timedelta({'direct':0,'kort':14,'planmatig':56}[prio])
            if dg: status='Afgerond'; af=d
            else:
                dl=random.randint(5,70)
                af=d+datetime.timedelta(dl)
                status='Afgerond' if af<=today else 'Open'
                if status=='Open': af=None
            a={'actie':f"{nr}-{sum(1 for z in acties if z['wpi']==nr)+1}",'wpi':nr,'datum':str(d),'ref':ref,'omschrijving':oms,'oordeel':o,'classificatie':kl,'prioriteit':prio,'direct_gecorrigeerd':dg,'actiehouder':random.choice(ACT),'termijn':str(term),'status':status,'afgerond_op':str(af) if af else None}
            acties.append(a); row.update(prioriteit=prio,actie=a['actie'])
        rows.append(row)
    for c,n,kl in ALG: add(c,n,kl,weak.get(kl,0.10),'Algemeen')
    for r in regs:
        kl=klasse(r); add(r['id'],r['risico'][:110],kl,weak.get(kl,0.09),'TRA')
    if random.random()<0.3:
        rows.append({'wpi':nr,'datum':str(d),'ref':'Buiten TRA','soort':'Buiten TRA','omschrijving':random.choice(['Werken in het donker bij uitloop van het werk: geen werkverlichting in de TRA','Kruisend werkverkeer van de opdrachtgever langs de werkplek','Gladheid op het bordes door algengroei','Geluid van naastgelegen installatie bemoeilijkt communicatie bij hijsen']),'oordeel':'Verbeterpunt','classificatie':'TRA onvolledig','prioriteit':'planmatig'})
progr=[{'maand':f"2026-{m:02d}",'inspecteur':INSP[i][0],'gepland':1,'uitgevoerd':0 if (m,i) in skip else 1} for (m,i) in plan]
json.dump({'let_op':'FICTIEVE VOORBEELDDATA - geen echte inspecties, personen of locaties','peildatum':str(today),'wpis':wpis,'regels':rows,'acties':acties,'programma':progr},open(out+'/voorbeelddata.json','w'),ensure_ascii=False,indent=1)
from collections import Counter
print(len(wpis),len(rows),len(acties),Counter(r['oordeel'] for r in rows)); print(Counter(a['status'] for a in acties)); print(sorted(Counter(w['code'] for w in wpis).items()))
print([w['nr']+' '+w['fase'] for w in wpis][-4:])
