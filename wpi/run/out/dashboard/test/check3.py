import asyncio,json,subprocess
from playwright.async_api import async_playwright
base='file:///home/claude/wpi/run/out/dashboard/test/'; out='/home/claude/wpi/run/out/dashboard/test/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':900}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(base+'light.html'); await pg.wait_for_timeout(300)
        kern=await pg.evaluate("Object.fromEntries(dash.data('kern').data.map(r=>[r.k,[r.toon,r.tekst]]))")
        json.dump(kern,open(out+'kern_page.json','w'),ensure_ascii=False,indent=0)
        txt=await pg.evaluate("document.querySelector('#boodschappen').innerText")
        print(txt)
        await pg.click('#conclusie summary'); print(await pg.evaluate("document.querySelector('#conclusie ul').innerText"))
        # voorbeeld-WPI via acties-tegel -> WPI-detail
        await pg.click('[data-tabknop=acties]'); await pg.select_option('[data-draw=f-product]','Damwand'); await pg.wait_for_timeout(150)
        await pg.locator('#act-tegels [data-t=open]').first.click(); await pg.wait_for_timeout(150)
        print(await pg.evaluate("[...document.querySelectorAll('#act-tegels .w-det tbody tr')].map(r=>r.cells[0].innerText.split(String.fromCharCode(10))[0]).join(' | ')"))
        await pg.click('[data-act=reset]'); await pg.click('[data-tabknop=programma]'); await pg.locator('#progr-kaart td .w-clk').last.click(); await pg.wait_for_timeout(120)
        await pg.locator('#progr-kaart .w-det .w-clk',has_text='WPI-20261105-DAM-C2').first.click(); await pg.wait_for_timeout(150)
        print(await pg.evaluate("document.querySelector('#progr-kaart .w-dh').innerText"))
        print(await pg.evaluate("[...document.querySelectorAll('#progr-kaart .w-det thead th')].map(t=>t.innerText).join(';')"))
        print(await pg.evaluate("[...document.querySelectorAll('#progr-kaart .w-det tbody tr')].map(r=>[...r.cells].slice(1).map(c=>c.innerText).join(';')).join(' | ')"))
        await pg.locator('#progr-kaart .w-det').screenshot(path=out+'r3-wpidetail.png')
        # omgekeerde periode
        await pg.click('[data-act=reset]'); await pg.click('[data-tabknop=bevindingen]')
        await pg.select_option('[data-draw=f-van]','2026-10'); await pg.select_option('[data-draw=f-tot]','2026-06'); await pg.wait_for_timeout(150)
        print('omgekeerd:',await pg.evaluate("document.querySelector('[data-draw=f-actief]').innerText"),'|',await pg.evaluate("document.querySelector('[data-draw=maand]').innerText"))
        await pg.select_option('[data-draw=f-tot]','2026-11'); await pg.wait_for_timeout(150)
        print('2 maanden:',await pg.evaluate("document.querySelector('[data-draw=trend]').innerText"))
        await pg.click('[data-act=reset]'); await pg.select_option('[data-draw=f-classificatie]','Milieu'); await pg.wait_for_timeout(150)
        print('milieu:',await pg.evaluate("document.querySelector('[data-draw=f-actief]').innerText"),'|',await pg.evaluate("document.querySelector('#classificatie h3').innerText"))
        await pg.click('[data-act=reset]'); await pg.wait_for_timeout(100)
        print('milieu rij:',await pg.evaluate("[...document.querySelectorAll('[data-draw=klasse] .w-bar')].map(e=>e.innerText.split(String.fromCharCode(10))[0]).filter(x=>x=='Milieu')"))
        await pg.click('[data-tabknop=acties]'); await pg.locator('#openacties').screenshot(path=out+'r3-open1280.png')
        print('errs',errs); await b.close()
asyncio.run(main())
