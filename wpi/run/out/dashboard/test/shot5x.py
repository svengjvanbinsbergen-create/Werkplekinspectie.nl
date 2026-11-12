import asyncio,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for theme,w in [('light',1280),('dark',400)]:
            pg=await b.new_page(viewport={'width':w,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto('file:///home/claude/wpi/run/out/dashboard/test/%s.html'%theme); await pg.wait_for_timeout(300)
            await pg.click('[data-act=vastleg]'); await pg.wait_for_timeout(200)
            await pg.screenshot(path='test/r5-%s-%d-vastleg.png'%(theme,w),full_page=True)
            await pg.emulate_media(media='print'); await pg.wait_for_timeout(100)
            await pg.pdf(path='test/r5-vastleg.pdf') if theme=='light' else None
            await pg.emulate_media(media='screen')
            r=await pg.evaluate("[document.querySelector('[data-draw=vastleg]').innerText.length, document.querySelector('.w-tabbar').hidden]")
            await pg.click('[data-act=terug]'); await pg.wait_for_timeout(100)
            r2=await pg.evaluate("[document.querySelector('#overzicht').hidden, document.querySelector('#vastleggen').hidden, document.querySelector('.w-tabbar').hidden]")
            # programma phone scroll
            await pg.click('[data-tabknop=programma]'); await pg.wait_for_timeout(200)
            r3=await pg.evaluate("(()=>{const s=document.querySelector('#werkplek .w-scroll');return [s.scrollLeft,s.scrollWidth-s.clientWidth]})()")
            await pg.screenshot(path='test/r5-%s-%d-progtop.png'%(theme,w))
            # milieu
            await pg.click('[data-tabknop=bevindingen]'); await pg.evaluate("dash.setParams({classificatie:'Milieu'})"); await pg.wait_for_timeout(150)
            n=await pg.evaluate("[...document.querySelectorAll('#bevindingen p')].filter(e=>e.textContent.includes('Geen gegevens')).length + '|' + document.querySelector('[data-draw=f-actief]').textContent")
            print(theme,w,errs,r,r2,r3,n)
        await b.close()
asyncio.run(main())
