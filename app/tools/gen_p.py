# Generator voor P01-P05 (ronde 3). Schrijft HTML naar /home/claude/app/screens/phone/
import json, os
OUT = '/home/claude/app/screens/phone/'
KB = json.load(open('/home/claude/wpi/run/data/kennisbank.json', encoding='utf-8'))
RULES = {r['id']: r for r in KB['DAM']['regels']}

def lit(rid, groep, zin):
    """Controleer dat een maatregelzin letterlijk in de kennisbank staat."""
    ms = [m for m in RULES[rid]['maatregelen'] if m.startswith(groep + ':')]
    assert ms and zin in ms[0], (rid, groep, zin)
    return zin

def risico(rid):
    return RULES[rid]['risico']

# ---------- iconen ----------
def I(d, w=20, c='currentColor', sw='1.75'):
    return (f'<svg width="{w}" height="{w}" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;display:block">{d}</svg>')
BACK = '<path d="M15 5l-7 7 7 7"/>'
CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>'
CHEV = '<path d="M9 5l7 7-7 7"/>'
CHEVD = '<path d="M5 9l7 7 7-7"/>'
CHEVU = '<path d="M5 15l7-7 7 7"/>'
PEN = '<path d="M4 20h4L19 9l-4-4L4 16z"/>'
CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
LOCK = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
MIC = '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v3"/>'
CAM = '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
WARN = '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5h.01"/>'
CLOCK = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'
LIST = '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>'
KEYB = '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>'
SEARCH = '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>'
PLUS = '<path d="M12 5v14M5 12h14"/>'
PLAY = '<path d="M8 5.5v13l10-6.5z"/>'
PHONE = '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 17.5h2"/>'
CLOUD = '<path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/><path d="M9.5 13.5l2 2 3.5-3.5"/>'
NOCLOUD = '<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 4-2.3"/><path d="M19 12.5a10 10 0 0 0-3.2-2"/><path d="M12 20h.01"/>'
BUBBLE = '<path d="M4 5h16v11H9l-5 4z"/>'

# ---------- tokens ----------
TXT = '#141A22'; SOFT = '#4A5565'; WEAK = '#6B7584'; LINE = '#DDE1E7'; BG = '#F6F7F9'
PRI = '#1F5FBF'; PRI_S = '#E7EFFB'; ACC = '#5235C0'; ACC_BORDER = '#6B4FD8'; ACC_S = '#EFEBFD'
OORD = {'C': ('Conform', '#1E7A4C', '#E6F4EC'), 'A': ('Afwijking', '#B42318', '#FDECEA'),
        'V': ('Verbeterpunt', '#8A4B00', '#FFF1DC'), 'NVT': ('Niet van toepassing', '#4A5565', '#EEF0F3')}

def chip(code, h=26):
    n, fg, bg = OORD[code]
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;height:{h}px;padding:0 10px;border-radius:999px;'
            f'background:{bg};color:{fg};font-size:14px;font-weight:600;white-space:nowrap;flex:none;"><span style="font-weight:700;">[{code}]</span>{n}</span>')

def tag(text, kind='jij'):
    if kind == 'jij':
        return f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;background:#EEF0F3;color:{TXT};font-size:14px;font-weight:700;flex:none;">{text}</span>'
    return f'<span style="display:inline-flex;align-items:center;height:24px;padding:0 8px;border-radius:999px;background:{ACC};color:#FFFFFF;font-size:14px;font-weight:700;flex:none;">{text}</span>'

def badge(n):
    return f'<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:{ACC};color:#FFFFFF;font-size:14px;font-weight:700;flex:none;">{n}</span>'

def stepmark(n):  # tik-nummer in P04b
    return f'<span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:{TXT};color:#FFFFFF;font-size:14px;font-weight:700;flex:none;">{n}</span>'

def link48(text, extra=''):
    return (f'<a href="#" style="display:inline-flex;align-items:center;height:48px;margin:-12px 0;padding:0 4px;'
            f'font-size:16px;font-weight:600;color:{PRI};white-space:nowrap;flex:none;{extra}">{text}</a>')

# ---------- skelet ----------
def head(code, title):
    return f'''<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=390, initial-scale=1">
<title>{code} · {title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  html, body {{ margin: 0; padding: 0; background: #DDE1E7; }}
  body {{ font-family: Inter, system-ui, sans-serif; color: #141A22; -webkit-font-smoothing: antialiased; }}
  * {{ box-sizing: border-box; }}
  a {{ color: #1F5FBF; text-decoration: none; }}
  button {{ font-family: inherit; }}
</style>
</head>
<body>
<main id="root" data-scherm="{code}" style="position:relative;width:390px;height:844px;overflow:hidden;background:{BG};display:flex;flex-direction:column;">
<div style="height:44px;flex:none;" aria-hidden="true"></div>
'''

