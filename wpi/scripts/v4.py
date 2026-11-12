import json,sys,re
from collections import Counter
D=sys.argv[1]
kb=json.load(open(D+'/kennisbank.json')); d=json.load(open(D+'/voorbeelddata.json'))
RULES=[(('fysieke belasting','werkhouding','tillen','spier'),'Fysieke belasting'),
 (('besloten ruimte','gassen','zuurstof','verstikking','h2s'),'Besloten ruimte en gas'),
 (('vallen van de last','hijs','kraan','aanslaan','zwaaiende','last '),'Hijsen'),
 (('lototo','spanning','elektr','elektrocutie','inschakel','aanloop','restenergie'),'Veiligstellen-LOTOTO'),
 (('biologisch','afvalwater','slib','stof','chemi','aerosol'),'Gevaarlijke stoffen en hygiëne'),
 (('vallen van hoogte','vallen in','verdrink','uitglijden','struikel','te water','bassin'),'Werken op hoogte of bij water'),
 (('trilling','gehoor','slijp','lassen','gereedschap','wegspringen'),'Arbeidsmiddelen en keuring'),
 (('aanrijd','verkeer','omstanders','derden','kabeltrac'),'Omgeving en afzetting'),
 (('beknel','pletten','draaiende','verschuiven','wegrollen','kantelen'),'Gedrag en werkwijze')]
def kl(txt):
    s=txt.lower()
    for keys,v in RULES:
        if any(k in s for k in keys): return v
    return 'Gedrag en werkwijze'
cls={}
for c,p in kb.items():
    for r in p['regels']:
        r['klasse']=kl(r['risico']); cls[r['id']]=r['klasse']
json.dump(kb,open(D+'/kennisbank.json','w'),ensure_ascii=False)
BT={'verlichting':'Omgeving en afzetting','werkverkeer':'Omgeving en afzetting','Gladheid':'Werken op hoogte of bij water','Geluid':'Hijsen'}
for r in d['regels']:
    if r['ref'] in cls: r['classificatie']=cls[r['ref']]
    if r['soort']=='Buiten TRA':
        r['classificatie']=next(v for k,v in BT.items() if k in r['omschrijving'])
    if r['oordeel']=='Geen afwijking waargenomen' and r.get('waargenomen')=='Ja': r['oordeel']='Conform'
    o=r['oordeel']
    r['waargenomen']='Waargenomen' if o in('Conform','Afwijking','Verbeterpunt') else 'Alleen bevestigd' if o=='Geen afwijking waargenomen' else 'Niet beoordeeld' if o=='Niet beoordeeld' else 'N.v.t.'
for a in d['acties']:
    if a['ref'] in cls: a['classificatie']=cls[a['ref']]
    a['toetser']='Hoofd Service & Montage'
d['versie']='4'
d['toelichting']={'oordelen':'Conform, Afwijking en Verbeterpunt vragen een eigen waarneming van de inspecteur (= Waargenomen). Geen afwijking waargenomen = alleen via de afsluitvraag bevestigd, zonder eigen waarneming (= Alleen bevestigd). Het veld waargenomen is afgeleid van het oordeel.','buiten_tra':'Waarnemingen buiten de TRA zijn te herkennen aan soort = Buiten TRA en hebben een gewone classificatie.','kennisbank':'Elke risicoregel in kennisbank.json heeft een vaste klasse; die bepaalt de classificatie van een bevinding op die regel.'}
json.dump(d,open(D+'/voorbeelddata.json','w'),ensure_ascii=False,indent=1)
print(Counter(r['oordeel'] for r in d['regels'])); print(Counter(r['waargenomen'] for r in d['regels']))
print(Counter(r['klasse'] for p in kb.values() for r in p['regels']))
K='WPI-20261105-DAM-C2'
for r in d['regels']:
    if r['wpi']==K: print(r['ref'],r['oordeel'],'|',r['classificatie'])
for a in d['acties']:
    if a['wpi']==K: print(a['actie'],a['ref'],a['classificatie'],a['prioriteit'],a['status'])
print(Counter(a['classificatie'] for a in d['acties']))
