import json,collections as C,datetime as D
d=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
W,A,P=d['wpis'],d['acties'],d['projecten']; peil=D.date.fromisoformat(d['peildatum'])
dd=D.date.fromisoformat
def mend(y,m): return (D.date(y+(m==12),m%12+1,1)-D.timedelta(days=1))
tot=[0,0]; per={}
for p in P:
    s,e=dd(p['start']),dd(p['eind']); lang=(e-s).days>31; risk=p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']
    ws=[dd(w['datum']) for w in W if w['project']==p['project']]
    cel={}
    if lang:
        y,m=s.year,s.month; eind=min(e,peil)
        while (y,m)<=(eind.year,eind.month):
            klaar=min(mend(y,m),e)<=peil  # periode voorbij
            ok=any((x.year,x.month)==(y,m) for x in ws)
            cel['%d-%02d'%(y,m)]=('✓' if ok else '✕') if klaar else ('✓L' if ok else 'oL')
            m+=1
            if m==13: y,m=y+1,1
    elif risk:
        klaar=e<=peil; ok=len(ws)>0
        mk=(ws[0] if ok else min(e,peil)).strftime('%Y-%m')
        cel[mk]=('✓' if ok else '✕') if klaar else ('✓L' if ok else 'oL')
    else: cel['?']='1op4'
    x=sum(v=='✓' for v in cel.values()); y_=sum(v in('✓','✕') for v in cel.values())
    per[p['project']]=(p['product'],'lang' if lang else ('kort-risico' if risk else 'kort'),x,y_,cel)
    tot[0]+=x; tot[1]+=y_
for k,v in per.items(): print(k,v)
print('TOTAAL',tot, round(100*tot[0]/tot[1]))
for cat in ['lang','kort-risico','kort']:
    s=[v for v in per.values() if v[1]==cat]; print(cat,len(s),sum(v[2] for v in s),sum(v[3] for v in s))
print('projecten zonder enige verplichte WPI gedaan', [k for k,v in per.items() if v[3]>0 and v[2]==0])
print('gemiste verplichtingen per maand', C.Counter(m for v in per.values() for m,c in v[4].items() if c=='✕'))
print('vervulde per maand', C.Counter(m for v in per.values() for m,c in v[4].items() if c=='✓'))
print('lopend',[(k,m,c) for k,v in per.items() for m,c in v[4].items() if c.endswith('L')])
# terugkerende bevindingen
b=C.defaultdict(list)
for a in A: b[a['bevinding']].append(a)
for t,v in sorted(b.items(),key=lambda x:(-len(x[1]),x[0])):
    if len(v)>1: print(len(v),len({a['wpi'] for a in v}),t,sorted({W_['product'] for a in v for W_ in W if W_['nr']==a['wpi']}),sorted({a['classificatie'] for a in v}),C.Counter(a['status'] for a in v))
print('acties met unieke bevinding', sum(1 for v in b.values() if len(v)==1), 'groepen>1', sum(1 for v in b.values() if len(v)>1), 'acties in groepen>1', sum(len(v) for v in b.values() if len(v)>1))
