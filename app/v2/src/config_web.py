# v2-webschermen: overzicht, begeleider, regels, kennisbank, catalogus, upload, RI&E, versies.
# Bouwstenen uit gen.py (zonder diens schrijfstap uit te voeren; gen.py zelf blijft ongewijzigd).
# Feiten: voorbeelddata.json v11, kennisbank.json (met taakstap), cijfers.json v11 (fictief, peildatum 11-11-2026). Methode: momentopname (koers2.md).
import os, json

_src = open('/home/claude/app/v2/src/gen.py').read().split('\nfiles = {')[0]
G = {}
exec(compile(_src, 'gen.py', 'exec'), G)
INK, SOFT, DARK, LINE, P, ACCENT, HEAD = G['INK'], G['SOFT'], G['DARK'], G['LINE'], G['P'], G['ACCENT'], G['HEAD']
_ico, chip, fictief, oordeel_chip, icotile, round_btn, nav_item = (
    G['ico'], G['chip'], G['fictief'], G['oordeel_chip'], G['icotile'], G['round_btn'], G['nav_item'])

OUT = '/home/claude/app/v2/screens/web'
os.makedirs(OUT, exist_ok=True)
KB = json.load(open('/home/claude/wpi/run/data/kennisbank.json'))
CIJ = json.load(open('/home/claude/app/tools/cijfers.json'))
_T = [o for o in CIJ['vp'] if o['telt']]
VP_OK, VP_N, VP_MIS = sum(o['ok'] for o in _T), len(_T), len(_T) - sum(o['ok'] for o in _T)

EXTRA = {
    'lock': '<rect x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    'upload': '<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    'search': '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    'grip': '<circle cx="9" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/>',
    'book': '<path d="M5 4.5h9.5a3 3 0 0 1 3 3v12h-10a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5h10"/>',
    'flag': '<path d="M6 21V4.5M6 5h11l-2.2 4L17 13H6"/>',
    'chat': '<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>',
    'play': '<path d="M8 5.5v13l10.5-6.5z"/>',
    'tag': '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.3"/>',
    'down': '<path d="M6 9l6 6 6-6"/>',
    'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'sparkle': '<path d="M12 4l1.8 4.7L18.5 10.5l-4.7 1.8L12 17l-1.8-4.7L5.5 10.5l4.7-1.8z"/>',
    'branch': '<circle cx="6.5" cy="6" r="2"/><circle cx="6.5" cy="18" r="2"/><circle cx="17.5" cy="9" r="2"/><path d="M6.5 8v8M17.5 11c0 4-5 3.5-9.5 6"/>',
    'pdf': '<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M14 3.5v4h4"/><path d="M9 16v-4h1.4a1.3 1.3 0 0 1 0 2.6H9"/>',
}


def ico(name, size=24, sw=1.75, color='currentColor'):
    if name in EXTRA:
        return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
                f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{EXTRA[name]}</svg>')
    return _ico(name, size, sw, color)


def tile_ico(name, tint, size=44, isz=22, radius=14, color=INK):
    return (f'<span style="display:inline-flex;align-items:center;justify-content:center;width:{size}px;height:{size}px;'
            f'border-radius:{radius}px;background:{tint};color:{color};flex:none">{ico(name, isz)}</span>')


CARD = f'background:#fff;border-radius:24px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04)'
RED = '#B42318'
GREEN = '#1E5B36'
BROWN = '#7A4300'

# ---------------- schil ----------------
SUBNAV = ['Begeleider', 'Kennisbank', 'Rapport', 'Dashboardbouwer', 'Programma', 'Gebruikers en rollen',
          'AI en data', 'Huisstijl', 'Versies en publiceren']


def sidebar(active='Overzicht', sub=None, org='Noardling B.V.', role='VGM-coördinator'):
    if sub:
        active = None
    items = ''.join(nav_item(i, l, active == l) for i, l in
                    [('home', 'Overzicht'), ('clip', 'Inspecties'), ('list', 'Acties'), ('chart', 'Dashboard')])
    conf = ''
    if sub:
        subs = ''.join(
            f'<a {"aria-current=page " if s == sub else ""}style="display:flex;align-items:center;height:36px;padding:0 14px 0 46px;border-radius:12px;font-size:14px;'
            + (f'background:{P["mist"][0]};font-weight:600;color:{INK}' if s == sub else f'color:{SOFT};font-weight:500')
            + f'">{s}</a>' for s in SUBNAV)
        conf = (f'<a style="display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:14px;font-size:15px;color:{INK};font-weight:600">'
                f'{ico("gear", 20)}Configuratie<span style="margin-left:auto;transform:rotate(90deg);display:inline-flex">{ico("chev", 16)}</span></a>'
                f'<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px">{subs}</div>')
    else:
        conf = nav_item('gear', 'Configuratie')
    return f'''
<aside style="position:absolute;left:0;top:0;bottom:0;width:248px;background:#fff;border-right:1px solid {LINE};padding:24px 16px">
  <div style="display:flex;align-items:center;gap:10px;padding:0 6px;height:44px">
    <span style="width:32px;height:32px;border-radius:10px;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center">{ico('check', 18, 2.2)}</span>
    <span class="serif" style="font-size:16px;white-space:nowrap">Begeleid Inspecteren</span></div>
  <div style="margin-top:28px;display:flex;flex-direction:column;gap:4px">{items}</div>
  <div style="margin-top:20px;border-top:1px solid {LINE};padding-top:20px">{conf}</div>
  <div style="position:absolute;left:16px;right:16px;bottom:24px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:16px;background:{P['mist'][0]}">
    {tile_ico('building', '#fff', 36, 18, 10)}
    <div><div style="font-size:14px;font-weight:600;white-space:nowrap;letter-spacing:-.02em">{org}</div><div style="font-size:13px;color:{SOFT}">{role}</div></div>
  </div>
</aside>'''


def concept_chip(v='v1.4'):
    return chip(f'Concept {v}', P['butter'][0], BROWN, P['butter'][0], 30, 13, 600)


def published_chip():
    return chip('Gepubliceerd v1.3', P['sage'][0], GREEN, P['sage'][0], 30, 13, 600)


def btn(label, primary=False, icon=None, disabled=False, h=44, extra=''):
    i = ico(icon, 18) if icon else ''
    if disabled:
        sty = f'background:{P["mist"][1]};color:{SOFT}'
    elif primary:
        sty = f'background:{DARK};color:#fff'
    else:
        sty = f'background:#fff;color:{INK};box-shadow:0 0 0 1px {LINE}'
    dis = ' aria-disabled="true"' if disabled else ''
    return (f'<button{dis} style="height:{h}px;padding:0 18px;border-radius:14px;{sty};display:inline-flex;align-items:center;gap:8px;'
            f'font-size:15px;font-weight:600;white-space:nowrap;{extra}">{i}{label}</button>')


def top(meta, title, chips, actions=''):
    return f'''
  <div style="height:72px;display:flex;align-items:flex-end;justify-content:space-between">
    <div style="font-size:15px;color:{SOFT};font-weight:500">{meta}</div>
    <div style="display:flex;gap:8px">{chips}{fictief()}</div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;height:44px">
    <div class="serif" style="font-size:36px;line-height:1.2">{title}</div>
    <div style="display:flex;gap:10px">{actions}</div>
  </div>'''


def tabs(items, active, mt=24):
    out = []
    for lab, cnt in items:
        on = lab == active
        c = f'<span style="margin-left:6px;color:{SOFT};font-weight:500">{cnt}</span>' if cnt != '' else ''
        sty = f'background:#fff;box-shadow:0 1px 4px rgba(20,26,34,.10);color:{INK};font-weight:600' if on else f'color:{SOFT};font-weight:500'
        out.append(f'<a {"aria-current=page " if on else ""}style="height:36px;padding:0 16px;border-radius:11px;display:inline-flex;align-items:center;font-size:14px;{sty}">{lab}{c}</a>')
    return (f'<div role="tablist" style="margin-top:{mt}px;display:inline-flex;gap:2px;padding:4px;border-radius:14px;background:{P["mist"][0]}">'
            f'{"".join(out)}</div>')


def h2(text, right='', mt=28):
    return (f'<div style="margin-top:{mt}px;display:flex;justify-content:space-between;align-items:center;min-height:44px">'
            f'<div class="serif" style="font-size:20px">{text}</div><div style="display:flex;gap:10px;align-items:center">{right}</div></div>')


def link(text, icon='chev'):
    return (f'<a style="font-size:14px;font-weight:600;color:{INK};display:inline-flex;align-items:center;gap:2px;height:44px">'
            f'{text}{ico(icon, 18)}</a>')


def switch(on=True, label=''):
    bg = DARK if on else '#C9CED6'
    x = 20 if on else 2
    return (f'<button role="switch" aria-checked="{str(on).lower()}" aria-label="{label}" style="width:48px;height:44px;display:inline-flex;align-items:center;justify-content:center;flex:none">'
            f'<span style="position:relative;width:44px;height:26px;border-radius:13px;background:{bg}">'
            f'<span style="position:absolute;top:2px;left:{x}px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span></button>')


def lock(text='Altijd aan'):
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:{SOFT};font-weight:500;white-space:nowrap;height:44px">'
            f'{ico("lock", 16)}{text}</span>')


def info(tip):
    return (f'<button aria-label="Toelichting" title="{tip}" style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;color:{SOFT};flex:none">'
            f'{ico("info", 18)}</button>')


