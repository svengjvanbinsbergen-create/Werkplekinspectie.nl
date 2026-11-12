import subprocess, glob, os, sys
from PIL import Image
pdf="/home/claude/wpi/run/out/Voorstel nieuwe methode werkplekinspecties.pdf"
d="/tmp/vul"; os.makedirs(d,exist_ok=True)
for f in glob.glob(d+"/*"): os.remove(f)
subprocess.run(["pdftoppm","-gray","-r","30",pdf,d+"/p"])
uit=[]
for f in sorted(glob.glob(d+"/p-*.pgm")):
    im=Image.open(f); w,h=im.size; px=im.load()
    top=int(h*0.085); bot=int(h*0.80)   # inhoudsgebied tussen logo en golf
    last=top
    for y in range(top,bot):
        if any(px[x,y]<200 for x in range(int(w*0.08),int(w*0.92))): last=y
    uit.append(round((last-top)/(bot-top)*100))
print("vulling %:", list(enumerate(uit,1)))
