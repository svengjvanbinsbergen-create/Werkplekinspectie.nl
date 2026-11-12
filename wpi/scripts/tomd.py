import json, sys, os, re
kb=json.load(open(sys.argv[1])); out=sys.argv[2]; os.makedirs(out,exist_ok=True)
codes={'Drumscreen':'TRF','Damwanden':'DAM','Compactvijzel':'CPV','Slibindikker':'SLI','Kettingreiniger':'KET','Landox':'LDX','Beluchter':'BEL','Semi Hydrovijzel':'SHV','Borstelbeluchter':'BBL','Drijvende Beluchter':'DBL','Semi Compactvijzel':'SCV','Instorttrogvijzel':'ITV','Roosterreiniger':'ROO','Compact Hydrovijzel':'CHV','Bandscreen':'BAN','Microfilter':'MIC','Indraaivijzel':'IDV','Dompelpompen':'POM','Buisvijzel':'BUV','Nabezinktank':'NBT','Stortmalvijzel':'SMV'}
names={'Drumscreen':'Trommelfilter (Drumscreen)','Damwanden':'Damwand','Semi Hydrovijzel':'Semi Compact Hydrovijzel','Bandscreen':'Bandfilter (Bandscreen)','Dompelpompen':'Pompen (Dompelpompen)','Landox':'Landox (FlowBooster)'}
idx=[]; tot=0
for p in kb:
    c=codes[p['product']]; nm=names.get(p['product'],p['product'])
    L=[f"# WPI-kennisbank — {nm} ({c})","",f"Bron: product-TRA {nm}. Elke regel is één risico met de maatregelen die de inspecteur aan de praktijk toetst. Het ID is de vaste sleutel in het WPI-rapport.",""]
    L+=["## Standaardmaatregelen (gelden bij iedere taakstap)",""]+[f"- {y.strip()}" for x in p['standaard'] for y in x.split('\n') if y.strip()]+[""]
    L+=["## Fasen en taken",""]
    for fi,f in enumerate(p['fasen'],1):
        fn=re.sub(r'^\d+\.\s*','',f['fase'])
        taken=[]
        for r in f['regels']:
            if r['taak'] not in taken: taken.append(r['taak'])
        L.append(f"- Fase {fi} {fn}: "+'; '.join(taken))
    L.append("")
    n=0
    for fi,f in enumerate(p['fasen'],1):
        fn=re.sub(r'^\d+\.\s*','',f['fase'])
        L+= [f"## Fase {fi} — {fn}",""]
        for ri,r in enumerate(f['regels'],1):
            n+=1
            L.append(f"### {c}-{fi}.{ri:02d}")
            L.append(f"- Taak: {r['taak']}")
            if r['taakstap']: L.append(f"- Taakstap: {r['taakstap']}")
            L.append(f"- Risico: {r['risico']}")
            ms=[m.strip() for m in r['maatregel'].split('\n') if m.strip()]
            L.append("- Maatregelen:")
            L+= [f"  - {m}" for m in ms]
            if r['verantwoordelijke']: L.append(f"- Verantwoordelijke: {r['verantwoordelijke']}")
            L.append("")
    fn=f"{out}/TRA-{c}-{nm.split(' (')[0].replace(' ','-')}.md"
    open(fn,'w').write('\n'.join(L)); tot+=os.path.getsize(fn)
    idx.append((c,nm,len(p['fasen']),n,os.path.basename(fn),os.path.getsize(fn)))
for i in idx: print(i)
print('total',tot)
json.dump(idx,open(out+'/_index.json','w'))
