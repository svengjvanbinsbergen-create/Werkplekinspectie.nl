# Rendert de webschermen van deze bouwer (1440x900) naar v2/shots en draait de controle uit tools/render.py.
import sys, re, glob
src = open('/home/claude/app/tools/render.py').read()
CHECK = re.search(r"CHECK = r'''(.*?)'''", src, re.S).group(1)
from playwright.sync_api import sync_playwright
codes = sys.argv[1:] or ['W07', 'W08', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14', 'W15', 'W17']
with sync_playwright() as p:
    b = p.chromium.launch()
    for f in sorted(glob.glob('/home/claude/app/v2/screens/web/*.html')):
        code = f.split('/')[-1][:-5]
        if not any(code.startswith(c) for c in codes):
            continue
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        pg = ctx.new_page(); pg.goto('file://' + f); pg.wait_for_timeout(500)
        r = pg.evaluate(CHECK)
        pg.locator('#root').screenshot(path=f'/home/claude/app/v2/shots/{code}.png')
        print(code, r['w'], r['h'], 'bad', r['bad'][:6], 'clip', r['clip'][:5], 'out', r['out'][:3])
        ctx.close()
    b.close()