def lrow(title, meta='', right='', lead='', last=False, h=56, title_size=15, chev=False, pad=0):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    m = f'<div style="font-size:13px;color:{SOFT};margin-top:3px">{meta}</div>' if meta else ''
    c = f'<span style="color:{SOFT};flex:none">{ico("chev", 20)}</span>' if chev else ''
    return (f'<div style="display:flex;align-items:center;gap:14px;min-height:{h}px;padding:{pad}px 0;{b}">{lead}'
            f'<div style="flex:1;min-width:0"><div style="font-size:{title_size}px;font-weight:600;line-height:1.3">{title}</div>{m}</div>'
            f'{right}{c}</div>')


def card(inner, pad='8px 22px', extra=''):
    head = ''
    if inner.startswith('\x01'):
        t, rest = inner[1:].split('\x02', 1)
        right, inner = rest.split('\x03', 1)
        head = h2(t, right, 0)
        pad = '4px 22px'
        extra = 'margin-top:8px;' + extra
        return f'<div>{head}<div style="{CARD};overflow:hidden;padding:{pad};{extra}">{inner}</div></div>'
    return f'<div style="{CARD};overflow:hidden;padding:{pad};{extra}">{inner}</div>'


def card_head(title, right=''):
    return f'\x01{title}\x02{right}\x03'


def stat(label, value, meta, tone, icon, h=164, unit='', vcolor=INK):
    bg, tile = P[tone]
    return (f'<a style="display:block;position:relative;height:{h}px;border-radius:24px;background:{bg};padding:20px 22px">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
            f'<div style="font-size:15px;color:{SOFT};font-weight:500">{label}</div>{tile_ico(icon, tile, 40, 20, 13)}</div>'
            f'<div class="num" style="font-size:40px;font-weight:600;line-height:1;margin-top:2px;color:{vcolor}">{value}<span style="font-size:18px;color:{SOFT};font-weight:500">{unit}</span></div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{meta}</div></a>')


def small_chip(text, tone='mist', fg=SOFT):
    return chip(text, P[tone][0], fg, P[tone][0], 26, 13, 600)


def voorstel_chip():
    return chip('Voorstel', '#fff', ACCENT, '#E1D9FA', 26, 13, 600)


def oc(code, h=28, fs=13):
    extra = {
        'NVT': ('Niet van toepassing', SOFT, '#fff', f'box-shadow:inset 0 0 0 1px {LINE};'),
        'GA': ('Geen afwijking waargenomen', SOFT, '#EEF0F3', ''),
        'NB': ('Niet beoordeeld', SOFT, '#F1F2F4', 'background-image:repeating-linear-gradient(135deg,#E3E6EA 0 4px,#F1F2F4 4px 8px);'),
    }
    if code in extra:
        w, fg, bg, more = extra[code]
        return (f'<span style="display:inline-flex;align-items:center;height:{h}px;padding:0 10px;border-radius:999px;background:{bg};{more}'
                f'color:{fg};font-size:{fs}px;font-weight:600;white-space:nowrap"><span style="background:{bg if code != "NB" else "#F1F2F4"};border-radius:6px;padding:0 2px">[{code}] {w}</span></span>')
    return oordeel_chip(code, h, fs)


def page(title, side, main, overlay=''):
    return HEAD.format(title=title) + (
        f'<div id="root" style="position:relative;width:1440px;height:900px;overflow:hidden;background:#FAFAF8">'
        f'{side}<main style="position:absolute;left:248px;right:0;top:0;bottom:0;padding:0 48px">{main}</main>{overlay}</div></body></html>')


def panel(inner, w=500, label='Detail'):
    return (f'<div style="position:absolute;inset:0;background:rgba(20,26,34,.28)"></div>'
            f'<aside role="dialog" aria-label="{label}" style="position:absolute;right:16px;top:16px;bottom:16px;width:{w}px;background:#fff;border-radius:28px;'
            f'box-shadow:0 12px 40px rgba(20,26,34,.18);padding:28px 32px">{inner}</aside>')


def panel_head(kicker, title, icon, tint):
    return (f'<div style="display:flex;align-items:center;gap:14px">{tile_ico(icon, tint, 48, 24, 16)}'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;color:{SOFT};font-weight:500">{kicker}</div>'
            f'<div class="serif" style="font-size:24px;line-height:1.2">{title}</div></div>{round_btn("close", label="Paneel sluiten")}</div>')


def panel_foot(left, right):
    return f'<div style="position:absolute;left:32px;right:32px;bottom:28px;display:flex;gap:12px">{left}{right}</div>'


def bigbtn(label, primary=True, disabled=False, flex=1):
    if disabled:
        sty = f'background:{P["mist"][1]};color:{SOFT}'
    elif primary:
        sty = f'background:{DARK};color:#fff'
    else:
        sty = f'background:{P["mist"][0]};color:{INK}'
    dis = ' aria-disabled="true"' if disabled else ''
    return f'<button{dis} style="flex:{flex};min-width:0;width:100%;height:56px;border-radius:18px;{sty};font-size:16px;font-weight:600">{label}</button>'


def field(label, value, tone='mist', mt=16):
    return (f'<div style="margin-top:{mt}px;background:{P[tone][0]};border-radius:18px;padding:14px 18px">'
            f'<div style="font-size:13px;color:{SOFT};font-weight:600">{label}</div>'
            f'<div style="font-size:15px;line-height:1.5;margin-top:4px">{value}</div></div>')


