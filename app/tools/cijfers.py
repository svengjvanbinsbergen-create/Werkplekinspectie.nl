# v11 (koers2, 12-11-2026): dekking/Alleen bevestigd/Niet beoordeeld vervangen door maatregelen gezien + getoetste stappen per WPI.
# Rekent alle getallen voor W09-W12 uit voorbeelddata.json (fictief). Uitvoer: cijfers.json
import json, collections as C, datetime as DT, math
D=json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
W,R,A,P,PR=D['wpis'],D['regels'],D['acties'],D['programma'],D['projecten']
PEIL=D['peildatum']
def days(a,b): return (DT.date.fromisoformat(b)-DT.date.fromisoformat(a)).days
for w in W: w['maand']=w['datum'][:7]
out={}
out['n_wpi']=len(W); out['n_regels']=len(R); out['n_acties']=len(A); out['n_proj']=len(PR)
out['soort_wpi']=C.Counter(w['soort'] for w in W)
out['oordeel']=C.Counter(r['oordeel'] for r in R)
# v11 (koers2): geen dekking meer; wel 'maatregelen gezien' en 'getoetste stappen per WPI'
GEZIEN=lambda r:r['oordeel'] in('Conform','Afwijking','Verbeterpunt')
out['ingang']=C.Counter(w.get('ingang','ingepland') for w in W)
# v11.1 (afspraak eenheid): eenheid = risicoregel/onderwerp -> 'waarnemingen' (niet 'maatregelen gezien')
out['waarnemingen']=dict(totaal=sum(1 for r in R if GEZIEN(r)),NVT=sum(1 for r in R if r['oordeel']=='Niet van toepassing'),
    TRA=sum(1 for r in R if GEZIEN(r) and r['soort']=='TRA'),Algemeen=sum(1 for r in R if GEZIEN(r) and r['soort']=='Algemeen'),
    buiten_TRA=sum(1 for r in R if GEZIEN(r) and r['soort']=='Buiten TRA'))
out['stappen_per_wpi']={w['nr']:w.get('getoetste_stappen',[]) for w in W}
out['n_stappen_per_wpi']={w['nr']:len(w.get('getoetste_stappen',[])) for w in W}
out['n_stappen_tot']=sum(out['n_stappen_per_wpi'].values())
out['stappen_met_taakstap']=sum(1 for w in W for x in w.get('getoetste_stappen',[]) if x['taakstap'])
# getoetst = taken (per WPI uniek) en taakstappen (waar de TRA ze kent)
# toetsniveau: taak (TRA zonder taakstap) of taakstap; 15 + 11 = 26 getoetste stappen
out['getoetst']=dict(taken=sum(1 for w in W for x in w.get('getoetste_stappen',[]) if not x['taakstap']),taakstappen=out['stappen_met_taakstap'])
out['taken_getoetst']=C.Counter(x['taak'] for w in W for x in w.get('getoetste_stappen',[])).most_common()
out['oordeel_soort']={s:C.Counter(r['oordeel'] for r in R if r['soort']==s) for s in ['Algemeen','TRA','Buiten TRA']}
# oordelen per maand
mnd=sorted(set(w['maand'] for w in W))
out['oordeel_maand']={m:C.Counter(r['oordeel'] for r in R if r['datum'][:7]==m) for m in mnd}
out['wpi_maand']={m:sum(1 for w in W if w['maand']==m) for m in mnd}
# A+V per klasse
NEG=lambda r:r['oordeel'] in('Afwijking','Verbeterpunt')
out['neg_klasse']=C.Counter(r['classificatie'] for r in R if NEG(r)).most_common()
out['neg_klasse_A']=C.Counter(r['classificatie'] for r in R if r['oordeel']=='Afwijking')
out['neg_klasse_V']=C.Counter(r['classificatie'] for r in R if r['oordeel']=='Verbeterpunt')
out['n_neg']=sum(1 for r in R if NEG(r))
# klasse: maatregelen gezien per klasse
kl={}
for r in R:
    k=kl.setdefault(r['classificatie'],C.Counter()); k[r['oordeel']]+=1; k['tot']+=1
