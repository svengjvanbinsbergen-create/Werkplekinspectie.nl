import json,sys,datetime,random
random.seed(5)
p=sys.argv[1]+'/voorbeelddata.json'; d=json.load(open(p))
K='WPI-20261105-DAM-C2'
DAM={'1':"Actuele TRA in projectmap P26-168 plaatsen en de andere lopende projectmappen nalopen. Hijsen als vaste LMRA-stap bespreken in het coördinatorenoverleg.",
'2':"Bus aanvullen met een handenwasset (jerrycan, zeep, papier, desinfectiegel) en de set op de voorraadlijst zetten.",
'3':"Vooraf reinigen door de opdrachtgever vast opnemen in de werkvoorbereiding en het VGM-projectplan voor demontage in afvalwater. Hygiëneregels behandelen in de eerstvolgende toolbox.",
'4':"Geen verdere actie op deze werkplek. De structurele oplossing staat in actie -5.",
'5':"Klem of karabijn uitzoeken en bij elke 4-gasmeter in de montagewagens leggen."}
T={'Hijsen':["Hijszone volledig afzetten en stuurlijnen gebruiken; bespreken in de eerstvolgende toolbox.","Hijsplan met gewicht en zwaartepunt vooraf doornemen bij het start-werkoverleg.","Afgekeurd hijsmiddel vervangen en kleurcode van dit jaar controleren op alle hijsmiddelen in de bus."],
'Gevaarlijke stoffen en hygiëne':["Handenwasgelegenheid en schone pauzeplek regelen vóór start van het werk.","Hygiëneregels (niet eten of drinken in de werkzone) opnieuw instrueren en opnemen in het start-werkoverleg.","Chemisch bestendige handschoenen en gelaatsbescherming aanvullen in de montagewagen."],
'Besloten ruimte en gas':["Gasmeter op werkhoogte dragen en continu meten; opnemen in de LMRA voor dit werk.","Mangatwacht en reddingsmiddelen regelen vóór betreden; werkvergunning besloten ruimte controleren."],
'Veiligstellen-LOTOTO':["Eigen LOTOTO-slot van Noardling plaatsen naast dat van de opdrachtgever; slotenvermeerderaar in elke bus."],
'Arbeidsmiddelen en keuring':["Arbeidsmiddel met verlopen keuring uit gebruik nemen en laten keuren; keuringslijst bijwerken."],
'Documenten en voorbereiding':["Actuele TRA en VGM-projectplan in de projectmap op locatie leggen; LMRA aantoonbaar uitvoeren vóór aanvang."],
'PBM':["Ontbrekende PBM aanvullen en gebruik bespreken met de ploeg."],
'Orde en netheid':["Looproutes vrijmaken en materiaal opslaan buiten de werkzone."],
'Gedrag en werkwijze':["Werkwijze bespreken met de ploeg en vastleggen in het start-werkoverleg."],
'Werken op hoogte of bij water':["Randbeveiliging of afzetting plaatsen bij open bassin; reddingsmiddelen binnen handbereik."],
'Omgeving en afzetting':["Werkplek afzetten en afstemmen met de opdrachtgever over verkeer langs de werkplek."],
'Noodvoorzieningen':["EHBO- en blusmiddelen aanvullen en de vluchtroute bespreken bij het start-werkoverleg."],
'Fysieke belasting':["Hulpmiddel voor tillen inzetten en taakroulatie afspreken."]}
for a in d['acties']:
    if a['wpi']==K: a['verbeteractie']=DAM[a['actie'].rsplit('-',1)[1]]
    else: a['verbeteractie']=random.choice(T[a['classificatie']])
n=0
for r in d['regels']:
    if r['soort']=='Buiten TRA' and not r.get('actie'):
        nr=f"{r['wpi']}-{sum(1 for z in d['acties'] if z['wpi']==r['wpi'])+1}"
        dt=datetime.date.fromisoformat(r['datum'])
        d['acties'].append({'actie':nr,'wpi':r['wpi'],'datum':r['datum'],'ref':'Buiten TRA','omschrijving':r['omschrijving'],'oordeel':'Verbeterpunt','classificatie':r['classificatie'],'prioriteit':'planmatig','direct_gecorrigeerd':False,'actiehouder':'Hoofd Service & Montage','termijn':str(dt+datetime.timedelta(56)),'status':'Open','afgerond_op':None,'bron':'Buiten TRA','toetser':'Hoofd Service & Montage','verbeteractie':'Risico beoordelen en de product-TRA en de WPI-kennisbank aanvullen.'})
        r['actie']=nr; n+=1
d['versie']='5'
json.dump(d,open(p,'w'),ensure_ascii=False,indent=1)
neg=sum(1 for r in d['regels'] if r['oordeel'] in('Afwijking','Verbeterpunt'))
print('acties',len(d['acties']),'toegevoegd',n,'negatief',neg,'zonder actie',sum(1 for r in d['regels'] if r['oordeel'] in('Afwijking','Verbeterpunt') and not r.get('actie')))
from collections import Counter; print(Counter(a['status'] for a in d['acties']),Counter(a['bron'] for a in d['acties']))
