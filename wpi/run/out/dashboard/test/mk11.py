import json,re,sys
base='/home/claude/wpi/run/out/dashboard/'
html=open(base+'index.html').read().replace("<script src='app.js'></script>",'')
data={n:json.load(open(base+'data11/%s.json'%n)) for n in ['wpis','regels','acties','programma','kennisbank','peildatum','trendacties','projecten']}
d3=open('/opt/npm-tools/node_modules/d3/dist/d3.min.js').read()
app=open(base+'app.js').read()
mock='''
const DATA=%s; const calcs={}, draws={}, ons=[]; let params={van:"",tot:"",product:"",inspecteur:"",classificatie:""}; const P0={...params};
window.dash={colors:['#2a78d6','#eb6834','#1baf7a'],
 data(id){ if(calcs[id]){ if(!calcs[id].v) calcs[id].v=calcs[id].fn(...calcs[id].inputs.map(i=>dash.data(i).data)); return {status:'ok',data:calcs[id].v}; } return DATA[id]?{status:'ok',data:DATA[id]}:{status:'missing',data:[]}; },
 calc(id,o){calcs[id]=o}, onData(f){ons.push(f)}, params(){return params}, setLink(){},
 setParams(o){params={...params,...o}; run()}, resetParams(){params={...P0}; run()},
 draw(n,f){ if(f){draws[n]=f; return;} document.querySelectorAll('[data-draw="'+n+'"]').forEach(el=>draws[n](el)); } };
function run(){ ons.forEach(f=>f()); for(const n in draws) dash.draw(n); }
window.__run=run;
''' % json.dumps(data,ensure_ascii=False)
for theme,css in [('light',':root{--color-fg:#1a1a18;--color-fg-muted:#5f5e58;--color-bg:#faf9f5;--color-panel:#fff;--color-border-line:#d8d6cc;--color-ok:#2e7d4f;--color-warn:#c98a00;--color-bad:#c0392b;--font-anthropic-sans:system-ui;--font-anthropic-serif:Georgia;--cds-radius:8px}body{background:#faf9f5}'),
                  ('dark',':root{--color-fg:#f0eee6;--color-fg-muted:#a8a69c;--color-bg:#1f1e1c;--color-panel:#2a2927;--color-border-line:#45433e;--color-ok:#5fc98a;--color-warn:#e6b84a;--color-bad:#ef6f61;--font-anthropic-sans:system-ui;--font-anthropic-serif:Georgia;--cds-radius:8px}body{background:#1f1e1c}')]:
    open(base+'test/%s.html'%theme,'w').write('<!doctype html><meta charset="utf-8"><style>%s body{margin:16px}</style><div id="dash-root">%s</div><script>%s</script><script>%s</script><script>%s</script><script>window.__run()</script>'%(css,html,d3,mock,app))