out['klasse_gezien']=kl
# afwijkende TRA-maatregelen: per ref A/V
tra=[r for r in R if r['soort']=='TRA']
byref={}
for r in tra:
    b=byref.setdefault(r['ref'],{'ref':r['ref'],'oms':r['omschrijving'],'klasse':r['classificatie'],'taak':r.get('taak'),'taakstap':r.get('taakstap'),'getoetst':0,'A':0,'V':0,'C':0,'NVT':0,'wpis':[]})
    b['getoetst']+=1; b['wpis'].append(r['wpi'])
    o=r['oordeel']
    key={'Afwijking':'A','Verbeterpunt':'V','Conform':'C','Niet van toepassing':'NVT'}.get(o)
    if key: b[key]+=1
afw=sorted([b for b in byref.values() if b['A']+b['V']>0],key=lambda b:(-(b['A']+b['V']),-b['A'],b['ref']))
out['tra_afw']=afw
out['n_tra_refs']=len(byref); out['n_tra_refs_afw']=len(afw)
out['tra_neg_rows']=sum(1 for r in tra if NEG(r))
out['tra_rows']=len(tra)
# prefix (product) for A/V TRA
out['tra_neg_prod']=C.Counter(r['ref'].split('-')[0] for r in tra if NEG(r))
out['buiten_tra']=[{'wpi':r['wpi'],'oms':r['omschrijving'],'oordeel':r['oordeel'],'klasse':r['classificatie']} for r in R if r['soort']=='Buiten TRA']
# acties
TNORM=lambda t:t.replace(' (ter plaatse)','').replace(', ter plaatse','')
open_=[a for a in A if a['status']=='Open']
out['act_status']=C.Counter(a['status'] for a in A)
out['act_prio']=C.Counter(a['prioriteit'] for a in A)
out['act_open_prio']=C.Counter(a['prioriteit'] for a in open_)
over=[a for a in open_ if a['termijn']<PEIL]
out['act_over']=[a['actie'] for a in over]
binnen7=[a for a in open_ if PEIL<=a['termijn']<= (DT.date.fromisoformat(PEIL)+DT.timedelta(days=7)).isoformat()]
out['act_binnen7']=[a['actie'] for a in binnen7]
out['act_toetser_open']=C.Counter(TNORM(a['toetser']) for a in open_)
out['act_houder_open']=C.Counter(a['actiehouder'] for a in open_)
out['act_toetser']=C.Counter(TNORM(a['toetser']) for a in A)
out['act_terplaatse']=sum(1 for a in A if 'ter plaatse' in a['toetser'])  # beide schrijfwijzen: '(ter plaatse)' en ', ter plaatse'
out['act_direct_gecorr']=sum(1 for a in A if a['direct_gecorrigeerd'])
out['act_dgm']=sum(1 for a in A if a['direct_genomen_maatregel'])
out['act_bron']=C.Counter(a['bron'] for a in A)
out['act_klasse']=C.Counter(a['classificatie'] for a in A).most_common()
af=[a for a in A if a['status']=='Afgerond']
dl=[days(a['datum'],a['afgerond_op']) for a in af]
out['doorloop_gem']=round(sum(dl)/len(dl),1)
out['doorloop_prio']={p:(round(sum(days(a['datum'],a['afgerond_op']) for a in af if a['prioriteit']==p)/max(1,sum(1 for a in af if a['prioriteit']==p)),1),sum(1 for a in af if a['prioriteit']==p)) for p in ['direct','kort','planmatig']}
out['optijd']=sum(1 for a in af if a['afgerond_op']<=a['termijn']); out['n_af']=len(af)
out['laat_af']=[a['actie'] for a in af if a['afgerond_op']>a['termijn']]
out['zelf_toets']=sum(1 for a in A if TNORM(a['toetser'])==a['actiehouder'])
out['open_ouder']=[(a['actie'],days(a['datum'],PEIL)) for a in open_]
OC={'Conform':'C','Afwijking':'A','Verbeterpunt':'V','Niet van toepassing':'NVT'}
# programma per werkplek (zelfde regel als bestaand dashboard / voorstel procedure 5.5)
RISK=lambda p: p['hijsen_mobiele_kraan'] or p['besloten_ruimte_vergunning'] or p['open_water']
LANG=lambda p: days(p['start'],p['eind'])>31
def mEind(m):
    y,n=int(m[:4]),int(m[5:7]); import calendar; return f"{m}-{calendar.monthrange(y,n)[1]:02d}"
