# Bouwt een overzichtspagina van alle app-schermen + annotaties (tussenstop 12-11-2026)
import os, glob, html, markdown
from PIL import Image
BASE='/home/claude/app'; OUT=BASE+'/overzicht'
os.makedirs(OUT+'/img', exist_ok=True)

TITELS={}
for line in open(BASE+'/schermen.md', encoding='utf-8'):
    pass

def conv(png):
    name=os.path.splitext(os.path.basename(png))[0]
    im=Image.open(png).convert('RGB')
    w,h=im.size
    maxw=900 if name.startswith('P') else 1440
    if w>maxw:
        im=im.resize((maxw, int(h*maxw/w)), Image.LANCZOS)
    p=f'{OUT}/img/{name}.jpg'; im.save(p,'JPEG',quality=78,optimize=True,progressive=True)
    return name

shots=sorted(glob.glob(BASE+'/shots/*.png'))
items=[]
for s in shots:
    n=conv(s)
    note=BASE+'/notes/'+n+'.md'
    md=open(note,encoding='utf-8').read() if os.path.exists(note) else '*Geen annotatie.*'
    title=md.splitlines()[0].lstrip('# ').strip() if md.startswith('#') else n
    body='\n'.join(md.splitlines()[1:]) if md.startswith('#') else md
    items.append((n,title,markdown.markdown(body, extensions=['tables'])))

STATUS=open(BASE+'/tools/overzicht_status.html',encoding='utf-8').read()

def card(n,t,b):
    phone=n.startswith('P')
    return f'''<section class="scr {'phone' if phone else 'web'}" id="{n}">
<div class="shot"><a href="img/{n}.jpg" target="_blank"><img loading="lazy" src="img/{n}.jpg" alt="{html.escape(t)}"></a></div>
<div class="note"><p class="code">{n}</p><h3>{html.escape(t)}</h3>{b}</div></section>'''

nav=''.join(f'<a href="#{n}">{n.split("-")[0]}</a>' for n,_,_ in items)
ph=''.join(card(*i) for i in items if i[0].startswith('P'))
wb=''.join(card(*i) for i in items if i[0].startswith('W'))
doc=f'''<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WPI-app ontwerp en WPI-methode — tussenstop 12-11-2026</title>
<style>
:root{{--ink:#1B2430;--muted:#5B6675;--line:#DDE2E8;--bg:#F6F7F9;--pri:#1F5FBF;--ai:#6B4FD8}}
*{{box-sizing:border-box}}body{{margin:0;font:15px/1.55 Inter,system-ui,sans-serif;color:var(--ink);background:var(--bg)}}
header{{padding:28px 32px 12px;max-width:1500px;margin:auto}}h1{{font-size:26px;margin:0 0 6px}}
.chip{{display:inline-block;border:1px solid var(--line);background:#fff;border-radius:999px;padding:2px 10px;font-size:13px;color:var(--muted)}}
main{{max-width:1500px;margin:auto;padding:0 32px 60px}}
.status{{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px 22px;margin:16px 0 26px}}
.status table{{border-collapse:collapse;width:100%}}.status td,.status th{{border-top:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}}
nav.jump{{position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2;display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--line)}}
nav.jump a{{font-size:12px;text-decoration:none;color:var(--pri);border:1px solid var(--line);background:#fff;border-radius:6px;padding:2px 7px}}
h2{{margin:34px 0 10px;font-size:20px}}
.scr{{display:grid;gap:22px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;margin:16px 0}}
.scr.phone{{grid-template-columns:390px 1fr}}.scr.web{{grid-template-columns:minmax(0,1.6fr) minmax(320px,1fr)}}
.shot{{max-height:900px;overflow:auto;border:1px solid var(--line);border-radius:8px;background:#fafafa}}
.shot img{{width:100%;display:block}}
.note h3{{margin:0 0 8px;font-size:17px}}.note .code{{margin:0;color:var(--muted);font-size:13px}}.note h2{{font-size:15px;margin:16px 0 4px}}
.note table{{border-collapse:collapse;font-size:13px}}.note td,.note th{{border:1px solid var(--line);padding:4px 6px}}
@media(max-width:900px){{.scr.phone,.scr.web{{grid-template-columns:1fr}}main,header{{padding:0 14px}}}}
</style></head><body>
<header><h1>WPI — tussenstop 12-11-2026</h1><span class="chip">Voorbeeldinhoud · fictief</span>
<p style="color:var(--muted);max-width:900px">Stand van de gauntlet-loops: de nieuwe WPI-methode voor Noardling (voorstel, voorbeeldrapport, dashboard) en het schermontwerp van de configureerbare inspectie-app. Klik op een scherm voor de volle grootte; rechts staat per scherm de annotatie (hoe configureer je het, uitbreidingen, verbeteringen).</p></header>
<main>{STATUS}
<nav class="jump">{nav}</nav>
<h2>Telefoon — inspecteur ({sum(1 for i in items if i[0].startswith('P'))} schermen)</h2>{ph}
<h2>Web — configuratie en resultaten ({sum(1 for i in items if i[0].startswith('W'))} schermen)</h2>{wb}
</main></body></html>'''
open(OUT+'/index.html','w',encoding='utf-8').write(doc)
print(len(items),'schermen;', OUT)
