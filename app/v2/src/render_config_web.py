import sys, re, glob
src = open('/home/claude/app/tools/render.py').read()
CHECK = re.search(r"CHECK = r'''(.*?)'''", src, re.S).group(1)
from playwright.sync_api import sync_playwright
sys.path.insert(0,'/home/claude/app/v2/src'); from config_web import FILES; NAMES = sys.argv[1:] or list(FILES)
BOTTOM = """()=>{const m=document.querySelector('main');let b=0,who='';for(const e of m.querySelectorAll('*')){const r=e.getBoundingClientRect();if(r.height>0&&r.bottom>b){b=r.bottom;who=(e.textContent||'').trim().slice(0,30)}}return [Math.round(b),who]}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page()
    for code in NAMES:
        f = f'/home/claude/app/v2/screens/web/{code}.html'
        pg.goto('file://' + f); pg.wait_for_timeout(300)
        r = pg.evaluate(CHECK); bot = pg.evaluate(BOTTOM)
        small = pg.evaluate("""()=>[...document.querySelectorAll('#root button, #root a')].map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height),(e.getAttribute('aria-label')||e.textContent).trim().slice(0,30)]}).filter(x=>x[1]<36)""")
        pg.locator('#root').screenshot(path=f'/home/claude/app/v2/shots/{code}.png')
        print(code, 'bottom', bot, 'bad', r['bad'][:6], 'clip', r['clip'][:4], 'out', r['out'][:3], 'small', small[:5])
    b.close()
