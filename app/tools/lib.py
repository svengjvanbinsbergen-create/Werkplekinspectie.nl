# Gedeelde bouwstenen voor de webschermen W07-W15 (ontwerp.md-tokens). Alleen inline styles.
import html as _h

BG = '#F6F7F9'; SURF = '#FFFFFF'; LINE = '#DDE1E7'; TXT = '#141A22'; TXT2 = '#4A5565'; TXT3 = '#6B7584'
PRI = '#1F5FBF'; PRIS = '#E7EFFB'; ACC = '#6B4FD8'; ACCS = '#EFEBFD'
OORD = {
    'C': ('Conform', '#1E7A4C', '#E6F4EC'),
    'A': ('Afwijking', '#B42318', '#FDECEA'),
    'V': ('Verbeterpunt', '#8A4B00', '#FFF1DC'),
    'GA': ('Geen afwijking waargenomen', '#4A5565', '#EEF0F3'),
    'NB': ('Niet beoordeeld', '#4A5565', 'repeating-linear-gradient(135deg,#EEF0F3 0 4px,#E3E6EB 4px 8px)'),
    'NVT': ('Niet van toepassing', '#6B7584', '#FFFFFF'),
}
OCODE = {'Conform': 'C', 'Afwijking': 'A', 'Verbeterpunt': 'V', 'Geen afwijking waargenomen': 'GA', 'Niet beoordeeld': 'NB', 'Niet van toepassing': 'NVT'}
FONT = "font-family:Inter,system-ui,sans-serif"
HFONT = "font-family:'Space Grotesk',Inter,sans-serif"

def e(s):
    return _h.escape(str(s), quote=True)

def nl(n, d=0):
    s = f"{n:,.{d}f}"
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')

ICONS = {
    'home': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    'clipboard': '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'checksq': '<path d="m9 11 3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    'chart': '<path d="M3 3v18h18"/><path d="M8 17v-6"/><path d="M13 17V7"/><path d="M18 17v-4"/>',
    'msg': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
    'book': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    'file': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    'layout': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'cpu': '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M19 9h3M19 15h3M2 9h3M2 15h3"/>',
    'palette': '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    'down': '<path d="m6 9 6 6 6-6"/>',
    'right': '<path d="m9 6 6 6-6 6"/>',
    'left': '<path d="m15 6-6 6 6 6"/>',
    'up': '<path d="m6 15 6-6 6 6"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'grip': '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    'lock': '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eyeoff': '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9"/><path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    'filter': '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'alert': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
    'mic': '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    'spark': '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'server': '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    'phone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    'arrow': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    'more': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    'history': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    'building': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    'image': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    'type': '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
    'send': '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    'link': '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    'copy': '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    'pen': '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    'trash': '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
    'map': '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    'key': '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3"/><path d="m16 7 3 3"/><path d="m19 4 2 2"/>',
    'euro': '<path d="M18 7a7 7 0 1 0 0 10"/><path d="M4 10h10"/><path d="M4 14h10"/>',
    'list': '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    'table': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    'target': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'wifi_off': '<path d="M3 3l18 18"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 4.2-2.4"/><path d="M19 12.9a10 10 0 0 0-2.8-1.9"/><path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M22 8.8A15 15 0 0 0 10.6 5"/><path d="M12 20h.01"/>',
    'refresh': '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
}

def icon(name, size=20, color='currentColor', sw=1.75, extra=''):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block;{extra}" aria-hidden="true">{ICONS[name]}</svg>')

def oord(code, small=False, word=True):
    w, fg, bg = OORD[code]
    pad = '2px 8px' if small else '3px 10px'
    fs = 12 if small else 13
    border = f'border:1px solid {LINE};' if code == 'NVT' else ''
    txt = f'[{code}] {w}' if word else f'[{code}]'
    return (f'<span style="display:inline-flex;align-items:center;white-space:nowrap;font-size:{fs}px;font-weight:600;'
            f'color:{fg};background:{bg};{border}border-radius:999px;padding:{pad};line-height:1.35">{e(txt)}</span>')

