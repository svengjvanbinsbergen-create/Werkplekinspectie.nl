"""Meet per staande pagina hoeveel van het tekstvlak onder de laatste inhoud leeg is (tekst + tabelranden)."""
import sys, subprocess, re
pdf = sys.argv[1]
out = subprocess.run(["pdftotext", "-bbox", pdf, "-"], capture_output=True, text=True).stdout
pages = re.findall(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', out, flags=re.S)
TOP, BOT = 1300 / 20, 842 - 1560 / 20
for i, (w, h, body) in enumerate(pages, 1):
    if float(w) > float(h):
        print(f"p{i}: liggend"); continue
    ys = [float(m) for m in re.findall(r'yMax="([\d.]+)"', body)]
    ys = [y for y in ys if TOP - 5 < y < BOT + 2]
    if not ys:
        print(f"p{i}: leeg/omslag"); continue
    leeg = (BOT - max(ys)) / (BOT - TOP)
    print(f"p{i}: laatste inhoud {max(ys):.0f} pt, leeg {leeg:.0%}" + ("  <-- >15%" if leeg > 0.15 else ""))
