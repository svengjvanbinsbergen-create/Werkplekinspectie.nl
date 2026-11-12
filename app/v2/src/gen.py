# Genereert de v2-richtingschermen (rustige, Apple-achtige stijl) als statische HTML.
# Feiten: voorbeelddata.json v10.4 en kennisbank.json (fictief). Geen JavaScript.
import os

OUT = '/home/claude/app/v2'

# ---------- tokens ----------
INK = '#141A22'
SOFT = '#4A5565'
DARK = '#16191F'
LINE = '#E7E9ED'
P = {  # pastelvlakken + bijbehorende icoontegel
    'sky': ('#EAF1FA', '#D5E4F6'),
    'butter': ('#FBF5DE', '#F3E8BC'),
    'sage': ('#EDF5E4', '#D8EAC4'),
    'lilac': ('#F1EDFC', '#E1D9FA'),
    'blush': ('#FBECEA', '#F6D6D2'),
    'mist': ('#F3F4F6', '#E6E8EC'),
}
OORDEEL = {
    'C': ('Conform', '#1E7A4C', '#E6F4EC'),
    'A': ('Afwijking', '#B42318', '#FDECEA'),
    'V': ('Verbeterpunt', '#8A4B00', '#FFF1DC'),
}
ACCENT = '#5B3FC4'  # AI-voorstel (iets donkerder dan #6B4FD8 voor 4.5:1 op lila)

HEAD = '''<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{{margin:0;background:#E9EAEC;font-family:Inter,system-ui,sans-serif;color:%s;-webkit-font-smoothing:antialiased}}
*{{box-sizing:border-box}}
a{{color:inherit;text-decoration:none}}
button{{font:inherit;color:inherit;border:0;background:none;padding:0;cursor:pointer}}
.serif{{font-family:Inter,system-ui,sans-serif;font-weight:700;letter-spacing:-.02em}}
.num{{font-feature-settings:"tnum" 1;letter-spacing:-.02em}}
</style></head><body>''' % INK


def ico(name, size=24, sw=1.75, color='currentColor'):
    paths = {
        'back': '<path d="M15 18l-6-6 6-6"/>',
        'chev': '<path d="M9 6l6 6-6 6"/>',
        'close': '<path d="M7 7l10 10M17 7L7 17"/>',
        'camera': '<path d="M3.5 8.5A2.5 2.5 0 0 1 6 6h1.6l1.5-2h5.8l1.5 2H18a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z"/><circle cx="12" cy="13" r="3.5"/>',
        'mic': '<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
        'wind': '<path d="M3 8.5h10.5a2.8 2.8 0 1 0-2.8-2.8M3 12.5h15a3 3 0 1 1-3 3M3 16.5h7"/>',
        'gauge': '<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="M12 16.5l3.6-4.4"/><circle cx="12" cy="16.5" r="1.2"/>',
        'doc': '<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M14 3.5v4h4M9.5 12.5h5M9.5 16h5"/>',
        'person': '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
        'cloud': '<path d="M7.5 18.5h9.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.6a4.5 4.5 0 0 0 1.3 8.9z"/>',
        'alert': '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10v4.5M12 17.2v.1"/>',
        'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'plus': '<path d="M12 5v14M5 12h14"/>',
        'cal': '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
        'list': '<path d="M9.5 7h10M9.5 12h10M9.5 17h10"/><circle cx="5" cy="7" r=".9"/><circle cx="5" cy="12" r=".9"/><circle cx="5" cy="17" r=".9"/>',
        'report': '<path d="M6.5 3.5h11v17h-11z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>',
        'hat': '<path d="M3.5 17.5h17"/><path d="M5.5 17.5v-3a6.5 6.5 0 0 1 13 0v3"/><path d="M10 8.3V5.5h4v2.8"/>',
        'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        'layers': '<path d="M12 4l8.5 4.3L12 12.6 3.5 8.3z"/><path d="M3.5 12.3L12 16.6l8.5-4.3M3.5 16.3L12 20.6l8.5-4.3"/>',
        'info': '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2M12 7.8v.1"/>',
        'device': '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
        'shield': '<path d="M12 3.5l7 2.8v5.2c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6.3z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
        'drop': '<path d="M12 3.8c3.2 4.2 5.6 7.2 5.6 10.2a5.6 5.6 0 0 1-11.2 0c0-3 2.4-6 5.6-10.2z"/>',
        'arrow': '<path d="M7 17L17 7M9 7h8v8"/>',
        'grid': '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
        'clip': '<rect x="5.5" y="4.5" width="13" height="16" rx="2.5"/><path d="M9.5 4.5V3.5h5v1M9 11h6M9 15h4"/>',
        'chart': '<path d="M4 20h16"/><path d="M7 16.5v-5M12 16.5v-9M17 16.5v-3"/>',
        'gear': '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M6 18l1.6-1.6M16.4 7.6L18 6"/>',
        'home': '<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5v10h11v-10"/>',
        'pin': '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
        'building': '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h1.5M13.5 8H15M9 12h1.5M13.5 12H15M10.5 20.5v-4h3v4"/>',
    }
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>')


