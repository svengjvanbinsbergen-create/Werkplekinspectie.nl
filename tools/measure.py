import asyncio,sys
from playwright.async_api import async_playwright
async def m(n,sel):
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':390,'height':844})
        await pg.goto(f'file:///home/claude/app/screens/phone/{n}.html')
        print(await pg.evaluate("s=>[...document.querySelectorAll(s)].map(e=>[...e.children].map(c=>c.tagName+' '+Math.round(c.getBoundingClientRect().height)+' '+(c.textContent||'').trim().slice(0,30)))",sel))
        await b.close()
asyncio.run(m(sys.argv[1],sys.argv[2]))
