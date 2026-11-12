import asyncio,json,sys
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'; out='/home/claude/wpi/run/out/dashboard/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for theme,w in [('light',1280),('dark',1920),('light',400),('dark',400)]:
            pg=await b.new_page(viewport={'width':w,'height':900}); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            await pg.goto(base+theme+'.html'); await pg.wait_for_timeout(300)
            res={}
            for tab in ['overzicht','programma','bevindingen','tra','acties']:
                await pg.click(f'[data-tabknop={tab}]'); await pg.wait_for_timeout(150)
                await pg.screenshot(path=f'{out}r3-{theme}-{w}-{tab}.png',full_page=True)
                res[tab]=await pg.evaluate("[document.documentElement.scrollWidth>innerWidth, document.documentElement.scrollHeight]")
            # tile clicks
            await pg.click('[data-tabknop=acties]')
            for t in ['open','over','afgerond','kort_gem']:
                await pg.locator(f'#act-tegels [data-t={t}]').first.click(); await pg.wait_for_timeout(120)
                res['klik_'+t]=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
            await pg.screenshot(path=f'{out}r3-{theme}-{w}-acties-klik.png',full_page=True)
            await pg.click('[data-tabknop=bevindingen]')
            for t in ['regels','neg','zonder']:
                await pg.locator(f'#bev-tegels [data-t={t}]').first.click(); await pg.wait_for_timeout(120)
                res['klik_'+t]=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
            print(theme,w,'errors',errs,json.dumps(res))
        await b.close()
asyncio.run(main())