def chip(text, bg='#FFFFFF', fg=SOFT, border=LINE, h=30, fs=12, weight=500, icon=None):
    i = ico(icon, 14) if icon else ''
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;height:{h}px;padding:0 12px;'
            f'border-radius:999px;background:{bg};color:{fg};border:1px solid {border};font-size:{fs}px;'
            f'font-weight:{weight};white-space:nowrap">{i}{text}</span>')


def fictief():
    return chip('Voorbeeldinhoud · fictief')


def online():
    return chip('Online', icon='cloud', fg=INK, border='#C9CED6')


def oordeel_chip(code, h=28, fs=13):
    w, fg, bg = OORDEEL[code]
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;height:{h}px;padding:0 10px;'
            f'border-radius:999px;background:{bg};color:{fg};font-size:{fs}px;font-weight:600;white-space:nowrap">'
            f'[{code}] {w}</span>')


def icotile(name, tint, size=44, isz=22, radius=14, color=INK):
    return (f'<span style="display:inline-flex;align-items:center;justify-content:center;width:{size}px;height:{size}px;'
            f'border-radius:{radius}px;background:{tint};color:{color};flex:none">{ico(name, isz)}</span>')


def round_btn(name, bg=P['mist'][0], size=48, color=INK, label=None):
    return (f'<button aria-label="{label or name}" style="width:{size}px;height:{size}px;border-radius:50%;background:{bg};'
            f'display:inline-flex;align-items:center;justify-content:center;color:{color};flex:none">{ico(name, 22)}</button>')


def phone(title, inner, extra=''):
    return HEAD.format(title=title) + (
        f'<div id="root" style="position:relative;width:390px;height:844px;overflow:hidden;background:#FFFFFF">'
        f'{inner}</div>{extra}</body></html>')


# ---------- telefoon: gedeelde onderbalk voor inspectieschermen ----------
def direct_gevaar(top):
    return (f'<button aria-label="Direct gevaar, werk stilleggen. Houd 2 seconden ingedrukt" '
            f'style="position:absolute;left:24px;right:24px;top:{top}px;height:48px;border-radius:16px;background:{P["blush"][0]};'
            f'color:#B42318;display:flex;align-items:center;justify-content:center;gap:10px;font-size:15px;font-weight:600">'
            f'{ico("alert", 20)}<span>Direct gevaar <span style="font-weight:500">· houd 2 s ingedrukt</span></span></button>')


def dock(primary, primary_icon='chev'):
    # links Foto, midden Inspreken (72), rechts primaire vervolgactie (donkere pil)
    return (
        f'<div style="position:absolute;left:24px;top:12px;width:72px;display:flex;flex-direction:column;align-items:center;gap:6px">'
        f'<button aria-label="Foto" style="width:64px;height:64px;margin-top:4px;border-radius:50%;background:{P["mist"][0]};'
        f'display:flex;align-items:center;justify-content:center">{ico("camera", 26)}</button>'
        f'<span style="font-size:14px;font-weight:500;color:{SOFT}">Foto</span></div>'
        f'<div style="position:absolute;left:159px;top:8px;width:72px;display:flex;flex-direction:column;align-items:center;gap:6px">'
        f'<button aria-label="Inspreken" style="width:72px;height:72px;border-radius:50%;background:{DARK};color:#fff;'
        f'display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(20,26,34,.22)">{ico("mic", 28, 2)}</button>'
        f'<span style="font-size:14px;font-weight:500;color:{SOFT}">Inspreken</span></div>'
        f'<div style="position:absolute;right:24px;top:12px;width:80px;display:flex;flex-direction:column;align-items:center;gap:6px">'
        f'<button aria-label="{primary}" style="width:64px;height:64px;margin-top:4px;border-radius:50%;background:{DARK};color:#fff;'
        f'display:flex;align-items:center;justify-content:center">{ico(primary_icon, 26, 2.2)}</button>'
        f'<span style="font-size:14px;font-weight:600;color:{INK}">{primary}</span></div>')