def prio(p, small=True):
    fs = 12 if small else 13
    if p == 'direct':
        st = 'color:#FFFFFF;background:#B42318;border:1px solid #B42318'
    elif p == 'kort':
        st = 'color:#8A4B00;background:#FFFFFF;border:1.5px solid #C46A00'
    else:
        st = f'color:{TXT2};background:#FFFFFF;border:1px solid #9AA3AF'
    return f'<span style="display:inline-flex;align-items:center;font-size:{fs}px;font-weight:600;{st};border-radius:999px;padding:1px 8px;line-height:1.4;white-space:nowrap">{e(p)}</span>'

def chip(text, fg=TXT2, bg='#EEF0F3', border=None, size=12, weight=500, ic=None):
    b = f'border:1px solid {border};' if border else ''
    i = icon(ic, 14) if ic else ''
    return (f'<span style="display:inline-flex;align-items:center;gap:4px;font-size:{size}px;font-weight:{weight};color:{fg};background:{bg};{b}'
            f'border-radius:999px;padding:2px 9px;line-height:1.45;white-space:nowrap">{i}{e(text) if not text.startswith("<") else text}</span>')

def ai_chip(text='Voorstel'):
    return chip(text, ACC, ACCS, None, 12, 600, 'spark')

def btn(text, kind='sec', ic=None, h=36, size=14, extra=''):
    if kind == 'pri':
        st = f'background:{PRI};color:#FFFFFF;border:1px solid {PRI}'
    elif kind == 'ghost':
        st = f'background:transparent;color:{PRI};border:1px solid transparent'
    elif kind == 'acc':
        st = f'background:{ACCS};color:{ACC};border:1px solid #D9D0FA'
    else:
        st = f'background:{SURF};color:{TXT};border:1px solid {LINE}'
    i = icon(ic, 18) if ic else ''
    return (f'<span style="display:inline-flex;align-items:center;gap:8px;height:{h}px;box-sizing:border-box;padding:0 14px;'
            f'border-radius:8px;font-size:{size}px;font-weight:600;{st};white-space:nowrap;{extra}">{i}{e(text)}</span>')

def toggle(on=True, disabled=False):
    bg = PRI if on else '#B8C0CC'
    if disabled:
        bg = '#9DB3D9' if on else '#D3D8DF'
    pos = 'right:2px' if on else 'left:2px'
    return (f'<span style="position:relative;display:inline-block;flex:none;width:36px;height:20px;border-radius:999px;background:{bg}">'
            f'<span style="position:absolute;top:2px;{pos};width:16px;height:16px;border-radius:999px;background:#FFFFFF;box-shadow:0 1px 2px rgba(20,26,34,.25)"></span></span>')

def cb(on=True, disabled=False):
    if on:
        bg = '#7F9BC9' if disabled else PRI
        return (f'<span style="display:inline-flex;flex:none;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:{bg}">'
                f'{icon("check", 14, "#FFFFFF", 2.5)}</span>')
    return f'<span style="display:inline-block;flex:none;width:18px;height:18px;box-sizing:border-box;border-radius:4px;border:1.5px solid #8A94A3;background:#FFFFFF"></span>'

def radio(on=True):
    if on:
        return f'<span style="display:inline-flex;flex:none;align-items:center;justify-content:center;width:18px;height:18px;box-sizing:border-box;border-radius:999px;border:1.5px solid {PRI}"><span style="width:9px;height:9px;border-radius:999px;background:{PRI}"></span></span>'
    return f'<span style="display:inline-block;flex:none;width:18px;height:18px;box-sizing:border-box;border-radius:999px;border:1.5px solid #8A94A3"></span>'

