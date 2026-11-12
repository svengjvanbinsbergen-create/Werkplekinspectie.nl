import asyncio,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':900}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file:///home/claude/wpi/run/out/dashboard/test/light.html'); await pg.wait_for_timeout(300)
        r={}
        # DAM-C2 via bevindingen tile -> wpi -> actie
        await pg.click('[data-tabknop=bevindingen]')
        await pg.evaluate("dash.setParams({van:'2026-11',tot:'2026-11'})"); await pg.wait_for_timeout(100)
        await pg.locator('#bev-tegels [data-t=neg]').click(); await pg.wait_for_timeout(100)
        await pg.locator('#bev-tegels .w-det td .w-clk',has_text='DAM-C2').first.click(); await pg.wait_for_timeout(100)
        r['dam']=await pg.evaluate("document.querySelector('#bev-tegels .w-det .w-dh').textContent")
        r['dam_oord']=await pg.evaluate("[...document.querySelectorAll('#bev-tegels .w-det tbody tr')].map(t=>t.children[1].textContent).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})")
        await pg.locator('#bev-tegels .w-det td .w-clk',has_text='C2-6').first.click(); await pg.wait_for_timeout(100)
        r['actie']=await pg.evaluate("document.querySelector('#bev-tegels .w-det').innerText")
        await pg.locator('#bev-tegels .w-det button',has_text='Terug').click(); await pg.wait_for_timeout(100)
        r['terug']=await pg.evaluate("document.querySelector('#bev-tegels .w-det .w-dh').textContent")
        # Milieu filter
        await pg.evaluate("dash.setParams({van:'',tot:'',classificatie:'Milieu'})"); await pg.wait_for_timeout(100)
        r['milieu']=await pg.evaluate("[document.querySelector('[data-draw=f-actief]').textContent, document.querySelector('[data-draw=maand]').innerText, document.querySelector('[data-draw=klasse]').innerText, document.querySelector('#bevindingen').scrollHeight]")
        await pg.evaluate("dash.setParams({classificatie:'Hijsen'})"); await pg.wait_for_timeout(100)
        r['hijsen']=await pg.evaluate("document.querySelector('[data-draw=f-actief]').textContent")
        # reversed period
        await pg.evaluate("dash.setParams({classificatie:'',van:'2026-10',tot:'2026-06'})"); await pg.wait_for_timeout(100)
        await pg.click('[data-tabknop=programma]'); r['rev']=await pg.evaluate("[document.querySelector('[data-draw=f-actief]').textContent, document.querySelector('[data-draw=pw]').innerText]")
        await pg.evaluate("dash.setParams({van:'',tot:'',product:'Damwand'})"); await pg.wait_for_timeout(100)
        r['damwand']=await pg.evaluate("document.querySelector('#werkplek h3').innerText")
        # nog 1 dag + 0 not clickable
        await pg.evaluate("dash.resetParams()"); await pg.click('[data-tabknop=acties]')
        r['1dag']=await pg.evaluate("document.body.innerText.includes('nog 1 dag') && !document.body.innerText.includes('1 dagen')")
        await pg.click('[data-tabknop=programma]')
        r['nul_klik']=await pg.evaluate("[...document.querySelectorAll('.w-clk')].filter(e=>['0','—'].includes(e.textContent.trim())).length")
        # phone filter toggle
        await pg.set_viewport_size({'width':400,'height':900}); await pg.wait_for_timeout(100)
        r['ph_dicht']=await pg.evaluate("getComputedStyle(document.querySelector('.w-filters')).display")
        await pg.click('.w-ftog'); r['ph_open']=await pg.evaluate("getComputedStyle(document.querySelector('.w-filters')).display")
        print(errs); print(json.dumps(r,ensure_ascii=False,indent=0))
        await b.close()
asyncio.run(main())