def header(left, center=''):
    return (f'<div style="position:absolute;left:24px;right:24px;top:44px;height:48px;display:flex;align-items:center;gap:12px">'
            f'{left}<div style="flex:1"></div>'
            f'<div style="display:flex;gap:6px">{online()}{fictief()}</div></div>')


# ======================= P01 start =======================
def p01():
    tab = lambda name, label, active=False: (
        f'<a style="width:64px;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:12px;'
        f'color:{INK if active else SOFT};font-size:12px;font-weight:{600 if active else 500}">{ico(name, 24)}{label}</a>')
    inner = f'''
<div style="position:absolute;left:24px;right:24px;top:44px;height:40px;display:flex;justify-content:flex-end;align-items:center;gap:6px">{online()}{fictief()}</div>
<div style="position:absolute;left:24px;right:24px;top:96px">
  <div style="font-size:15px;color:{SOFT};font-weight:500">Donderdag 5 november</div>
  <div class="serif" style="font-size:34px;line-height:1.15;margin-top:4px">Vandaag</div>
</div>

<div style="position:absolute;left:24px;right:24px;top:180px;background:{P['sage'][0]};border-radius:22px;padding:16px 56px 16px 16px;display:flex;gap:14px;align-items:center">
  {icotile('device', '#FFFFFF', 44, 22, 14, '#2F5D1E')}
  <div><div class="serif" style="font-size:17px;line-height:1.25">Klaar voor offline</div>
  <div style="font-size:14px;color:{SOFT};margin-top:2px">TRA Damwand v1.3 op toestel</div></div>
  <button aria-label="Banner sluiten" style="position:absolute;right:4px;top:4px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:{SOFT}">
    <span style="width:28px;height:28px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center">{ico('close', 16, 2)}</span></button>
</div>

<a style="position:absolute;left:24px;right:24px;top:292px;height:156px;background:#fff;border-radius:24px;padding:20px;box-shadow:0 6px 24px rgba(20,26,34,.07),0 0 0 1px {LINE};display:block">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div style="font-size:15px;color:{SOFT};font-weight:500">Werkplek</div>
    {icotile('pin', P['sky'][1], 48, 24, 16)}
  </div>
  <div style="font-size:26px;font-weight:600;letter-spacing:-.02em;margin-top:6px">Verwijderen damwand</div>
  <div style="font-size:15px;color:{SOFT};margin-top:6px">RWZI Voorbeeldstad · P26-168</div>
</a>

<div style="position:absolute;left:24px;right:24px;top:480px;display:flex;gap:12px">
  <a style="flex:1;height:148px;background:{P['butter'][0]};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:15px;color:{SOFT};font-weight:500">Open punten</div>
    <div class="num" style="font-size:40px;font-weight:600;margin-top:10px;line-height:1">2</div>
    <div style="font-size:14px;color:{SOFT};margin-top:10px">van vorige keer</div>
    <span style="position:absolute;right:16px;bottom:16px;color:{INK}">{ico('arrow', 20)}</span>
  </a>
  <a style="flex:1;height:148px;background:{P['sky'][0]};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:15px;color:{SOFT};font-weight:500">TRA-regels</div>
    <div class="num" style="font-size:40px;font-weight:600;margin-top:10px;line-height:1">8</div>
    <div style="font-size:14px;color:{SOFT};margin-top:10px">voor deze taak</div>
    <span style="position:absolute;right:16px;bottom:16px;color:{INK}">{ico('arrow', 20)}</span>
  </a>
</div>

<button style="position:absolute;left:24px;right:24px;top:656px;height:60px;border-radius:20px;background:{DARK};color:#fff;font-size:17px;font-weight:600">Start inspectie</button>

<nav style="position:absolute;left:0;right:0;bottom:0;height:88px;background:#fff;border-top:1px solid {LINE};display:flex;justify-content:space-around;padding:0 8px">
  {tab('home', 'Vandaag', True)}{tab('list', 'Acties')}
  <div style="width:72px;position:relative"><button aria-label="Nieuwe inspectie of melding" style="position:absolute;left:4px;top:-26px;width:64px;height:64px;border-radius:50%;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #fff,0 8px 20px rgba(20,26,34,.18)">{ico('plus', 28, 2)}</button></div>
  {tab('report', 'Rapporten')}{tab('person', 'Profiel')}
</nav>'''
    return phone('P01 · Start', inner)


