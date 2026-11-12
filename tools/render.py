import sys, asyncio
from playwright.async_api import async_playwright
async def main(names):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2)
        for n in names:
            await pg.goto(f'file:///home/claude/app/screens/phone/{n}.html')
            await pg.wait_for_timeout(400)
            info = await pg.evaluate('''() => {const r=(document.getElementById('root')||document.body.firstElementChild);const b=r.getBoundingClientRect();
              // find overflowing children: elements whose bottom exceeds their scroll container
              const out=[];document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if((s.overflow=='hidden')&&e.scrollHeight>e.clientHeight+1)out.push((e.tagName+' '+(e.textContent||'').trim().slice(0,40))+' sh='+e.scrollHeight+' ch='+e.clientHeight)});
              const c=[...r.querySelectorAll('div')].find(d=>getComputedStyle(d).flexGrow=='1'&&d.parentElement===r);let slack=null;if(c){const kids=[...c.children];const last=kids[kids.length-1];slack=Math.round(c.getBoundingClientRect().bottom-parseFloat(getComputedStyle(c).paddingBottom)-last.getBoundingClientRect().bottom);}
return {h:b.height,doc:document.documentElement.scrollHeight,slack:slack,ovf:out}}''')
            await pg.screenshot(path=f'/home/claude/app/shots/{n}.png', full_page=True)
            print(n, info)
        await b.close()
asyncio.run(main(sys.argv[1:]))
