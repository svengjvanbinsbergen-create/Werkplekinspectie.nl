# Rendert webschermen naar PNG en controleert: hoogte, afgesneden tekst, buiten de root, contrast < 4.5
import sys, json
from playwright.sync_api import sync_playwright
CHECK = r'''
() => {
 const root = document.getElementById('root');
 const rr = root.getBoundingClientRect();
 function parse(c){const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(s=>parseFloat(s)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
 function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
 function bgOf(el){ while(el){ const cs=getComputedStyle(el); const bi=cs.backgroundImage; if(bi && bi!=='none' && bi.includes('gradient')){ const m=bi.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{6}/g); if(m){ return parse(m[m.length-1].startsWith('#')?hex(m[m.length-1]):m[m.length-1]); } }
   const c=parse(cs.backgroundColor); if(c && c.a>0.5) return c; el=el.parentElement;} return {r:246,g:247,b:249,a:1}; }
 function hex(h){return 'rgb('+parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16)+')';}
 const bad=[], clip=[], out=[];
 const all = root.querySelectorAll('*');
 for (const el of all){
   const cs=getComputedStyle(el);
   const own=[...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>0);
   const r=el.getBoundingClientRect();
   if (r.width>0 && (r.right>rr.right+1 || r.left<rr.left-1)) out.push((el.textContent||el.tagName).trim().slice(0,50));
   if (own){
     const fg=parse(cs.color); const bg=bgOf(el);
     if(fg&&bg){ const L1=lum(fg),L2=lum(bg); const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
       if(ratio<4.5) bad.push(ratio.toFixed(2)+' '+cs.color+' on '+JSON.stringify(bg)+' :: '+el.textContent.trim().slice(0,40)); }
     if (parseFloat(cs.fontSize)<12) bad.push('font<12 '+cs.fontSize+' :: '+el.textContent.trim().slice(0,40));
   }
   if ((cs.overflow==='hidden'||cs.overflowX==='hidden'||cs.textOverflow==='ellipsis') && el.scrollWidth>el.clientWidth+1) clip.push(el.textContent.trim().slice(0,60));
   if ((cs.overflow==='hidden'||cs.overflowY==='hidden') && el.scrollHeight>el.clientHeight+2 && el.clientHeight>0) clip.push('V: '+el.textContent.trim().slice(0,60));
 }
 return {w:rr.width,h:rr.height,bad:[...new Set(bad)].slice(0,40),clip:[...new Set(clip)].slice(0,30),out:[...new Set(out)].slice(0,20)};
}'''
files = sys.argv[1:]
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    for f in files:
        code = f.split('/')[-1].replace('.html', '')
        pg.goto('file://' + f)
        pg.wait_for_timeout(300)
        r = pg.evaluate(CHECK)
        pg.locator('#root').screenshot(path=f'/home/claude/app/shots/{code}.png')
        res[code] = r
        print(code, 'w', r['w'], 'h', r['h'])
        for k in ['bad', 'clip', 'out']:
            if r[k]: print('  ', k, len(r[k])); [print('     ', x) for x in r[k][:15]]
    b.close()
json.dump(res, open('/home/claude/app/tools/render_result.json', 'w'), indent=1)