def mVolg(m):
    y,n=int(m[:4]),int(m[5:7]); return f"{y+1}-01" if n==12 else f"{y}-{n+1:02d}"
def WDAG(a,b):
    a,b=DT.date.fromisoformat(a),DT.date.fromisoformat(b); return sum(1 for i in range((b-a).days+1) if (a+DT.timedelta(i)).weekday()<5)
PN=lambda s: s.lower().split(' (')[0]
PAST=lambda w,p: w['locatie']==p['locatie'] and (PN(p['product']).startswith(PN(w['product'])) or PN(w['product']).startswith(PN(p['product'])))
vp=[]; overig=[]
for p in PR:
    ws=sorted([w for w in W if w['project']==p['project'] and PAST(w,p)],key=lambda w:w['datum'])
    if p['start']>PEIL: continue
    if LANG(p):
        tot=(p['eind'] if p['eind']<PEIL else PEIL)[:7]; m=p['start'][:7]
        while m<=tot:
            w=[x for x in ws if x['maand']==m]; a_=max(p['start'],m+'-01'); b_=min(mEind(m),p['eind'])
            if WDAG(a_,b_)>=1:   # besluit 8: elke maand waarin gewerkt wordt telt (voorheen >=10 werkdagen)
                vp.append(dict(project=p['project'],product=p['product'],locatie=p['locatie'],cat='lang',maand=m,telt=len(w)>0 or b_<=PEIL,ok=len(w)>0,wpis=[x['nr'] for x in w]))
            m=mVolg(m)
    elif RISK(p):
        vp.append(dict(project=p['project'],product=p['product'],locatie=p['locatie'],cat='risico',maand=(ws[0]['maand'] if ws else (p['eind'] if p['eind']<PEIL else PEIL)[:7]),telt=len(ws)>0 or p['eind']<=PEIL,ok=len(ws)>0,wpis=[x['nr'] for x in ws]))
    else:
        overig.append(dict(project=p['project'],product=p['product'],cat='overig',ok=len(ws)>0,eind=p['eind']))
out['vp_geen']=[p['project'] for p in PR if p['start']<=PEIL and not any(w['project']==p['project'] and PAST(w,p) for w in W)]
out['vp']=vp; out['overig']=overig
t=[o for o in vp if o['telt']]
out['vp_x']=sum(1 for o in t if o['ok']); out['vp_y']=len(t)
out['vp_cat']={c:(sum(1 for o in t if o['ok'] and o['cat']==c),sum(1 for o in t if o['cat']==c)) for c in ['lang','risico']}
out['vp_lopend']=sum(1 for o in vp if not o['telt'])
out['vp_mis']=[o for o in t if not o['ok']]
# per project
pp={}
for p in PR:
    if p['start']>PEIL: continue
    l=[o for o in vp if o['project']==p['project']]
    pp[p['project']]=dict(p=p,cat=('lang' if LANG(p) else 'risico' if RISK(p) else 'overig'),dur=days(p['start'],p['eind']),
        obl=l, x=sum(1 for o in l if o['telt'] and o['ok']), y=sum(1 for o in l if o['telt']), wpis=[w['nr'] for w in W if w['project']==p['project']],
        risk=[k for k,n in [('hijsen_mobiele_kraan','hijsen'),('besloten_ruimte_vergunning','besloten ruimte'),('open_water','open water')] if p[k]])
out['per_project']=pp
# per inspecteur programma
out['programma']=P
# directie per kwartaal
def kw(m): return f"Q{(int(m[5:7])-1)//3+1} {m[:4]}"
out['dir_kw']=C.Counter(kw(w['maand']) for w in W if w['soort']=='VGM-inspectie directie')
out['insp_wpi']=C.Counter(w['inspecteur'] for w in W)
# wpi detail summaries
ws={}
for w in W:
    rr=[r for r in R if r['wpi']==w['nr']]; aa=[a for a in A if a['wpi']==w['nr']]
    ws[w['nr']]=dict(n=len(rr),oord=C.Counter(r['oordeel'] for r in rr),ingang=w.get('ingang','ingepland'),stappen=w.get('getoetste_stappen',[]),n_stappen=len(w.get('getoetste_stappen',[])),acties=len(aa),open=sum(1 for a in aa if a['status']=='Open'),alg=sum(1 for r in rr if r['soort']=='Algemeen'),tra=sum(1 for r in rr if r['soort']=='TRA'),bui=sum(1 for r in rr if r['soort']=='Buiten TRA'))
