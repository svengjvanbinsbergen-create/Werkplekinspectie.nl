"""Zet de ruwe screenshots (shots/) om naar de beelden van de handleiding (..) en de randversies voor de docx (emb/).
Volgorde:  1) server op poort 8700 in een git-archive-kopie van webapp/   2) node shots.js   3) python3 kopieer.py   4) node bouw.js"""
import os, shutil
from PIL import Image, ImageOps
H = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(H, "shots"); DST = os.path.dirname(H); EMB = os.path.join(H, "emb")
M = {"01-inloggen": "01-inloggen", "02-vandaag": "02-vandaag", "02b-menu": "03-menu", "03-taak": "04-taak", "04-wat-zie-je": "05-wat-zie-je",
     "04b-direct-gevaar": "06-direct-gevaar", "05-koppelen": "07-koppelen-tra", "06-oordeel": "08-oordeel", "07-actie": "09-actievoorstel",
     "08-nog-iets": "10-nog-iets-gezien", "09-monteurs": "11-monteurs", "10-controle": "12-controle", "11-ondertekenen": "13-ondertekenen",
     "12-vastgelegd": "14-vastgelegd", "14-weergave": "17-weergave", "15-veld-zon": "18-veld-zonmodus", "31-acties-instellen": "19-acties-in-te-stellen",
     "32-actie-instellen": "20-actie-instellen", "33-toetser-fout": "21-toetser-fout", "35-actiehouder": "22-actiehouder", "36-toetsen": "23-toetsen",
     "37-afgerond": "24-afgerond", "38-meldingen": "25-meldingen", "20-oefenen": "26-oefenen", "21-oefenen-scene": "27-oefenen-scene"}
for a, b in M.items(): shutil.copy(os.path.join(SRC, a + ".png"), os.path.join(DST, b + ".png"))
im = Image.open(os.path.join(SRC, "13-rapport-vol.png"))   # splitsen boven "4. Gesprek met de monteurs"; controleer bij een nieuwe opname
im.crop((0, 0, 780, 2370)).save(os.path.join(DST, "15-rapport-deel1.png"))
im.crop((0, 2370, 780, min(im.height, 3860))).save(os.path.join(DST, "16-rapport-deel2.png"))
os.makedirs(EMB, exist_ok=True)
for f in sorted(os.listdir(DST)):
    if f.endswith(".png"):
        ImageOps.expand(Image.open(os.path.join(DST, f)).convert("RGB"), border=3, fill=(200, 205, 208)).save(os.path.join(EMB, f), optimize=True)
print("klaar")
