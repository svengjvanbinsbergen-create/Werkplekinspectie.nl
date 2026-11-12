import asyncio
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'
out='/home/claude/wpi/run/out/dashboard/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':800}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(base+'light.html'); await pg.wait_for_timeout(300)
        for i,sel in enumerate(['#programma','#oordelen','#classificatie','#tra','#blindevlekken','#acties']):
            await pg.locator(sel).screenshot(path=out+f'sec{i}.png')
        # drill + filter
        await pg.locator('#oordelen .w-col .w-seg.o-afw').first.click(); await pg.wait_for_timeout(200)
        print('drill', await pg.evaluate("document.querySelector('#oordelen .w-det').innerText.slice(0,300)"))
        await pg.locator('#oordelen .w-det .w-clk').first.click(); await pg.wait_for_timeout(200)
        print('drill2', await pg.evaluate("document.querySelector('#oordelen .w-det .w-dh').innerText"))
        await pg.locator('#oordelen').screenshot(path=out+'drill.png')
        await pg.select_option('[data-draw=f-product]','Bandfilter'); await pg.select_option('[data-draw=f-classificatie]','Hijsen'); await pg.wait_for_timeout(200)
        print(await pg.evaluate("document.querySelector('[data-draw=f-actief]').textContent"))
        print(await pg.evaluate("JSON.stringify([...document.querySelectorAll('[data-draw=t]')].slice(0,9).map(e=>e.dataset.t+'='+e.textContent))"))
        await pg.locator('[data-dim=taak]').click()
        await pg.locator('[data-act=reset]').click(); await pg.wait_for_timeout(200)
        print(await pg.evaluate("document.querySelector('[data-draw=f-actief]').textContent"))
        await pg.locator('#tra .w-item summary').first.click()
        await pg.locator('#tra').screenshot(path=out+'tra-open.png')
        print('errs',errs)
        pg=await b.new_page(viewport={'width':400,'height':800})
        await pg.goto(base+'dark.html'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=out+'m0.png')
        for i,sel in enumerate(['#programma','#oordelen','#classificatie','#acties']):
            await pg.locator(sel).screenshot(path=out+f'm{i+1}.png')
        await b.close()
asyncio.run(main())
