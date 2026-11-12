import json,collections as C,datetime as D,statistics as S
d=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'));kb=json.load(open('/home/claude/wpi/run/data/kennisbank.json'))
W,R,A,P=d['wpis'],d['regels'],d['acties'],d['programma']; peil=d['peildatum']; WI={w['nr']:w for w in W}
neg=lambda r:r['oordeel'] in('Afwijking','Verbeterpunt'); q=lambda m:'Q%d'%((int(m[5:7])+2)//3); n=len(R)
print('progr',sum(p['uitgevoerd'] for p in P),sum(p['gepland'] for p in P))
oc=C.Counter(r['oordeel'] for r in R); print(dict(oc),'ratio',round(oc['Conform']/sum(map(neg,R)),1))
wc=C.Counter(r['waargenomen'] for r in R); print(dict(wc),{k:round(100*v/n) for k,v in wc.items()})
for i in sorted({w['inspecteur'] for w in W}):
    rr=[r for r in R if WI[r['wpi']]['inspecteur']==i]; c=C.Counter(r['waargenomen'] for r in rr); print(' ',i,len(rr),round(100*c['Waargenomen']/len(rr)),round(100*c['Alleen bevestigd']/len(rr)))
for k in ['Q2','Q3','Q4']:
    rr=[r for r in R if q(r['datum'])==k]; print(k,round(sum(map(neg,rr))/len({r['wpi'] for r in rr}),1))
print('class neg',C.Counter(r['classificatie'] for r in R if neg(r)).most_common())
tra=[r for r in R if r['soort']=='TRA']; get=[r for r in tra if r['waargenomen']=='Waargenomen']
tot=C.Counter(r['ref'] for r in get); ng=C.Counter(r['ref'] for r in tra if neg(r)); af=C.Counter(r['ref'] for r in tra if r['oordeel']=='Afwijking')
print('tra getoetst',len(get),'neg',sum(map(neg,tra)),'herhaald',sum(1 for k in ng if ng[k]>1))
print('top tra',[(k,ng[k],tot[k]) for _,_,_,k in sorted([(-ng[k],-ng[k]/tot[k],-af[k],k) for k in ng])][:6])
key=lambda r: r['ref'] if r['soort']=='TRA' else r['omschrijving']
print('NB',C.Counter(key(r) for r in R if r['oordeel']=='Niet beoordeeld').most_common(2),'AB',sorted(C.Counter(key(r) for r in R if r['waargenomen']=='Alleen bevestigd').most_common(3)))
print('alg',C.Counter(r['omschrijving'] for r in R if r['soort']=='Algemeen' and neg(r)).most_common(2))
ins={w['code'] for w in W}; print('niet geinsp',len([c for c in kb if c not in ins]))
gez={r['ref'] for r in get}; kl=C.Counter(x['klasse'] for v in kb.values() for x in v['regels']); kg=C.Counter(x['klasse'] for v in kb.values() for x in v['regels'] if x['id'] in gez)
print('kb',len(gez),sum(kl.values()),round(100*len(gez)/sum(kl.values())),[(k,kg[k],v) for k,v in kl.most_common()])
print('buiten',C.Counter(r['omschrijving'] for r in R if r['soort']=='Buiten TRA').most_common(1),sum(r['soort']=='Buiten TRA' for r in R))
dd=D.date.fromisoformat; op=[a for a in A if a['status']=='Open']; kl2=[a for a in A if a['status']=='Afgerond']
ov=sorted([a for a in op if a['termijn']<peil],key=lambda a:a['termijn']); dl=[(dd(a['afgerond_op'])-dd(a['datum'])).days for a in kl2]
print('acties',len(A),len(op),len(kl2),[(a['actie'],(dd(peil)-dd(a['termijn'])).days) for a in ov],'doorloop',round(S.mean(dl),1),S.median(dl),'telaat',sum(a['afgerond_op']>a['termijn'] for a in kl2),'direct',sum(a['direct_gecorrigeerd'] for a in A),'idee',[a['actie'] for a in A if a['bron']=='Idee monteurs'])
for s in ['WPI coördinator','VGM-inspectie directie']:
    rr=[r for r in R if WI[r['wpi']]['soort']==s]; nw=len({r['wpi'] for r in rr}); c=C.Counter(r['oordeel'] for r in rr); w=C.Counter(r['waargenomen'] for r in rr)
    print(s,nw,'neg/wpi',round((c['Afwijking']+c['Verbeterpunt'])/nw,1),'nb%',round(100*c['Niet beoordeeld']/len(rr)),'ja%',round(100*w['Waargenomen']/len(rr)),'pos%',round(100*c['Conform']/len(rr)))
x='WPI-20261105-DAM-C2'; print(x,sorted(C.Counter(r['oordeel'] for r in R if r['wpi']==x).items()),[(a['actie'][-1],a['bron'],a['ref'],a['status'],a['toetser']) for a in A if a['wpi']==x])
