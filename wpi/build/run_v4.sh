#!/bin/bash
set -e
cd /home/claude/wpi/build
OUT="/home/claude/wpi/run/out"
N="Voorstel nieuwe methode werkplekinspecties"
python3 bouw_v4.py ${1:-} 2>&1 | grep -v "^$" | tail -3
(cd "$OUT" && soffice --headless --convert-to pdf --outdir . "$N.docx" >/dev/null 2>&1)
python3 - <<'P'
import subprocess, json, re
pdf="/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.pdf"
n=int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo",pdf],capture_output=True,text=True).stdout).group(1))
keys=json.load(open("/home/claude/wpi/build/toc_keys.json"))
toc={}; words=[]
for i in range(1,n+1):
    t=subprocess.run(["pdftotext","-f",str(i),"-l",str(i),pdf,"-"],capture_output=True,text=True).stdout
    words.append(len(t.split()))
    regels=[" ".join(r.split()) for r in t.splitlines()]
    for k in keys:
        if k not in toc and k in regels: toc[k]=i
for k in keys:
    if k=="Samenvatting": toc[k]=2
json.dump(toc,open("/home/claude/wpi/build/toc4.json","w"),ensure_ascii=False)
print("pagina's",n,"| woorden",words)
print({k:v for k,v in toc.items()}, "| ontbreekt:", [k for k in keys if k not in toc])
P
