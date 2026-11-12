import asyncio,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(); await pg.goto('file:///home/claude/wpi/run/out/dashboard/test/light.html'); await pg.wait_for_timeout(300)
        k=await pg.evaluate("dash.data('kern').data.map(r=>[r.k,r.toon,r.tekst])")
        json.dump(k,open('/home/claude/wpi/run/out/dashboard/test/kern_page.json','w'),ensure_ascii=False)
        txt=await pg.evaluate("document.querySelector('#boodschappen').innerText+'\\n'+document.querySelector('#conclusie').textContent")
        print(txt)
        await b.close()
asyncio.run(main())