def header(title, sub, conn='Online', close=False):
    if conn == 'Online':
        cc = (f'<span style="display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:999px;background:#FFFFFF;'
              f'border:1.5px solid {WEAK};color:{TXT};font-size:14px;font-weight:600;">{I(CLOUD,16)}Online</span>')
    else:
        cc = (f'<span style="display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:999px;background:{TXT};'
              f'color:#FFFFFF;font-size:14px;font-weight:600;">{I(NOCLOUD,16)}Offline</span>')
    return f'''<header style="height:56px;flex:none;display:flex;align-items:center;gap:4px;padding:0 16px 0 4px;">
  <button aria-label="{'Sluiten' if close else 'Terug'}" style="width:48px;height:48px;border:0;background:transparent;color:{TXT};display:flex;align-items:center;justify-content:center;border-radius:8px;flex:none;">{I(CLOSE if close else BACK,24)}</button>
  <div style="flex:1;min-width:0;">
    <div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:18px;font-weight:600;line-height:22px;white-space:nowrap;">{title}</div>
    <div style="font-size:14px;line-height:18px;color:{SOFT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{sub}</div>
  </div>
  <div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
    <span style="font-size:12px;line-height:16px;font-weight:600;color:{SOFT};border:1px solid {LINE};background:#FFFFFF;border-radius:999px;padding:2px 8px;white-space:nowrap;">Voorbeeldinhoud · fictief</span>
    {cc}
  </div>
</header>
'''

def progress(n, of=8):
    bars = ''.join(f'<div style="flex:1;height:4px;border-radius:999px;background:{PRI if i < n else LINE};"></div>' for i in range(of))
    return f'<div role="progressbar" aria-label="Stap {n} van {of}" aria-valuenow="{n}" aria-valuemax="{of}" style="flex:none;display:flex;gap:4px;padding:2px 16px 8px 16px;">{bars}</div>\n'

def content(inner, gap=6):
    return f'<div style="flex:1;min-height:0;overflow:hidden;padding:0 16px 2px 16px;display:flex;flex-direction:column;gap:{gap}px;">{inner}</div>\n'

def gevaar():
    return f'''<div style="flex:none;padding:4px 16px 6px 16px;">
  <button aria-label="Direct gevaar: werk stilleggen. Houd 2 seconden ingedrukt." style="width:100%;height:48px;border-radius:8px;background:#FFFFFF;border:2px solid #B42318;color:#B42318;display:flex;align-items:center;gap:10px;padding:0 12px;text-align:left;">{I(WARN,24,'#B42318')}<span style="flex:1;white-space:nowrap;"><span style="display:block;font-size:16px;line-height:20px;font-weight:700;">Direct gevaar · werk stilleggen</span><span style="display:block;font-size:14px;line-height:17px;font-weight:600;color:{SOFT};">houd 2 s ingedrukt</span></span></button>
</div>
'''

def nav(primary, disabled=False, icon=CHEV, reason=None):
    if disabled:
        p = (f'<button disabled aria-disabled="true" style="width:124px;height:56px;margin-top:8px;border-radius:8px;background:#EEF0F3;color:{SOFT};'
             f'border:1.5px solid {LINE};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;line-height:19px;text-align:center;padding:0 6px;">{primary}</button>')
    else:
        p = (f'<button style="width:124px;height:56px;margin-top:8px;border-radius:8px;background:{PRI};color:#FFFFFF;border:0;display:flex;'
             f'align-items:center;justify-content:center;gap:6px;font-size:16px;font-weight:600;line-height:19px;text-align:center;padding:0 8px;">{primary}{I(icon,22) if icon else ""}</button>')
    return f'''<nav style="flex:none;height:120px;background:#FFFFFF;border-top:1px solid {LINE};display:flex;align-items:flex-start;justify-content:space-between;padding:12px 16px 0 16px;">
  <button style="width:124px;height:56px;margin-top:8px;border-radius:8px;background:#FFFFFF;color:{TXT};border:1.5px solid {WEAK};display:flex;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:600;">{I(CAM,24)}Foto</button>
  <div style="display:flex;flex-direction:column;align-items:center;width:84px;">
    <button aria-label="Inspreken" style="width:72px;height:72px;border-radius:999px;background:{PRI};color:#FFFFFF;border:0;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(20,26,34,.10);">{I(MIC,32,sw='2')}</button>
    <div style="font-size:14px;line-height:18px;font-weight:600;margin-top:4px;color:{TXT};white-space:nowrap;">Inspreken</div>
  </div>
  {p}
</nav>
</main>
</body>
</html>
'''

def card(inner, pad='8px 12px', border=f'1px solid {LINE}', bg='#FFFFFF', extra=''):
    return f'<section style="background:{bg};border:{border};border-radius:10px;padding:{pad};{extra}">{inner}</section>'

def oordeel_row(pressed=None, locked=False, mark=None):
    out = []
    for code, lab, fl in [('C', 'Conform', 1), ('A', 'Afwijking', 1), ('V', 'Verbeterpunt', 1.45), ('NVT', 'N.v.t.', 0.75)]:
        n, fg, bg = OORD[code]
        if locked:
            st = f'background:{BG};color:{SOFT};border:1.5px dashed {WEAK};'
        elif pressed == code:
            st = f'background:{fg};color:#FFFFFF;border:2px solid {fg};'
        else:
            st = f'background:#FFFFFF;color:{fg};border:1.5px solid {WEAK};'
        dis = ' disabled aria-disabled="true"' if locked else ''
        m = (f'<span style="position:absolute;top:-8px;right:-6px;">{stepmark(mark)}</span>' if (mark and pressed == code) else '')
        out.append(f'<button{dis} aria-pressed="{"true" if pressed == code else "false"}" aria-label="[{code}] {n}" style="position:relative;flex:{fl};min-width:0;height:56px;border-radius:8px;{st}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0 2px;">'
                   f'<span style="font-size:16px;line-height:18px;font-weight:700;">[{code}]</span><span style="font-size:14px;line-height:16px;font-weight:600;white-space:nowrap;">{lab}</span>{m}</button>')
    return '<div style="display:flex;gap:6px;">' + ''.join(out) + '</div>'

