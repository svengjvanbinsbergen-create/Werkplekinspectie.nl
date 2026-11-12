"""Taakstap per TRA-regel uit de bron-xltx, met samengevoegde cellen correct opgelost.
Volgt dezelfde regelvolgorde als extract.py (id = CODE-fase.regelnr), zodat ids aansluiten op kennisbank.json.
Uitvoer: {id: {"taakstap": str|None, "rij": int, "bron": "eigen cel"|"samengevoegd"|"geen", "taak_bron": str, "risico_bron": str}}"""
import sys, glob, openpyxl, os, json, re, warnings
warnings.filterwarnings('ignore')
src, out = sys.argv[1], sys.argv[2]
codes={'Drumscreen':'TRF','Damwanden':'DAM','Compactvijzel':'CPV','Slibindikker':'SLI','Kettingreiniger':'KET','Landox':'LDX','Beluchter':'BEL','Semi Hydrovijzel':'SHV','Borstelbeluchter':'BBL','Drijvende Beluchter':'DBL','Semi Compactvijzel':'SCV','Instorttrogvijzel':'ITV','Roosterreiniger':'ROO','Compact Hydrovijzel':'CHV','Bandscreen':'BAN','Microfilter':'MIC','Indraaivijzel':'IDV','Dompelpompen':'POM','Buisvijzel':'BUV','Nabezinktank':'NBT','Stortmalvijzel':'SMV'}
def s(v): return re.sub(r'[ \t]+',' ',str(v)).strip() if v is not None else ''
res={}; ff_diff=[]
for f in sorted(glob.glob(src+'/*.xltx')):
    wb=openpyxl.load_workbook(f,data_only=True); ws=wb.worksheets[0]
    product=re.sub(r'^TRA\s+|\s*\((2|WMS)\)$','',ws.title).strip(); c=codes[product]
    merged=[(m.min_row,m.max_row,m.min_col,m.max_col) for m in ws.merged_cells.ranges]
    def owner(r,col):  # (r0,c0) top-left of merged range containing cell, or None
        for a,b,x,y in merged:
            if a<=r<=b and x<=col<=y: return (a,x,b,y)
        return None
    rows=[[s(cc.value) for cc in r] for r in ws.iter_rows()]
    cur=None; fi=0; ri=0; cols=None; step_ff=''
    for i,r in enumerate(rows, start=1):
        if not any(r): continue
        low=[x.lower() for x in r]
        if any(x.startswith('standaard maatregelen') for x in low): continue
        mi=next((j for j,x in enumerate(low) if x.startswith('maatregel(en)')),None)
        if mi is not None:
            fi+=1; ri=0; cur=True; cols={'m':mi}; step_ff=''; continue
        if any(x.startswith('gevaar en risico bij') for x in low) and cur:
            ti=next(j for j,x in enumerate(low) if x)
            gi=next((j for j,x in enumerate(low) if x.startswith('gevaar')),ti+2)
            si=next((j for j,x in enumerate(low) if x.startswith('taakstap')),ti+1 if ti+1<gi else None)  # kolom tussen Taak en Gevaar, ook als het kopje ontbreekt
            cols.update(t=ti,st=si,g=gi,hdr=i); continue
        if not cur: continue
        t=r[cols['t']]; st=r[cols['st']] if cols['st'] is not None else ''
        g=r[cols['g']]; m=r[cols['m']]
        if t: step_ff=''
        if st: step_ff=st
        if not g and not m: continue
        ri+=1; rid=f"{c}-{fi}.{ri:02d}"
        # merge-resolved taakstap
        val=None; how='geen'
        if cols['st'] is None:
            how='geen kolom Taakstap in koprij'
        else:
            col=cols['st']+1; o=owner(i,col)
            if o and o[1]<=cols['t']+1:   # range begint in/links van taak-kolom: cel hoort bij Taak
                how='samengevoegd met Taak'
            elif o:
                v=s(ws.cell(o[0],o[1]).value); val=v or None; how='samengevoegd (rij %d)'%o[0] if o[0]!=i else 'eigen cel'
            else:
                v=st; val=v or None; how='eigen cel' if v else 'leeg'
        if (val or '')!=step_ff: ff_diff.append((rid,val,step_ff))
        res[rid]={'taakstap':val,'rij':i,'bron':how,'risico_bron':g,'taak_bron':t}
json.dump(res,open(out,'w'),ensure_ascii=False,indent=1)
print('regels',len(res),'met taakstap',sum(1 for v in res.values() if v['taakstap']))
from collections import Counter
print(Counter(v['bron'].split(' (')[0] for v in res.values()))
print('verschil met forward-fill van extract.py:',len(ff_diff))
for d in ff_diff[:40]: print('  ',d)
