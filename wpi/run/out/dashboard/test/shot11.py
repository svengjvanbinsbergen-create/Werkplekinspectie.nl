import asyncio,json,sys
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'; out='/home/claude/wpi/run/out/dashboard/test/'
combos=[(t,w) for w in (1440,390) for t in ('light','dark')]
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
                if tab=='bevindingen':
                    await pg.click('#getoetst summary'); await pg.wait_for_timeout(150)
                    await pg.locator('#getoetst .w-seg.w-clk').first.click(); await pg.wait_for_timeout(150)
                    res['getoetst_drill']=await pg.evaluate("(document.querySelector('#getoetst .w-det .w-dh')||{}).textContent")
                    await pg.locator('#getoetst .w-det td .w-clk').first.click(); await pg.wait_for_timeout(150)
                    res['wpi_kop']=await pg.evaluate("(document.querySelector('#getoetst .w-det .w-dl')||{}).textContent")
                await pg.screenshot(path=f'{out}r11-{theme}-{w}-{tab}.png',full_page=True)
                res[tab]=await pg.evaluate("[document.documentElement.scrollWidth>innerWidth, document.documentElement.scrollHeight]")
            await pg.click('[data-tabknop=overzicht]')
            for k in ['spontaan','conform','pw_geen','over']:
                await pg.locator(f'#boodschappen [data-where="k={k}"][data-field=toon]').first.click(); await pg.wait_for_timeout(150)
                res['msg_'+k]=await pg.evaluate("(document.querySelector('#boodschappen .w-det .w-dh')||{}).textContent")
            await pg.click('#conclusie summary'); await pg.locator('#conclusie [data-where="k=stap_ts"][data-field=toon]').click(); await pg.wait_for_timeout(150)
            res['concl_stap_ts']=await pg.evaluate("(document.querySelector('#conclusie .w-det .w-dh')||{}).textContent")
            await pg.screenshot(path=f'{out}r11-{theme}-{w}-concl.png',full_page=True)
            await pg.click('[data-act=vastleg]'); await pg.wait_for_timeout(200)
            res['vastleg_sec3']=await pg.evaluate("[...document.querySelectorAll('#vastleggen h3')].map(e=>e.textContent).join(' | ')")
            res['vastleg_bad']=await pg.evaluate("/Alleen bevestigd|Niet beoordeeld|eigen waarneming bij/.test(document.querySelector('#vastleggen').textContent)")
            await pg.screenshot(path=f'{out}r11-{theme}-{w}-vastleg.png',full_page=True)
            res['page_bad']=await pg.evaluate("/Alleen bevestigd|Niet beoordeeld|afsluitvraag/.test(document.querySelector('.w-page').textContent)")
            print(theme,w,'errors',errs,json.dumps(res,ensure_ascii=False))
        await b.close()
asyncio.run(main())