def maatregel_row(text, state='', right='', mark=None, sub=''):
    """state: '' (tikbaar), 'gekoppeld' (bevestigd, primair), 'voorstel' (AI, accent), 'gekozen' (snel tikken)"""
    if state in ('gekoppeld', 'gekozen'):
        box = f'background:{PRI_S};border:2px solid {PRI};'
        dot = f'<span style="width:24px;height:24px;border-radius:999px;background:{PRI};color:#FFFFFF;display:flex;align-items:center;justify-content:center;flex:none;">{I(CHECK,16,sw="2.5")}</span>'
    elif state == 'voorstel':
        box = f'background:#FFFFFF;border:2px solid {ACC_BORDER};'
        dot = f'<span style="width:24px;height:24px;border-radius:999px;border:2px solid {ACC};background:{ACC_S};flex:none;"></span>'
    else:
        box = f'background:#FFFFFF;border:1.5px solid {LINE};'
        dot = f'<span style="width:24px;height:24px;border-radius:999px;border:2px solid {WEAK};background:#FFFFFF;flex:none;"></span>'
    m = stepmark(mark) if mark else ''
    return (f'<div style="border-radius:8px;{box}"><button aria-pressed="{"true" if state else "false"}" style="width:100%;min-height:48px;display:flex;align-items:center;gap:10px;padding:3px 8px 3px 10px;background:transparent;border:0;text-align:left;color:{TXT};">'
            f'{dot}<span style="flex:1;font-size:16px;line-height:21px;{"font-weight:600;" if state else ""}">{text}</span>{right}{m}</button>{sub}</div>')

def grp(label):
    return f'<div style="font-size:14px;line-height:18px;font-weight:600;color:{SOFT};margin:2px 0 0 2px;">{label}</div>'

def write(code, html):
    open(OUT + code + '.html', 'w', encoding='utf-8').write(html)

# =====================================================================
# P01 — Nieuwe inspectie (kop)
# =====================================================================
def p01():
    h = head('P01-start', 'Nieuwe inspectie') + header('Nieuwe inspectie', 'Stap 1 van 8 · Kop') + progress(1)
    L = lambda t, c=TXT: f'<div style="font-size:16px;line-height:22px;color:{c};">{t}</div>'
    kop = card(f'''<div style="display:flex;align-items:center;gap:8px;">
    <span style="font-family:'Space Grotesk',Inter,sans-serif;font-size:18px;line-height:22px;font-weight:600;white-space:nowrap;">P26-168 · Damwand</span>
    <button style="margin-left:auto;height:48px;padding:0 10px;border-radius:8px;background:#FFFFFF;color:{PRI};border:1.5px solid {WEAK};font-size:16px;font-weight:600;display:flex;align-items:center;gap:6px;flex:none;">{I(PEN,18)}Wijzigen</button>
  </div>
  <div style="font-size:16px;line-height:22px;display:flex;align-items:center;gap:8px;">Waterschap Voorbeeld-Noord<span style="font-size:14px;line-height:18px;font-weight:600;color:{SOFT};background:#EEF0F3;border-radius:999px;padding:1px 8px;white-space:nowrap;">uit planning</span></div>
  {L('RWZI Voorbeeldstad · do 5 nov, 09:40')}
  {L('WPI coördinator · Coördinator 2 (fictief)')}
  {L('Monteur 1 en 2 (fictief) + kraanmachinist')}
  <div style="font-size:16px;line-height:22px;display:flex;gap:6px;align-items:center;"><span style="color:{SOFT};">Weer en omstandigheden:</span><span style="font-weight:600;color:{PRI};">nog inspreken</span></div>''',
               pad='2px 8px 8px 12px')
    toestel = (f'<div style="display:flex;align-items:flex-start;gap:8px;padding:2px 4px;">{I(PHONE,20,SOFT)}'
               f'<div style="font-size:14px;line-height:19px;color:{SOFT};"><b style="color:{TXT};font-weight:600;">Op dit toestel:</b> TRA Damwand, kennisbank v1.3, 2 eerdere WPI\'s — werkt zonder bereik</div></div>')

    def item(code, rid, status, actie, proj, tekst=None, knop=None, rood=False):
        st = f'<span style="font-size:14px;line-height:18px;color:{"#B42318" if rood else SOFT};font-weight:{600 if rood else 400};white-space:nowrap;">{status}</span>'
        right = (f'<button style="margin-left:auto;flex:none;height:48px;padding:0 10px;border-radius:8px;background:#FFFFFF;color:{PRI};border:1.5px solid {PRI};font-size:16px;font-weight:600;white-space:nowrap;">{knop}</button>' if knop else '')
        t = f'<div style="font-size:16px;line-height:21px;margin-top:2px;">{tekst}</div>' if tekst else ''
        return (f'<div style="padding:5px 8px 6px 12px;border-top:1px solid {LINE};">'
                f'<div style="display:flex;align-items:center;gap:8px;min-height:{48 if knop else 26}px;">{chip(code)}<span style="font-size:16px;line-height:20px;font-weight:600;white-space:nowrap;">{rid}</span>{right}</div>'
                f'{t}<div style="font-size:14px;line-height:19px;color:{SOFT};margin-top:1px;">{actie} · {proj} · {st}</div></div>')
    hist = card(f'''<div style="padding:6px 12px 6px 12px;">
    <div style="display:flex;align-items:center;gap:8px;"><span style="font-family:'Space Grotesk',Inter,sans-serif;font-size:18px;font-weight:600;line-height:22px;">Opnieuw bekijken</span><span style="display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border-radius:999px;background:#FFFFFF;border:1px solid {ACC};color:{ACC};font-size:14px;font-weight:700;">{I(BUBBLE,16)}Begeleider</span></div>
    <div style="font-size:16px;line-height:21px;color:{ACC};margin-top:2px;">Na je taakkeuze komen de punten van die taak terug bij de regel, de rest in de afsluiting.</div>
  </div>'''
               + item('V', 'DAM-2.04', 'termijn 28-09 verlopen', 'WPI-20260914-DAM-C1-1', 'P26-304', 'Geen stuurlijn gebruikt bij het begeleiden van de last.', 'Bekijken', True)
               + f'''<button style="width:100%;min-height:48px;display:flex;align-items:center;gap:8px;padding:5px 8px 6px 12px;background:transparent;border:0;border-top:1px solid {LINE};text-align:left;color:{TXT};">
    <div style="flex:1;min-width:0;"><div style="font-size:16px;line-height:21px;"><b style="font-weight:600;">Nog 4 punten</b> · 1 open, 3 afgerond</div><div style="font-size:14px;line-height:19px;color:{SOFT};">DAM-1.07 · DAM-2.06 · DAM-2.07 · DAM-1.06</div></div>{I(CHEV,20,SOFT)}</button>''',
               pad='0', extra='overflow:hidden;')
    write('P01-start', h + content(kop + toestel + hist, 6) + nav('Start'))