# ======================= P04 TRA-toetsing =======================
def maatregel_tile(icon, kind, name, tone, state=None, selected=False):
    bg, tile = P[tone]
    ring = f'box-shadow:0 0 0 2px {INK};' if selected else ''
    st = state or ''
    return (f'<a style="display:block;position:relative;height:112px;border-radius:22px;background:{bg};padding:16px;{ring}">'
            f'<span style="position:absolute;right:12px;top:12px">{icotile(icon, tile, 40, 20, 13)}</span>'
            f'<div style="font-size:14px;color:{SOFT};font-weight:500">{kind}</div>'
            f'<div style="font-size:18px;font-weight:600;letter-spacing:-.01em;margin-top:22px;line-height:1.2">{name}</div>'
            f'<div style="margin-top:6px">{st}</div></a>')


def oordeel_btn(code, selected=False):
    w, fg, bg = OORDEEL[code]
    if selected:
        sty = f'background:{fg};color:#fff;box-shadow:0 6px 16px rgba(180,35,24,.25)'
        lt = 'background:rgba(255,255,255,.2);color:#fff'
    else:
        sty = f'background:{bg};color:{fg}'
        lt = f'background:#fff;color:{fg}'
    return (f'<button aria-pressed="{str(selected).lower()}" style="flex:1;height:76px;border-radius:20px;{sty};display:flex;flex-direction:column;'
            f'align-items:center;justify-content:center;gap:6px">'
            f'<span style="height:24px;min-width:28px;padding:0 6px;border-radius:8px;{lt};font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">{code}</span>'
            f'<span style="font-size:15px;font-weight:600">{w}</span></button>')


def p04_body():
    seg = ''.join(f'<span style="flex:1;height:4px;border-radius:2px;background:{INK if i < 6 else ("#8A93A0" if i == 6 else LINE)}"></span>' for i in range(8))
    jij = oordeel_chip("A", 26, 13)
    return f'''
{header(round_btn('back', label='Terug'))}
<div style="position:absolute;left:24px;right:24px;top:100px;display:flex;gap:4px">{seg}</div>
<div style="position:absolute;left:24px;right:24px;top:124px">
  <div style="font-size:15px;color:{SOFT};font-weight:500">Regel 7 van 8 · DAM-2.07</div>
  <div class="serif" style="font-size:30px;line-height:1.2;margin-top:4px">Besloten ruimte en gas</div>
  <button style="margin-top:10px;height:48px;padding:0 14px 0 10px;border-radius:999px;background:{P['mist'][0]};display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:{INK}">{ico('info', 18)}TRA-tekst en historie</button>
</div>
<div style="position:absolute;left:24px;right:24px;top:270px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
  {maatregel_tile('wind', 'Collectief', 'Ventilatie', 'sky')}
  {maatregel_tile('gauge', 'Collectief', '4-gasmeting', 'blush', jij, True)}
  {maatregel_tile('doc', 'Individueel', 'Werkvergunning', 'butter')}
  {maatregel_tile('person', 'Individueel', 'Mangatwacht', 'butter')}
</div>
<div style="position:absolute;left:24px;right:24px;top:530px;display:flex;gap:10px">
  {oordeel_btn('C')}{oordeel_btn('A', True)}{oordeel_btn('V')}
</div>
{direct_gevaar(636)}
<div style="position:absolute;left:0;right:0;top:704px;height:140px">{dock('Volgende')}</div>
'''


def p04():
    return phone('P04 · TRA-toetsing', p04_body())