# =============== W01 Overzicht ===============
def w01():
    side = sidebar('Overzicht')
    wp = [
        ('P26-168 · Damwand', 'Lang project', small_chip('Gedaan', 'sage', GREEN), 'WPI-20261105-DAM-C2'),
        ('P26-135 · Roosterreiniger', 'Kort, met risico · spontaan', small_chip('Gedaan', 'sage', GREEN), 'WPI-20261103-ROO-C1'),
        ('P26-156 · Bandfilter', 'Lang project', small_chip('Gedaan', 'sage', GREEN), 'WPI-20261102-BAN-DL'),
        ('P26-436 · Pompen', 'Lang project', small_chip('Te doen', 'butter', BROWN), 'tot 14 dec'),
        ('P26-446 · Indraaivijzel', 'Lang project', small_chip('Te doen', 'butter', BROWN), 'tot 23 dec'),
    ]
    rows = ''.join(lrow(t, f'{m} · {x}', c, last=i == len(wp) - 1, h=60, chev=True) for i, (t, m, c, x) in enumerate(wp))
    sig = [
        ('Geluid bij hijsen', '3× Buiten TRA · 2 producten', small_chip('In concept', 'butter', BROWN)),
        ('Gladheid op bordes door algen', '1× Buiten TRA · Pompen', ''),
        ('Werken in het donker bij uitloop', '1× Buiten TRA · Pompen', ''),
        ('Klasse Milieu', 'Nog nergens gebruikt', ''),
    ]
    srows = ''.join(lrow(t, m, c, lead=tile_ico('flag', P['lilac'][0], 40, 20, 12), last=i == len(sig) - 1, h=64, chev=True)
                    for i, (t, m, c) in enumerate(sig))
    main = top('Woensdag 11 november 2026 · Service &amp; Montage', 'Overzicht', published_chip(),
               btn('Rapport exporteren', icon='report')) + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
    {stat('Per werkplek', str(VP_OK), f'Verplichte WPI’s · {VP_MIS} gemist', 'butter', 'pin', unit=f' van {VP_N}')}
    {stat('Per inspecteur', str(CIJ['prog_uitgevoerd']), f'{CIJ["ingang"]["ingepland"]} ingepland · {CIJ["ingang"]["spontaan"]} spontaan', 'sky', 'person', unit=f' van {CIJ["prog_gepland"]}')}
    {stat('Open acties', str(CIJ['act_open_n']), f'{len(CIJ["act_over"])} over termijn', 'blush', 'list')}
    {stat('Concept v1.4', '7', 'wijzigingen · 1 proef wijkt af', 'lilac', 'layers')}
  </div>
  <div style="margin-top:28px;display:grid;grid-template-columns:3fr 2fr;gap:20px">
    <div>
      {h2('Werkplekken in november', link('Programma'), 0)}
      {card(rows, '4px 22px', 'margin-top:12px')}
    </div>
    <div>
      {h2('Signalen voor de inrichting', info('Drempel: elke waarneming Buiten TRA telt; vanaf 2 keer heet het terugkerend; een klasse zonder gebruik na 6 maanden. In te stellen in Dashboardbouwer.'), 0)}
      {card(srows, '4px 22px', 'margin-top:12px')}
    </div>
  </div>'''
    return page('W01 · Overzicht', side, main)


# =============== W02 Begeleider ===============
BEG_TABS = [('Verloop', ''), ('Doorvragen', '6'), ('Grenzen', ''), ('Oordelen', ''), ('Classificaties', '')]
STAPPEN = [
    (0, 'Kop', 'Ingepland of spontaan', False, False), (1, 'Wat doen de monteurs nu?', 'Taak of taakstap', False, False),
    (2, 'Toetsen wat je ziet', 'Verplicht', False, False), (3, 'Algemeen als geheugensteun', 'Optioneel', False, False),
    (4, 'Gesprek met monteurs', 'Vast', True, False), (5, 'Afronden', 'Vast', True, False),
]


def begeleider_top(active):
    return top('Configuratie · Begeleider · werkplekinspectie', 'Begeleider', concept_chip(),
               btn('Proefgesprek', primary=True, icon='play')) + tabs(BEG_TABS, active)


def stap_card(n, name, status, vast, changed, selected=False):
    ring = f'box-shadow:0 0 0 2px {INK};' if selected else f'box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04);'
    bg = P['mist'][0] if vast else '#fff'
    st = (f'<span style="display:inline-flex;align-items:center;gap:6px">{ico("lock", 16)}Vast</span>' if vast else status)
    if changed:
        st = f'<span style="display:inline-flex;height:26px;padding:0 10px;border-radius:999px;background:{P["butter"][0]};color:{BROWN};font-weight:600;align-items:center">Gewijzigd in concept</span>'
    return (f'<a style="position:relative;display:block;height:164px;border-radius:24px;background:{bg};{ring}padding:20px 22px">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="num" style="display:inline-flex;width:40px;height:40px;border-radius:13px;background:{"#fff" if vast else P["sky"][0]};align-items:center;justify-content:center;font-size:16px;font-weight:700">{n}</span>'
            f'<span style="color:{SOFT}">{ico("chev", 20)}</span></div>'
            f'<div style="font-size:20px;font-weight:600;letter-spacing:-.01em;margin-top:20px">{name}</div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:12px;height:26px;display:flex;align-items:center">{st}</div></a>')


def plus_card():
    return (f'<a style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:164px;border-radius:24px;'
            f'border:2px dashed #C9CED6;color:{INK};font-size:16px;font-weight:600">{tile_ico("plus", P["mist"][0], 44, 22, 14)}Stap toevoegen</a>')


REGELS = [
    ('Oordeel is [A] Afwijking of [V] Verbeterpunt', 'Vraag alleen wat ontbreekt: taakstap, direct gecorrigeerd, foto', 'on', ''),
    ('Oordeel zonder waarneming', 'Vraag eerst wat de inspecteur zag', 'vast', ''),
    ('Waarneming past bij geen regel van de taak', 'Vastleggen als Buiten TRA en de klasse vragen', 'vast', ''),
    ('Werkwijze wijkt af van de TRA, volgens de inspecteur veilig', 'Vastleggen als afwijkende werkwijze, TRA beoordelen', 'on', ''),
    ('AI twijfelt tussen twee regels', 'Beide voorleggen; de inspecteur kiest', 'vast', ''),
    ('Product heeft regels in klasse Hijsen', 'Vraag of het hijsplan vooraf met de ploeg is doorgenomen', 'on', 'nieuw'),
]


def regel_rows(selected=None):
    out = []
    for i, (als, dan, st, tag) in enumerate(REGELS):
        right = lock('Vast') if st == 'vast' else switch(tag != 'nieuw', f'Regel {i + 1}')
        badges = ''
        if tag == 'nieuw':
            badges = small_chip('Nieuw', 'butter', BROWN) + voorstel_chip()
        lead = f'<span class="num" style="width:32px;height:32px;border-radius:10px;background:{P["mist"][0]};display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex:none">{i + 1}</span>'
        sel = f'background:{P["sky"][0]};margin:0 -22px;padding:0 22px;' if selected == i else ''
        out.append(f'<div style="{sel}">' + lrow(f'Als: {als}', f'Dan: {dan}', f'<span style="display:flex;gap:6px">{badges}</span>' + right,
                                                 lead=lead, last=i == len(REGELS) - 1 or selected == i + 1 or selected == i, h=62, chev=True) + '</div>')
    return ''.join(out)


def setting_tile(label, value, meta, tone, icon, right=''):
    bg, tile = P[tone]
    return (f'<a style="display:block;position:relative;height:164px;border-radius:24px;background:{bg};padding:20px 22px">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
            f'<div style="font-size:15px;color:{SOFT};font-weight:500">{label}</div>{right or tile_ico(icon, tile, 40, 20, 13)}</div>'
            f'<div style="font-size:26px;font-weight:600;letter-spacing:-.01em;margin-top:6px">{value}</div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{meta}</div></a>')


def w02_settings(niveau='Taak', niveau_meta=None, eenheid='taak', changed=True):
    ts = sum(1 for v in KB.values() for r in v['regels'] if r.get('taakstap'))
    nr = sum(len(v['regels']) for v in KB.values())
    niveau_meta = niveau_meta or f'Taakstap waar die er is · {ts} van {nr}'
    return (setting_tile('Toetsniveau', niveau, niveau_meta, 'sky', 'layers')
            + setting_tile('Spontane WPI', 'Toegestaan', 'Kop: project, inspecteur, datum', 'sage', 'clip', switch(True, 'Spontane WPI toestaan'))
            + setting_tile('Standaardmaatregelen', 'Altijd tonen', f'LMRA en PBM bij elke {eenheid}', 'butter', 'shield', small_chip('Gewijzigd', 'mist', BROWN) if changed else ''))


def w02_main(selected_step=None):
    cards = ''.join(stap_card(*x, selected=(x[0] == selected_step)) for x in STAPPEN)
    return begeleider_top('Verloop') + f'''
  {h2('Verloop van de inspectie', btn('Stap toevoegen', icon='plus') + btn('Bewerken', icon='gear'), 24)}
  <div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">{cards}</div>
  {h2('Instellingen', '', 24)}
  <div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">{w02_settings()}</div>'''


def w02():
    return page('W02 · Begeleider', sidebar(sub='Begeleider'), w02_main())


def w02d_main(selected_rule=None):
    return begeleider_top('Doorvragen') + f'''
  {h2('Wanneer vraagt de begeleider door?', btn('Bewerken', icon='gear') + btn('Regel in gewone taal', icon='plus'), 24)}
  {card(regel_rows(selected_rule), '2px 22px', 'margin-top:12px')}'''


def w02d():
    return page('W02d · Begeleider, doorvragen', sidebar(sub='Begeleider'), w02d_main())


def w02_bouwbedrijf():
    def vervangt(t):
        return f'<span style="display:inline-flex;height:26px;padding:0 10px;border-radius:999px;background:{P["sky"][0]};color:{INK};font-weight:600;align-items:center">Vervangt {t}</span>'
    st = [(0, 'Kop', 'Ingepland of spontaan', False, False), (1, 'Wat gebeurt er op de werkplek?', vervangt('Taak of taakstap'), False, False),
          (2, 'Toetsen wat je ziet', vervangt('TRA-maatregelen'), False, False), (3, 'Algemeen als geheugensteun', 'Optioneel', False, False),
          (4, 'Gesprek met medewerkers', 'Vast', True, False), (5, 'Afronden', 'Vast', True, False)]
    cards = ''.join(stap_card(*x) for x in st)
    note = (f'<div style="margin-top:16px;height:52px;border-radius:16px;background:{P["mist"][0]};padding:0 8px 0 16px;display:flex;align-items:center;gap:12px;font-size:14px;color:{SOFT}">'
            f'{ico("branch", 18)}<span style="flex:1"><b style="color:{INK}">Afgeleid van je inrichting</b> · werkplekken uit RI&amp;E · prioriteit hoog, midden, laag</span>{link("Wijzigen")}</div>')
    main = top('Configuratie · Begeleider · Bouwbedrijf Voorbeeld B.V. (fictief)', 'Begeleider', concept_chip('v0.1'),
               btn('Proefgesprek', primary=True, icon='play')) + tabs([(t, '') for t, _ in BEG_TABS], 'Verloop') + note + f'''
  <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">{cards}</div>
  {h2('Instellingen', '', 20)}
  <div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">{w02_settings('Werkplek', 'Risico’s van de gekozen werkplek', 'werkplek', False)}</div>'''
    return page('W02 · Begeleider, Bouwbedrijf Voorbeeld', sidebar(sub='Begeleider', **BB), main)


ONDERWERPEN = [
    ('A', 'Voorbereiding en documenten', 'Documenten en voorbereiding', 'Bij A of V'),
    ('B', 'Veiligstellen', 'Veiligstellen-LOTOTO', 'Altijd'),
    ('C', 'PBM', 'PBM', 'Bij A of V'),
    ('D', 'Arbeidsmiddelen en gereedschap', 'Arbeidsmiddelen en keuring', 'Bij A of V'),
    ('E', 'Hijsen en kraan', 'Hijsen', 'Bij A of V'),
    ('F', 'Werkplek en omgeving', 'Orde en netheid', 'Bij A of V'),
    ('G', 'Gevaarlijke stoffen, hygiëne en milieu', 'Gevaarlijke stoffen en hygiëne', 'Bij A of V'),
    ('H', 'Noodvoorzieningen', 'Noodvoorzieningen', 'Bij A of V'),
    ('I', 'Gedrag en samenwerking', 'Gedrag en werkwijze', 'Nee'),
]


def w02b():
    rows = ''.join(
        lrow(n, f'Klasse {k} · foto {f.lower() if f != "Bij A of V" else "bij A of V"}', '',
             lead=f'<span style="color:{SOFT};flex:none">{ico("grip", 18)}</span><span style="width:34px;height:34px;border-radius:11px;background:{P["sky"][0]};display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex:none">{l}</span>',
             last=i == 8, h=58, title_size=15, chev=True)
        for i, (l, n, k, f) in enumerate(ONDERWERPEN))
    seg = (f'<div style="margin-top:20px;display:flex;gap:4px;padding:4px;border-radius:16px;background:{P["mist"][1]}">'
           f'<a style="flex:1;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;color:{SOFT};font-weight:500">Onderwerpen als lijst</a>'
           f'<a aria-current="true" style="flex:1;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px;background:#fff;box-shadow:0 1px 3px rgba(20,26,34,.12);font-weight:600">Inspecteur vertelt vrij</a></div>')
    inner = panel_head('Stap 3 · optioneel', 'Algemeen als geheugensteun', 'eye', P['sky'][1]) + seg + f'''
  <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:700">Onderwerpen · 9</div>
    {info('Geheugensteun, niet verplicht: alleen wat de inspecteur ziet wordt vastgelegd, met [C], [A] of [V]. Niet genoemde onderwerpen komen niet in het rapport. De klasse is een voorstel bij een bevinding.')}</div>
  <div style="margin-top:2px">{rows}</div>''' + panel_foot(bigbtn('Openingsvraag', False), bigbtn('Onderwerp toevoegen', True))
    return page('W02b · Begeleider, stap 3', sidebar(sub='Begeleider'), w02_main(selected_step=3), panel(inner, 520, 'Stap 3 Algemeen als geheugensteun'))


