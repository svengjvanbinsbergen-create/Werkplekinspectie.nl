import sys, json, re
sys.path.insert(0, '/home/claude/app/tools')
src = open('/home/claude/app/tools/render.py').read()
CHECK = re.search(r"CHECK = r'''(.*?)'''", src, re.S).group(1)
from playwright.sync_api import sync_playwright
import glob
with sync_playwright() as p:
    b = p.chromium.launch()
    for f in sorted(glob.glob('/home/claude/app/v2/*.html')):
        code = f.split('/')[-1][:-5]
        ph = code.startswith('P')
        ctx = b.new_context(viewport={'width': 390 if ph else 1440, 'height': 844 if ph else 900}, device_scale_factor=2 if ph else 1)
        pg = ctx.new_page(); pg.goto('file://' + f); pg.wait_for_timeout(400)
        r = pg.evaluate(CHECK)
        small = pg.evaluate("""()=>[...document.querySelectorAll('#root button, #root a')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),(e.getAttribute('aria-label')||e.textContent).trim().slice(0,30)]}).filter(x=>x[1]<44||x[0]<44)""")
        pg.locator('#root').screenshot(path=f'/home/claude/app/v2/shots/{code}.png')
        print(code, r['w'], r['h'], 'bad', r['bad'][:8], 'clip', r['clip'][:5], 'out', r['out'][:5], 'small', small)
        ctx.close()
    b.close()
