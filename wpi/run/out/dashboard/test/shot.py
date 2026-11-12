import asyncio,sys,json
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for theme,w,hh in [('light',1280,800),('dark',400,800),('light',400,800),('dark',1920,1080)]:
            pg=await b.new_page(viewport={'width':w,'height':hh}); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            await pg.goto(base+theme+'.html'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/home/claude/wpi/run/out/dashboard/test/{theme}-{w}.png',full_page=True)
            ov=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
            print(theme,w,'errors',errs,'hscroll',ov)
            if w==1280:
                txt=await pg.evaluate("document.querySelector('#conclusie').innerText"); print(txt)
                print(await pg.evaluate("JSON.stringify([...document.querySelectorAll('[data-draw=t]')].map(e=>e.dataset.t+'='+e.textContent))"))
        await b.close()
asyncio.run(main())