def field(label, value, w=None, select=False, hint=None, mono=False, lab_extra='', h=36):
    ww = f'width:{w}px;' if w else ''
    ff = "font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:13px;" if mono else 'font-size:14px;'
    sel = icon('down', 16, TXT2) if select else ''
    hint_html = f'<div style="font-size:12px;color:{TXT2};margin-top:4px;line-height:1.4">{hint}</div>' if hint else ''
    lab = f'<div style="font-size:13px;font-weight:600;color:{TXT};margin-bottom:6px;{lab_extra}">{label}</div>' if label else ''
    return (f'<div style="{ww}min-width:0">{lab}'
            f'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;height:{h}px;box-sizing:border-box;padding:0 12px;'
            f'background:{SURF};border:1px solid {LINE};border-radius:8px;{ff}color:{TXT}">'
            f'<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{value}</span>{sel}</div>{hint_html}</div>')

def card(inner, pad=20, extra=''):
    return f'<div style="background:{SURF};border:1px solid {LINE};border-radius:10px;padding:{pad}px;box-sizing:border-box;{extra}">{inner}</div>'

def h2(text, sub=None, right='', size=18):
    s = f'<div style="font-size:13px;color:{TXT2};margin-top:4px;line-height:1.45">{sub}</div>' if sub else ''
    return (f'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px">'
            f'<div style="min-width:0"><div style="{HFONT};font-size:{size}px;font-weight:600;color:{TXT};line-height:1.3">{text}</div>{s}</div>'
            f'<div style="display:flex;gap:8px;align-items:center;flex:none">{right}</div></div>')

def label(text, extra=''):
    return f'<div style="font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{TXT2};{extra}">{text}</div>'

NAV = [
    ('Overzicht', 'home'), ('Inspecties', 'clipboard'), ('Acties', 'checksq'), ('Dashboard', 'chart'),
    None,
    ('Begeleider', 'msg'), ('Kennisbank', 'book'), ('Rapport', 'file'), ('Dashboardbouwer', 'layout'),
    ('Programma', 'calendar'), ('Gebruikers en rollen', 'users'), ('AI en data', 'cpu'), ('Huisstijl', 'palette'),
]

def nav(active):
    items = []
    for it in NAV:
        if it is None:
            items.append(f'<div style="display:flex;align-items:center;gap:6px;margin:18px 12px 6px 12px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{TXT2}">Configuratie</div>')
            continue
        name, ic = it
        on = name == active
        st = (f'background:{PRIS};color:{PRI};font-weight:600' if on else f'color:{TXT2};font-weight:500')
        items.append(f'<div style="display:flex;align-items:center;gap:12px;height:40px;padding:0 12px;border-radius:8px;font-size:14px;{st}">{icon(ic, 20)}<span>{name}</span></div>')
    return (f'<div style="width:248px;flex:none;background:{SURF};border-right:1px solid {LINE};box-sizing:border-box;padding:0 12px 24px 12px">'
            f'<div style="height:56px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid {LINE};margin:0 -12px 12px -12px;padding-left:24px">'
            f'<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:{PRI};color:#FFFFFF">{icon("clipboard", 18, "#FFFFFF", 2)}</span>'
            f'<span style="{HFONT};font-size:16px;font-weight:600;color:{TXT}">Begeleid Inspecteren</span></div>'
            + ''.join(items) + '</div>')