out['per_wpi']=ws
# ---------- ronde 2 (W08-W12, W09b): extra afgeleide getallen ----------
HSM='Hoofd Service & Montage'
out['act_open_n']=len(open_)
out['act_toetser_open_hsm']=sum(1 for a in open_ if TNORM(a['toetser'])==HSM)
out['act_houder_open_hsm']=sum(1 for a in open_ if a['actiehouder']==HSM)
out['act_open_detail']={a['actie']:dict(dagen_tot_termijn=days(PEIL,a['termijn']),dagen_open=days(a['datum'],PEIL)) for a in open_}
out['act_over_bron']=C.Counter(a['bron'] for a in over)
out['act_open_direct']=sum(1 for a in open_ if a['prioriteit']=='direct')
out['act_houders']=sorted(set(a['actiehouder'] for a in A)); out['act_toetsers']=sorted(set(TNORM(a['toetser']) for a in A))
out['act_klassen']=sorted(set(a['classificatie'] for a in A))
out['act_projecten']=sorted(set(next(w['project'] for w in W if w['nr']==a['wpi']) for a in A))
# verplichtingen per maand (afgesloten en lopend)
vm={}
for m in mnd:
    l=[o for o in vp if o['maand']==m]
    vm[m]=dict(ok=sum(1 for o in l if o['telt'] and o['ok']),y=sum(1 for o in l if o['telt']),lopend=sum(1 for o in l if not o['telt']),lopend_ok=sum(1 for o in l if not o['telt'] and o['ok']))
out['vp_maand']=vm
out['vp_lopend_ok']=sum(1 for o in vp if not o['telt'] and o['ok'])
# huidige maand per project
cur=PEIL[:7]; mstart=cur+'-01'; meind=mEind(cur)
RK=[('hijsen_mobiele_kraan','kraan'),('besloten_ruimte_vergunning','besloten ruimte'),('open_water','open water')]
nu=[]
for p in sorted(PR,key=lambda p:p['eind']):
    if not(p['start']<=PEIL and p['eind']>=mstart): continue
    cat='lang' if LANG(p) else 'risico' if RISK(p) else 'overig'
    if cat=='lang' and WDAG(max(p['start'],mstart),min(p['eind'],meind))<10: continue  # < 10 werkdagen: deze maand niet verplicht
    wsm=[w for w in W if w['project']==p['project'] and w['maand']==cur]
    wsall=[w for w in W if w['project']==p['project']]
    if wsm: st=dict(status='gedaan',wpi=wsm[0]['nr'],datum=wsm[0]['datum'],inspecteur=wsm[0]['inspecteur'])
    elif cat=='risico' and wsall: st=dict(status='al gedaan',wpi=wsall[0]['nr'],datum=wsall[0]['datum'],inspecteur=wsall[0]['inspecteur'])
    elif p['eind']<PEIL: st=dict(status='gemist')
    else: st=dict(status='nog te doen',dagen=days(PEIL,min(p['eind'],meind)),uiterlijk=min(p['eind'],meind))
    nu.append(dict(project=p['project'],product=p['product'],locatie=p['locatie'],start=p['start'],eind=p['eind'],dur=days(p['start'],p['eind']),cat=cat,risk=[n for k,n in RK if p[k]],**st))
out['maand_nu']=nu
out['maand_nu_telling']=C.Counter(x['status'] for x in nu)
volg=mVolg(cur); vs=volg+'-01'; ve=mEind(volg)
out['volgende_maand']=volg
out['volgende_maand_proj']=[dict(project=p['project'],product=p['product'],locatie=p['locatie'],eind=p['eind'],cat=('lang' if LANG(p) else 'risico' if RISK(p) else 'overig')) for p in sorted(PR,key=lambda p:p['eind']) if p['start']<=ve and p['eind']>=vs]
# programma per inspecteur
pi={}
for e in P:
    d=pi.setdefault(e['inspecteur'],dict(gepland=0,uitgevoerd=0,maanden={})); d['gepland']+=e['gepland']; d['uitgevoerd']+=e['uitgevoerd']; d['maanden'][e['maand']]=(e['uitgevoerd'],e['gepland'])