def w02c():
    inner = panel_head('Doorvraagregel 6 · nieuw in concept', 'Hijsplan doorgenomen?', 'chat', P['butter'][1]) + f'''
  {field('Als', 'het product heeft regels in klasse <b>Hijsen</b>', 'mist', 22)}
  {field('Dan vraagt de begeleider', '“Is het hijsplan vooraf met de ploeg doorgenomen?”', 'mist', 10)}
  <div style="margin-top:16px;background:{P['lilac'][0]};border-radius:18px;padding:16px 18px">
    <div style="display:flex;align-items:center;gap:10px">{voorstel_chip()}<span style="font-size:15px;font-weight:600">Te breed</span></div>
    <div style="font-size:15px;line-height:1.5;margin-top:8px">Raakt alle 21 producten. Vervang <b>het product</b> door <b>de gekozen taak</b>: dan 71 van 138 taken.</div>
    <div style="display:flex;gap:10px;margin-top:12px">{btn('Overnemen')}{btn('Negeren')}</div>
  </div>
  <a style="margin-top:12px;display:flex;align-items:center;gap:12px;min-height:64px;border-bottom:1px solid {LINE}">
    {tile_ico('play', P['blush'][0], 40, 18, 12)}
    <div style="flex:1"><div style="font-size:15px;font-weight:600">Proefscenario 6 wijkt af</div><div style="font-size:13px;color:{SOFT};margin-top:3px">Pompen · Inschakelen, daar wordt niet gehesen</div></div>
    <span style="color:{SOFT}">{ico('chev', 20)}</span></a>
  <a style="display:flex;align-items:center;gap:12px;min-height:64px">
    {tile_ico('flag', P['mist'][0], 40, 18, 12)}
    <div style="flex:1"><div style="font-size:15px;font-weight:600">Aanleiding</div><div style="font-size:13px;color:{SOFT};margin-top:3px">Acties WPI-20260925-DAM-DL-1 en -DL-2</div></div>
    <span style="color:{SOFT}">{ico('chev', 20)}</span></a>''' + panel_foot(bigbtn('Verwijderen', False), bigbtn('Opslaan in concept', True))
    return page('W02c · Begeleider, doorvraagregel', sidebar(sub='Begeleider'), w02d_main(selected_rule=5), panel(inner, 500, 'Doorvraagregel 6'))


# =============== W03 Regels: Grenzen / Oordelen / Classificaties ===============
VCA71_POS = 'VCA 7.1, minimumeis: Er worden inspectieverslagen gemaakt, waarin opgenomen positieve bevindingen, geconstateerde afwijkingen, uit te voeren verbeteracties, uitvoeringsverantwoordelijken en de bepaling van de tijdsduur voor de uitvoering.'


def w03():
    nooit = ['Een waarneming verzinnen of aanvullen', 'Zelf een oordeel kiezen of voorselecteren',
             'Een oordeel afleiden uit “prima” of “in orde”', 'Een fototoelichting schrijven uit de foto',
             'Iets in het rapport zetten dat niet bevestigd is', 'Bij twijfel zelf kiezen waar iets hoort']
    r1 = lrow('6 vaste grenzen', 'O.a. geen oordeel zonder eigen waarneming', lock(), lead=tile_ico('lock', P['mist'][0], 36, 18, 11), last=True, h=60, chev=True)
    altijd = [('Per stap de gewenste velden aanbieden', switch(True, 'Velden aanbieden')),
              ('Alleen vastleggen wat de inspecteur ziet', lock()),
              ('Velden zelf uit vrije spraak halen', switch(True, 'Velden uit spraak')),
              ('Vragen naar positieve bevindingen ' + small_chip('VCA 7.1'), lock() + info(VCA71_POS)),
              ('Herformuleren naar nette zinnen', switch(True, 'Herformuleren'))]
    r2 = ''.join(lrow(t, '', r, last=i == 4, h=46) for i, (t, r) in enumerate(altijd))
    priv = [('Namen van monteurs alleen in de kop', lock()), ('Naam bij een bevinding weglaten', lock()),
            ('Hint bij foto: geen herkenbare gezichten', switch(True, 'Hint gezichten')),
            ('Derden alleen in de kop als aanwezigen', switch(True, 'Derden in kop')),
            ('Spraakopname wissen na bevestigen', switch(True, 'Spraak wissen'))]
    r3 = ''.join(lrow(t, '', r, last=i == 4, h=46) for i, (t, r) in enumerate(priv))
    main = begeleider_top('Grenzen') + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
    <div style="display:flex;flex-direction:column;gap:20px">
      {card(card_head('Wat de begeleider nooit doet') + r1)}
      {card(card_head('Wat de begeleider altijd doet') + r2, '0 22px 4px')}
    </div>
    <div style="display:flex;flex-direction:column;gap:20px">
      <a style="display:block;position:relative;border-radius:24px;background:{P['blush'][0]};padding:20px 22px;height:196px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px;color:{SOFT};font-weight:500">Direct gevaar</span>{small_chip('Gewijzigd in concept', 'butter', BROWN)}</div>{tile_ico('alert', P['blush'][1], 40, 20, 13, RED)}</div>
        <div style="font-size:30px;font-weight:700;letter-spacing:-.02em;color:{RED};margin-top:0">Stop het werk.</div>
        <div style="font-size:14px;color:{SOFT};margin-top:8px">Waarschuwt Hoofd Service &amp; Montage · 5 voorbeelden</div>
        <div style="position:absolute;left:22px;right:22px;bottom:14px;display:flex;justify-content:space-between;align-items:center">{lock()}{btn('Bewerken')}</div>
      </a>
      {card(card_head('Privacy', link('Bewaartermijnen')) + r3, '0 22px 4px')}
    </div>
  </div>'''
    return page('W03 · Begeleider, grenzen', sidebar(sub='Begeleider'), main)


def w03b():
    oo = [('C', 'Maatregel toegepast', 'Inspecteur kiest · eigen waarneming vereist'),
          ('A', 'Niet of niet goed toegepast', 'Inspecteur kiest · actie nodig'),
          ('V', 'Toegepast, kan beter', 'Inspecteur kiest · actie nodig'),
          ('NVT', 'Ziet dat het niet van toepassing is', 'Optioneel · telt niet mee')]
    rows = ''.join(lrow(m, x, '', lead=f'<span style="width:256px;flex:none">{oc(c)}</span>', last=i == 3, h=64, chev=True)
                   for i, (c, m, x) in enumerate(oo))
    sets = [('Oordeelknoppen zonder voorselectie', lock()), ('Altijd met eigen waarneming', lock()),
            ('Regeloordeel: slechtste van wat gezien is', lock()), ('[NVT] als knop tonen', switch(True, 'NVT als knop'))]
    srows = ''.join(lrow(t, '', r, last=i == 3, h=46) for i, (t, r) in enumerate(sets))
    main = begeleider_top('Oordelen') + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:7fr 5fr;gap:20px;align-items:start">
    {card(card_head('Oordelen · 4', btn('Oordeel toevoegen', icon='plus', h=40)) + rows, '0 22px 4px')}
    <div style="display:flex;flex-direction:column;gap:20px">
      <a style="display:block;position:relative;height:164px;border-radius:24px;background:{P['sky'][0]};padding:20px 22px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-size:15px;color:{SOFT};font-weight:500">Momentopname</div>{tile_ico('eye', P['sky'][1], 40, 20, 13)}</div>
        <div style="font-size:22px;font-weight:600;line-height:1.3;margin-top:2px">Wat je niet ziet, leg je niet vast.</div>
        <div style="font-size:14px;color:{SOFT};margin-top:10px">Rapport: getoetst tijdens bezoek · taak en stap</div>
      </a>
      {card(srows, '2px 22px')}
    </div>
  </div>'''
    return page('W03b · Begeleider, oordelen', sidebar(sub='Begeleider'), main)


KLASSEN = [('Hijsen', 242, 14), ('Veiligstellen-LOTOTO', 134, 1), ('Gedrag en werkwijze', 87, 1),
           ('Gevaarlijke stoffen en hygiëne', 74, 12), ('Werken op hoogte of bij water', 58, 1), ('Fysieke belasting', 46, 0),
           ('Besloten ruimte en gas', 18, 4), ('Arbeidsmiddelen en keuring', 4, 2), ('Omgeving en afzetting', 3, 1),
           ('PBM', 0, 0), ('Orde en netheid', 0, 1), ('Noodvoorzieningen', 0, 0), ('Documenten en voorbereiding', 0, 1), ('Milieu', 0, 0)]


