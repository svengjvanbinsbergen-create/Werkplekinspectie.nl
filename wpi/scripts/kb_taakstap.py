import json, collections
D='/home/claude/wpi/run/data/'
kb=json.load(open(D+'kennisbank_v1.json')); t=json.load(open('/home/claude/wpi/scripts/taakstap_bron.json'))
new={}
for c,p in kb.items():
    regels=[]
    for r in p['regels']:
        q={}
        for k,v in r.items():
            q[k]=v
            if k=='taak': q['taakstap']=t[r['id']]['taakstap']
        regels.append(q)
    new[c]={**p,'regels':regels}
json.dump(new,open(D+'kennisbank.json','w'),ensure_ascii=False,indent=1)
# controle
L=['# Controle kennisbank — niveau taakstap (12-11-2026)','',
 'Bron: `/mnt/user-data/uploads/*.xltx` (één werkblad per product, alle "(2)"/"(WMS)"-bladen), uitgelezen met `scripts/taakstap_extract.py` (samengevoegde cellen opgelost). Uitkomst is identiek aan `kb_raw.json` en aan de "- Taakstap:"-regels in `kb/TRA-*.md`; md-bestanden daarom niet bijgewerkt.',
 'Koppeling op id (CODE-fase.regelnr); risicotekst per id gecontroleerd (656 letterlijk gelijk, 10 alleen witruimte-verschil in "Vrijkomen van stof …").','',
 '| Product | Code | Regels v1 | Regels v2 | Met taakstap | Zonder (null) | Taken | Unieke taakstappen |','|---|---|---|---|---|---|---|---|']
tot=collections.Counter(); per_taak=[]
for c in sorted(new):
    o=kb[c]['regels']; n=new[c]['regels']
    met=sum(1 for r in n if r['taakstap']); taken=collections.OrderedDict()
    for r in n: taken.setdefault(r['taak'],set()); 
    for r in n:
        if r['taakstap']: taken[r['taak']].add(r['taakstap'])
    uniq=sum(len(v) for v in taken.values())
    L.append(f"| {new[c]['naam']} | {c} | {len(o)} | {len(n)} | {met} | {len(n)-met} | {len(taken)} | {uniq} |")
    tot.update(v1=len(o),v2=len(n),met=met,zonder=len(n)-met,taken=len(taken),uniq=uniq)
    for tk,v in taken.items(): per_taak.append((c,tk,sum(1 for r in n if r['taak']==tk),len(v)))
L.append(f"| **Totaal** | | **{tot['v1']}** | **{tot['v2']}** | **{tot['met']}** | **{tot['zonder']}** | **{tot['taken']}** | **{tot['uniq']}** |")
bron=collections.Counter(v['bron'].split(' (')[0] for v in t.values())
L+=['','Waarom null: '+', '.join(f"{k}: {v}" for k,v in bron.items())+'. De bron-TRA\'s zijn gegeneraliseerde bladen; bij de meeste taken is de kolom Taakstap samengevoegd met Taak (dus geen taakstap in de bron).','',
    '## Unieke taakstappen per taak','','| Code | Taak | Regels | Unieke taakstappen |','|---|---|---|---|']
L+=[f"| {c} | {tk} | {n} | {u} |" for c,tk,n,u in per_taak]
L+=['',f"Taken met minstens één taakstap: {sum(1 for x in per_taak if x[3])} van {len(per_taak)}."]
open(D+'kennisbank_controle.md','w').write('\n'.join(L)+'\n')
print('\n'.join(L[:35]))