def topbar(env='Concept', env_note=None):
    seg = []
    for name in ['Concept', 'Gepubliceerd']:
        on = name == env
        st = (f'background:{SURF};color:{TXT};font-weight:600;box-shadow:0 0 0 1px {LINE}' if on else f'color:{TXT2};font-weight:500')
        seg.append(f'<span style="display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font-size:13px;{st}">'
                   + (f'<span style="width:8px;height:8px;border-radius:999px;background:{"#C46A00" if name=="Concept" else "#1E7A4C"}"></span>' if on else '')
                   + f'{name}</span>')
    note = f'<span style="font-size:13px;color:{TXT2}">{env_note}</span>' if env_note else ''
    return (f'<div style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:{SURF};border-bottom:1px solid {LINE};box-sizing:border-box">'
            f'<div style="display:flex;align-items:center;gap:16px">'
            f'<div style="display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:{TXT}">{icon("building", 20, TXT2)}Noardling B.V.{icon("down", 16, TXT2)}</div>'
            f'<span style="display:inline-flex;align-items:center;gap:2px;padding:2px;border-radius:999px;background:#EEF0F3">{"".join(seg)}</span>{note}</div>'
            f'<div style="display:flex;align-items:center;gap:16px">'
            f'<div style="display:flex;align-items:center;gap:8px;width:320px;height:36px;box-sizing:border-box;padding:0 12px;border:1px solid {LINE};border-radius:8px;background:{BG};font-size:14px;color:{TXT2}">{icon("search", 18)}Zoek inspectie, actie of regel-ID</div>'
            f'<span style="color:{TXT2}">{icon("help", 20)}</span><span style="color:{TXT2}">{icon("bell", 20)}</span>'
            f'<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:999px;background:{PRIS};color:{PRI};font-size:13px;font-weight:700">VC</span>'
            f'</div></div>')

def tabs(items, active, extra=''):
    out = []
    for it in items:
        name = it[0] if isinstance(it, tuple) else it
        cnt = it[1] if isinstance(it, tuple) else None
        on = name == active
        st = (f'color:{PRI};font-weight:600;border-bottom:2px solid {PRI}' if on else f'color:{TXT2};font-weight:500;border-bottom:2px solid transparent')
        c = f'<span style="font-size:12px;font-weight:600;color:{TXT2};background:#EEF0F3;border-radius:999px;padding:0 7px">{cnt}</span>' if cnt is not None else ''
        out.append(f'<span style="display:inline-flex;align-items:center;gap:6px;height:40px;box-sizing:border-box;font-size:14px;{st}">{name}{c}</span>')
    return f'<div style="display:flex;gap:24px;border-bottom:1px solid {LINE};{extra}">{"".join(out)}</div>'

def th(cols, extra=''):
    # cols: list of (label, width or None, align)
    cells = ''.join(f'<th style="text-align:{a};font-size:12px;font-weight:600;color:{TXT2};padding:8px 10px;border-bottom:1px solid {LINE};white-space:nowrap;{("width:"+str(w)+"px;") if w else ""}">{l}</th>' for l, w, a in cols)
    return f'<thead><tr style="background:#F1F3F6;{extra}">{cells}</tr></thead>'

def td(content, align='left', extra=''):
    return f'<td style="text-align:{align};font-size:13px;color:{TXT};padding:9px 10px;border-bottom:1px solid #E9ECF0;vertical-align:top;line-height:1.45;{extra}">{content}</td>'

def table(head, rows, extra=''):
    return f'<table style="width:100%;border-collapse:collapse;table-layout:fixed;{extra}">{head}<tbody>{"".join(rows)}</tbody></table>'

def short(name):
    return name.replace(' (fictief)', '')

def dmy(iso):
    return f'{iso[8:10]}-{iso[5:7]}-{iso[:4]}'

MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
def mnd(m):
    return MND[int(m[5:7]) - 1]

import re as _re
# Gedeelde kop en navigatie, gelijk aan W04-W06 (ronde 3): navigatie over de volle hoogte met logo,
# kop rechts met kruimelpad, organisatie, Concept/Gepubliceerd en gebruiker; chip "Voorbeeldinhoud · fictief" in de paginakop.
_HDR = {'Gepubliceerd': open('/home/claude/app/tools/shell_header.html').read(), 'Concept': open('/home/claude/app/tools/shell_header_concept.html').read()}
_NAV = open('/home/claude/app/tools/shell_nav.html').read()
_ACT = 'border-radius:8px;background:#E7EFFB;color:#1F5FBF;font-weight:600;'
_INA = 'border-radius:8px;color:#141A22;font-weight:500;'
CONFIG_ITEMS = ['Begeleider', 'Kennisbank', 'Rapport', 'Dashboardbouwer', 'Programma', 'Gebruikers en rollen', 'AI en data', 'Huisstijl', 'Versies en publiceren']