def w03c():
    top5 = KLASSEN[:5]
    rows = ''.join(lrow(n, f'{r} TRA-regels · {bv} bevinding{"en" if bv != 1 else ""}', '',
                        lead=f'<span style="color:{SOFT};flex:none">{ico("grip", 18)}</span>', h=58, chev=True)
                   for n, r, bv in top5)
    rows += lrow('Alle 14 klassen', 'Milieu nog nergens gebruikt', '', lead=tile_ico('list', P['mist'][0], 36, 18, 11), h=58, chev=True)
    rows += lrow('Eén klasse per bevinding ' + small_chip('Eigen keuze'), '', switch(True, 'Eén klasse per bevinding'), last=True, h=58)
    prio = [('Direct', 'Zelfde dag', 'blush', RED, 'alert'), ('Kort', '14 dagen', 'butter', BROWN, 'clock'), ('Planmatig', '8 weken', 'mist', SOFT, 'cal')]
    ptiles = ''.join(
        f'<a style="flex:1;min-width:0;border-radius:24px;background:{P[t][0]};padding:20px;height:164px;display:block">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:15px;font-weight:600;color:{fg}">{n}</div>{tile_ico(i, P[t][1], 36, 18, 11)}</div>'
        f'<div class="num" style="font-size:22px;font-weight:600;margin-top:18px;white-space:nowrap">{v}</div>'
        f'<div style="font-size:13px;color:{SOFT};margin-top:6px">standaardtermijn</div></a>' for n, v, t, fg, i in prio)
    link_card = card(lrow('Actiehouder en toetser', '6 regels · ingesteld bij Gebruikers en rollen', '',
                          lead=tile_ico('person', P['sky'][0], 40, 20, 12), last=True, h=72, chev=True), '0 22px')
    main = begeleider_top('Classificaties') + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
    {card(card_head('Classificaties · 14', btn('Klasse toevoegen', icon='plus', h=40) + info('De app kent bewust geen klasse Onderaannemer of derden (alleen eigen monteurs) en geen TRA onvolledig (daarvoor is de vlag Buiten TRA). Regels: kennisbank (666). Bevindingen: [A] en [V] in de voorbeelddata (38).')) + rows, '0 22px 2px')}
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="font-size:16px;font-weight:700;height:40px;display:flex;align-items:center">Prioriteiten</div>
      <div style="display:flex;gap:16px">{ptiles}</div>
      <div style="margin-top:8px">{link_card}</div>
    </div>
  </div>'''
    return page('W03c · Begeleider, classificaties', sidebar(sub='Begeleider'), main)


# =============== W04 Kennisbank ===============
CONCEPT_PROD = {'DAM', 'IDV', 'POM'}


def kb_top(active='Producten en TRA’s'):
    return top('Configuratie · Kennisbank · 21 producten · 666 regels (668 in concept) · 128 met taakstap', 'Kennisbank', concept_chip(),
               btn('Uit catalogus', icon='book') + btn('TRA of RI&amp;E uploaden', primary=True, icon='upload')) + \
        tabs([('Producten en TRA’s', '21'), ('Werkplekken', ''), ('Standaardmaatregelen', ''), ('Inrichting', '')], active)


def w04():
    PLUS = {'IDV': '+1 in concept', 'POM': '+1 in concept', 'DAM': 'Gewijzigd in concept'}
    items = list(KB.items())

    def prow(code, v, last):
        n = len(v['regels'])
        fasen = len(dict.fromkeys(r['fase'] for r in v['regels']))
        chipx = small_chip(PLUS[code], 'butter', BROWN) if code in PLUS else ''
        lead = (f'<span style="width:44px;height:30px;border-radius:9px;background:{P["mist"][0]};display:inline-flex;align-items:center;justify-content:center;'
                f'font-size:12px;font-weight:700;color:{SOFT};letter-spacing:.04em;flex:none">{code}</span>')
        right = f'{chipx}<span class="num" style="width:80px;text-align:right;font-size:15px;font-weight:600">{n} <span style="font-weight:500;color:{SOFT};font-size:13px">regels</span></span>'
        ts = sum(1 for r in v['regels'] if r.get('taakstap'))
        return lrow(v['naam'], f'{ts} regel{"" if ts == 1 else "s"} met taakstap', right, lead=lead, last=last, h=44, chev=True).replace('margin-top:3px', 'margin-top:1px')
    half = 11
    col1 = ''.join(prow(c, v, i == half - 1) for i, (c, v) in enumerate(items[:half]))
    col2 = ''.join(prow(c, v, i == len(items) - half - 1) for i, (c, v) in enumerate(items[half:]))
    banner = (f'<a style="margin-top:20px;height:44px;border-radius:14px;background:{P["butter"][0]};padding:0 12px 0 14px;display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:{BROWN}">'
              f'{ico("alert", 18)}<span style="flex:1">3 punten om na te kijken</span><span style="display:inline-flex">{ico("down", 18)}</span></a>')
    nts = sum(1 for v in KB.values() for r in v['regels'] if r.get('taakstap'))
    nr = sum(len(v['regels']) for v in KB.values())
    sig = (f'<div style="margin-top:20px;height:44px;border-radius:14px;background:{P["sky"][0]};padding:0 14px;display:flex;align-items:center;gap:10px;font-size:14px;color:{INK}">'
           f'{ico("layers", 18)}<span style="flex:1"><b>{nr - nts} van {nr} regels zonder taakstap</b> · toetsen op taakniveau</span>'
           f'<span style="color:{BROWN};font-weight:600;display:inline-flex;align-items:center;gap:6px;height:44px">{ico("alert", 16)}3 punten om na te kijken{ico("down", 16)}</span></div>')
    main = kb_top() + sig + f'''
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
    {card(col1, '0 22px')}{card(col2, '0 22px')}
  </div>'''
    return page('W04 · Kennisbank', sidebar(sub='Kennisbank'), main)


BB = dict(org='Bouwbedrijf Voorbeeld', role='1 gebruiker · beheerder')


def kb_top_bb(active, actions=''):
    return top('Configuratie · Kennisbank · Bouwbedrijf Voorbeeld B.V. (fictief)', 'Kennisbank', concept_chip('v0.1'), actions) + \
        tabs([('Werkplekken', '0'), ('Producten en TRA’s', ''), ('Standaardmaatregelen', ''), ('Inrichting', '')], active)


def choice(title, meta, on, icon):
    ring = f'box-shadow:0 0 0 2px {INK};' if on else f'box-shadow:0 0 0 1px {LINE};'
    mark = (f'<span style="width:24px;height:24px;border-radius:50%;background:{DARK};color:#fff;display:inline-flex;align-items:center;justify-content:center">{ico("check", 14, 2.4)}</span>'
            if on else f'<span style="width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 2px #B7BDC6"></span>')
    return (f'<button role="radio" aria-checked="{str(on).lower()}" style="flex:1;min-width:0;text-align:left;height:132px;border-radius:24px;background:#fff;{ring}padding:18px 20px;display:block">'
            f'<span style="display:flex;justify-content:space-between;align-items:flex-start">{tile_ico(icon, P["mist"][0], 40, 20, 13)}{mark}</span>'
            f'<span style="display:block;font-size:16px;font-weight:600;margin-top:14px">{title}</span>'
            f'<span style="display:block;font-size:13px;color:{SOFT};margin-top:4px">{meta}</span></button>')


def w04_inrichting():
    lv = [('Werkplek', False), ('Activiteit', True), ('Risico', False), ('Maatregel', False)]
    chain = f'<span style="color:{SOFT}">{ico("chev", 18)}</span>'.join(
        f'<span style="height:40px;padding:0 14px;border-radius:12px;display:inline-flex;align-items:center;font-size:15px;font-weight:600;'
        + (f'background:{P["mist"][0]};color:{SOFT};text-decoration:line-through;font-weight:500' if skip else f'background:{P["sky"][0]}')
        + f'">{n}</span>' for n, skip in lv)
    main = kb_top_bb('Inrichting', btn('Volgende: kennisbank vullen', primary=True)) + f'''
  {h2('1 · Waar begint de inspectie?', '', 22)}
  <div style="margin-top:10px;display:flex;gap:16px">
    {choice('Werkplekken uit RI&amp;E', 'Werkplek › risico › maatregel', True, 'pin')}
    {choice('Producten en TRA’s', 'Product › fase › taak › risico', False, 'layers')}
    {choice('Beide', 'Werkplek én product kiezen', False, 'grid')}
  </div>
  {h2('2 · Niveaus', btn('Bewerken', icon='gear', h=40), 24)}
  <div style="margin-top:10px;display:flex;align-items:center;gap:8px">{chain}</div>
  {h2('3 · Risicomethode', info('Fine &amp; Kinney: drie keuzes per regel, rapport toont risicogetal. Hoog/midden/laag: één keuze, rapport en dashboard tonen de verdeling. Geen score: dashboard groepeert op klasse. Zonder score of prioriteit kun je opslaan maar niet publiceren.'), 24)}
  <div style="margin-top:10px;display:flex;gap:16px">
    {choice('Fine &amp; Kinney', 'Kans × hoe vaak × hoe erg', False, 'gauge')}
    {choice('Hoog, midden, laag', 'Eén keuze per risico', True, 'chart')}
    {choice('Geen score', 'Alleen klasse', False, 'tag')}
  </div>'''
    return page('W04 · Kennisbank, inrichting', sidebar(sub='Kennisbank', **BB), main)


def w04_leeg():
    def start(title, meta, icon, tone, primary):
        return (f'<a style="flex:1;display:block;height:220px;border-radius:24px;background:{P[tone][0]};padding:24px;position:relative">'
                f'{tile_ico(icon, P[tone][1], 52, 26, 16)}'
                f'<div style="font-size:22px;font-weight:600;letter-spacing:-.01em;margin-top:22px">{title}</div>'
                f'<div style="font-size:15px;color:{SOFT};margin-top:6px">{meta}</div>'
                f'<span style="position:absolute;right:20px;bottom:20px">{btn("Starten", primary=primary)}</span></a>')
    main = kb_top_bb('Werkplekken') + f'''
  <div style="margin-top:56px;text-align:center">
    {tile_ico('book', P['mist'][0], 64, 30, 20)}
    <div class="serif" style="font-size:28px;margin-top:18px">Nog geen kennisbank</div>
    <div style="font-size:16px;color:{SOFT};margin-top:8px">Begin met een upload of met de catalogus.</div>
  </div>
  <div style="margin:36px auto 0;max-width:860px;display:flex;gap:20px">
    {start('RI&amp;E of TRA uploaden', 'PDF of Excel · de AI stelt voor, jij beslist per regel', 'upload', 'sky', True)}
    {start('Uit catalogus kiezen', 'Startbibliotheek of branchecatalogus', 'book', 'sage', False)}
  </div>
  <div style="margin-top:28px;text-align:center;font-size:14px;color:{SOFT}">Inrichting: werkplekken uit RI&amp;E · hoog, midden, laag {link('Wijzigen')}</div>'''
    return page('W04 · Kennisbank, leeg', sidebar(sub='Kennisbank', **BB), main)


IDV4 = [('4.01', 'Vallen van de last tijdens het hijsen', 'Indraaireductor hijsen en positioneren', '135', '22,5'),
        ('4.02', 'Beknellen van handen tussen last en omgeving', 'Indraaireductor hijsen en positioneren', '63', '14'),
        ('4.03', 'Handen beknellen bij koppelen van de V-snaar', 'Installeren aan de aandrijving', '63', '14'),
        ('4.04', 'Onverwacht draaien van de vijzel', 'Indraaireductor testen', '45', '3'),
        ('4.05', 'Handen beknellen tussen draaiende V-snaar', 'Indraaireductor testen', '21', '3,5'),
        ('4.06', 'Twee partijen op één werkplek', 'Indraaien betonbed', '63', '7'),
        ('4.07', 'Noodstop niet bereikbaar of niet deugdelijk', 'Indraaien betonbed', '45', '6'),
        ('4.08', 'Vijzel niet vergrendeld bij benaderen', 'Indraaien betonbed', '135', '3'),
        ('4.09', 'Onverwacht draaien bij ontkoppelen', 'Indraaireductor ontkoppelen en afvoeren', '45', '3'),
        ('4.10', 'Vallen van de last bij afvoeren', 'Indraaireductor ontkoppelen en afvoeren', '63', '10,5')]


def rg_chip(v):
    f = float(v.replace(',', '.'))
    if f <= 20:
        return small_chip(f'{v}', 'sage', GREEN)
    if f <= 70:
        return small_chip(f'{v}', 'butter', BROWN)
    return small_chip(f'{v}', 'blush', RED)


def w04b():
    fasen = [('1', 'Voorbereiding', 9), ('2', 'Demontage', 8), ('3', 'Montage', 9), ('4', 'Indraaien vijzel', 10),
             ('5', 'Afmontage', 5), ('6', 'Elektrisch aansluiten', 1), ('7', 'Inbedrijfstelling', 3)]
    ft = ''.join(
        f'<a {"aria-current=true " if n == "4" else ""}style="height:40px;padding:0 12px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;font-size:14px;'
        + (f'background:{DARK};color:#fff;font-weight:600' if n == '4' else f'background:#fff;box-shadow:0 0 0 1px {LINE};color:{INK};font-weight:500')
        + f'"><b>{n}</b>{name}</a>' for n, name, c in fasen)
    rows = ''.join(
        lrow(f'IDV-{i} · {r}', s, f'<span style="display:flex;align-items:center;gap:6px">{rg_chip(z)}<span style="color:{SOFT}">→</span>{rg_chip(m)}</span>',
             last=k == 9, h=54, chev=True) if i != '4.08' else
        f'<div style="background:{P["sky"][0]};margin:0 -22px;padding:0 22px">' + lrow(f'IDV-{i} · {r}', s, f'<span style="display:flex;align-items:center;gap:6px">{rg_chip(z)}<span style="color:{SOFT}">→</span>{rg_chip(m)}</span>', last=True, h=54, chev=True) + '</div>'
        for k, (i, r, s, z, m) in enumerate(IDV4))
    main = top('Configuratie · Kennisbank · Producten en TRA’s', 'Indraaivijzel', concept_chip(), btn('Risico toevoegen', icon='plus')) + f'''
  <div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">{ft}</div>
  {h2('Indraaireductor monteren en vijzel indraaien', f'<span style="font-size:14px;color:{SOFT}">risicogetal zonder → met maatregelen</span>', 22)}
  {card(rows, '0 22px', 'margin-top:10px')}'''

    def risk(lbl, val, word, tone, fg):
        return (f'<div style="flex:1;border-radius:20px;background:{P[tone][0]};padding:16px 18px">'
                f'<div style="font-size:14px;color:{SOFT};font-weight:500">{lbl}</div>'
                f'<div class="num" style="font-size:32px;font-weight:600;margin-top:6px;line-height:1">{val}</div>'
                f'<div style="font-size:14px;font-weight:600;color:{fg};margin-top:6px">{word}</div></div>')
    mt = [('LOTOTO op de indraaireductor vóór het benaderen', 'Collectief', 'Kijken'),
          ('Strip pas verwijderen na volledige uitharding van het beton', 'Collectief', 'Vragen'),
          ('Werkinstructie Indraaien van een vijzel', 'Verwijzing', 'Document')]
    mrows = ''.join(lrow(t, k, small_chip(w, 'sky', INK), last=i == 2, h=60, pad=13) for i, (t, k, w) in enumerate(mt))
    inner = panel_head('IDV-4.08 · Indraaien betonbed', 'Vijzel niet vergrendeld bij benaderen', 'shield', P['sky'][1]) + f'''
  <div style="margin-top:14px;display:flex;gap:8px">{small_chip('Gedrag en werkwijze')}{small_chip('Monteur')}{small_chip('Gepubliceerd v1.3', 'sage', GREEN)}</div>
  <div style="margin-top:18px;display:flex;gap:12px">{risk('Zonder maatregelen', '135', 'Aanzienlijk', 'blush', RED)}{risk('Met maatregelen', '3', 'Aanvaardbaar', 'sage', GREEN)}</div>
  <div style="margin-top:20px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:700">Maatregelen · 3</div>
    <span style="font-size:13px;color:{SOFT}">hoe de begeleider toetst</span></div>
  {mrows}
  <a style="margin-top:8px;display:flex;align-items:center;gap:12px;min-height:56px;border-radius:16px;background:{P['mist'][0]};padding:0 14px">
    {ico('branch', 20)}<div style="flex:1"><div style="font-size:14px;font-weight:600">Gesplitst ten opzichte van de bron</div><div style="font-size:13px;color:{SOFT}">VGM-coördinator · 25 aug · sinds v1.2</div></div>
    <span style="font-size:14px;font-weight:600">Bron</span></a>''' + panel_foot(bigbtn('Terugdraaien', False), bigbtn('Bewerken', True))
    return page('W04b · Kennisbank, regel', sidebar(sub='Kennisbank'), main, panel(inner, 500, 'Regel IDV-4.08'))


# =============== W05 Catalogus kiezen ===============
def w05():
    groups = [
        ('Vallen van de last', '50 regels · 21 producten · Hijsen', small_chip('Staat er al', 'sage', GREEN), False),
        ('Biologische agentia', '35 regels · 17 producten · andere tekst dan DAM-3.09', small_chip('Andere tekst', 'butter', BROWN), False),
        ('Vallen van hoogte', '35 regels · 16 producten · Werken op hoogte of bij water', small_chip('Staat er al', 'sage', GREEN), False),
        ('Aanrijding of beknelling door kraanbeweging', '22 regels · 21 producten · Hijsen', small_chip('Ontbreekt', 'mist', INK), False),
        ('Besloten ruimte', '13 regels · 11 producten · Besloten ruimte en gas', small_chip('Ontbreekt', 'mist', INK), True),
        ('Struikelgevaar', '13 regels · 13 producten · Werken op hoogte of bij water', small_chip('Ontbreekt', 'mist', INK), True),
    ]

    def cb(on):
        if on:
            return f'<span role="checkbox" aria-checked="true" style="width:24px;height:24px;border-radius:8px;background:{DARK};color:#fff;display:inline-flex;align-items:center;justify-content:center;flex:none">{ico("check", 16, 2.4)}</span>'
        return f'<span role="checkbox" aria-checked="false" style="width:24px;height:24px;border-radius:8px;box-shadow:inset 0 0 0 2px #B7BDC6;flex:none"></span>'
    rows = ''.join(lrow(t, m, c, lead=cb(on), last=i == 5, h=64, chev=True) for i, (t, m, c, on) in enumerate(groups))
    src = tabs([('Eigen kennisbank', ''), ('Startbibliotheek', ''), ('Branchecatalogus', '')], 'Eigen kennisbank', 0)

    def pick(label):
        return (f'<span style="flex:1;height:44px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px {LINE};display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 10px;font-size:14px;white-space:nowrap">'
                f'<span style="color:{SOFT}">{label}</span>{ico("down", 16)}</span>')

    def sel(name, nid):
        return (f'<div style="border-radius:18px;background:{P["mist"][0]};padding:14px 16px;margin-top:12px">'
                f'<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:15px;font-weight:600">{name}</div>'
                f'<span style="font-size:13px;color:{SOFT}">wordt {nid}</span></div>'
                f'<div style="display:flex;gap:6px;margin-top:10px">{pick("Kans")}{pick("Hoe vaak")}{pick("Hoe erg")}</div></div>')
    main = top('Configuratie · Kennisbank · Uit catalogus kiezen', 'Naar Damwand · Plaatsen damwand',
               concept_chip(), btn('Ander doel')) + f'''
  <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center">{src}<span style="display:flex;align-items:center;gap:8px;font-size:14px;color:{SOFT}">Risicomethode {small_chip('Fine &amp; Kinney', 'mist', INK)}{link('Wijzigen')}</span></div>
  <div style="margin-top:18px;display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">
    <div>
      <div style="border-radius:20px;background:{P['lilac'][0]};padding:12px 14px;display:flex;align-items:center;gap:12px">
        {voorstel_chip()}<div style="flex:1;font-size:15px;line-height:1.4">Besloten ruimte staat wel bij <b>Verwijderen damwand</b>.</div>{btn('Bekijken', h=40)}</div>
      {card(rows, '0 22px', 'margin-top:14px')}
    </div>
    {card(card_head('Selectie · 2', link('Wissen', 'close')) + sel('Besloten ruimte', 'DAM-3.11') + sel('Struikelgevaar', 'DAM-3.12') + f'<div style="font-size:13px;color:{SOFT};margin-top:12px">Score per taak kies jij · publiceren kan pas met score</div><div style="margin:16px 0 20px">{bigbtn("Toevoegen aan concept (2)")}</div>', '0 22px')}
  </div>'''
    return page('W05 · Catalogus kiezen', sidebar(sub='Kennisbank'), main)


# =============== W06 Upload TRA omzetten ===============
TWIJFEL = [('DAM-3.01', 'Vallen van hoogte', 'Alleen een verwijzing · Plaatsen damwand'),
           ('DAM-3.09', 'Biologische agentia', 'Type ontbreekt · gevolg erger na maatregelen'),
           ('DAM-3.10', 'Vrijkomen van stof bij boren', 'Tekst anders dan kennisbank'),
           ('DAM-4.01', 'Gevaar voor elektrocutie', 'Type ontbreekt · Inschakelen'),
           ('DAM-5.01', 'Gevaar voor elektrocutie', 'Type ontbreekt · Inbedrijfstelling')]


def reden(text, with_link=True):
    return (f'<div style="margin-top:14px;border-radius:18px;background:{P["mist"][0]};min-height:52px;padding:0 8px 0 16px;display:flex;align-items:center;gap:12px;font-size:14px;color:{SOFT}">'
            f'{ico("lock", 18)}<span style="flex:1">{text}</span>{link("Versies en publiceren") if with_link else ""}</div>')


def w06_main(selected=None):
    rows = []
    for i, (rid, r, m) in enumerate(TWIJFEL):
        row = lrow(f'{rid} · {r}', m, small_chip('Twijfel', 'blush', RED), lead=tile_ico('alert', P['blush'][0], 40, 20, 12, RED),
                   last=i == 4 or selected == i or selected == i + 1, h=64, chev=True)
        rows.append(f'<div style="background:{P["sky"][0]};margin:0 -22px;padding:0 22px">{row}</div>' if selected == i else row)
    return top('Configuratie · Kennisbank · Uploaden', 'Damwand.xltx', concept_chip(),
               btn('Ander bestand', icon='upload') + btn('Overnemen in concept', disabled=True, icon='lock')) + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
    {stat('Twijfel', '5', 'Begin hier', 'blush', 'alert')}
    {stat('Open', '6', 'Zonder twijfel, ook één voor één', 'butter', 'list')}
    {stat('Goedgekeurd', '20', 'van 31 · 0 afgewezen', 'sage', 'check')}
    {stat('Wachtrij', '2', 'Kolommen bevestigen', 'mist', 'layers', ' bestanden')}
  </div>
  {h2('Twijfel · 5', info('Vergeleken met de kennisbank, spaties en regeleinden genegeerd: 30 gelijk, 1 anders. Kolommen: 13 velden gekoppeld en bevestigd.') + link('Alle 31 regels'), 26)}
  {card(''.join(rows), '0 22px', 'margin-top:10px')}
  {reden('Overnemen na alle 31 regels · de tweede goedkeuring is het vrijgeven, door een ander')}'''