# ======================= P04 detail (sheet) =======================
def p04_detail():
    sheet = f'''
<div style="position:absolute;inset:0;background:rgba(20,26,34,.38)"></div>
<div role="dialog" aria-label="Maatregel continue 4-gasmeting" style="position:absolute;left:0;right:0;top:160px;bottom:0;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -8px 32px rgba(20,26,34,.16);padding:0 24px">
  <div style="width:40px;height:5px;border-radius:3px;background:#C9CED6;margin:10px auto 0"></div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
    <div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">Collectief · DAM-2.07</div>
    <div class="serif" style="font-size:25px;line-height:1.2;margin-top:2px">Continue 4-gasmeting</div></div>
    {round_btn('close', label='Sluiten')}
  </div>

  <div style="margin-top:18px;background:{P['mist'][0]};border-radius:20px;padding:16px 18px">
    <div style="font-size:13px;color:{SOFT};font-weight:600">Uit de TRA · v1.3</div>
    <div style="font-size:16px;line-height:1.5;margin-top:6px">Collectief: Mechanische ventilatie (indien nodig); <mark style="background:#FFE7A3;color:{INK};border-radius:4px;padding:1px 3px">continue 4-gasmeting</mark>.</div>
    <div style="height:1px;background:{LINE};margin:12px 0"></div>
    <div style="font-size:14px;line-height:1.5;color:{SOFT}">Besloten ruimte; aanwezigheid in het inlaatkanaal/de put zonder adequate ventilatie en gasbewaking; ophoping van toxische of brandbare gassen of zuurstoftekort leidt tot bewusteloosheid, vergiftiging of verstikking.</div>
  </div>

  <div style="margin-top:14px;border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px {LINE}">
    <div style="padding:14px 18px">
      <div style="display:flex;justify-content:space-between;align-items:center">{chip('Jij', P['mist'][0], INK, P['mist'][0], 24, 13, 600)}{oordeel_chip('A', 26, 13)}</div>
      <div style="font-size:16px;line-height:1.45;margin-top:8px">“Gasmeter hangt boven aan de ladder, niet bij de man.”</div>
    </div>
    <div style="padding:14px 18px;background:{P['lilac'][0]};display:flex;gap:12px;align-items:baseline">
      {chip('Voorstel', '#fff', ACCENT, '#fff', 24, 13, 600)}
      <div style="font-size:16px;line-height:1.45">Koppel aan deze maatregel.</div>
    </div>
  </div>

  <a style="margin-top:8px;height:56px;display:flex;align-items:center;gap:12px">
    {icotile('clock', P['mist'][0], 40, 20, 12)}
    <div style="flex:1;font-size:16px">Eerder · 14 sep</div>
    {oordeel_chip('A', 26, 13)}<span style="color:{SOFT}">{ico('chev', 20)}</span>
  </a>

  <div style="position:absolute;left:24px;right:24px;bottom:28px;display:flex;gap:12px">
    <button style="flex:1;height:60px;border-radius:20px;background:{P['mist'][0]};font-size:17px;font-weight:600">Wijzig</button>
    <button style="flex:2;height:60px;border-radius:20px;background:{DARK};color:#fff;font-size:17px;font-weight:600">Klopt, koppelen</button>
  </div>
</div>'''
    return phone('P04 · Maatregel (sheet)', p04_body() + sheet)


# ======================= P07 actie =======================
def prio(label, fg, bg, selected=False):
    ring = f'box-shadow:0 0 0 2px {INK};' if selected else ''
    chk = f'<span style="color:{INK}">{ico("check", 18, 2.2)}</span>' if selected else ''
    return (f'<button aria-pressed="{str(selected).lower()}" style="flex:1;height:52px;border-radius:999px;background:{bg};color:{fg};{ring}'
            f'display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:16px;font-weight:600">{chk}{label}</button>')


def row(icon, tint, label, value, last=False):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    return (f'<a style="display:flex;align-items:center;gap:14px;height:64px;{b}">'
            f'{icotile(icon, tint, 40, 20, 12)}'
            f'<div style="flex:1"><div style="font-size:13px;color:{SOFT};font-weight:500">{label}</div>'
            f'<div style="font-size:16px;font-weight:500;margin-top:2px">{value}</div></div>'
            f'<span style="color:{SOFT}">{ico("chev", 20)}</span></a>')


