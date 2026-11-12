#!/usr/bin/env python3
"""Render een HTML-scherm naar een PNG met de voorgeïnstalleerde Chromium.

Werkt in deze cloudomgeving: gebruikt de vaste browser op /opt/pw-browsers
in plaats van `playwright install`. Controleert en meldt overloop/scroll.

Gebruik:
  python3 tools/shot.py <scherm.html> <uit.png> [breedte] [hoogte] [scale]
  # voorbeeld telefoon:
  python3 tools/shot.py app/v2/screens/phone/P01-start.html /tmp/P01.png 390 844 2
"""
import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"


async def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    html = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]).resolve()
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 390
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 844
    scale = int(sys.argv[5]) if len(sys.argv) > 5 else 2

    async with async_playwright() as p:
        b = await p.chromium.launch(
            executable_path=CHROME, args=["--no-sandbox", "--headless=new"]
        )
        pg = await b.new_page(viewport={"width": w, "height": h},
                              device_scale_factor=scale)
        await pg.goto(html.as_uri())
        await pg.wait_for_timeout(400)
        info = await pg.evaluate(
            """() => ({doc: document.documentElement.scrollHeight,
                      win: window.innerHeight,
                      scroll: document.documentElement.scrollHeight > window.innerHeight})"""
        )
        await pg.screenshot(path=str(out), full_page=True)
        await b.close()
        flag = " ⚠ SCROLLT" if info["scroll"] else " ✓ past"
        print(f"{out.name}: doc={info['doc']}px win={info['win']}px{flag}")


if __name__ == "__main__":
    asyncio.run(main())