def w06():
    return page('W06 · TRA omzetten', sidebar(sub='Kennisbank'), w06_main())


def w06_paneel():
    def opt(t, m):
        return (f'<button aria-pressed="false" style="width:100%;text-align:left;display:flex;align-items:center;gap:12px;min-height:58px;border-radius:16px;background:#fff;box-shadow:0 0 0 1px {LINE};padding:0 16px;margin-top:8px">'
                f'<span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 2px #B7BDC6;flex:none"></span>'
                f'<span style="flex:1"><span style="display:block;font-size:15px;font-weight:600">{t}</span><span style="display:block;font-size:13px;color:{SOFT};margin-top:2px">{m}</span></span></button>')
    inner = panel_head('DAM-3.01 · Montage › Plaatsen damwand', 'Vallen van hoogte', 'alert', P['blush'][1]) + f'''
  {field('Uit het bestand', 'Maatregel: <b>Standaard maatregel</b> · risicogetal 21 → 7', 'mist', 20)}
  <div style="margin-top:10px;background:{P['lilac'][0]};border-radius:18px;padding:14px 18px">
    <div style="display:flex;align-items:center;gap:10px">{voorstel_chip()}<span style="font-size:15px;font-weight:600">Alleen een verwijzing</span></div>
    <div style="font-size:15px;line-height:1.5;margin-top:6px">Geen standaardmaatregel van Damwand gaat over vallen. Er valt niets te toetsen.</div>
  </div>
  <div style="margin-top:18px;font-size:15px;font-weight:700">Jouw beslissing</div>
  {opt('Navragen bij de opsteller', 'Regel blijft open tot het antwoord er is')}
  {opt('Overnemen van DAM-2.01', 'Werkinstructie voor werken nabij putrand')}
  {opt('Zelf invullen', 'Maatregel en type zelf schrijven')}
  {opt('Bron volgen', 'Overnemen zoals het in het bestand staat')}''' + panel_foot(bigbtn('Afwijzen', False), bigbtn('Goedkeuren · kies eerst', disabled=True))
    return page('W06 · TRA omzetten, regel', sidebar(sub='Kennisbank'), w06_main(selected=0), panel(inner, 500, 'Regel DAM-3.01'))