def p07():
    inner = f'''
{header(round_btn('back', label='Terug'))}
<div style="position:absolute;left:24px;right:24px;top:108px">
  <div style="display:flex;align-items:center;gap:8px">{oordeel_chip('A', 26, 13)}<span style="font-size:14px;color:{SOFT};font-weight:500">G · Gevaarlijke stoffen en hygiëne</span></div>
  <div class="serif" style="font-size:28px;line-height:1.2;margin-top:10px">Nieuwe actie</div>
</div>

<div style="position:absolute;left:24px;right:24px;top:196px;border-radius:22px;overflow:hidden;box-shadow:0 0 0 1px {LINE}">
  <div style="padding:14px 18px;background:#fff;display:flex;gap:12px;align-items:baseline">
    {chip('Jij', P['mist'][0], INK, P['mist'][0], 24, 13, 600)}
    <div style="font-size:16px;line-height:1.45">“Geen handenwasset in de bus.”</div>
  </div>
  <div style="padding:14px 18px;background:{P['lilac'][0]};display:flex;gap:12px;align-items:baseline">
    {chip('Voorstel', '#fff', ACCENT, '#fff', 24, 13, 600)}
    <div style="font-size:16px;line-height:1.45">Montagewagen aanvullen met een handenwasset.</div>
  </div>
</div>

<div style="position:absolute;left:24px;right:24px;top:340px">
  <div style="font-size:15px;color:{SOFT};font-weight:500;margin-bottom:10px">Prioriteit</div>
  <div style="display:flex;gap:10px">{prio('Direct', '#B42318', P['blush'][0])}{prio('Kort', '#8A4B00', '#FFF1DC', True)}{prio('Planmatig', SOFT, P['mist'][0])}</div>
</div>

<div style="position:absolute;left:24px;right:24px;top:452px;padding:0 14px;border-radius:22px;background:#fff;box-shadow:0 0 0 1px {LINE}">
  {row('person', P['sky'][0], 'Actiehouder', 'Coördinator 2 (fictief)')}
  {row('cal', P['butter'][0], 'Termijn', 'Do 19 november', True)}
</div>
{direct_gevaar(636)}
<div style="position:absolute;left:0;right:0;top:704px;height:140px">{dock('Vastleggen', 'check')}</div>
'''
    return phone('P07 · Actie vastleggen', inner)


# ======================= W09 dashboard =======================
def w_tile(label, value, meta, tone, icon, h=164, unit=''):
    bg, tile = P[tone]
    return (f'<a style="display:block;position:relative;height:{h}px;border-radius:24px;background:{bg};padding:22px 24px">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
            f'<div style="font-size:15px;color:{SOFT};font-weight:500">{label}</div>{icotile(icon, tile, 44, 22, 14)}</div>'
            f'<div class="num" style="font-size:40px;font-weight:600;line-height:1;margin-top:2px">{value}<span style="font-size:20px;color:{SOFT};font-weight:500">{unit}</span></div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{meta}</div></a>')


def chart_svg():
    months = ['mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov']
    # A, V, overig (GA+NB+NVT), C  -- van de basislijn omhoog
    data = [(3, 5, 5, 17), (7, 2, 16, 31), (2, 1, 1, 14), (0, 0, 4, 8), (4, 1, 16, 30), (0, 5, 6, 19), (6, 2, 11, 33)]
    cols = ['#C8473D', '#C98A1E', '#B9BFC8', '#2F8A5B']
    W, H, base, top = 640, 250, 222, 24
    scale = (base - top) / 60
    bw, gapx = 44, (W - 40) / 7
    s = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Beoordeelde regels per maand, gestapeld per oordeel">']
    for g in (0, 20, 40, 60):
        y = base - g * scale
        s.append(f'<line x1="32" x2="{W}" y1="{y:.1f}" y2="{y:.1f}" stroke="{LINE}" stroke-width="1"/>')
        s.append(f'<text x="24" y="{y + 4:.1f}" text-anchor="end" font-size="12" fill="{SOFT}" font-family="Inter">{g}</text>')
    for i, (m, d) in enumerate(zip(months, data)):
        x = 40 + i * gapx + (gapx - bw) / 2
        y = base
        segs = [(v, c) for v, c in zip(d, cols) if v]
        for j, (v, c) in enumerate(segs):
            hgt = v * scale
            ytop = y - hgt
            gap = 2 if j < len(segs) - 1 else 0
            if j == len(segs) - 1:  # bovenste segment: afgerond
                s.append(f'<path d="M{x:.1f} {y:.1f} V{ytop + 6:.1f} Q{x:.1f} {ytop:.1f} {x + 6:.1f} {ytop:.1f} H{x + bw - 6:.1f} Q{x + bw:.1f} {ytop:.1f} {x + bw:.1f} {ytop + 6:.1f} V{y:.1f} Z" fill="{c}"/>')
            else:
                s.append(f'<rect x="{x:.1f}" y="{ytop + gap:.1f}" width="{bw}" height="{max(hgt - gap, 1):.1f}" fill="{c}"/>')
            y = ytop
        tot = sum(d)
        s.append(f'<text x="{x + bw / 2:.1f}" y="{y - 8:.1f}" text-anchor="middle" font-size="13" font-weight="600" fill="{INK}" font-family="Inter">{tot}</text>')
        s.append(f'<text x="{x + bw / 2:.1f}" y="{base + 20:.1f}" text-anchor="middle" font-size="13" fill="{SOFT}" font-family="Inter">{m}</text>')
    s.append('</svg>')
    return ''.join(s)


