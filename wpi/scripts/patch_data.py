import json,sys
p=sys.argv[1]; d=json.load(open(p)); kb=json.load(open(sys.argv[2]))
risk={r['id']:(r['risico']+' | '+r['taak']+' | '+r['fase']).lower() for c in kb.values() for r in c['regels']}
def kl(ref,old):
    if ref=='H': return 'Noodvoorzieningen'
    if ref not in risk: return old
    s=risk[ref]; r=s.split(' | ')[0]
    for keys,v in [(('fysieke','werkhouding','tillen'),'Gedrag en werkwijze'),(('besloten','gas','zuurstof','verstikking'),'Besloten ruimte en gas'),(('lototo','spanning','elektr','inschakel','onverwacht'),'Veiligstellen-LOTOTO'),(('kraan','vallen van de last','hijs','zwaaiende','aanslaan'),'Hijsen'),(('vallen van hoogte','vallen in','verdrink','uitglijden','struikel'),'Werken op hoogte of bij water'),(('stof','biolog','afvalwater','slib','chemi'),'Gevaarlijke stoffen en hygiëne'),(('trilling','gereedschap','slijp','las','gehoor'),'Arbeidsmiddelen en keuring'),(('beknel','draaiende'),'Gedrag en werkwijze'),(('aanrijd','verkeer','omstanders','derden'),'Omgeving en afzetting')]:
        if any(k in r for k in keys): return v
    return 'Gedrag en werkwijze'
for r in d['regels']:
    r['classificatie']=kl(r['ref'],r['classificatie'])
for a in d['acties']:
    a['classificatie']=kl(a['ref'],a['classificatie'])
    if a['direct_gecorrigeerd']:
        a['prioriteit']='direct'; a['termijn']=a['datum']; a['status']='Afgerond'; a['afgerond_op']=a['datum']
        for r in d['regels']:
            if r.get('actie')==a['actie']: r['prioriteit']='direct'
d['versie']='2 (classificaties en direct gecorrigeerde acties rechtgezet)'
json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
from collections import Counter
print(Counter(a['classificatie'] for a in d['acties'])); print(Counter((a['prioriteit'],a['status']) for a in d['acties']))
print([(a['actie'],a['ref'],a['classificatie'],a['prioriteit'],a['status']) for a in d['acties'] if a['wpi']=='WPI-20261105-DAM-C2'])