# =============== W06b RI&E omzetten ===============
def w06b():
    def mk(n, txt):
        return (f'<span class="num" style="display:inline-flex;width:20px;height:20px;border-radius:6px;background:{DARK};color:#fff;font-size:12px;font-weight:700;align-items:center;justify-content:center;vertical-align:1px;margin-right:4px">{n}</span>'
                f'<mark style="background:#DCE8FA;color:{INK};border-radius:4px;padding:1px 2px">{txt}</mark>')
    pdf = f'''
    <div style="{CARD};padding:20px">
      <div style="display:flex;align-items:center;gap:10px">{tile_ico('pdf', P['mist'][0], 36, 18, 10)}<div style="flex:1;font-size:14px;font-weight:600">RI&amp;E Bouwbedrijf Voorbeeld 2026.pdf</div>
        <span style="font-size:14px;color:{SOFT}">p. 7, §3.2</span></div>
      <div style="margin-top:14px;border-radius:14px;background:#F7F7F5;box-shadow:inset 0 0 0 1px {LINE};padding:22px 24px;font-size:15px;line-height:1.7;color:{INK}">
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">3.2 Werkplaats — lassen en slijpen</div>
        {mk(1, 'Lasplek 1 en 2 hebben puntafzuiging; lasplek 3 heeft geen werkende afzuiging. Maatregel: puntafzuiging bij elke lasplek; tot dan adembescherming P3. Prioriteit: hoog.')}
      </div>
      <div style="margin-top:12px">{btn('Hele pagina tonen', icon='eye', h=44)}</div>
    </div>'''

    def prop(n, title, prio, meta, state, on=False):
        ring = f'box-shadow:0 0 0 2px #1F5FBF;' if on else f'box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04);'
        return (f'<a style="display:block;border-radius:24px;background:#fff;{ring}padding:14px 18px;height:131px">'
                f'<div style="display:flex;align-items:center;gap:10px"><span class="num" style="width:24px;height:24px;border-radius:7px;background:{DARK if on else "#5D6676"};color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center">{n}</span>'
                f'<div style="flex:1;font-size:16px;font-weight:600">{title}</div>{state}</div>'
                f'<div style="display:flex;align-items:baseline;gap:8px;margin-top:14px"><span style="font-size:13px;color:{SOFT}">Prioriteit</span>'
                f'<span style="font-size:20px;font-weight:600">{prio}</span></div>'
                f'<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:{SOFT};margin-top:6px">{voorstel_chip() if "Goedgekeurd" not in state else ""}<span>{meta}</span></div></a>')
    props = ''.join([
        prop(1, 'Lasrook inademen', 'Hoog', 'p. 7 · 2 maatregelen · prioriteit uit de bron · ook een actie', small_chip('Te beoordelen', 'sky', INK), True),
        prop(2, 'Oogletsel door lichtboog', 'Midden', 'p. 7, §3.2 · 2 maatregelen · prioriteit uit de bron', small_chip('Goedgekeurd', 'sage', GREEN)),
        prop(3, 'Brandgevaar door slijpvonken', 'Kies', 'p. 7 · maatregel staat er niet bij', small_chip('Twijfel', 'blush', RED)),
        prop(4, 'Lawaai bij slijpen en zagen', 'Kies', 'p. 7 · prioriteit staat er niet bij', small_chip('Twijfel', 'blush', RED)),
    ])
    werkplek = (f'<a style="height:44px;padding:0 14px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px {LINE};display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600">'
                f'{ico("pin", 18)}Werkplaats · 3 van 8{ico("down", 16)}</a>')
    main = top('Configuratie · Kennisbank · RI&amp;E uploaden', 'RI&amp;E omzetten', concept_chip('v0.1'),
               btn('Ander bestand', icon='upload') + btn('Overnemen in concept', disabled=True, icon='lock')) + f'''
  <div style="display:flex;justify-content:space-between;align-items:flex-end">{tabs([('Risico’s', '3 van 23'), ('Plan van aanpak', '0 van 12 punten')], 'Risico’s')}{werkplek}</div>
  <div style="margin-top:20px;display:grid;grid-template-columns:5fr 6fr;gap:20px;align-items:start">
    <div>{pdf}{reden('Overnemen na alle regels · daarna vrijgeven door een ander', False)}
      <div style="margin-top:10px;border-radius:18px;background:{P['sky'][0]};min-height:56px;padding:0 8px 0 16px;display:flex;align-items:center;gap:12px;font-size:14px">
        {ico('person', 18)}<span style="flex:1"><b>Vrijgeven vraagt een tweede persoon</b></span>{btn('Nodig een vrijgever uit', h=40)}</div></div>
    <div style="display:flex;flex-direction:column;gap:12px">{props}</div>
  </div>'''
    return page('W06b · RI&E omzetten', sidebar(sub='Kennisbank', **BB), main)