def legend_item(col, txt):
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:{SOFT}">'
            f'<span style="width:10px;height:10px;border-radius:3px;background:{col}"></span>{txt}</span>')


def attention(title, value, meta):
    return (f'<a style="display:block;position:relative;height:132px;border-radius:22px;background:#fff;padding:18px 20px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04)">'
            f'<div style="font-size:15px;font-weight:600;line-height:1.35;padding-right:28px;height:40px">{title}</div>'
            f'<div style="display:flex;align-items:baseline;gap:6px;margin-top:12px"><span class="num" style="font-size:24px;font-weight:600;color:#B42318">{value}</span>'
            f'<span style="font-size:14px;color:{SOFT}">over termijn</span></div>'
            f'<div style="font-size:13px;color:{SOFT};margin-top:4px">{meta}</div>'
            f'<span style="position:absolute;right:16px;top:16px;color:{SOFT}">{ico("chev", 20)}</span></a>')


def nav_item(icon, label, active=False):
    sty = f'background:{P["mist"][0]};font-weight:600;color:{INK}' if active else f'color:{SOFT};font-weight:500'
    return (f'<a style="display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:14px;font-size:15px;{sty}">'
            f'{ico(icon, 20)}{label}</a>')


def w09_body():
    nav = f'''
<aside style="position:absolute;left:0;top:0;bottom:0;width:248px;background:#fff;border-right:1px solid {LINE};padding:24px 16px">
  <div style="display:flex;align-items:center;gap:10px;padding:0 6px;height:44px">
    <span style="width:32px;height:32px;border-radius:10px;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center">{ico('check', 18, 2.2)}</span>
    <span class="serif" style="font-size:16px;white-space:nowrap">Begeleid Inspecteren</span></div>
  <div style="margin-top:28px;display:flex;flex-direction:column;gap:4px">
    {nav_item('home', 'Overzicht')}{nav_item('clip', 'Inspecties')}{nav_item('list', 'Acties')}{nav_item('chart', 'Dashboard', True)}
  </div>
  <div style="margin-top:20px;border-top:1px solid {LINE};padding-top:20px">{nav_item('gear', 'Configuratie')}</div>
  <div style="position:absolute;left:16px;right:16px;bottom:24px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:16px;background:{P['mist'][0]}">
    {icotile('building', '#fff', 36, 18, 10)}
    <div><div style="font-size:14px;font-weight:600">Noardling B.V.</div><div style="font-size:13px;color:{SOFT}">VGM-coördinator</div></div>
  </div>
</aside>'''
    main = f'''
<main style="position:absolute;left:248px;right:0;top:0;bottom:0;padding:0 48px">
  <div style="height:72px;display:flex;align-items:flex-end;justify-content:space-between">
    <div style="font-size:15px;color:{SOFT};font-weight:500">Mei t/m nov 2026 · peildatum 11-11-2026</div>
    <div style="display:flex;gap:8px">{chip('Gepubliceerd v1.3', P['sage'][0], '#1E5B36', P['sage'][0], 30, 13, 600)}{fictief()}</div>
  </div>
  <div class="serif" style="font-size:36px;line-height:1.2;margin-top:6px">Dashboard</div>

  <div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
    {w_tile('Open acties', '17', '6 kort · 11 planmatig', 'sky', 'list')}
    {w_tile('Over termijn', '4', 'Oudste 134 dagen', 'blush', 'clock')}
    {w_tile('Programma', '12', 'Verplichte WPI’s per werkplek', 'butter', 'cal', unit=' van 32')}
    {w_tile('Eigen waarneming', '76', 'Doel 80% · 190 van 249 regels', 'sage', 'check', unit='%')}
  </div>

  <div style="margin-top:20px;display:grid;grid-template-columns:2fr 1fr;gap:20px">
    <a style="display:block;height:330px;border-radius:24px;background:#fff;padding:22px 24px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04);position:relative">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="serif" style="font-size:20px">Oordelen per maand</div>
        <div style="display:flex;gap:16px">{legend_item('#2F8A5B', '[C] Conform')}{legend_item('#B9BFC8', 'Overig')}{legend_item('#C98A1E', '[V] Verbeterpunt')}{legend_item('#C8473D', '[A] Afwijking')}</div>
      </div>
      <div style="margin-top:14px">{chart_svg()}</div>
    </a>
    <div style="display:flex;flex-direction:column;gap:20px">
      {w_tile('Inspecties', '15', '12 coördinator · 3 directie', 'mist', 'clip', 155)}
      {w_tile('Directie per kwartaal', '3', 'Q2, Q3 en Q4 2026 gedaan', 'lilac', 'shield', 155, ' van 3')}
    </div>
  </div>

  <div style="margin-top:28px;display:flex;justify-content:space-between;align-items:baseline">
    <div class="serif" style="font-size:20px">Aandacht nodig</div>
    <a style="font-size:14px;font-weight:600;color:{INK};display:inline-flex;align-items:center;gap:2px;height:44px">Alle acties{ico('chev', 18)}</a>
  </div>
  <div style="margin-top:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
    {attention('Geluid bemoeilijkt communicatie bij hijsen', '134 d', 'WPI-20260505-POM-C2-5')}
    {attention('Geluid bemoeilijkt communicatie bij hijsen', '126 d', 'WPI-20260513-IDV-C1-3')}
    {attention('Geen werkverlichting bij uitloop van het werk', '98 d', 'WPI-20260610-POM-C2-2')}
    {attention('Geen stuurlijn bij begeleiden van de last', '44 d', 'WPI-20260914-DAM-C1-1')}
  </div>
</main>'''
    return nav + main


