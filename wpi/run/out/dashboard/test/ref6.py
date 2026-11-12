import json,collections as C,datetime as D,statistics as S
d=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'));kb=json.load(open('/home/claude/wpi/run/data/kennisbank.json'))
W,R,A,P=d['wpis'],d['regels'],d['acties'],d['programma']; peil=d['peildatum']; WI={w['nr']:w for w in W}
neg=lambda r:r['oordeel'] in('Afwijking','Verbeterpunt'); q=lambda m:'Q%d'%((int(m[5:7])+2)//3); n=len(R)
waar=[r for r in R if r['waargenomen']=='Waargenomen']
print('progr',sum(p['uitgevoerd'] for p in P),sum(p['gepland'] for p in P),[(p['maand'],p['inspecteur']) for p in P if p['uitgevoerd']<p['gepland']])
print('dirkw',sorted({q(w['datum']) for w in W if 'directie' in w['soort']}))
oc=C.Counter(r['oordeel'] for r in R); print(dict(oc)); wc=C.Counter(r['waargenomen'] for r in R); print(dict(wc))
print('conform van waargenomen',oc['Conform'],len(waar),round(100*oc['Conform']/len(waar)))
for k in ['Q2','Q3','Q4']:
    rr=[r for r in R if q(r['datum'])==k]; nw=len({r['wpi'] for r in rr}); ng=sum(map(neg,rr)); wa=[r for r in rr if r['waargenomen']=='Waargenomen']
    print(k,'wpis',nw,'neg',ng,'per wpi',round(ng/nw,1),'neg/waarg %',round(100*ng/len(wa)))
for m in sorted({r['datum'][:7] for r in R}):
    rr=[r for r in R if r['datum'][:7]==m]; print(m,len({r['wpi'] for r in rr}),len(rr))
cl=C.Counter(r['classificatie'] for r in R if neg(r)); cw=C.Counter(r['classificatie'] for r in waar)
print('class neg',cl.most_common()); print('class share',sorted([(k,cl[k],cw[k],round(100*cl[k]/cw[k])) for k in cw],key=lambda x:-x[1]/x[2]))
for i in sorted({w['inspecteur'] for w in W}):
    rr=[r for r in R if WI[r['wpi']]['inspecteur']==i]; c=C.Counter(r['waargenomen'] for r in rr); print(' ',i,len(rr),round(100*c['Waargenomen']/len(rr)),round(100*c['Alleen bevestigd']/len(rr)))
tra=[r for r in R if r['soort']=='TRA']; get=[r for r in tra if r['waargenomen']=='Waargenomen']
tot=C.Counter(r['ref'] for r in get); ng=C.Counter(r['ref'] for r in tra if neg(r)); af=C.Counter(r['ref'] for r in tra if r['oordeel']=='Afwijking')
print('tra toetsingen',len(get),'unieke',len(tot),'neg toetsingen',sum(map(neg,tra)),'unieke neg',len(ng),'herhaald',[k for k in ng if ng[k]>1])
print('top tra',[(k,ng[k],tot[k]) for _,_,_,k in sorted([(-ng[k],-ng[k]/tot[k],-af[k],k) for k in ng])][:7])
gez={r['ref'] for r in get}; kl=C.Counter(x['klasse'] for v in kb.values() for x in v['regels']); kg=C.Counter(x['klasse'] for v in kb.values() for x in v['regels'] if x['id'] in gez)
print('kb',len(gez),sum(kl.values()),[(k,kg[k],v) for k,v in kl.most_common()])
ins={w['code'] for w in W}; print('niet geinsp',len([c for c in kb if c not in ins]))
key=lambda r: r['ref']+' '+(r['omschrijving'] if r['soort']!='TRA' else '')
print('AB+NB',C.Counter(key(r) for r in R if r['waargenomen'] in('Alleen bevestigd','Niet beoordeeld')).most_common(4))
print('buiten',C.Counter(r['omschrijving'] for r in R if r['soort']=='Buiten TRA').most_common())
for dim in ['product']:
    for p_ in sorted({r[dim] if dim in r else WI[r['wpi']][dim] for r in R}):
        rr=[r for r in R if WI[r['wpi']][dim]==p_]; print(' ',p_,'wpis',len({r['wpi'] for r in rr}),'regels',len(rr),'neg',sum(map(neg,rr)))
dd=D.date.fromisoformat; op=[a for a in A if a['status']=='Open']; kl2=[a for a in A if a['status']=='Afgerond']
ov=sorted([a for a in op if a['termijn']<peil],key=lambda a:a['termijn'])
print('acties',len(A),'open',len(op),'afg',len(kl2),'over',[(a['actie'],(dd(peil)-dd(a['termijn'])).days) for a in ov],'telaat',sum(a['afgerond_op']>a['termijn'] for a in kl2))
print('bron',C.Counter(a['bron'] for a in A),'direct',sum(a['direct_gecorrigeerd'] for a in A))
for p_ in ['direct','kort','planmatig']:
    x=[a for a in kl2 if a['prioriteit']==p_]; dl=[(dd(a['afgerond_op'])-dd(a['datum'])).days for a in x]
    print(p_,len(x),'gem',round(S.mean(dl),1) if dl else None,'binnen14',sum(v<=14 for v in dl),'binnen termijn',sum(a['afgerond_op']<=a['termijn'] for a in x),'open',sum(a['prioriteit']==p_ for a in op))
print('getoetst_op==afgerond',all(a['getoetst_op']==a['afgerond_op'] for a in kl2),'toetser!=houder',all(a['toetser'].split(' (')[0]!=a['actiehouder'] for a in A))
for s in ['WPI coördinator','VGM-inspectie directie']:
    rr=[r for r in R if WI[r['wpi']]['soort']==s]; nw=len({r['wpi'] for r in rr}); c=C.Counter(r['oordeel'] for r in rr); w=C.Counter(r['waargenomen'] for r in rr)
    print(s,nw,len(rr),'neg/wpi',round((c['Afwijking']+c['Verbeterpunt'])/nw,1),'ja%',round(100*w['Waargenomen']/len(rr)),'ab%',round(100*w['Alleen bevestigd']/len(rr)))
x='WPI-20261105-DAM-C2'; print(x,sorted(C.Counter(r['oordeel'] for r in R if r['wpi']==x).items()),sorted(C.Counter(r['waargenomen'] for r in R if r['wpi']==x).items()),[(a['actie'][-1],a['status'],a['toetser'],a['bron']) for a in A if a['wpi']==x])
print('regel acties consistent',all(set(r['acties'])<= {a['actie'] for a in A} for r in R), 'neg zonder actie',[r['wpi'] for r in R if neg(r) and not r['acties']])