def p01b():
    h = head('P01b-overige-punten', 'Opnieuw bekijken') + header('Overige punten', 'Damwand · 4 punten') + progress(1)
    def it(code, rid, tekst, actie, proj, status, rood=False, knop=None):
        st = f'<span style="color:{"#B42318" if rood else SOFT};font-weight:{600 if rood else 400};">{status}</span>'
        right = (f'<button style="margin-left:auto;flex:none;height:48px;padding:0 10px;border-radius:8px;background:#FFFFFF;color:{PRI};border:1.5px solid {PRI};font-size:16px;font-weight:600;white-space:nowrap;">{knop}</button>' if knop else '')
        return (f'<div style="padding:3px 8px 5px 12px;border-top:1px solid {LINE};">'
                f'<div style="display:flex;align-items:center;gap:8px;min-height:{48 if knop else 28}px;">{chip(code)}<span style="font-size:16px;line-height:20px;font-weight:600;white-space:nowrap;">{rid}</span>{right}</div>'
                f'<div style="font-size:16px;line-height:21px;margin-top:1px;">{tekst}</div>'
                f'<div style="font-size:14px;line-height:19px;color:{SOFT};margin-top:1px;">{actie} · {proj} · {st}</div></div>')
    grp_h = lambda t: f'<div style="padding:4px 12px 2px 12px;border-top:1px solid {LINE};font-size:14px;line-height:18px;font-weight:600;color:{SOFT};">{t}</div>'
    lijst = card(f'<div style="padding:6px 12px 6px 12px;font-size:16px;line-height:21px;color:{ACC};">Komen terug bij de regel als je die taak kiest, anders in de afsluiting.</div>'
                 + grp_h('Open')
                 + it('A', 'DAM-1.07', 'Kraan opgesteld zonder dat de ligging van het kabeltracé bij de opdrachtgever was nagevraagd.', 'WPI-20260925-DAM-DL-2', 'P26-194', 'open t/m 20-11')
                 + grp_h('Afgerond')
                 + it('A', 'DAM-2.06', 'Eten of drinken in de werkzone.', 'WPI-20260914-DAM-C1-2', 'P26-304', 'afgerond 14-09')
                 + it('A', 'DAM-2.07', 'Geen mangatwacht aanwezig bij het betreden.', 'WPI-20260914-DAM-C1-3', 'P26-304', 'afgerond 14-09')
                 + it('A', 'DAM-1.06', 'Gewicht van het zwaarste damwanddeel stond niet in het hijsplan; kraancapaciteit niet aantoonbaar getoetst.', 'WPI-20260925-DAM-DL-1', 'P26-194', 'afgerond 16-10'),
                 pad='0', extra='overflow:hidden;')
    write('P01b-overige-punten', h + content(lijst, 6) + nav('Klaar', icon=CHECK))