def shell_nav(active):
    def rep(m):
        a = m.group(0)
        if a.endswith(f'>{active}</div>'):
            a = a.replace(_INA, _ACT, 1)
        return a
    nav = _re.sub(r'<div style="display:flex;align-items:center;gap:12px;height:40px;[^"]*">.*?</div>', rep, _NAV, flags=_re.S)
    return nav.replace('<nav style="', '<nav style="box-sizing:border-box;', 1)

def fictief_chip():
    return ('<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid #DDE1E7;'
            'background:#FFFFFF;color:#4A5565;font-size:12px;font-weight:500;line-height:16px;white-space:nowrap">Voorbeeldinhoud · fictief</span>')

def fictief():
    return fictief_chip()

def _crumb(parts):
    sep = '<span style="color:#4A5565;display:inline-flex;align-items:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5565" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block"><path d="m9 6 6 6-6 6"/></svg></span>'
    out = []
    for i, x in enumerate(parts):
        last = i == len(parts) - 1
        out.append(f'<span style="color:{"#141A22" if last else "#4A5565"};font-weight:{600 if last else 500};white-space:nowrap">{x}</span>')
    return '<div style="display:flex;align-items:center;gap:6px;font-size:14px">' + sep.join(out) + '</div>'

def _user(ini, naam):
    return (f'<span style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4A5565"><span style="width:32px;height:32px;border-radius:999px;background:#EEF0F3;color:#141A22;'
            f'display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">{ini}</span>{naam}</span>')

def page(code, title, active, body, env='Concept', env_note=None, user=('VC', 'VGM-coördinator'), crumb=None, fname=None):
    # env_note wordt niet meer getoond: de kop is gelijk aan W04-W06 (zonder notitie naast Concept/Gepubliceerd).
    if crumb is None:
        crumb = (['Configuratie', active] if active in CONFIG_ITEMS else [active])
    hdr = _HDR[env].replace('<header style="', '<header style="box-sizing:border-box;', 1)
    hdr = hdr.replace('{{CRUMB}}', _crumb(crumb)).replace('{{USER}}', _user(*user))
    return f"""<!DOCTYPE html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=1440"><title>{code} · {e(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>html,body{{margin:0;padding:0;background:{BG}}}body{{color:{TXT};font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}}a{{color:{PRI};text-decoration:none}}p{{margin:0}}</style></head>
<body><div id="root" data-scherm="{fname or code}" style="width:1440px;display:flex;align-items:stretch;min-height:900px;background:{BG};{FONT};color:{TXT}">{shell_nav(active)}<div style="flex:1;min-width:0;display:flex;flex-direction:column">{hdr}
<main style="padding:24px 32px 40px;box-sizing:border-box">
{body}
</main></div></div></body></html>"""

def page_head(crumb, title, sub=None, right=''):
    # crumb staat in de kop (page); hier alleen titel, subregel, chip "Voorbeeldinhoud · fictief" en knoppen (zoals W04-W06).
    s = f'<div style="margin-top:4px;font-size:15px;line-height:22px;color:{TXT2};max-width:720px">{sub}</div>' if sub else ''
    return (f'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:20px">'
            f'<div style="min-width:0"><h1 style="{HFONT};font-size:28px;font-weight:600;color:{TXT};line-height:36px;margin:0">{title}</h1>{s}</div>'
            f'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex:none">{fictief_chip()}'
            f'<div style="display:flex;gap:8px;align-items:center">{right}</div></div></div>')
