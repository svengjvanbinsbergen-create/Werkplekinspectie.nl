#!/usr/bin/env python3
"""Bouwt een minimalistische, Power BI-achtige trendanalyse-pagina (app-stijl).

Leest app/tools/cijfers.json (dezelfde bron als de web-app) en schrijft een
zelfstandige HTML met inline SVG-grafieken. Geen fetch/JS nodig: rendert overal.

  python3 app/tools/trend_dashboard.py
  -> app/v2/screens/web/W09b-trend-dashboard.html
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, "cijfers.json"), encoding="utf-8"))
OUT = os.path.abspath(os.path.join(HERE, "..", "v2", "screens", "web", "W09b-trend-dashboard.html"))

# ---- app-tokens ----
INK, SOFT, LINE, BG = "#141A22", "#4A5565", "#E7E9ED", "#F6F7F9"
GREEN, RED, AMBER, GREY = "#1E7A4C", "#B42318", "#8A4B00", "#9AA2AE"
P = {"sky": "#EAF1FA", "butter": "#FBF5DE", "sage": "#EDF5E4",
     "lilac": "#F1EDFC", "blush": "#FBECEA", "mist": "#F3F4F6"}
OORD = {"Conform": GREEN, "Afwijking": RED, "Verbeterpunt": AMBER, "Niet van toepassing": GREY}
MND = {"2026-05": "mei", "2026-06": "jun", "2026-07": "jul", "2026-08": "aug",
       "2026-09": "sep", "2026-10": "okt", "2026-11": "nov"}


def kpi(bg, groot, label, sub, accent=INK):
    return f'''<div style="background:{bg};border-radius:20px;padding:20px 22px;display:flex;flex-direction:column;gap:2px">
  <div style="font-size:13px;color:{SOFT};font-weight:600">{label}</div>
  <div style="font-size:38px;font-weight:650;line-height:1.05;color:{accent};margin-top:6px">{groot}</div>
  <div style="font-size:13px;color:{SOFT};margin-top:2px">{sub}</div></div>'''


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


def stacked_maand(oordeel_maand):
    """Gestapelde staaf per maand: Conform/Verbeterpunt/Afwijking/NVT."""
    mnd = [m for m in C["maanden"]]
    totals = [sum(oordeel_maand.get(m, {}).values()) for m in mnd]
    mx = max(totals) or 1
    W, H, pad = 640, 200, 28
    bw = (W - pad) / len(mnd) * 0.52
    gap = (W - pad) / len(mnd)
    order = ["Conform", "Verbeterpunt", "Afwijking", "Niet van toepassing"]
    bars = []
    for i, m in enumerate(mnd):
        x = pad + gap * i + (gap - bw) / 2
        y = H - 22
        d = oordeel_maand.get(m, {})
        for key in order:
            v = d.get(key, 0)
            if not v:
                continue
            h = (v / mx) * (H - 50)
            y -= h
            bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="2" fill="{OORD[key]}"/>')
        tot = totals[i]
        bars.append(f'<text x="{x+bw/2:.1f}" y="{y-6:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{INK}">{tot}</text>')
        bars.append(f'<text x="{x+bw/2:.1f}" y="{H-6:.1f}" text-anchor="middle" font-size="12" fill="{SOFT}">{MND[m]}</text>')
    svg = f'<svg viewBox="0 0 {W} {H}" width="100%" style="display:block">{"".join(bars)}</svg>'
    return svg


def programma_maand(vp_maand):
    """Per maand: uitgevoerd (groen) / gemist (rood) / lopend (grijs gestreept)."""
    mnd = [m for m in C["maanden"]]
    ys = [vp_maand.get(m, {}).get("y", 0) + vp_maand.get(m, {}).get("lopend", 0) for m in mnd]
    mx = max(ys) or 1
    W, H, pad = 640, 200, 28
    bw = (W - pad) / len(mnd) * 0.52
    gap = (W - pad) / len(mnd)
    bars = []
    for i, m in enumerate(mnd):
        x = pad + gap * i + (gap - bw) / 2
        d = vp_maand.get(m, {})
        ok, y_, lop = d.get("ok", 0), d.get("y", 0), d.get("lopend", 0)
        gemist = y_ - ok
        y = H - 22
        segs = [(ok, GREEN, ""), (gemist, RED, ""), (lop, GREY, "url(#hatch)")]
        for v, col, fill in segs:
            if v <= 0:
                continue
            h = (v / mx) * (H - 50)
            y -= h
            f = fill or col
            bars.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{h:.1f}" rx="2" fill="{f}" stroke="{GREY if fill else "none"}" stroke-width="{1 if fill else 0}"/>')
        bars.append(f'<text x="{x+bw/2:.1f}" y="{y-6:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{INK}">{ok}/{y_}</text>')
        bars.append(f'<text x="{x+bw/2:.1f}" y="{H-6:.1f}" text-anchor="middle" font-size="12" fill="{SOFT}">{MND[m]}</text>')
    defs = '<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F3F4F6"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C9CED6" stroke-width="2"/></pattern></defs>'
    return f'<svg viewBox="0 0 {W} {H}" width="100%" style="display:block">{defs}{"".join(bars)}</svg>'


def klasse_bars(klasse_gezien):
    """Horizontale balken: afwijkingen + verbeterpunten per klasse (meeste eerst)."""
    rows = []
    for k, v in klasse_gezien.items():
        a, vb = v.get("Afwijking", 0), v.get("Verbeterpunt", 0)
        if a + vb > 0:
            rows.append((k, a, vb, v.get("tot", 0)))
    rows.sort(key=lambda r: -(r[1] + r[2]))
    rows = rows[:7]
    mx = max((a + vb for _, a, vb, _ in rows), default=1)
    out = []
    for k, a, vb, tot in rows:
        wa = (a / mx) * 100
        wv = (vb / mx) * 100
        out.append(f'''<div style="display:flex;align-items:center;gap:12px;margin:9px 0">
      <div style="width:200px;font-size:13px;color:{INK};font-weight:500;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{k}</div>
      <div style="flex:1;display:flex;align-items:center;height:16px">
        <div style="width:{wa:.1f}%;height:16px;background:{RED};border-radius:3px 0 0 3px"></div>
        <div style="width:{wv:.1f}%;height:16px;background:{AMBER};border-radius:0 3px 3px 0"></div>
        <span style="margin-left:8px;font-size:12px;color:{SOFT};font-weight:600">{a+vb}</span>
      </div></div>''')
    return "".join(out)


def acties_panel():
    st = C["act_status"]
    prio = C["act_prio"]
    over = len(C["act_over"])
    rows = [("Open", st.get("Open", 0), RED), ("Afgerond", st.get("Afgerond", 0), GREEN),
            ("Over termijn", over, RED)]
    tiles = "".join(
        f'<div style="flex:1;background:{P["mist"]};border-radius:14px;padding:12px 14px">'
        f'<div style="font-size:24px;font-weight:650;color:{col}">{v}</div>'
        f'<div style="font-size:12px;color:{SOFT};font-weight:600">{lab}</div></div>'
        for lab, v, col in rows)
    pr = "".join(
        f'<div style="display:flex;justify-content:space-between;font-size:13px;color:{INK};margin:7px 0">'
        f'<span style="color:{SOFT}">{lab.capitalize()}</span><span style="font-weight:600">{prio.get(lab,0)}</span></div>'
        for lab in ["direct", "kort", "planmatig"])
    return (f'<div style="display:flex;gap:10px;margin-bottom:14px">{tiles}</div>'
            f'<div style="font-size:13px;font-weight:600;color:{SOFT};margin-bottom:4px">Naar prioriteit</div>{pr}')


conform_pct = round(100 * C["oordeel"]["Conform"] / C["waarnemingen"]["totaal"])
w = C["waarnemingen"]
g = C["getoetst"]

HTML = f'''<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Trendanalyse</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;650;700&display=swap" rel="stylesheet">
<style>*{{box-sizing:border-box;margin:0;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}}
body{{background:{BG};color:{INK}}}</style></head>
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

  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:14px">
    {kpi(P['sage'], f"{conform_pct}%", "Conform", f"{C['oordeel']['Conform']} van {w['totaal']} waarnemingen", GREEN)}
    {kpi(P['sky'], str(w['totaal']), "Waarnemingen", f"TRA {w['TRA']} · onderwerpen {w['Algemeen']}")}
    {kpi(P['blush'], f"{len(C['vp_mis'])}", "Programma gemist", f"{C['vp_x']} van {C['vp_y']} gedaan", RED)}
    {kpi(P['butter'], str(C['act_open_n']), "Open acties", f"{len(C['act_over'])} over termijn", BROWN := '#7A4300')}
    {kpi(P['lilac'], str(C['n_wpi']), "Inspecties", f"{C['ingang']['ingepland']} ingepland · {C['ingang']['spontaan']} spontaan")}
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
    {card("Oordelen per maand", stacked_maand(C['oordeel_maand']),
          legend([("Conform", GREEN), ("Verbeterpunt", AMBER), ("Afwijking", RED)]))}
    {card("Verplichte WPI’s per maand", programma_maand(C['vp_maand']),
          legend([("Uitgevoerd", GREEN), ("Gemist", RED), ("Loopt nog", GREY)]))}
  </div>

  <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px">
    {card("Afwijkingen en verbeterpunten per klasse", klasse_bars(C['klasse_gezien']),
          legend([("Afwijking", RED), ("Verbeterpunt", AMBER)]))}
    {card("Acties", acties_panel())}
  </div>

  <div style="font-size:12px;color:{SOFT};margin-top:18px;line-height:1.5">
    Momentopname: alleen wat de inspecteur zag. {C['n_wpi']} WPI’s ({C['ingang']['ingepland']} ingepland, {C['ingang']['spontaan']} spontaan) in {len(C['maanden'])} maanden.
    Kleine aantallen: verschillen zijn een signaal, geen bewezen trend. Fictieve voorbeelddata.
  </div>
</div>
</body></html>'''

open(OUT, "w", encoding="utf-8").write(HTML)
print("geschreven:", OUT)
print(f"conform {conform_pct}% | programma {C['vp_x']}/{C['vp_y']} | acties open {C['act_open_n']}")
