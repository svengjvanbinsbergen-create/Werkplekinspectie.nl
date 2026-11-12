#!/usr/bin/env python3
"""Minimalistische, interactieve trendanalyse (Power BI-stijl, app-look).

Leest app/tools/cijfers.json + dashboard/data11/trendacties.json en schrijft
een zelfstandige HTML met inline SVG-grafieken. Klik op een tegel of balk →
modal met de achterliggende rijen (drill-down). Data staat inline, dus geen
fetch nodig: rendert en werkt overal.

  python3 app/tools/trend_dashboard.py
  -> app/v2/screens/web/W09b-trend-dashboard.html
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, "cijfers.json"), encoding="utf-8"))
TREND = json.load(open(os.path.abspath(os.path.join(
    HERE, "..", "..", "wpi", "run", "out", "dashboard", "data11", "trendacties.json")), encoding="utf-8"))
OUT = os.path.abspath(os.path.join(HERE, "..", "v2", "screens", "web", "W09b-trend-dashboard.html"))

INK, SOFT, LINE, BG = "#141A22", "#4A5565", "#E7E9ED", "#F6F7F9"
GREEN, RED, AMBER, GREY, BROWN = "#1E7A4C", "#B42318", "#8A4B00", "#9AA2AE", "#7A4300"
P = {"sky": "#EAF1FA", "butter": "#FBF5DE", "sage": "#EDF5E4",
     "lilac": "#F1EDFC", "blush": "#FBECEA", "mist": "#F3F4F6"}
OORD = {"Conform": GREEN, "Afwijking": RED, "Verbeterpunt": AMBER, "Niet van toepassing": GREY}
MND = {"2026-05": "mei", "2026-06": "jun", "2026-07": "jul", "2026-08": "aug",
       "2026-09": "sep", "2026-10": "okt", "2026-11": "nov"}

# ---- detail-arrays voor drill-down (in Python voorgekookt) ----
INSP = []
for nr, v in C["per_wpi"].items():
    d = nr.split("-")[1]
    INSP.append({"nr": nr, "maand": d[:4] + "-" + d[4:6], "ingang": v.get("ingang", ""),
                 "oord": v.get("oord", {})})
INSP.sort(key=lambda r: r["nr"])
KLASSE = [{"naam": k, "C": v.get("Conform", 0), "A": v.get("Afwijking", 0),
           "V": v.get("Verbeterpunt", 0), "tot": v.get("tot", 0)}
          for k, v in C["klasse_gezien"].items()]
TRENDR = [{"nr": a["nr"], "onderwerp": a["onderwerp"], "actiehouder": a["actiehouder"],
           "termijn": a["termijn"], "status": a["status"]} for a in TREND]

DATA = {
    "oordeel": C["oordeel"], "oordeel_maand": C["oordeel_maand"], "waarnemingen": C["waarnemingen"],
    "vp_mis": C["vp_mis"], "vp_maand": C["vp_maand"], "vp_x": C["vp_x"], "vp_y": C["vp_y"],
    "act_status": C["act_status"], "act_prio": C["act_prio"], "act_over": C["act_over"],
    "ingang": C["ingang"], "maanden": C["maanden"], "mnd": MND,
    "insp": INSP, "klasse": KLASSE, "trend": TRENDR,
    "col": {"Conform": GREEN, "Afwijking": RED, "Verbeterpunt": AMBER, "Niet van toepassing": GREY},
}


def kpi(bg, groot, label, sub, accent, drill):
    return f'''<div onclick="drill('{drill}')" style="background:{bg};border-radius:20px;padding:20px 22px;cursor:pointer;transition:transform .08s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
  <div style="font-size:13px;color:{SOFT};font-weight:600">{label}</div>
  <div style="font-size:38px;font-weight:650;line-height:1.05;color:{accent};margin-top:6px">{groot}</div>
  <div style="font-size:13px;color:{SOFT};margin-top:2px">{sub} ›</div></div>'''


def card(title, body, extra=""):
    return f'''<div style="background:#fff;border-radius:20px;box-shadow:0 0 0 1px {LINE};padding:20px 22px">
  <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
    <div style="font-size:16px;font-weight:650;color:{INK}">{title}</div>{extra}</div>{body}</div>'''


def legend(items):
    out = ['<div style="display:flex;gap:16px;flex-wrap:wrap">']
    for lab, col in items:
        out.append(f'<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:{SOFT}">'
                   f'<span style="width:10px;height:10px;border-radius:3px;background:{col}"></span>{lab}</span>')
    out.append('</div>')
    return "".join(out)


def stacked_maand(om):
    mnd = C["maanden"]
    totals = [sum(om.get(m, {}).values()) for m in mnd]
    mx = max(totals) or 1
    W, H, pad = 640, 200, 28
    gap = (W - pad) / len(mnd)
    bw = gap * 0.52
    order = ["Conform", "Verbeterpunt", "Afwijking", "Niet van toepassing"]
    g = []
    for i, m in enumerate(mnd):
        x = pad + gap * i + (gap - bw) / 2
        y = H - 22
        parts = []
        for key in order:
            v = om.get(m, {}).get(key, 0)
            if not v:
                continue
            h = (v / mx) * (H - 50)
            y -= h
            parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="2" fill="{OORD[key]}"/>')
        parts.append(f'<text x="{x+bw/2:.1f}" y="{y-6:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{INK}">{totals[i]}</text>')
        parts.append(f'<text x="{x+bw/2:.1f}" y="{H-6:.1f}" text-anchor="middle" font-size="12" fill="{SOFT}">{MND[m]}</text>')
        # klikvlak over de hele kolom
        parts.append(f'<rect x="{pad+gap*i:.1f}" y="0" width="{gap:.1f}" height="{H}" fill="transparent"/>')
        g.append(f'<g style="cursor:pointer" onclick="drill(\'oordeelmaand\',\'{m}\')">{"".join(parts)}</g>')
    return f'<svg viewBox="0 0 {W} {H}" width="100%" style="display:block">{"".join(g)}</svg>'


def programma_maand(vm):
    mnd = C["maanden"]
    ys = [vm.get(m, {}).get("y", 0) + vm.get(m, {}).get("lopend", 0) for m in mnd]
    mx = max(ys) or 1
    W, H, pad = 640, 200, 28
    gap = (W - pad) / len(mnd)
    bw = gap * 0.52
    defs = '<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F3F4F6"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C9CED6" stroke-width="2"/></pattern></defs>'
    g = []
    for i, m in enumerate(mnd):
        x = pad + gap * i + (gap - bw) / 2
        d = vm.get(m, {})
        ok, y_, lop = d.get("ok", 0), d.get("y", 0), d.get("lopend", 0)
        gemist = y_ - ok
        y = H - 22
        parts = []
        for v, col, hatch in [(ok, GREEN, False), (gemist, RED, False), (lop, "url(#hatch)", True)]:
            if v <= 0:
                continue
            h = (v / mx) * (H - 50)
            y -= h
            parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="2" fill="{col}" stroke="{GREY if hatch else "none"}" stroke-width="{1 if hatch else 0}"/>')
        parts.append(f'<text x="{x+bw/2:.1f}" y="{y-6:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{INK}">{ok}/{y_}</text>')
        parts.append(f'<text x="{x+bw/2:.1f}" y="{H-6:.1f}" text-anchor="middle" font-size="12" fill="{SOFT}">{MND[m]}</text>')
        parts.append(f'<rect x="{pad+gap*i:.1f}" y="0" width="{gap:.1f}" height="{H}" fill="transparent"/>')
        g.append(f'<g style="cursor:pointer" onclick="drill(\'programma\',\'{m}\')">{"".join(parts)}</g>')
    return f'<svg viewBox="0 0 {W} {H}" width="100%" style="display:block">{defs}{"".join(g)}</svg>'


def klasse_bars(kl):
    rows = [(k["naam"], k["A"], k["V"]) for k in KLASSE if k["A"] + k["V"] > 0]
    rows.sort(key=lambda r: -(r[1] + r[2]))
    rows = rows[:7]
    mx = max((a + v for _, a, v in rows), default=1)
    out = []
    for naam, a, v in rows:
        wa, wv = (a / mx) * 100, (v / mx) * 100
        out.append(f'''<div onclick="drill('klasse','{naam}')" style="display:flex;align-items:center;gap:12px;margin:9px 0;cursor:pointer">
      <div style="width:200px;font-size:13px;color:{INK};font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{naam}</div>
      <div style="flex:1;display:flex;align-items:center;height:16px">
        <div style="width:{wa:.1f}%;height:16px;background:{RED};border-radius:3px 0 0 3px"></div>
        <div style="width:{wv:.1f}%;height:16px;background:{AMBER};border-radius:0 3px 3px 0"></div>
        <span style="margin-left:8px;font-size:12px;color:{SOFT};font-weight:600">{a+v}</span></div></div>''')
    return "".join(out)


def acties_panel():
    st, prio = C["act_status"], C["act_prio"]
    rows = [("Open", st.get("Open", 0), RED), ("Afgerond", st.get("Afgerond", 0), GREEN),
            ("Over termijn", len(C["act_over"]), RED)]
    tiles = "".join(
        f'<div style="flex:1;background:{P["mist"]};border-radius:14px;padding:12px 14px">'
        f'<div style="font-size:24px;font-weight:650;color:{col}">{v}</div>'
        f'<div style="font-size:12px;color:{SOFT};font-weight:600">{lab}</div></div>'
        for lab, v, col in rows)
    pr = "".join(
        f'<div style="display:flex;justify-content:space-between;font-size:13px;margin:7px 0">'
        f'<span style="color:{SOFT}">{lab.capitalize()}</span><span style="font-weight:600">{prio.get(lab,0)}</span></div>'
        for lab in ["direct", "kort", "planmatig"])
    return (f'<div onclick="drill(\'acties\')" style="cursor:pointer">'
            f'<div style="display:flex;gap:10px;margin-bottom:14px">{tiles}</div>'
            f'<div style="font-size:13px;font-weight:600;color:{SOFT};margin-bottom:4px">Naar prioriteit ›</div>{pr}</div>')


conform_pct = round(100 * C["oordeel"]["Conform"] / C["waarnemingen"]["totaal"])
w = C["waarnemingen"]

HTML = f'''<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trendanalyse</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650;700&display=swap" rel="stylesheet">
<style>*{{box-sizing:border-box;margin:0;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
body{{background:{BG};color:{INK}}}
#ov{{position:fixed;inset:0;background:rgba(20,26,34,.38);display:none;align-items:center;justify-content:center;padding:24px;z-index:50}}
#ov.on{{display:flex}}
#mod{{background:#fff;border-radius:22px;max-width:780px;width:100%;max-height:82vh;overflow:auto;padding:24px 26px;box-shadow:0 20px 60px rgba(20,26,34,.28)}}
table{{width:100%;border-collapse:collapse;font-size:13px}}
th{{text-align:left;color:{SOFT};font-weight:600;padding:8px 10px;border-bottom:1px solid {LINE};white-space:nowrap}}
td{{padding:9px 10px;border-bottom:1px solid {LINE};color:{INK}}}
.pill{{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:600}}</style></head>
<body>
<div style="max-width:1400px;margin:0 auto;padding:32px 36px 48px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <div style="font-size:14px;color:{SOFT};font-weight:600">Trendanalyse werkplekinspecties · mei–nov 2026 · peildatum 11-11-2026</div>
      <div style="font-size:30px;font-weight:700;margin-top:4px">Trendanalyse 2026</div>
    </div>
    <div style="display:flex;gap:8px">
      <span style="height:30px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;background:{P['sage']};color:{GREEN};font-size:13px;font-weight:600">VCA 7.1 · 7.2</span>
      <span style="height:30px;display:inline-flex;align-items:center;padding:0 12px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px {LINE};color:{SOFT};font-size:13px;font-weight:600">Voorbeeld · fictief</span>
    </div>
  </div>
  <div style="font-size:12px;color:{SOFT};margin-bottom:12px">Tik op een tegel of staaf voor de achterliggende regels.</div>

  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:14px">
    {kpi(P['sage'], f"{conform_pct}%", "Conform", f"{C['oordeel']['Conform']} van {w['totaal']} waarnemingen", GREEN, "conform")}
    {kpi(P['sky'], str(w['totaal']), "Waarnemingen", f"TRA {w['TRA']} · onderwerpen {w['Algemeen']}", INK, "waarnemingen")}
    {kpi(P['blush'], str(len(C['vp_mis'])), "Programma gemist", f"{C['vp_x']} van {C['vp_y']} gedaan", RED, "programma")}
    {kpi(P['butter'], str(C['act_open_n']), "Open acties", f"{len(C['act_over'])} over termijn", BROWN, "acties")}
    {kpi(P['lilac'], str(C['n_wpi']), "Inspecties", f"{C['ingang']['ingepland']} ingepland · {C['ingang']['spontaan']} spontaan", INK, "inspecties")}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
    {card("Oordelen per maand", stacked_maand(C['oordeel_maand']), legend([("Conform", GREEN), ("Verbeterpunt", AMBER), ("Afwijking", RED)]))}
    {card("Verplichte WPI’s per maand", programma_maand(C['vp_maand']), legend([("Uitgevoerd", GREEN), ("Gemist", RED), ("Loopt nog", GREY)]))}
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px">
    {card("Afwijkingen en verbeterpunten per klasse", klasse_bars(C['klasse_gezien']), legend([("Afwijking", RED), ("Verbeterpunt", AMBER)]))}
    {card("Acties", acties_panel())}
  </div>

  <div style="font-size:12px;color:{SOFT};margin-top:18px;line-height:1.5">
    Momentopname: alleen wat de inspecteur zag. {C['n_wpi']} WPI’s ({C['ingang']['ingepland']} ingepland, {C['ingang']['spontaan']} spontaan) in {len(C['maanden'])} maanden.
    Kleine aantallen: verschillen zijn een signaal, geen bewezen trend. Fictieve voorbeelddata.
  </div>
</div>

<div id="ov" onclick="if(event.target==this)close_()"><div id="mod"></div></div>
<script>
const D = {json.dumps(DATA, ensure_ascii=False)};
const SOFT="{SOFT}", INK="{INK}", GREEN="{GREEN}", RED="{RED}", AMBER="{AMBER}", GREY="{GREY}";
const ov=document.getElementById('ov'), mod=document.getElementById('mod');
function close_(){{ov.classList.remove('on')}}
document.addEventListener('keydown',e=>{{if(e.key==='Escape')close_()}});
const esc=s=>String(s).replace(/[&<>]/g,c=>({{'&':'&amp;','<':'&lt;','>':'&gt;'}}[c]));
function pill(txt,bg,fg){{return `<span class="pill" style="background:${{bg}};color:${{fg}}">${{esc(txt)}}</span>`}}
function tbl(head,rows){{return `<table><thead><tr>${{head.map(h=>`<th>${{h}}</th>`).join('')}}</tr></thead><tbody>${{rows.map(r=>`<tr>${{r.map(c=>`<td>${{c}}</td>`).join('')}}</tr>`).join('')}}</tbody></table>`}}
function show(title,sub,body){{mod.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px"><div style="font-size:20px;font-weight:700">${{esc(title)}}</div><button onclick="close_()" style="border:0;background:#F3F4F6;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;color:${{SOFT}}">×</button></div>`+(sub?`<div style="font-size:13px;color:${{SOFT}};margin-bottom:14px">${{esc(sub)}}</div>`:'<div style="height:10px"></div>')+body;ov.classList.add('on')}}
const OC={{Conform:GREEN,Afwijking:RED,Verbeterpunt:AMBER,"Niet van toepassing":GREY}};
const OB={{Conform:"#E6F4EC",Afwijking:"#FDECEA",Verbeterpunt:"#FFF1DC","Niet van toepassing":"#EEF0F3"}};
function oordeelCells(o){{return ["Conform","Afwijking","Verbeterpunt","Niet van toepassing"].filter(k=>o[k]).map(k=>pill((k[0])+" "+o[k],OB[k],OC[k])).join(' ')||'<span style="color:'+SOFT+'">—</span>'}}

function drill(key,param){{
  if(key==='conform'||key==='waarnemingen'){{
    const o=D.oordeel, w=D.waarnemingen;
    let b=tbl(['Oordeel','Aantal'],[['Conform',o.Conform],['Afwijking',o.Afwijking],['Verbeterpunt',o.Verbeterpunt],['Niet van toepassing',o["Niet van toepassing"]]].map(r=>[pill(r[0],OB[r[0]],OC[r[0]]),r[1]]));
    b+=`<div style="margin-top:16px;font-size:13px;color:${{SOFT}}">Waarnemingen: TRA-regels ${{w.TRA}} · algemene onderwerpen ${{w.Algemeen}} · buiten TRA ${{w.buiten_TRA}} · totaal ${{w.totaal}}.</div>`;
    return show('Waarnemingen en oordelen','Alle waarnemingen in de periode (momentopname).',b);
  }}
  if(key==='inspecties'){{
    const rows=D.insp.map(w=>[w.nr, D.mnd[w.maand]||w.maand, w.ingang, oordeelCells(w.oord)]);
    return show('Inspecties',D.insp.length+' WPI\\'s in de periode.',tbl(['WPI','Maand','Ingang','Oordelen'],rows));
  }}
  if(key==='programma'){{
    let rows=D.vp_mis.map(o=>[o.project.replace(' (fictief)',''),o.product,o.locatie,D.mnd[o.maand]||o.maand,o.cat,pill('gemist','#FDECEA',RED)]);
    let sub=`${{D.vp_x}} van ${{D.vp_y}} verplichte WPI's uitgevoerd; ${{D.vp_mis.length}} gemist.`;
    if(param){{rows=rows.filter(r=>r[3]===(D.mnd[param]||param));sub=`Maand ${{D.mnd[param]||param}}: gemiste verplichte WPI's.`}}
    return show('Gemiste verplichte WPI\\'s',sub,rows.length?tbl(['Project','Product','Locatie','Maand','Soort',''],rows):'<div style="color:'+SOFT+'">Geen gemiste WPI\\'s in deze selectie.</div>');
  }}
  if(key==='oordeelmaand'){{
    const o=D.oordeel_maand[param]||{{}}, label=D.mnd[param]||param;
    const wk=D.insp.filter(w=>w.maand===param);
    let b=`<div style="margin-bottom:14px">${{oordeelCells(o)}}</div>`;
    b+=tbl(['WPI','Ingang','Oordelen'],wk.map(w=>[w.nr,w.ingang,oordeelCells(w.oord)]));
    return show('Oordelen · '+label,'Waarnemingen en inspecties in deze maand.',b);
  }}
  if(key==='klasse'){{
    const k=D.klasse.find(x=>x.naam===param)||{{C:0,A:0,V:0,tot:0}};
    const b=tbl(['','Aantal'],[[pill('Conform',OB.Conform,GREEN),k.C],[pill('Afwijking',OB.Afwijking,RED),k.A],[pill('Verbeterpunt',OB.Verbeterpunt,AMBER),k.V],['Totaal gezien',k.tot]]);
    return show(param,'Waarnemingen in deze klasse.',b);
  }}
  if(key==='acties'){{
    const stat=t=>t==='Open'?pill('Open','#FFF1DC',AMBER):pill(t,'#E6F4EC',GREEN);
    const rows=D.trend.map(a=>[a.nr,a.onderwerp,a.actiehouder,a.termijn,stat(a.status)]);
    let b=`<div style="font-size:13px;color:${{SOFT}};margin-bottom:12px">VCA 7.2 · ${{D.act_status.Open}} open · ${{D.act_status.Afgerond}} afgerond · ${{D.act_over.length}} over termijn. Prioriteit: direct ${{D.act_prio.direct}} · kort ${{D.act_prio.kort}} · planmatig ${{D.act_prio.planmatig}}.</div>`;
    b+=tbl(['Nr','Onderwerp','Actiehouder','Termijn','Status'],rows);
    return show('Trendacties (VCA 7.2)','Acties uit de trendanalyse, met actiehouder en termijn.',b);
  }}
}}
</script>
</body></html>'''

open(OUT, "w", encoding="utf-8").write(HTML)
print("geschreven:", OUT)
print(f"conform {conform_pct}% | programma {C['vp_x']}/{C['vp_y']} | insp {len(INSP)} | trendacties {len(TRENDR)}")
