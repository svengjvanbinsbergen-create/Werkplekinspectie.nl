import sys, glob, openpyxl, os, json, re, warnings
warnings.filterwarnings('ignore')
src, out = sys.argv[1], sys.argv[2]
def s(v):
    return re.sub(r'[ \t]+',' ',str(v)).strip() if v is not None else ''
kb=[]; report=[]
for f in sorted(glob.glob(src+'/*.xltx')):
    wb=openpyxl.load_workbook(f,data_only=True); ws=wb.worksheets[0]
    product=re.sub(r'^TRA\s+|\s*\((2|WMS)\)$','',ws.title).strip()
    fname=os.path.basename(f).split('-',1)[1].replace('.xltx','').replace('_',' ')
    rows=[[s(c.value) for c in r] for r in ws.iter_rows()]
    std=[]; phases=[]; cur=None; cols=None; task=''; step=''
    unparsed=[]
    for i,r in enumerate(rows, start=1):
        if not any(r): continue
        low=[x.lower() for x in r]
        if any(x.startswith('standaard maatregelen') for x in low):
            std=[x for x in r if x and not x.lower().startswith('standaard maatregelen')]; continue
        mi=next((j for j,x in enumerate(low) if x.startswith('maatregel(en)')),None)
        if mi is not None:
            name=next((x for x in r if x),'')
            vi=next((j for j,x in enumerate(low) if x.startswith('verantwoordelijke')),None)
            cur={'fase':name,'regels':[]}; phases.append(cur)
            cols={'m':mi,'v':vi}; task='';step=''; continue
        if any(x.startswith('gevaar en risico bij') for x in low) and cur is not None:
            ti=next(j for j,x in enumerate(low) if x)
            si=next((j for j,x in enumerate(low) if x.startswith('taakstap')),ti+1)
            gi=next((j for j,x in enumerate(low) if x.startswith('gevaar')),ti+2)
            cols.update(t=ti,st=si,g=gi); continue
        if cur is None:
            vals=[x for x in r if x]
            if len(vals)>3: std.append(vals[0]+': '+vals[1]+' -> '+next((x for x in vals[2:] if len(x)>25),''))
            else: unparsed.append((i,vals[:3]))
            continue
        t,st,g,m=r[cols['t']],r[cols['st']],r[cols['g']],r[cols['m']]
        if t: task=t; step=''
        if st: step=st
        if not g and not m:
            if t or st: pass
            else: unparsed.append((i,[x for x in r if x][:3]))
            continue
        cur['regels'].append({'taak':task,'taakstap':step,'risico':g,'maatregel':m,
            'verantwoordelijke':r[cols['v']] if cols['v'] is not None else ''})
    kb.append({'product':product,'bestand':fname,'standaard':std,'fasen':phases})
    report.append((fname,product,len(std),[(p['fase'],len(p['regels'])) for p in phases],unparsed))
json.dump(kb,open(out,'w'),ensure_ascii=False,indent=1)
for x in report:
    print(x[0],'|',x[1],'| std',x[2]); print('   ',x[3]); 
    if x[4]: print('   UNPARSED',x[4])