def web(title, inner):
    return HEAD.format(title=title) + (
        f'<div id="root" style="position:relative;width:1440px;height:900px;overflow:hidden;background:#FAFAF8">{inner}</div></body></html>')


def w09():
    return web('W09 · Dashboard', w09_body())


def panel_row(title, meta, value, last=False):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    return (f'<a style="display:flex;align-items:center;gap:14px;min-height:76px;{b}">'
            f'<div style="flex:1"><div style="font-size:15px;font-weight:600;line-height:1.35">{title}</div>'
            f'<div style="font-size:13px;color:{SOFT};margin-top:4px">{meta}</div></div>'
            f'<span class="num" style="font-size:16px;font-weight:600;color:#B42318;white-space:nowrap">{value}</span>'
            f'<span style="color:{SOFT}">{ico("chev", 20)}</span></a>')


def w09_panel():
    panel = f'''
<div style="position:absolute;inset:0;background:rgba(20,26,34,.28)"></div>
<aside role="dialog" aria-label="Over termijn" style="position:absolute;right:16px;top:16px;bottom:16px;width:460px;background:#fff;border-radius:28px;box-shadow:0 12px 40px rgba(20,26,34,.18);padding:28px 32px">
  <div style="display:flex;align-items:center;gap:14px">
    {icotile('clock', P['blush'][1], 48, 24, 16)}
    <div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">Acties</div><div class="serif" style="font-size:26px;line-height:1.2">Over termijn</div></div>
    {round_btn('close', label='Paneel sluiten')}
  </div>
  <div style="margin-top:24px;display:flex;align-items:baseline;gap:10px"><span class="num" style="font-size:48px;font-weight:600;line-height:1">4</span><span style="font-size:15px;color:{SOFT}">van 17 open acties</span></div>
  <div style="margin-top:20px">
    {panel_row('Geluid bemoeilijkt communicatie bij hijsen', 'Pompen · Hoofd Service &amp; Montage', '134 d')}
    {panel_row('Geluid bemoeilijkt communicatie bij hijsen', 'Indraaivijzel · Hoofd Service &amp; Montage', '126 d')}
    {panel_row('Geen werkverlichting bij uitloop van het werk', 'Pompen · Hoofd Service &amp; Montage', '98 d')}
    {panel_row('Geen stuurlijn bij begeleiden van de last', 'Damwand · Werkvoorbereider', '44 d', True)}
  </div>
  <button style="position:absolute;left:32px;right:32px;bottom:28px;height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Open in Acties</button>
</aside>'''
    return web('W09 · Dashboard met paneel', w09_body() + panel)


files = {
    'P01-start': p01(), 'P04-tra-toetsing': p04(), 'P04-detail': p04_detail(), 'P07-actie': p07(),
    'W09-dashboard': w09(), 'W09-dashboard-paneel': w09_panel(),
}
for k, v in files.items():
    open(f'{OUT}/{k}.html', 'w').write(v)
print('ok', list(files))