# =====================================================================
# P02 — Product en taak
# =====================================================================
def p02():
    h = head('P02-product-taak', 'Product en taak') + header('Product en taak', 'Welke taak nu?') + progress(2)
    prod = card(f'''<div style="display:flex;align-items:center;gap:10px;">
  <div style="width:40px;height:40px;border-radius:8px;background:{PRI_S};color:{PRI};display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',Inter,sans-serif;font-weight:700;font-size:14px;flex:none;">DAM</div>
  <div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-family:'Space Grotesk',Inter,sans-serif;font-size:18px;font-weight:600;line-height:22px;">Damwand</span><span style="font-size:14px;line-height:18px;font-weight:600;color:{SOFT};background:#EEF0F3;border-radius:999px;padding:1px 8px;white-space:nowrap;">uit planning</span></div>
  <div style="font-size:14px;line-height:18px;color:{SOFT};">WPI-20261105-DAM-C2 (voorlopig)</div></div></div>''', pad='5px 12px')
    def task(meta, name, last=False):
        return (f'<button style="width:100%;min-height:52px;display:flex;align-items:center;gap:12px;padding:3px 4px 3px 10px;background:transparent;border:0;{"" if last else f"border-bottom:1px solid {LINE};"}text-align:left;color:{TXT};">'
                f'<span style="width:24px;height:24px;border-radius:6px;border:2px solid {SOFT};flex:none;background:#FFFFFF;"></span>'
                f'<div style="flex:1;min-width:0;"><div style="font-size:14px;line-height:18px;color:{SOFT};">{meta}</div><div style="font-size:16px;line-height:21px;">{name}</div></div></button>')
    voor = f'''<div style="background:{ACC_S};border:1.5px solid {ACC_BORDER};border-radius:10px;margin:2px 0;padding:4px 10px 6px 10px;">
  <button style="width:100%;min-height:48px;display:flex;align-items:center;gap:12px;padding:0;background:transparent;border:0;text-align:left;color:{TXT};">
    <span style="width:24px;height:24px;border-radius:6px;border:2px solid {ACC};flex:none;background:#FFFFFF;"></span>
    <div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;">{tag('Voorstel','v')}<span style="font-size:14px;line-height:18px;color:{SOFT};">Fase 2 · Demontage · 8 regels</span></div>
    <div style="font-size:16px;line-height:22px;font-weight:600;margin-top:2px;">Verwijderen damwand</div></div>
  </button>
  <div style="font-size:16px;line-height:21px;margin:2px 0 0 36px;display:flex;align-items:center;gap:6px;">{tag('Jij')}<span style="white-space:nowrap;">"Ze halen de damwand er nu uit."</span></div>
</div>'''
    lijst = card(task('Fase 1 · Voorbereiding · 5 regels', 'Afschakelprotocol en Veiligstelling (LOTOTO)')
                 + task('Fase 1 · Voorbereiding · 4 regels', 'Situatie Kraanopstelling', True) + voor
                 + task('Fase 3 · Montage · 10 regels', 'Plaatsen damwand')
                 + task('Fase 4 · Elektrisch Aansluiten · 1 regel', 'Inschakelen')
                 + task('Fase 5 · Inbedrijfstelling · 3 regels', 'Inbedrijfstelling van de damwand (indien gemotoriseerd/geautomatiseerd)', True)
                 + f'''<div style="display:flex;gap:8px;padding:4px 0 2px 0;">
  <button style="flex:1;height:48px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">{I(SEARCH,20)}Ander product</button>
  <button style="flex:1;height:48px;border-radius:8px;background:#FFFFFF;border:1.5px dashed {WEAK};color:{TXT};font-size:16px;font-weight:600;white-space:nowrap;display:flex;align-items:center;justify-content:center;">Niet in kennisbank</button>
</div>''', pad='2px 6px 4px 6px')
    write('P02-product-taak', h + content(prod + lijst, 5) + gevaar() + nav('Taak<br>bevestigen', icon=None))

