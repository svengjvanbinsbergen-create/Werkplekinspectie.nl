import json,collections as C,datetime as D,re
d=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
W,A,P,R,PG=d['wpis'],d['acties'],d['projecten'],d['regels'],d['programma']; peil=D.date.fromisoformat(d['peildatum'])
dd=D.date.fromisoformat
def mend(y,m): return (D.date(y+(m==12),m%12+1,1)-D.timedelta(days=1))
def wd(a,b): return sum(1 for i in range((b-a).days+1) if (a+D.timedelta(i)).weekday()<5)
pn=lambda s:s.lower().split(' (')[0]
def past(w,p): return w['locatie']==p['locatie'] and (pn(p['product']).startswith(pn(w['product'])) or pn(w['product']).startswith(pn(p['product'])))
Pm={p['project']:p for p in P}
waarsch=[w['nr'] for w in W if w['project'] not in Pm or not past(w,Pm[w['project']])]
print('koppel-waarschuwingen',waarsch)
ob=[]
for p in P:
    s,e=dd(p['start']),dd(p['eind'])
    if s>peil: continue
    ws=[dd(w['datum']) for w in W if w['project']==p['project'] and past(w,p)]
    risk=p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']
    if (e-s).days>31:
        y,m=s.year,s.month; eind=min(e,peil)
        while (y,m)<=(eind.year,eind.month):
            a=max(s,D.date(y,m,1)); b=min(e,mend(y,m)); ok=any((x.year,x.month)==(y,m) for x in ws)
            if wd(a,b)>=10:
                klaar=b<=peil
                ob.append((p['project'],'lang','%d-%02d'%(y,m),ok,ok or klaar))
            m+=1
            if m==13: y,m=y+1,1
    elif risk:
        ok=bool(ws); ob.append((p['project'],'risico',(min(ws) if ws else min(e,peil)).strftime('%Y-%m'),ok,ok or e<=peil))
tel=[o for o in ob if o[4]]; x=sum(o[3] for o in tel)
print('PW',x,len(tel),round(100*x/len(tel)))
for c in ['lang','risico']:
    t=[o for o in tel if o[1]==c]; print(c,sum(o[3] for o in t),len(t))
print('lopend niet gehaald',[o for o in ob if not o[4]])
print('nov',[(o[0],o[3]) for o in ob if o[2]=='2026-11'])
geen=[p['project'] for p in P if dd(p['start'])<=peil and not any(w['project']==p['project'] and past(w,p) for w in W)]
print('projecten zonder enige WPI',len(geen),geen)
print('gemist',[(o[0],o[2]) for o in tel if not o[3]])
# programma coordinator vs directie
dirn={w['inspecteur'] for w in W if 'directie' in w['soort']}
for lab,f in [('coord',lambda p:p['inspecteur'] not in dirn),('dir',lambda p:p['inspecteur'] in dirn)]:
    print(lab,sum(p['uitgevoerd'] for p in PG if f(p)),sum(p['gepland'] for p in PG if f(p)))
# terugkerend: same class + >=2 shared stems or same normalized text
STOP=set('geen niet door voor werd zijn staat stond hing tijdens binnen daarom alleen blijft wordt naar over onder zonder bovenaan vooraf'.split())
def stems(t): return {w[:6] for w in re.findall(r'[a-zà-ÿ]+',t.lower()) if len(w)>=4 and w not in STOP}
par=list(range(len(A)))
def f(i):
    while par[i]!=i: par[i]=par[par[i]]; i=par[i]
    return i
for i in range(len(A)):
    for j in range(i+1,len(A)):
        a,b=A[i],A[j]
        n=len(stems(a['bevinding'])&stems(b['bevinding']))
        if a['classificatie']==b['classificatie'] and (n>=2 or (n>=1 and a['ref']==b['ref'])): par[f(i)]=f(j)
g=C.defaultdict(list)
for i in range(len(A)): g[f(i)].append(A[i])
rec=[v for v in g.values() if len({a['wpi'] for a in v})>1]
rec.sort(key=lambda v:(-len(v),-len({a['wpi'] for a in v})))
for v in rec:
    terug=any(a['afgerond_op'] and any(a['afgerond_op']<b['datum'] for b in v) for a in v)
    print(len(v),len({a['wpi'] for a in v}),terug,v[0]['classificatie'],'|',' || '.join(sorted({a['bevinding'][:50] for a in v})))
print('groepen',len(rec),'acties',sum(map(len,rec)),'terug',sum(any(a['afgerond_op'] and any(a['afgerond_op']<b['datum'] for b in v) for a in v) for v in rec))
# open action age per priority
for pr in ['direct','kort','planmatig']:
    o=[(peil-dd(a['datum'])).days for a in A if a['status']=='Open' and a['prioriteit']==pr]
    print(pr,'open',len(o),round(sum(o)/len(o),1) if o else None,max(o) if o else None)
