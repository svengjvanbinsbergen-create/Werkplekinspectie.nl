#!/bin/bash
# Twee keer bouwen: de tweede keer met de paginanummers van de koppen uit de eerste render.
set -e
cd /home/claude/wpi/build
OUT="/home/claude/wpi/run/out"
N="Voorstel nieuwe methode werkplekinspecties"
python3 bouw_v3.py ${1:-} 2>&1 | tail -2
(cd "$OUT" && soffice --headless --convert-to pdf --outdir . "$N.docx" >/dev/null 2>&1)
python3 - <<'E'
import subprocess, json, re
pdf="/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.pdf"
n=int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo",pdf],capture_output=True,text=True).stdout).group(1))
koppen=["Samenvatting","1. Aanleiding en wat er verandert","2. Zo verloopt een WPI","3. Wat we per WPI vastleggen","4. Welke trenddata dit oplevert","5. Procedure Werkplekinspecties, versie 2.0 concept","6. Dekking van de VCA-eisen 7.1 en 7.2","7. Risico's en open punten","8. Te nemen besluiten en de proef","Bijlage A. Vast te leggen gegevens per WPI"]
toc={}
words=[]
for i in range(1,n+1):
    t=subprocess.run(["pdftotext","-f",str(i),"-l",str(i),pdf,"-"],capture_output=True,text=True).stdout
    words.append(len(t.split()))
    regels=[r.strip() for r in t.splitlines()]
    for k in koppen:
        if k in regels and k not in toc: toc[k]=i
    if "Samenvatting" in regels and "Samenvatting" not in toc: toc["Samenvatting"]=i
json.dump(toc,open("/home/claude/wpi/build/toc.json","w"),ensure_ascii=False)
print("pagina's",n,"| woorden per pagina",words)
print(toc)
E