# =====================================================================
# P03 — Algemene observatie (offline)
# =====================================================================
def p03(expanded=False):
    code = 'P03b-algemeen-uitgeklapt' if expanded else 'P03-algemeen'
    h = head(code, 'Algemene observatie') + header('Algemeen', '5 van 9 besproken', conn='Offline') + progress(3)
    rowA = (f'<button style="width:100%;min-height:52px;display:flex;align-items:center;gap:8px;padding:5px 8px 5px 12px;background:transparent;border:0;border-bottom:1px solid {LINE};text-align:left;color:{TXT};">'
            f'<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;">{chip("A")}</div><div style="font-size:16px;line-height:21px;margin-top:3px;">Voorbereiding en documenten</div></div>{I(CHEV,20,SOFT)}</button>')
    subs = [('Veiligstellen (LOTOTO)', 'Twee sloten op de kast, spanningsvrij.'),
            ('PBM', 'Helm, schoenen, handschoenen: in orde.'),
            ('Arbeidsmiddelen en gereedschap', 'Takel en stroppen: keuring geldig.'),
            ('Hijsen en kraan', 'Hijsplan aanwezig, hijszone afgezet.')]
    if expanded:
        inner = ''.join(f'<div style="padding:5px 0 5px 0;border-top:1px solid {LINE};"><div style="display:flex;align-items:center;gap:8px;"><span style="flex:1;font-size:16px;line-height:21px;font-weight:600;">{n}</span>{tag("Jij")}</div>'
                        f'<div style="font-size:16px;line-height:21px;margin-top:2px;">"{t}"</div></div>' for n, t in subs)
        rowC = (f'<div style="border-bottom:1px solid {LINE};padding:5px 8px 4px 12px;">'
                f'<button aria-expanded="true" style="width:100%;min-height:48px;display:flex;align-items:center;gap:8px;padding:0;background:transparent;border:0;text-align:left;color:{TXT};">'
                f'<span style="flex:1;display:flex;align-items:center;gap:8px;">{chip("C")}<span style="font-size:16px;color:{SOFT};">4 onderwerpen</span></span>{I(CHEVU,20,SOFT)}</button>{inner}</div>')
    else:
        rowC = (f'<button aria-expanded="false" style="width:100%;min-height:52px;display:flex;align-items:center;gap:8px;padding:5px 8px 5px 12px;background:transparent;border:0;border-bottom:1px solid {LINE};text-align:left;color:{TXT};">'
                f'<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;">{chip("C")}<span style="font-size:16px;color:{TXT};white-space:nowrap;">4 onderwerpen <span style="font-size:14px;color:{SOFT};">· uitklappen</span></span></div>'
                f'</div>{I(CHEVD,20,SOFT)}</button>')
    rowO = (f'<button style="width:100%;min-height:52px;display:flex;align-items:center;gap:8px;padding:5px 8px 5px 12px;background:transparent;border:0;text-align:left;color:{TXT};">'
            f'<div style="flex:1;min-width:0;"><div style="display:flex;align-items:center;gap:8px;"><span style="display:inline-flex;align-items:center;height:26px;padding:0 10px;border-radius:999px;border:1.5px solid {WEAK};color:{TXT};font-size:14px;font-weight:600;white-space:nowrap;">Nog open · 3</span><span style="font-size:14px;line-height:18px;color:{SOFT};font-weight:600;white-space:nowrap;">in orde? via afsluitvraag</span></div>'
            f'<div style="font-size:16px;line-height:21px;margin-top:3px;">Werkplek en omgeving · Noodvoorzieningen · Gedrag en samenwerking</div></div>{I(CHEV,20,SOFT)}</button>')
    lijst = card(rowA + rowC + rowO, pad='0', extra='overflow:hidden;')
    if expanded:
        actief = (f'<button style="width:100%;min-height:56px;display:flex;align-items:center;gap:8px;padding:6px 10px 6px 12px;background:#FFFFFF;border:2px solid {TXT};border-radius:10px;text-align:left;color:{TXT};">'
                  f'<div style="flex:1;min-width:0;"><div style="font-size:14px;line-height:18px;color:{SOFT};">Nu bezig · tekst nog aanvullen</div><div style="font-size:16px;line-height:21px;font-weight:600;">Gevaarlijke stoffen, hygiëne en milieu</div></div>{I(CHEV,20,SOFT)}</button>')
        body = lijst + actief
    else:
        actief = card(f'''<div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:18px;line-height:23px;font-weight:600;">Gevaarlijke stoffen, hygiëne en milieu</div>
  <div style="margin-top:6px;border:1.5px solid {WEAK};border-radius:8px;padding:4px 4px 6px 10px;background:#FFFFFF;">
    <div style="display:flex;align-items:center;gap:8px;">{tag('Jij')}<span style="font-size:14px;color:{SOFT};white-space:nowrap;">op toestel · 0:14</span>
      <button aria-label="Tekst typen of aanvullen" style="margin-left:auto;height:48px;padding:0 10px;border-radius:8px;background:#FFFFFF;border:0;color:{PRI};font-size:16px;font-weight:600;display:flex;align-items:center;gap:6px;">{I(KEYB,20)}Typen</button></div>
    <div style="font-size:16px;line-height:22px;">"Wasset ligt niet in de bus. Water en zeep laten halen <span style="background:#FFF1DC;color:#8A4B00;font-weight:600;border-radius:4px;padding:0 4px;">[niet verstaan]</span>"</div>
  </div>
  <div style="font-size:14px;line-height:18px;color:{SOFT};margin-top:4px;">Geen bereik: voorstel volgt bij bereik.</div>
  <div style="display:flex;gap:8px;margin-top:6px;">
    <button disabled aria-disabled="true" style="flex:1;height:56px;border-radius:8px;background:#EEF0F3;color:{SOFT};border:1.5px solid {LINE};font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">{I(CHECK,20)}Tekst klopt</button>
    <button style="flex:1;height:56px;border-radius:8px;background:#FFFFFF;color:{TXT};border:1.5px solid {WEAK};font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">{I(MIC,20)}Opnieuw</button>
  </div>
  <div style="display:flex;align-items:center;gap:6px;margin:8px 0 4px 0;font-size:14px;line-height:18px;color:{SOFT};">{I(LOCK,16)}<span><b style="font-weight:600;color:{TXT};">Jouw oordeel</b> · op slot: [niet verstaan]</span></div>
  {oordeel_row(locked=True)}''', pad='6px 12px 10px 12px', border=f'2px solid {TXT}')
        body = lijst + actief
    write(code, h + content(body, 6) + gevaar() + nav('Volgende'))