# =============== W16 Versies en publiceren ===============
WIJZ = [('Standaardmaatregelen altijd tonen · LMRA en PBM', 'Begeleider · gewijzigd · 4 nov', ''),
        ('Doorvraagregel 6 · hijsplan', 'Begeleider · nieuw · 6 nov', 'proef'),
        ('Direct gevaar · persoon onder hangende last', 'Begeleider · gewijzigd · 7 nov', ''),
        ('IDV-1.10 · geluid bij hijsen', 'Kennisbank · nieuw · 8 nov', ''),
        ('POM-1.10 · geluid bij hijsen', 'Kennisbank · nieuw · 8 nov', ''),
        ('DAM-2.06 · handenwasset in de bus', 'Kennisbank · gewijzigd · 9 nov', ''),
        ('Voettekst met versie van de inrichting', 'Rapport · gewijzigd · 9 nov', '')]


def w16_main(selected=None):
    vers = [('v1.0', '5', '1 mei · momentopname', 'mist'), ('v1.1', '2', '1 jul · vervangen', 'mist'), ('v1.2', '3', '1 sep · vervangen', 'mist'),
            ('v1.3', '5', '1 okt · in gebruik', 'sage'), ('v1.4', '0', 'concept · 7 wijzigingen', 'butter')]
    vcards = ''.join(
        f'<a style="display:block;height:164px;border-radius:24px;background:{P[t][0]};padding:20px 22px">'
        f'<div style="display:flex;justify-content:space-between;align-items:center;height:26px"><span style="font-size:16px;font-weight:700">{v}</span>'
        f'{small_chip("In gebruik", "sage", GREEN) if v == "v1.3" else (small_chip("Concept", "butter", BROWN) if v == "v1.4" else "")}</div>'
        f'<div style="display:flex;align-items:baseline;gap:6px;margin-top:24px"><span class="num" style="font-size:40px;font-weight:600;line-height:1">{n}</span><span style="font-size:15px;color:{SOFT}">inspecties</span></div>'
        f'<div style="font-size:14px;color:{SOFT};margin-top:14px">{m}</div></a>' for v, n, m, t in vers)
    rows = []
    for i, (t, m, tag) in enumerate(WIJZ):
        r = small_chip('Proef wijkt af', 'blush', RED) if tag else ''
        lead = f'<span class="num" style="width:30px;height:30px;border-radius:10px;background:{P["mist"][0]};display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex:none">{i + 1}</span>'
        row = lrow(t, m, r, lead=lead, last=i == 6 or selected == i or selected == i + 1, h=54, chev=True)
        rows.append(f'<div style="background:{P["sky"][0]};margin:0 -22px;padding:0 22px">{row}</div>' if selected == i else row)
    steps = (lrow('Opstellen', 'VGM-coördinator · klaar', '', lead=tile_ico('check', P['sage'][0], 36, 18, 11, GREEN), h=58)
             + lrow('Vrijgeven', 'Hoofd Service &amp; Montage · altijd een ander dan de opsteller', lock('Vast'), lead=tile_ico('person', P['mist'][0], 36, 18, 11), h=58)
             + lrow('Ingangsdatum', 'Direct na vrijgave', '', lead=tile_ico('cal', P['mist'][0], 36, 18, 11), last=True, h=58, chev=True))
    return top('Configuratie · Versies en publiceren', 'Versies en publiceren', concept_chip(),
               btn('Exporteren', icon='report') + btn('Ter vrijgave aanbieden', disabled=True, icon='lock')) + f'''
  <div style="margin-top:24px;display:grid;grid-template-columns:repeat(5,1fr);gap:16px">{vcards}</div>
  <div style="margin-top:28px;display:grid;grid-template-columns:7fr 5fr;gap:20px;align-items:start">
    <div>{h2('v1.4 tegenover v1.3 · 7 wijzigingen', link('Vergelijk andere versie'), 0)}{card(''.join(rows), '0 22px', 'margin-top:10px')}</div>
    <div>
      {h2('Publiceren', '', 0)}
      <a style="display:block;margin-top:10px;border-radius:22px;background:{P['blush'][0]};padding:16px 18px;height:112px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:15px;color:{SOFT};font-weight:500">Proefdraaien</div>{tile_ico('play', P['blush'][1], 36, 18, 11)}</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:2px"><span class="num" style="font-size:28px;font-weight:600">27</span><span style="font-size:15px;color:{SOFT}">van 28 geslaagd</span></div>
        <div style="font-size:13px;color:{SOFT};margin-top:4px">Eerst scenario 6 oplossen of accepteren</div></a>
      {card(steps, '0 22px', 'margin-top:14px')}
    </div>
  </div>'''


def w16():
    return page('W16 · Versies en publiceren', sidebar(sub='Versies en publiceren'), w16_main())


def w16_paneel():
    inner = panel_head('Wijziging 6 · Kennisbank · 9 nov', 'DAM-2.06 · handenwasset', 'layers', P['butter'][1]) + f'''
  {field('Was · v1.3', 'Individueel: Strikt hygiëneprotocol (handen wassen voor pauzes, niet eten/drinken in werkzone.', 'mist', 22)}
  {field('Wordt · v1.4', 'Individueel: Strikt hygiëneprotocol (handen wassen voor pauzes, niet eten/drinken in werkzone.<mark style="background:#CDE8B5;color:{INK};border-radius:4px;padding:1px 3px"> Handenwasset in de bus, controle bij vertrek</mark>.', 'sage', 10)}
  {field('Inspecteur merkt', 'Bij DAM-2.06 staat de handenwasset als te toetsen maatregel.', 'sky', 10)}
  <a style="margin-top:12px;display:flex;align-items:center;gap:12px;min-height:64px">
    {tile_ico('flag', P['mist'][0], 40, 18, 12)}
    <div style="flex:1"><div style="font-size:15px;font-weight:600">Aanleiding</div><div style="font-size:13px;color:{SOFT};margin-top:3px">Actie WPI-20261105-DAM-C2-2</div></div>
    <span style="color:{SOFT}">{ico('chev', 20)}</span></a>''' + panel_foot(bigbtn('Terugdraaien', False), bigbtn('Volgende wijziging', True))
    return page('W16 · Versies, wijziging', sidebar(sub='Versies en publiceren'), w16_main(selected=5), panel(inner, 500, 'Wijziging 6'))


FILES = {
    'W01-overzicht': w01, 'W02-begeleider': w02, 'W02-bouwbedrijf': w02_bouwbedrijf, 'W02b-begeleider-stappen': w02b, 'W02c-begeleider-doorvraagregel': w02c, 'W02d-begeleider-doorvragen': w02d,
    'W03-begeleider-regels': w03, 'W03b-begeleider-oordelen': w03b, 'W03c-begeleider-classificaties': w03c,
    'W04-kennisbank': w04, 'W04-inrichting': w04_inrichting, 'W04-leeg': w04_leeg, 'W04b-kennisbank-regel': w04b, 'W05-catalogus-kiezen': w05,
    'W06-upload-omzetten': w06, 'W06-upload-omzetten-paneel': w06_paneel, 'W06b-rie-omzetten': w06b,
    'W16-versies-publiceren': w16, 'W16-versies-publiceren-paneel': w16_paneel,
}

if __name__ == '__main__':
    for k, f in FILES.items():
        open(f'{OUT}/{k}.html', 'w').write(f())
    print('ok', len(FILES))
