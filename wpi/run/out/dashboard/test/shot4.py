import asyncio,json,sys
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'; out='/home/claude/wpi/run/out/dashboard/test/'
combos=[(t,w) for w in (400,1280,1920) for t in ('light','dark')] if len(sys.argv)<2 else [(sys.argv[1],int(sys.argv[2]))]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for theme,w in combos:
            pg=await b.new_page(viewport={'width':w,'height':900}); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
            await pg.goto(base+theme+'.html'); await pg.wait_for_timeout(300)
            res={}
            for tab in ['overzicht','programma','bevindingen','tra','acties']:
                await pg.click(f'[data-tabknop={tab}]'); await pg.wait_for_timeout(150)
                await pg.screenshot(path=f'{out}r5-{theme}-{w}-{tab}.png',full_page=True)
                res[tab]=await pg.evaluate("[document.documentElement.scrollWidth>innerWidth, document.documentElement.scrollHeight]")
            # drill from messages
            await pg.click('[data-tabknop=overzicht]')
            for k in ['over','pw_y','pw_geen','risk_a','herh_n','conform']:
                await pg.locator(f'#boodschappen [data-where="k={k}"][data-field=toon]').first.click(); await pg.wait_for_timeout(150)
                res['msg_'+k]=await pg.evaluate("(document.querySelector('#boodschappen .w-det .w-dh')||{}).textContent")
            await pg.screenshot(path=f'{out}r5-{theme}-{w}-msgdrill.png',full_page=False)
            # beam chart segment
            await pg.locator('#pw-kort .w-seg.w-clk').first.click(); await pg.wait_for_timeout(150)
            res['beam']=await pg.evaluate("(document.querySelector('#pw-kort .w-det .w-dh')||{}).textContent")
            # programme matrix
            await pg.click('[data-tabknop=programma]')
            await pg.locator('#werkplek .w-btn.w-clk').first.click(); await pg.wait_for_timeout(150)
            res['gemist']=await pg.evaluate("(document.querySelector('#werkplek .w-det .w-dh')||{}).textContent")
            await pg.locator('#werkplek .w-pc.w-ok, #werkplek .w-mc.w-ok').locator('visible=true').first.click(); await pg.wait_for_timeout(150)
            res['cel']=await pg.evaluate("(document.querySelector('#werkplek .w-det .w-dh')||{}).textContent")
            await pg.locator('#werkplek .w-det td .w-clk').first.click(); await pg.wait_for_timeout(150)
            res['wpi']=await pg.evaluate("(document.querySelector('#werkplek .w-det .w-dh')||{}).textContent")
            res['wpi_dl']=await pg.evaluate("(document.querySelector('#werkplek .w-det .w-dl')||{}).textContent")
            await pg.screenshot(path=f'{out}r5-{theme}-{w}-wpidrill.png',full_page=True)
            res['hscroll_after']=await pg.evaluate("document.documentElement.scrollWidth>innerWidth")
            print(theme,w,'errors',errs,json.dumps(res,ensure_ascii=False))
        await b.close()
asyncio.run(main())