# =====================================================================
# P04 — TRA-toetsing, koppeling tot op de maatregel
# =====================================================================
def p04():
    h = head('P04-tra-toetsing', 'Taakgerichte toetsing') + header('TRA-toetsing', 'Regel 7 van 8 · 2 open') + progress(4)
    summ = (f'<button aria-label="Alle regels van deze taak" style="width:100%;min-height:48px;display:flex;align-items:center;gap:8px;padding:2px 8px 2px 12px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};text-align:left;">'
            f'<span style="flex:1;font-size:16px;line-height:21px;">2 open · 1 <b style="color:#B42318;font-weight:600;">[A] Afwijking</b> · 1 <b style="color:#8A4B00;font-weight:600;">[V] Verbeterpunt</b></span>{I(LIST,22)}</button>')
    std = (f'<button style="width:100%;min-height:48px;display:flex;align-items:center;gap:8px;padding:3px 8px 3px 12px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};text-align:left;">'
           f'<span style="flex:1;min-width:0;"><span style="display:block;font-size:16px;line-height:20px;font-weight:600;">Standaardmaatregelen (6)</span>'
           f'<span style="display:block;font-size:14px;line-height:18px;color:{SOFT};">Om en Nabij de put een gasmeter dragen, …</span></span>{I(CHEV,20)}</button>')
    sub = f'''<div style="padding:0 10px 6px 12px;">
    <div style="font-size:16px;line-height:24px;">{tag('Jij')} "Gasmeter hangt boven aan de ladder, niet bij de man." {chip('A',24)}</div>
    <div style="font-size:16px;line-height:21px;margin-top:3px;"><b style="font-weight:600;">Direct genomen maatregel:</b> "Heb ik laten omhangen."</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
      <span style="flex:none;font-size:16px;line-height:20px;font-weight:600;">Volledig opgelost?</span>
      <button style="flex:1;height:56px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};font-size:16px;font-weight:600;">Ja</button>
      <button style="flex:1;height:56px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};font-size:16px;font-weight:600;">Nee</button>
    </div></div>'''
    R = 'DAM-2.07'
    regel = card(f'''<div style="display:flex;align-items:center;gap:8px;min-height:40px;">
    <span style="font-size:16px;line-height:21px;font-weight:700;white-space:nowrap;">{R}</span><span style="font-size:14px;line-height:18px;color:{SOFT};white-space:nowrap;">v1.3</span>
    <button style="margin-left:auto;flex:none;height:48px;padding:0 6px;border:0;background:transparent;color:{PRI};font-size:16px;font-weight:600;display:flex;align-items:center;gap:4px;">{I(CLOCK,18)}Eerder (1)</button>
    {link48('Hele tekst')}
  </div>
  <div style="display:flex;flex-direction:column;gap:3px;">
  {grp('Collectief')}
  {maatregel_row(lit(R,'Collectief','Mechanische ventilatie (indien nodig)'))}
  {maatregel_row(lit(R,'Collectief','continue 4-gasmeting'), 'gekoppeld', f'<span style="font-size:14px;font-weight:600;color:{PRI};white-space:nowrap;">gekoppeld</span>', sub=sub)}
  {grp('Individueel')}
  {maatregel_row(lit(R,'Individueel','Werkvergunning besloten ruimte'))}
  {maatregel_row(lit(R,'Individueel','aangestelde mangatwacht met communicatiemiddelen (indien nodig)'))}
  </div>''', pad='0 8px 5px 10px')
    write('P04-tra-toetsing', h + content(std + regel, 4) + gevaar() + nav('Volgende'))

# =====================================================================
# P04b — snel tikken zonder spraak
# =====================================================================
def p04b():
    h = head('P04b-snel-tikken', 'Snel tikken zonder spraak') + header('TRA-toetsing', 'Zonder spraak') + progress(4)
    R = 'DAM-2.08'
    hint = ""
    regel = card(f'''<div style="display:flex;align-items:center;gap:8px;min-height:44px;">
    <span style="font-size:16px;line-height:21px;font-weight:700;">{R}</span><span style="font-size:14px;line-height:18px;color:{SOFT};">kennisbank v1.3</span>
    <span style="margin-left:auto;"></span>{link48('Hele tekst')}
  </div>
  <div style="display:flex;flex-direction:column;gap:3px;">
  {grp('Collectief')}
  {maatregel_row(lit(R,'Collectief','Technische afscherming van het gevaar.'))}
  {maatregel_row(lit(R,'Collectief','Niemand onder of in de val-zone van de damwand wanneer deze wordt losgekoppeld van de ophanging.'), 'gekozen', mark=1)}
  </div>
  <div style="font-size:16px;line-height:20px;font-weight:600;margin:8px 0 4px 0;">Jouw oordeel</div>
  {oordeel_row(pressed='C', mark=2)}
  <div style="font-size:16px;line-height:20px;font-weight:600;margin:8px 0 4px 0;">Waarneming <span style="font-weight:400;color:{SOFT};font-size:14px;">· chip of kort typen</span></div>
  <div style="display:flex;gap:8px;">
    <button aria-pressed="true" style="position:relative;flex:1;height:48px;border-radius:999px;background:{PRI_S};border:2px solid {PRI};color:{TXT};font-size:14px;font-weight:600;white-space:nowrap;display:flex;align-items:center;justify-content:center;gap:6px;">{I(CHECK,18)}gezien: aanwezig<span style="position:absolute;top:-8px;right:-4px;">{stepmark(3)}</span></button>
    <button aria-pressed="false" style="flex:1;height:48px;border-radius:999px;background:#FFFFFF;border:1.5px solid {WEAK};color:{TXT};font-size:14px;font-weight:600;white-space:nowrap;">gezien: niet aanwezig</button>
  </div>
  <button style="width:100%;height:48px;margin-top:8px;border-radius:8px;background:#FFFFFF;border:1.5px solid {WEAK};color:{SOFT};font-size:16px;display:flex;align-items:center;gap:8px;padding:0 12px;text-align:left;">{I(KEYB,20)}of kort typen…</button>
  <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:16px;line-height:21px;color:#1E7A4C;font-weight:600;">{I(CHECK,20,'#1E7A4C')}Vastgelegd na 3 tikken: {stepmark(1)}{stepmark(2)}{stepmark(3)}</div>''', pad='2px 10px 10px 12px')
    write('P04b-snel-tikken', h + content(hint + regel, 4) + gevaar() + nav('Volgende'))

