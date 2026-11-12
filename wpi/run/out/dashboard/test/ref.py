import json,collections as C,datetime as D,statistics as S
d=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'));kb=json.load(open('/home/claude/wpi/run/data/kennisbank.json'))
W,R,A,P=d['wpis'],d['regels'],d['acties'],d['programma']; peil=d['peildatum']
WI={w['nr']:w for w in W}
neg=lambda r:r['oordeel'] in('Afwijking','Verbeterpunt')
q=lambda m:'Q%d'%((int(m[5:7])+2)//3)
print('progr',sum(p['gepland'] for p in P),sum(p['uitgevoerd'] for p in P),[(p['maand'],p['inspecteur']) for p in P if p['uitgevoerd']<p['gepland']])
print('dir kw',sorted({q(w['datum']) for w in W if 'directie' in w['soort']}))
print('oordeel',C.Counter(r['oordeel'] for r in R)); n=len(R)
wc=C.Counter(r['waargenomen'] for r in R); print('waarg',wc,{k:round(100*v/n) for k,v in wc.items()})
for i in sorted({w['inspecteur'] for w in W}):
    rr=[r for r in R if WI[r['wpi']]['inspecteur']==i]; c=C.Counter(r['waargenomen'] for r in rr); print(' ',i,len(rr),dict(c),round(100*c['Ja']/len(rr)))
for m in sorted({r['datum'][:7] for r in R}):
    rr=[r for r in R if r['datum'][:7]==m]; c=C.Counter(r['waargenomen'] for r in rr); print(' ',m,len(rr),dict(c),round(100*c['Ja']/len(rr)), 'neg',sum(map(neg,rr)),'wpi',len({r['wpi'] for r in rr}))
for k in ['Q2','Q3','Q4']:
    rr=[r for r in R if q(r['datum'])==k]; print(k,round(sum(map(neg,rr))/len({r['wpi'] for r in rr}),1))
print('ratio',round(wc and C.Counter(r['oordeel'] for r in R)['Conform']/sum(map(neg,R)),1))
print('class neg',C.Counter(r['classificatie'] for r in R if neg(r)).most_common())
tra=[r for r in R if r['soort']=='TRA']; get=[r for r in tra if r['oordeel'] not in('Niet beoordeeld','Niet van toepassing')]
print('tra getoetst',len(get),'neg',sum(map(neg,tra)),'uniek refs',len({r['ref'] for r in tra}))
tot=C.Counter(r['ref'] for r in get); ng=C.Counter(r['ref'] for r in tra if neg(r)); af=C.Counter(r['ref'] for r in tra if r['oordeel']=='Afwijking')
print('top tra',sorted([(ng[k],round(ng[k]/tot[k],2),af[k],k,tot[k]) for k in ng],key=lambda x:(-x[0],-x[1],-x[2],x[3]))[:8])
print('alg neg',C.Counter(r['omschrijving'] for r in R if r['soort']=='Algemeen' and neg(r)).most_common(3))
key=lambda r: r['ref'] if r['soort']=='TRA' else r['omschrijving']
print('NB',C.Counter(key(r) for r in R if r['oordeel']=='Niet beoordeeld').most_common(5))
print('AB',C.Counter(key(r) for r in R if r['waargenomen']=='Alleen bevestigd').most_common(5))
print('AB+NB',C.Counter(key(r) for r in R if r['waargenomen']=='Alleen bevestigd' or r['oordeel']=='Niet beoordeeld').most_common(6))
ins={w['code'] for w in W}; print('niet geinsp',len([c for c in kb if c not in ins]),sorted(kb[c]['naam'] for c in kb if c not in ins)); print('prod wpis',C.Counter(w['product'] for w in W))
print('buiten',C.Counter(r['omschrijving'] for r in R if r['soort']=='Buiten TRA'))
dd=lambda s:D.date.fromisoformat(s)
op=[a for a in A if a['status']=='Open']; kl=[a for a in A if a['status']=='Afgerond']
ov=sorted([a for a in op if a['termijn']<peil],key=lambda a:a['termijn'])
print('acties',len(A),'open',len(op),'afgerond',len(kl),'over',[(a['actie'],a['termijn'],(dd(peil)-dd(a['termijn'])).days) for a in ov])
dl=[(dd(a['afgerond_op'])-dd(a['datum'])).days for a in kl]; print('doorloop',round(S.mean(dl),1),S.median(dl),'telaat',sum(a['afgerond_op']>a['termijn'] for a in kl),'direct',sum(a['direct_gecorrigeerd'] for a in A),'idee',[a['actie'] for a in A if a['bron']=='Idee monteurs'])
print('direct check',[(a['prioriteit'],a['status'],a['afgerond_op']==a['datum']) for a in A if a['direct_gecorrigeerd']])
for s in ['WPI coördinator','VGM-inspectie directie']:
    rr=[r for r in R if WI[r['wpi']]['soort']==s]; nw=len({r['wpi'] for r in rr}); c=C.Counter(r['oordeel'] for r in rr); w=C.Counter(r['waargenomen'] for r in rr)
    print(s,nw,len(rr),'neg/wpi',round((c['Afwijking']+c['Verbeterpunt'])/nw,1),'nb%',round(100*c['Niet beoordeeld']/len(rr)),'ja%',round(100*w['Ja']/len(rr)))
x='WPI-20261105-DAM-C2'; print(x,C.Counter(r['oordeel'] for r in R if r['wpi']==x),[(a['actie'],a['bron'],a['ref'],a['status']) for a in A if a['wpi']==x])
print('neg zonder actie',[(r['wpi'],r['ref']) for r in R if neg(r) and not r.get('actie')], 'acties zonder regel',[a['actie'] for a in A if a['actie'] not in {r.get('actie') for r in R}])
