import json,sys,random
random.seed(6)
D=sys.argv[1]; p=D+'/voorbeelddata.json'; d=json.load(open(p)); kb=json.load(open(D+'/kennisbank.json'))
risk={r['id']:r['risico'] for c in kb.values() for r in c['regels']}
K='WPI-20261105-DAM-C2'
insp={w['nr']:w['inspecteur'] for w in d['wpis']}
BEV_DAM={'1':"De TRA Damwand in de projectmap is ouder dan de versie in het QMS. Hijsen staat niet als aparte stap op de LMRA.",'2':"Geen handenwasgelegenheid bij de werkplek; de handenwasset ontbreekt in de bus.",'3':"Werkplek en damwand zijn niet vooraf gereinigd door de opdrachtgever (collectieve maatregel uit de TRA). Er stond koffie in de werkzone.",'4':"De 4-gasmeter hing bovenaan de ladder en niet op werkhoogte bij de monteur in het kanaal.",'5':"De gasmeter zit bij het afdalen in de weg en blijft daarom boven hangen. Idee van de monteurs: een klem of karabijn om hem op borsthoogte te dragen."}
BEV={'Hijsen':["Hijszone niet volledig afgezet tijdens het hijsen.","Geen stuurlijn gebruikt bij het begeleiden van de last.","Hijsplan niet vooraf doorgenomen met de ploeg."],'Gevaarlijke stoffen en hygiëne':["Geen handenwasgelegenheid bij de werkplek.","Eten of drinken in de werkzone.","Geen gelaatsbescherming gedragen bij spatgevaar."],'Besloten ruimte en gas':["Gasmeter niet op werkhoogte gedragen.","Geen mangatwacht aanwezig bij het betreden."],'Veiligstellen-LOTOTO':["Alleen het slot van de opdrachtgever geplaatst; eigen slot ontbrak."],'Arbeidsmiddelen en keuring':["Arbeidsmiddel met verlopen keuringsdatum in gebruik."],'Documenten en voorbereiding':["TRA of VGM-projectplan niet actueel op locatie; LMRA niet aantoonbaar."],'PBM':["Voorgeschreven PBM niet of niet goed gedragen."],'Orde en netheid':["Materiaal en gereedschap in de looproute."],'Gedrag en werkwijze':["Werkwijze wijkt af van de afgesproken methode."],'Werken op hoogte of bij water':["Open bassin zonder randbeveiliging of afzetting."],'Omgeving en afzetting':["Werkplek niet afgezet voor verkeer van de opdrachtgever."],'Noodvoorzieningen':["EHBO- of blusmiddelen niet compleet of niet bereikbaar."],'Fysieke belasting':["Zware onderdelen met de hand verplaatst zonder hulpmiddel."]}
for r in d['regels']:
    if r['ref'] in risk: r['omschrijving']=risk[r['ref']]
    if r['wpi']==K and r['ref']=='DAM-2.07': r['oordeel']='Afwijking'; r['prioriteit']='direct'
    r['acties']=[a['actie'] for a in d['acties'] if a['wpi']==r['wpi'] and a['ref']==r['ref'] and (r['soort']!='Buiten TRA' or a['omschrijving']==r['omschrijving'])]
    r.pop('actie',None)
for a in d['acties']:
    if a['ref'] in risk: a['omschrijving']=risk[a['ref']]
    k=a['actie'].rsplit('-',1)[1]
    if a['wpi']==K:
        a['bevinding']=BEV_DAM[k]
        if k=='4': a['oordeel']='Afwijking'; a['actiehouder']=insp[K]
        if k=='1': a['prioriteit']='planmatig'; a['termijn']='2026-12-31'; a['actiehouder']='Werkvoorbereider'
        if k=='3': a['prioriteit']='kort'; a['termijn']='2026-11-19'; a['actiehouder']='Werkvoorbereider'
        if k in('2','5'): a['actiehouder']=insp[K]
    else:
        a['bevinding']=a['omschrijving'] if a['bron']=='Buiten TRA' else random.choice(BEV[a['classificatie']])
        if a['actiehouder']=='QHSE-Manager': a['actiehouder']='Werkvoorbereider'
        if a['actiehouder']=='Montage Coördinator': a['actiehouder']=insp[a['wpi']] if 'Coördinator' in insp[a['wpi']] else 'Coördinator 1 (fictief)'
    if a['direct_gecorrigeerd']:
        a['toetser']=insp[a['wpi']]+' — ter plaatse'; a['getoetst_op']=a['datum']
        if a['wpi']!=K: a['actiehouder']=insp[a['wpi']]
    else:
        a['toetser']='Hoofd Service & Montage' if a['actiehouder']!='Hoofd Service & Montage' else insp[a['wpi']]
        a['getoetst_op']=a['afgerond_op']
d['versie']='6'
d['toelichting']['acties']='Een actie is pas Afgerond nadat de toetser heeft vastgesteld dat de verbeteractie is uitgevoerd (getoetst_op). Bij direct gecorrigeerde acties toetst de inspecteur ter plaatse. Toetser en actiehouder zijn nooit dezelfde. Een regel kan meerdere acties hebben (veld acties).'
json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
from collections import Counter
print(Counter(r['oordeel'] for r in d['regels'])); print('toetser==houder',sum(1 for a in d['acties'] if a['toetser'].split(' — ')[0]==a['actiehouder'] and not a['direct_gecorrigeerd']))
for a in d['acties']:
    if a['wpi']==K: print(a['actie'][-1],a['ref'],a['oordeel'],a['prioriteit'],a['termijn'],a['status'],'|',a['actiehouder'],'|',a['toetser'])
print([ (r['ref'],r['acties']) for r in d['regels'] if r['wpi']==K and r['acties']])
