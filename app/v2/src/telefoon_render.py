import sys, re, glob
src = open('/home/claude/app/tools/render.py').read()
CHECK = re.search(r"CHECK = r'''(.*?)'''", src, re.S).group(1)
from playwright.sync_api import sync_playwright
names = sys.argv[1:]
with sync_playwright() as p:
    b = p.chromium.launch()
    for n in names:
        f = f'/home/claude/app/v2/screens/phone/{n}.html'
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        pg = ctx.new_page(); pg.goto('file://' + f); pg.wait_for_timeout(500)
        r = pg.evaluate(CHECK)
        small = pg.evaluate("""()=>[...document.querySelectorAll('#root button, #root a')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),(e.getAttribute('aria-label')||e.textContent).trim().slice(0,30)]}).filter(x=>x[1]<44||x[0]<44)""")
        pg.locator('#root').screenshot(path=f'/home/claude/app/v2/shots/{n}.png')
        print(n, r['w'], r['h'], 'bad', r['bad'][:8], 'clip', r['clip'][:5], 'out', r['out'][:5], 'small', small)
        ctx.close()
    b.close()