# =====================================================================
# P05 — Inspreken: voorstel tot op de maatregel
# =====================================================================
def p05():
    h = head('P05-inspreken', 'Inspreken') + header('Inspreken', 'Deel 2 van 3', close=True)
    wave = ''.join(f'<rect x="{i*5}" y="{15-hh/2}" width="3" height="{hh}" rx="1.5" fill="{SOFT if i < 14 else LINE}"/>'
                   for i, hh in enumerate([6,10,16,12,20,26,18,10,14,22,28,20,12,8,14,24,18,10,6,12,20,16,26,22]))
    jij = card(f'''<div style="display:flex;align-items:flex-start;gap:6px;">
    <button aria-label="Terugluisteren" style="width:48px;height:48px;margin-left:-8px;border-radius:999px;border:0;background:transparent;color:{PRI};display:flex;align-items:center;justify-content:center;flex:none;">{I(PLAY,24)}</button>
    <div style="flex:1;min-width:0;padding-top:4px;">
      <div style="display:flex;align-items:center;gap:8px;">{tag('Jij')}{badge(2)}<span style="font-size:14px;color:{SOFT};white-space:nowrap;">op toestel · 0:24 · deel 2</span></div>
      <div style="font-size:16px;line-height:22px;margin-top:2px;">"Hijsen staat niet apart op de LMRA, alleen mondeling besproken."</div>
    </div>
  </div>''', pad='2px 12px 6px 12px')
    R = 'DAM-2.03'
    voor = card(f'''<div style="display:flex;align-items:center;gap:8px;">
    {tag('Voorstel','v')}<span style="font-size:16px;line-height:21px;font-weight:700;">{R}</span><span style="font-size:14px;color:{SOFT};">v1.3</span>
    <span style="margin-left:auto;"></span>{link48('Andere regel')}
  </div>
  <div style="display:flex;flex-direction:column;gap:3px;">
  {grp('Collectief')}
  {maatregel_row(lit(R,'Collectief','Technische Afscherming van gevaar, Hijsgebied en Hijspad afzetten.'))}
  {maatregel_row(lit(R,'Collectief','Gebruik van Stuurlijn(en) om last te stabiliseren tijdens het hijsen.'))}
  {grp('Individueel')}
  {maatregel_row(lit(R,'Individueel','Visueel en Auditief contact tussen Monteur en Kraan operator.'))}
  {maatregel_row(lit(R,'Individueel','LMRA voor het hijsen'), 'voorstel', f'<span style="font-size:14px;font-weight:600;color:{ACC};white-space:nowrap;">voorstel</span>')}
  </div>
  <div style="margin-top:4px;background:#FFFFFF;border:1px solid #CFC6F5;border-radius:8px;padding:4px 10px 5px 10px;">
    <div style="font-size:16px;line-height:21px;"><b style="font-weight:600;color:{ACC};">Waarneming:</b> Hijsen staat niet als aparte stap op de LMRA; alleen mondeling doorgenomen.</div>
  </div>
  <div style="display:flex;gap:6px;margin-top:6px;">
    <button style="flex:1.2;height:56px;border-radius:8px;background:{ACC};color:#FFFFFF;border:0;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">{I(CHECK,20)}Klopt</button>
    <button style="flex:1.2;height:56px;border-radius:8px;background:#FFFFFF;color:{TXT};border:1.5px solid {WEAK};font-size:16px;font-weight:600;">Aanpassen</button>
    <button style="flex:1;height:56px;border-radius:8px;background:#FFFFFF;color:{SOFT};border:1.5px solid {LINE};font-size:16px;font-weight:600;">Overslaan</button>
  </div>
  <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:14px;line-height:18px;color:{SOFT};">{I(LOCK,16)}<span><b style="font-weight:600;color:{TXT};">Jouw oordeel</b> na "Klopt" (maatregel + tekst)</span></div>''',
                pad='2px 10px 6px 12px', border=f'1.5px solid {ACC_BORDER}', bg=ACC_S)
    write('P05-inspreken', h + content(jij + voor, 4) + gevaar() + nav('Nog 2 te<br>beoordelen', disabled=True))

if __name__ == '__main__':
    p01(); p01b(); p02(); p03(); p03(True); p04(); p04b(); p05()
    print('ok')