out['prog_insp']=pi; out['prog_gepland']=sum(e['gepland'] for e in P); out['prog_uitgevoerd']=sum(e['uitgevoerd'] for e in P)
# kwartalen in de periode en directiedeelname
kws=sorted(set(kw(m) for m in mnd)); out['kwartalen']=kws; out['dir_kw_ok']=sum(1 for q in kws if out['dir_kw'].get(q,0)>0)
out['maanden']=mnd; out['periode']=(min(w['datum'] for w in W),max(w['datum'] for w in W))
# trend per klasse: eerste helft (mei-aug) tegenover tweede helft (sep-nov)
H1=[m for m in mnd if m<='2026-08']; H2=[m for m in mnd if m>'2026-08']
out['trend_helften']=dict(H1=H1,H2=H2,wpi_H1=sum(1 for w in W if w['maand'] in H1),wpi_H2=sum(1 for w in W if w['maand'] in H2))
tk={}
for r in R:
    t=tk.setdefault(r['classificatie'],dict(tot=0,C=0,A=0,V=0,NVT=0,neg_H1=0,neg_H2=0,bui=0))
    t['tot']+=1; t[OC[r['oordeel']]]+=1
    if r['soort']=='Buiten TRA': t['bui']+=1
    if NEG(r): t['neg_H1' if r['datum'][:7] in H1 else 'neg_H2']+=1
for k,t in tk.items():
    aa=[a for a in A if a['classificatie']==k]
    t.update(act=len(aa),act_open=sum(1 for a in aa if a['status']=='Open'),act_af=sum(1 for a in aa if a['status']=='Afgerond'),act_te_laat=sum(1 for a in aa if (a['status']=='Afgerond' and a['afgerond_op']>a['termijn']) or (a['status']=='Open' and a['termijn']<PEIL)))
out['trend_klasse']=tk
out['buiten_tra_cnt']=C.Counter(b['oms'] for b in out['buiten_tra']).most_common()
out['positief']=out['oordeel'].get('Conform',0)
BASE=lambda t:t.split(';')[0].split(':')[0].strip().rstrip('.')
th={}
for a in A:
    k=(a['classificatie'],BASE(a['bevinding']))
    d=th.setdefault(k,dict(klasse=k[0],thema=k[1],n=0,wpis=[],open=0,refs=[])); d['n']+=1; d['wpis'].append(a['wpi']); d['open']+=a['status']=='Open'; d['refs'].append(a['ref'])
out['thema']=sorted([d for d in th.values() if d['n']>1],key=lambda d:(-d['n'],d['klasse']))
json.dump(out,open('/home/claude/app/tools/cijfers.json','w'),ensure_ascii=False,indent=1,default=list)
# print summary
for k in ['n_wpi','n_regels','n_acties','soort_wpi','ingang','oordeel','waarnemingen','getoetst','n_stappen_per_wpi','n_stappen_tot','stappen_met_taakstap','oordeel_soort','wpi_maand','neg_klasse','n_neg','n_tra_refs','n_tra_refs_afw','tra_neg_rows','tra_rows','tra_neg_prod','act_status','act_prio','act_open_prio','act_over','act_binnen7','act_toetser_open','act_houder_open','act_toetser','act_terplaatse','act_direct_gecorr','act_dgm','act_bron','doorloop_gem','doorloop_prio','optijd','n_af','laat_af','zelf_toets','vp_x','vp_y','vp_cat','vp_lopend','dir_kw','insp_wpi','overig']:
    print(k, out[k])
print('MIS', [(o['project'],o['maand'],o['cat']) for o in out['vp_mis']])
print('TRA AFW', [(b['ref'],b['A'],b['V'],b['getoetst'],b['klasse']) for b in afw])
for k,v in pp.items(): print(k,v['p']['product'],v['cat'],v['dur'],v['x'],'/',v['y'],[ (o['maand'],o['ok'],o['telt']) for o in v['obl']], v['wpis'], v['risk'])
print('open_ouder',out['open_ouder'])
print('mnd oord',{m:dict(v) for m,v in out['oordeel_maand'].items()})
print('klasse_gezien',{k:dict(v) for k,v in kl.items()})
