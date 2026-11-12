"""voorbeelddata 10.5 -> 11 (koers2: WPI als momentopname)."""
import json, collections as C
D='/home/claude/wpi/run/data/'
d=json.load(open(D+'voorbeelddata_v10_5.json')); kb=json.load(open(D+'kennisbank.json'))
ids={r['id']:r for p in kb.values() for r in p['regels']}
VERV={'Geen afwijking waargenomen','Niet beoordeeld'}
SPONTAAN={'WPI-20260810-ROO-C2','WPI-20261103-ROO-C1'}
acts_by_key={(a['wpi'],a['ref']) for a in d['acties']}
weg=[];blijft=[];gemeld=[]
for r in d['regels']:
    if r['oordeel'] in VERV:
        if r['acties'] or (r['wpi'],r['ref']) in acts_by_key: gemeld.append(r); blijft.append(r)
        else: weg.append(r)
        continue
    blijft.append(r)
nieuw=[]
for r in blijft:
    q={}
    for k,v in r.items():
        q[k]=v
        if k=='ref' and r['soort']=='TRA':
            q['taak']=ids[v]['taak']; q['taakstap']=ids[v]['taakstap']
    nieuw.append(q)
d['regels']=nieuw
for w in d['wpis']:
    w['ingang']='spontaan' if w['nr'] in SPONTAAN else 'ingepland'
    st=[]
    for r in nieuw:
        if r['wpi']==w['nr'] and r['soort']=='TRA':
            x={'taak':r['taak'],'taakstap':r['taakstap']}
            if x not in st: st.append(x)
    w['getoetste_stappen']=st
d['versie']=('11 — momentopname: alleen wat de inspecteur zag staat erin (koers2, 12-11-2026). Uit 10.5: regels met oordeel '
  '"Geen afwijking waargenomen" of "Niet beoordeeld" vervallen (%d van %d; geen actie verwees ernaar); TRA-regels hebben taak en taakstap '
  'uit kennisbank.json (taakstap null waar de bron-TRA geen taakstap heeft); per WPI ingang (ingepland/spontaan) en getoetste_stappen. Acties ongewijzigd.'
  % (len(weg), len(weg)+len(blijft)))
T=d['toelichting']
T['oordelen']=('Oordelen: Conform, Afwijking, Verbeterpunt - altijd met eigen waarneming van de inspecteur; optioneel Niet van toepassing als de inspecteur '
  'expliciet ziet dat een maatregel niet van toepassing is. Wat niet gezien is, wordt niet vastgelegd: "Geen afwijking waargenomen (alleen bevestigd)" en '
  '"Niet beoordeeld" bestaan niet meer. Regeloordeel bij meerdere maatregelen = slechtste van wat gezien is (A > V > C). Het veld waargenomen blijft '
  'als afgeleide (Waargenomen / N.v.t.).')
T['momentopname']=('Een WPI is een momentopname: "Werken wij zoals we zeggen dat we werken?". Het rapport zegt alleen welke taak en taakstap(pen) tijdens het '
  'bezoek getoetst zijn (getoetste_stappen) en welke maatregelen gezien zijn (de regels); geen dekking of "regel x van y".')
T['taakstap']=('TRA-regels hebben taak en taakstap uit kennisbank.json (letterlijk uit de bron-TRA). In de gegeneraliseerde bron-TRA\'s heeft alleen een '
  'deel van de regels een taakstap (o.a. LOTOTO en Inschakelen); bij de overige is taakstap null en is de taak het getoetste niveau.')
T['getoetste_stappen']='Per WPI de unieke combinaties taak + taakstap van de TRA-regels in die WPI, afgeleid uit de data (niet met de hand).'
T['ingang']=('Per WPI: ingepland (uit het programma, kop vooraf gevuld) of spontaan (inspecteur kwam toevallig langs). Een spontane WPI telt mee voor het '
  'programma als hij op een verplichte werkplek/maand valt; beide spontane WPI\'s in deze data doen dat, het programma (gepland/uitgevoerd) is daarom ongewijzigd.')
T['algemeen']='Algemene onderwerpen zijn een geheugensteun, niet verplicht: alleen gezien onderwerpen staan erin (C/A/V); er is niets toegevoegd.'
json.dump(d,open(D+'voorbeelddata.json','w'),ensure_ascii=False,indent=1)
print('weg',len(weg),'blijft',len(blijft),'gemeld',[(r['wpi'],r['ref']) for r in gemeld])
print(C.Counter((r['soort'],r['oordeel']) for r in weg))
