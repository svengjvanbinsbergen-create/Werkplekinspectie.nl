# v2-webschermen resultaten en beheer: W07, W08, W09(+paneel, overgenomen), W09b, W10(+detail), W11(+toetsen),
# W12, W13, W14(+detail), W15, W17. Bouwstenen uit gen.py (ingelezen zonder de bestanden opnieuw weg te schrijven).
import json, os, datetime as dt

_src = open('/home/claude/app/v2/src/gen.py').read()
exec(_src[:_src.index('\nfiles = {')])  # tokens, ico, chip, icotile, w_tile, nav_item, w09_body, web, ...

OUT = '/home/claude/app/v2/screens/web'
os.makedirs(OUT, exist_ok=True)
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
C = json.load(open('/home/claude/app/tools/cijfers.json'))
PEIL = dt.date(2026, 11, 11)
RED = '#B42318'
AMBER = '#8A4B00'
GREEN = '#1E5B36'


def d_nl(s):
    y, m, d = s.split('-')
    return f'{d}-{m}-{y}'


def short(name):
    return name.replace(' (fictief)', '').replace('Hoofd Service & Montage', 'Hoofd S&amp;M')


# ---------------- gedeelde zijbalk en kop (gelijk aan v2-W09) ----------------
CONFIG_SUB = ['Begeleider', 'Kennisbank', 'Rapport', 'Dashboardbouwer', 'Programma',
              'Gebruikers en rollen', 'AI en data', 'Huisstijl', 'Versies en publiceren']


def sub_item(label, active=False):
    sty = f'background:{P["mist"][0]};font-weight:600;color:{INK}' if active else f'color:{SOFT};font-weight:500'
    cur = ' aria-current="page"' if active else ''
    return (f'<a{cur} style="display:flex;align-items:center;height:36px;padding:0 14px 0 46px;border-radius:12px;'
            f'font-size:14px;{sty}">{label}</a>')


def sidebar(active, sub=None, who='VGM-coördinator', org='Noardling B.V.'):
    items = [('home', 'Overzicht'), ('clip', 'Inspecties'), ('list', 'Acties'), ('chart', 'Dashboard')]
    main = ''.join(nav_item(i, l, l == active) for i, l in items)
    if active == 'Configuratie':
        conf = (f'<a style="display:flex;align-items:center;gap:12px;height:44px;padding:0 14px;border-radius:14px;font-size:15px;'
                f'color:{INK};font-weight:600">{ico("gear", 20)}Configuratie<span style="margin-left:auto;transform:rotate(90deg);display:inline-flex">{ico("chev", 16)}</span></a>'
                f'<div style="display:flex;flex-direction:column;gap:2px;margin-top:2px">'
                + ''.join(sub_item(s, s == sub) for s in CONFIG_SUB) + '</div>')
    else:
        conf = nav_item('gear', 'Configuratie')
    return f'''
<aside style="position:absolute;left:0;top:0;bottom:0;width:248px;background:#fff;border-right:1px solid {LINE};padding:24px 16px">
  <div style="display:flex;align-items:center;gap:10px;padding:0 6px;height:44px">
    <span style="width:32px;height:32px;border-radius:10px;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center">{ico('check', 18, 2.2)}</span>
    <span class="serif" style="font-size:16px;white-space:nowrap">Begeleid Inspecteren</span></div>
  <div style="margin-top:28px;display:flex;flex-direction:column;gap:4px">{main}</div>
  <div style="margin-top:20px;border-top:1px solid {LINE};padding-top:20px">{conf}</div>
  <div style="position:absolute;left:16px;right:16px;bottom:24px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:16px;background:{P['mist'][0]}">
    {icotile('building', '#fff', 36, 18, 10)}
    <div><div style="font-size:14px;font-weight:600">{org}</div><div style="font-size:13px;color:{SOFT}">{who}</div></div>
  </div>
</aside>'''


def sidebar_leverancier():
    items = [('building', 'Organisaties', True), ('layers', 'Sjablonen', False), ('chart', 'Verbruik', False)]
    main = ''.join(nav_item(i, l, a) for i, l, a in items)
    return f'''
<aside style="position:absolute;left:0;top:0;bottom:0;width:248px;background:#fff;border-right:1px solid {LINE};padding:24px 16px">
  <div style="display:flex;align-items:center;gap:10px;padding:0 6px;height:44px">
    <span style="width:32px;height:32px;border-radius:10px;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center">{ico('check', 18, 2.2)}</span>
    <span class="serif" style="font-size:16px;white-space:nowrap">Begeleid Inspecteren</span></div>
  <div style="margin:20px 6px 0;font-size:13px;font-weight:600;color:{SOFT}">Leveranciersomgeving</div>
  <div style="margin-top:10px;display:flex;flex-direction:column;gap:4px">{main}</div>
  <div style="position:absolute;left:16px;right:16px;bottom:24px;display:flex;align-items:center;gap:10px;padding:10px;border-radius:16px;background:{P['mist'][0]}">
    {icotile('person', '#fff', 36, 18, 10)}
    <div><div style="font-size:14px;font-weight:600">Leverancier</div><div style="font-size:13px;color:{SOFT}">Alle organisaties</div></div>
  </div>
</aside>'''


def chip_pub():
    return chip('Gepubliceerd v1.3', P['sage'][0], GREEN, P['sage'][0], 30, 13, 600)


def chip_concept():
    return chip('Concept v1.4', P['butter'][0], '#5E4500', P['butter'][0], 30, 13, 600)


def btn(label, primary=False, icon=None, disabled=False):
    i = ico(icon, 18) if icon else ''
    if disabled:
        sty = f'background:{P["mist"][0]};color:{SOFT}'
    elif primary:
        sty = f'background:{DARK};color:#fff'
    else:
        sty = f'background:#fff;color:{INK};box-shadow:0 0 0 1px {LINE}'
    return (f'<button {"disabled " if disabled else ""}style="height:44px;padding:0 18px;border-radius:14px;{sty};font-size:15px;font-weight:600;'
            f'display:inline-flex;align-items:center;gap:8px;white-space:nowrap">{i}{label}</button>')


def info_btn(label='Uitleg'):
    return (f'<button aria-label="{label}" style="width:44px;height:44px;border-radius:50%;background:{P["mist"][0]};'
            f'display:inline-flex;align-items:center;justify-content:center;color:{SOFT};flex:none">{ico("info", 20)}</button>')


def page(code, title, meta, chips, actions, body, side):
    main = f'''
<main style="position:absolute;left:248px;right:0;top:0;bottom:0;padding:0 48px">
  <div style="height:72px;display:flex;align-items:flex-end;justify-content:space-between">
    <div style="font-size:15px;color:{SOFT};font-weight:500">{meta}</div>
    <div style="display:flex;gap:8px">{chips}{fictief()}</div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;height:44px">
    <div class="serif" style="font-size:36px;line-height:1.2;display:flex;align-items:center;gap:12px">{title}</div>
    <div style="display:flex;gap:10px;align-items:center">{actions}</div>
  </div>
  {body}
</main>'''
    return web(code, side + main)


def card(inner, style=''):
    return (f'<div style="background:#fff;border-radius:24px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04);{style}">{inner}</div>')


def card_head(title, meta='', right=''):
    m = f'<div style="font-size:14px;color:{SOFT};margin-top:2px">{meta}</div>' if meta else ''
    return (f'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">'
            f'<div><div class="serif" style="font-size:20px">{title}</div>{m}</div>{right}</div>')


def seg(items, active=0, style=''):
    out = []
    for i, (label, n) in enumerate(items):
        num = f'<span style="color:{SOFT};font-weight:500;margin-left:6px">{n}</span>' if n != '' else ''
        sty = (f'background:#fff;color:{INK};font-weight:600;box-shadow:0 1px 4px rgba(20,26,34,.10)' if i == active
               else f'color:{SOFT};font-weight:500')
        out.append(f'<a style="height:36px;padding:0 16px;border-radius:11px;display:inline-flex;align-items:center;font-size:14px;{sty}">{label}{num}</a>')
    return (f'<div style="display:inline-flex;gap:2px;padding:4px;border-radius:14px;background:{P["mist"][0]};{style}">'
            + ''.join(out) + '</div>')


def toggle(on=True, label=''):
    bg = DARK if on else '#B8BEC7'
    x = 20 if on else 2
    return (f'<span role="switch" aria-checked="{str(on).lower()}" aria-label="{label}" style="position:relative;display:inline-block;width:46px;height:28px;'
            f'border-radius:14px;background:{bg};flex:none"><span style="position:absolute;top:2px;left:{x}px;width:24px;height:24px;border-radius:50%;'
            f'background:#fff;box-shadow:0 1px 3px rgba(20,26,34,.25)"></span></span>')


def lock_chip(text='Vast'):
    lock = ('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>')
    return (f'<span style="display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:999px;'
            f'background:{P["mist"][0]};color:{SOFT};font-size:13px;font-weight:600;white-space:nowrap">{lock}{text}</span>')


def ochip(code, h=26, fs=13, short_=False):
    extra = {'GA': ('Geen afwijking waargenomen', SOFT, '#EEF0F3'), 'NB': ('Niet beoordeeld', SOFT, '#EEF0F3')}
    w, fg, bg = OORDEEL[code] if code in OORDEEL else extra[code]
    txt = f'[{code}]' if short_ else f'[{code}] {w}'
    return (f'<span style="display:inline-flex;align-items:center;height:{h}px;padding:0 9px;border-radius:999px;background:{bg};'
            f'color:{fg};font-size:{fs}px;font-weight:600;white-space:nowrap">{txt}</span>')


def count_chip(code, n):
    w, fg, bg = OORDEEL[code]
    return (f'<span style="display:inline-flex;align-items:center;height:26px;padding:0 9px;border-radius:999px;background:{bg};'
            f'color:{fg};font-size:13px;font-weight:600;white-space:nowrap">[{code}] {n}</span>')


def status_chip(text, tone='mist', fg=None):
    bg = P[tone][0]
    return chip(text, bg, fg or INK, bg, 26, 13, 600)


def prio_chip(p):
    if p == 'direct':
        return chip('Direct', RED, '#fff', RED, 26, 13, 600)
    if p == 'kort':
        return chip('Kort', '#fff', AMBER, '#D9A35A', 26, 13, 600)
    return chip('Planmatig', '#fff', SOFT, '#C9CED6', 26, 13, 600)


def kv_row(label, value, right='', last=False, h=64, chev=True):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    c = f'<span style="color:{SOFT}">{ico("chev", 20)}</span>' if chev else ''
    return (f'<a style="display:flex;align-items:center;gap:14px;min-height:{h}px;{b}">'
            f'<div style="flex:1;min-width:0"><div style="font-size:13px;color:{SOFT};font-weight:500">{label}</div>'
            f'<div style="font-size:15px;font-weight:600;margin-top:3px">{value}</div></div>{right}{c}</a>')


def overlay_panel(inner, width=480, label='Paneel'):
    return (f'<div style="position:absolute;inset:0;background:rgba(20,26,34,.28)"></div>'
            f'<aside role="dialog" aria-label="{label}" style="position:absolute;right:16px;top:16px;bottom:16px;width:{width}px;background:#fff;'
            f'border-radius:28px;box-shadow:0 12px 40px rgba(20,26,34,.18);padding:28px 32px">{inner}</aside>')


def panel_head(icon, tint, kicker, title):
    return (f'<div style="display:flex;align-items:center;gap:14px">{icotile(icon, tint, 48, 24, 16)}'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;color:{SOFT};font-weight:500">{kicker}</div>'
            f'<div class="serif" style="font-size:24px;line-height:1.2">{title}</div></div>{round_btn("close", label="Paneel sluiten")}</div>')


def mini_tile(label, value, meta, tone, h=120, unit=''):
    bg = P[tone][0]
    return (f'<a style="display:block;height:{h}px;border-radius:20px;background:{bg};padding:16px 18px">'
            f'<div style="font-size:14px;color:{SOFT};font-weight:500">{label}</div>'
            f'<div class="num" style="font-size:30px;font-weight:600;line-height:1;margin-top:10px">{value}<span style="font-size:16px;color:{SOFT};font-weight:500">{unit}</span></div>'
            f'<div style="font-size:13px;color:{SOFT};margin-top:10px">{meta}</div></a>')


_dc2 = [x for x in D['wpis'] if x['nr'] == 'WPI-20261105-DAM-C2'][0]
TRA_REV = _dc2['tra_revisie'].split(' (fictief)')[0].replace(',', '')  # 'TRA Damwand rev. 3'
TRA_REV_PM = _dc2['tra_revisie_projectmap'].replace(' (fictief)', '')  # 'rev. 2'

# ======================= W07 rapportontwerper =======================
def w07():
    rows = [
        ('0', 'Voorblad', 'uit Huisstijl', 'on'), ('1', 'Kop', 'project, taak, inspecteur', 'vast'),
        ('2', 'Samenvatting', 'tellingen, acties, paraaf', 'on'), ('3', 'Algemene onderwerpen', 'alleen wat gezien is', 'on'),
        ('4', 'Getoetst tijdens bezoek', 'getoetste regels, met de maatregel die je zag', 'on'), ('5', 'Positieve bevindingen', '[C] met waarneming', 'vast'),
        ('6', 'Bevindingen en acties', 'met vaste tekst VCA 7.1', 'vast'), ('7', 'Gesprek met monteurs', 'wat zij inbrachten', 'on'),
        ('8', 'Foto’s', '2 per rij', 'on'), ('9', 'Gegevenstabel', 'voor dashboard en trend', 'vast'),
    ]
    rh = ''
    for i, (n, name, meta, st) in enumerate(rows):
        sel = n == '4'
        b = '' if i == len(rows) - 1 else f'border-bottom:1px solid {LINE};'
        right = lock_chip() if st == 'vast' else toggle(True, name)
        bg = f'background:{P["mist"][0]};border-radius:14px;' if sel else ''
        rh += (f'<a style="display:flex;align-items:center;gap:14px;height:54px;padding:0 12px;{bg}{"" if sel else b}">'
               f'<span class="num" style="width:28px;height:28px;border-radius:9px;background:{"#fff" if sel else P["mist"][0]};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:{SOFT}">{n}</span>'
               f'<div style="flex:1;display:flex;align-items:baseline;gap:10px;min-width:0"><span style="font-size:15px;font-weight:600;white-space:nowrap">{name}</span>'
               f'<span style="font-size:13px;color:{SOFT};white-space:nowrap">{meta}</span></div>{right}</a>')
    left = card(card_head('Onderdelen', '10 onderdelen · 4 vast', btn('Onderdeel', icon='plus'))
                + f'<div style="margin-top:14px">{rh}</div>', 'padding:22px 20px 14px')

    # voorbeeldpagina
    def prow(ref, name, code, last=False):
        b = '' if last else 'border-bottom:1px solid #E3E6EA;'
        return (f'<div style="display:flex;align-items:center;gap:10px;height:42px;{b}">'
                f'<span style="width:62px;font-size:12px;font-weight:600;color:{SOFT}">{ref}</span>'
                f'<span style="flex:1;font-size:13px">{name}</span>{ochip(code, 22, 12, True)}</div>')
    sheet = f'''
<div style="width:372px;height:510px;margin:18px auto 0;background:#fff;border-radius:6px;box-shadow:0 6px 24px rgba(20,26,34,.12);padding:30px 30px">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span style="width:64px;height:20px;border-radius:4px;background:#E6E8EC"></span>
    <span style="font-size:12px;color:{SOFT}">WPI-20261105-DAM-C2</span></div>
  <div style="font-size:17px;font-weight:700;margin-top:26px;color:#2B5C8A">4. Getoetst tijdens bezoek</div>
  <div style="font-size:12px;color:{SOFT};margin-top:4px">Taak Verwijderen damwand · {TRA_REV}</div>
  <div style="margin-top:16px;border-top:2px solid #2B5C8A">
    {prow('DAM-2.01', 'Vallen van hoogte', 'C')}{prow('DAM-2.03', 'Vallen van de last', 'V')}{prow('DAM-2.04', 'Beknelling en pletten', 'C')}
    {prow('DAM-2.05', 'Begeleiden van de last', 'C')}{prow('DAM-2.06', 'Biologische agentia', 'A', True)}
  </div>
  <div style="display:flex;gap:8px;margin-top:22px">
    <span style="flex:1;height:8px;border-radius:4px;background:#EEF0F3"></span><span style="width:90px;height:8px;border-radius:4px;background:#EEF0F3"></span></div>
  <div style="display:flex;gap:8px;margin-top:8px"><span style="width:180px;height:8px;border-radius:4px;background:#EEF0F3"></span></div>
  <div style="font-size:12px;color:{SOFT};margin-top:30px;text-align:right">pagina 5</div>
</div>'''
    right = (f'<div style="height:100%;border-radius:24px;background:{P["mist"][0]};padding:22px 24px">'
             f'<div style="display:flex;justify-content:space-between;align-items:center">'
             f'<div><div class="serif" style="font-size:20px">Voorbeeld</div><div style="font-size:14px;color:{SOFT};margin-top:2px">WPI-20261105-DAM-C2 · onderdeel 4</div></div>'
             f'{btn("Proefrapport", icon="doc")}</div>{sheet}</div>')
    body = f'''
<div style="margin-top:24px">{seg([('WPI-rapport', ''), ('Directie-overzicht', ''), ('Versie opdrachtgever', '')])}</div>
<div style="position:absolute;left:48px;right:48px;top:214px;bottom:28px;display:grid;grid-template-columns:600px 1fr;gap:24px">
  {left}{right}
</div>'''
    return page('W07 · Rapportontwerper', 'Rapport', 'Configuratie · Rapport', chip_concept(),
                btn('Naar publiceren', True), body, sidebar('Configuratie', 'Rapport'))


# ======================= W08 dashboardbouwer =======================
def w08():
    def t(label, val, tone, sel=False, h=96, span=1):
        ring = f'box-shadow:0 0 0 2px {INK};' if sel else ''
        return (f'<a style="display:block;height:{h}px;border-radius:16px;background:{P[tone][0]};padding:14px 16px;position:relative;{ring}">'
                f'<div style="font-size:13px;color:{SOFT};font-weight:500;padding-right:24px;white-space:nowrap">{label}</div>'
                f'<div class="num" style="font-size:24px;font-weight:600;margin-top:8px">{val}</div>'
                f'<span style="position:absolute;right:12px;top:12px;color:{SOFT}">{ico("grid", 16)}</span></a>')
    om = C['oordeel_maand']
    tots = {m: sum(v.values()) for m, v in om.items()}
    mx = max(tots.values())
    bars = ''
    for m in C['maanden']:
        v = om[m]
        segs = [(v.get('Afwijking', 0), '#C8473D'), (v.get('Verbeterpunt', 0), '#C98A1E'),
                (v.get('Geen afwijking waargenomen', 0) + v.get('Niet beoordeeld', 0) + v.get('Niet van toepassing', 0), '#B9BFC8'),
                (v.get('Conform', 0), '#2F8A5B')]
        inner = ''.join(f'<span style="height:{n / tots[m] * 100:.1f}%;background:{c}"></span>' for n, c in segs if n)
        bars += (f'<span style="flex:1;align-self:flex-end;height:{tots[m] / mx * 100:.0f}%;border-radius:4px 4px 0 0;overflow:hidden;'
                 f'display:flex;flex-direction:column-reverse">{inner}</span>')
    chart = (f'<a style="border-radius:16px;background:#fff;box-shadow:0 0 0 1px {LINE};padding:14px 16px;display:flex;flex-direction:column;position:relative">'
             f'<div style="font-size:13px;color:{SOFT};font-weight:500">Oordelen per maand</div>'
             f'<div style="flex:1;display:flex;gap:10px;padding:14px 8px 0">{bars}</div>'
             f'<span style="position:absolute;right:12px;top:12px;color:{SOFT}">{ico("grid", 16)}</span></a>')
    def ac(title, val, unit):
        return (f'<a style="height:72px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px {LINE};padding:12px 14px">'
                f'<div style="font-size:13px;color:{SOFT};font-weight:500;white-space:nowrap">{title}</div>'
                f'<div style="margin-top:6px"><span class="num" style="font-size:18px;font-weight:600;color:{RED}">{val}</span>'
                f'<span style="font-size:13px;color:{SOFT}"> {unit}</span></div></a>')
    att = (f'<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:{SOFT};font-weight:600">Aandacht nodig</span>'
           f'<span style="color:{SOFT}">{ico("grid", 16)}</span></div>'
           f'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:8px">'
           f'{ac("Verplichte WPI’s", len(C["vp_mis"]), "gemist")}{ac("Geluid bij hijsen", 3, "acties · 134 d")}'
           f'{ac("Werkverlichting", "98 d", "over termijn")}{ac("Last met de hand", "44 d", "over termijn")}</div>')
    canvas = f'''
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px">
  {t('Open acties', str(C['act_open_n']), 'sky', h=110)}{t('Over termijn', str(len(C['act_over'])), 'blush', h=110)}
  {t('Programma', f"{len(C['vp_mis'])} gemist", 'blush', h=110)}{t('Waarnemingen', str(C['waarnemingen']['totaal']), 'sage', True, h=110)}
</div>
<div style="display:grid;grid-template-columns:3fr 1fr;gap:14px;margin-top:14px;height:234px">
  {chart}{t('Inspecties', str(C['n_wpi']), 'mist', h=234)}
</div>
<div style="margin-top:16px">{att}</div>'''
    left = card(card_head('Tegels', 'VGM-trend 2026 · 7 tegels', btn('Tegel', icon='plus')) + canvas, 'padding:22px 24px')

    def side(label, val, meta, tone, icon):
        return (f'<a style="display:block;position:relative;height:164px;border-radius:24px;background:{P[tone][0]};padding:22px 24px">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:15px;color:{SOFT};font-weight:500">{label}</div>'
                f'{icotile(icon, P[tone][1], 44, 22, 14)}</div>'
                f'<div class="num" style="font-size:36px;font-weight:600;line-height:1;margin-top:4px">{val}</div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{meta}</div></a>')
    right = (f'<div style="display:flex;flex-direction:column;gap:20px">'
             f'{side("Doelen", "4", "3 uit VCA 7.1 en 7.2 · 1 eigen", "sage", "check")}'
             f'{side("Ziet dit dashboard", "4 van 7", "rollen · lezer zonder namen", "lilac", "person")}'
             f'{side("Filters", "6", "Periode: dit jaar", "sky", "layers")}</div>')
    body = f'''
<div style="margin-top:24px">{seg([('VGM-trend 2026', ''), ('Programma-bewaking', ''), ('Mijn acties · telefoon', '')])}</div>
<div style="position:absolute;left:48px;right:48px;top:214px;display:grid;grid-template-columns:1fr 330px;gap:24px">
  {left}{right}
</div>'''
    return page('W08 · Dashboardbouwer', 'Dashboardbouwer', 'Configuratie · Dashboardbouwer', chip_concept(),
                btn('Bekijken als directie') + btn('Naar publiceren', True), body, sidebar('Configuratie', 'Dashboardbouwer'))


# ======================= W09b trendanalyse =======================
def w09b():
    tk = C['trend_klasse']
    top = sorted(tk.items(), key=lambda kv: -(kv[1]['A'] + kv[1]['V']))[:5]
    mx = max(v['A'] + v['V'] for k, v in top)
    th_ = C['trend_helften']

    def half(k, ms):
        rr = [r for r in D['regels'] if r['classificatie'] == k and r['oordeel'] != 'Niet van toepassing' and r['datum'][:7] in ms]
        return sum(r['oordeel'] in ('Afwijking', 'Verbeterpunt') for r in rr), len(rr)
    rows = ''
    for i, (k, v) in enumerate(top):
        b = '' if i == len(top) - 1 else f'border-bottom:1px solid {LINE};'
        (n1, d1), (n2, d2) = half(k, th_['H1']), half(k, th_['H2'])
        wa = v['A'] / mx * 100
        wv = v['V'] / mx * 100
        rows += (f'<a style="display:flex;align-items:center;gap:16px;height:68px;{b}">'
                 f'<div style="width:236px;font-size:15px;font-weight:600">{k}</div>'
                 f'<div style="flex:1;display:flex;height:12px;border-radius:6px;background:#F1F2F4;overflow:hidden">'
                 f'<span style="width:{wa:.0f}%;background:#C8473D"></span><span style="width:2px"></span><span style="width:{wv:.0f}%;background:#C98A1E"></span></div>'
                 f'<span class="num" style="width:40px;text-align:right;font-size:17px;font-weight:600">{v["A"] + v["V"]}</span>'
                 f'<span class="num" style="width:150px;text-align:right;font-size:14px;color:{SOFT};white-space:nowrap">{n1} van {d1} → {n2} van {d2}</span>'
                 f'<span style="color:{SOFT}">{ico("chev", 20)}</span></a>')
    link = f'<a style="font-size:14px;font-weight:600;display:inline-flex;align-items:center;height:44px;white-space:nowrap">Alle 14 klassen{ico("chev", 18)}</a>'
    leg = (f'<div style="display:flex;gap:16px;align-items:center;margin-top:10px">{legend_item("#C8473D", "[A] Afwijking")}{legend_item("#C98A1E", "[V] Verbeterpunt")}'
           f'<span style="margin-left:auto;font-size:13px;color:{SOFT}">[A]+[V] van waarnemingen per periode</span></div>')
    left = card(card_head('Per klasse', f"mei–aug ({len(th_['H1'])} mnd, {th_['wpi_H1']} WPI’s) → sep–nov ({len(th_['H2'])} mnd, {th_['wpi_H2']} WPI’s)", link)
                + leg + f'<div style="margin-top:2px">{rows}</div>', 'padding:22px 24px 8px')

    def concl(klasse, who, text, last=False):
        voor = who == 'Voorstel'
        lab = chip('Voorstel', '#fff', ACCENT, '#fff', 24, 13, 600) if voor else chip('Jij', P['mist'][0], INK, P['mist'][0], 24, 13, 600)
        bg = f'background:{P["lilac"][0]};' if voor else f'background:#fff;box-shadow:0 0 0 1px {LINE};'
        return (f'<a style="display:block;border-radius:18px;padding:14px 16px;{bg}">'
                f'<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:14px;font-weight:600">{klasse}</span>{lab}</div>'
                f'<div style="font-size:14px;line-height:1.45;margin-top:6px">{text}</div></a>')
    right = card(card_head('Conclusies', '2 van jou · 3 voorstellen') + f'''
<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
  {concl('Hijsen', 'Jij', 'Stuurlijn en afzetting keren terug.')}
  {concl('Gevaarlijke stoffen en hygiëne', 'Jij', 'Handenwas ontbreekt in de wagens.')}
  {concl('Besloten ruimte en gas', 'Voorstel', 'Afwijkingen nemen toe · weinig waarnemingen (7)')}
</div>
<a style="display:flex;align-items:center;justify-content:space-between;height:48px;margin-top:6px;font-size:14px;font-weight:600">Nog 2 voorstellen{ico('chev', 18)}</a>''',
                 'padding:22px 24px 10px')
    def kt(label, value, meta, tone, icon, unit=''):
        bg, tile = P[tone]
        return (f'<a style="display:block;position:relative;height:164px;border-radius:24px;background:{bg};padding:22px 24px">'
                f'<span style="position:absolute;right:20px;top:20px">{icotile(icon, tile, 40, 20, 13)}</span>'
                f'<div style="font-size:15px;color:{SOFT};font-weight:500;padding-right:52px;height:40px;line-height:1.3">{label}</div>'
                f'<div class="num" style="font-size:40px;font-weight:600;line-height:1;margin-top:8px">{value}<span style="font-size:20px;color:{SOFT};font-weight:500">{unit}</span></div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{meta}</div></a>')
    tiles = f'''
<div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
  {kt('Positief', str(C['positief']), '[C] Conform met waarneming', 'sage', 'check')}
  {kt('Afwijkingen en verbeterpunten', str(C['n_neg']), f"{C['oordeel']['Afwijking']} [A] · {C['oordeel']['Verbeterpunt']} [V]", 'blush', 'alert')}
  {kt('Trendacties', '5', '4 besloten · 1 voorstel', 'sky', 'list')}
  {kt('Follow-up', str(C['n_af']), f"afgerond · {C['optijd']} binnen termijn", 'mist', 'clock', f" van {C['n_acties']}")}
</div>'''
    body = tiles + f'''
<div style="position:absolute;left:48px;right:48px;top:336px;display:grid;grid-template-columns:1fr 400px;gap:20px">
  {left}{right}
</div>'''
    return page('W09b · Trendanalyse', f'Trendanalyse 2026 {info_btn("Eis VCA 7.2")}',
                'Dashboard · mei t/m nov 2026 · vaststellen in december',
                chip_pub(),
                btn('Auditdossier VCA 7.1/7.2', icon='doc') + btn('Ter vaststelling aanbieden', True), body, sidebar('Dashboard'))


# ======================= W10 inspecties =======================
COLS10 = '104px minmax(0,1fr) 96px 150px 110px 20px'
SHOWN10 = 8


def getoetst(nr, kort=False):
    st = C['stappen_per_wpi'][nr]
    out = []
    taken = list(dict.fromkeys(x['taak'] for x in st))
    for taak in taken:
        k = sum(1 for x in st if x['taak'] == taak and x['taakstap'])
        naam = taak.split(' (')[0] if kort else taak
        out.append(naam + (f' · {k} stap' + ('pen' if k > 1 else '') if k else ''))
    if kort and len(out) > 1:
        return out[0] + f' + {len(out) - 1} taak'
    return ' + '.join(out)
FASE = {'Veiligstellen Lototo': 'LOTOTO'}
SHOWN = 10


def wpi_rows():
    out = []
    for w in sorted(D['wpis'], key=lambda w: w['datum'], reverse=True):
        pw = C['per_wpi'][w['nr']]
        acts = [a for a in D['acties'] if a['wpi'] == w['nr']]
        out.append(dict(w=w, n=pw['n'], A=pw['oord'].get('Afwijking', 0), V=pw['oord'].get('Verbeterpunt', 0),
                        acts=len(acts), open=sum(a['status'] == 'Open' for a in acts)))
    return out


def more_row(shown, total, what):
    return (f'<a style="display:flex;align-items:center;justify-content:space-between;height:52px;padding:0 20px;font-size:14px">'
            f'<span style="color:{SOFT}">1–{shown} van {total} {what}</span>'
            f'<span style="font-weight:600;display:inline-flex;align-items:center;gap:2px">Toon meer{ico("chev", 18)}</span></a>')


def search_box(text):
    return (f'<div style="height:44px;width:300px;border-radius:14px;background:#fff;box-shadow:0 0 0 1px {LINE};display:flex;align-items:center;gap:10px;padding:0 14px;color:{SOFT};font-size:14px">'
            f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>'
            f'{text}</div>')


def w10_body(selected=None):
    rows = wpi_rows()
    head = (f'<div style="display:grid;grid-template-columns:{COLS10};gap:16px;align-items:center;height:40px;'
            f'padding:0 20px;font-size:13px;color:{SOFT};font-weight:600;border-bottom:1px solid {LINE}">'
            f'<span>Datum</span><span>Inspectie</span><span>Project</span><span>Bevindingen</span><span>Open acties</span><span></span></div>')
    body = ''
    for r in rows[:SHOWN10]:
        w = r['w']
        sel = w['nr'] == selected
        bg = f'background:{P["sky"][0]};' if sel else ''
        f = ''.join([count_chip('A', r['A']) if r['A'] else '', count_chip('V', r['V']) if r['V'] else ''])
        f = f or f'<span style="font-size:14px;color:{SOFT}">geen</span>'
        op = (f'<span class="num" style="font-size:14px;font-weight:600">{r["open"]}<span style="color:{SOFT};font-weight:500"> van {r["acts"]}</span></span>'
              if r['acts'] else f'<span style="font-size:14px;color:{SOFT}">–</span>')
        sp = (' ' + chip('Spontaan', P['lilac'][0], '#3F2C99', P['lilac'][0], 22, 12, 600)) if w['ingang'] == 'spontaan' else ''
        body += (f'<a style="display:grid;grid-template-columns:{COLS10};gap:16px;align-items:center;height:70px;'
                 f'padding:0 20px;border-bottom:1px solid {LINE};{bg}">'
                 f'<span class="num" style="font-size:14px;color:{SOFT};white-space:nowrap">{d_nl(w["datum"])}</span>'
                 f'<div style="min-width:0"><div style="font-size:15px;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:8px">{w["product"]} · {FASE.get(w["fase"], w["fase"].lower())}{sp}</div>'
                 f'<div style="font-size:13px;margin-top:2px;white-space:nowrap">Getoetst: {getoetst(w["nr"], True)}</div>'
                 f'<div style="font-size:13px;color:{SOFT};margin-top:1px;white-space:nowrap">{w["locatie"]} · {short(w["inspecteur"])}</div></div>'
                 f'<span class="num" style="font-size:14px;color:{SOFT}">{short(w["project"])}</span>'
                 f'<span style="display:flex;gap:4px">{f}</span>{op}'
                 f'<span style="color:{SOFT}">{ico("chev", 18)}</span></a>')
    n_open_w = sum(1 for r in rows if r['open'])
    sc = C['soort_wpi']
    return f"""
<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center">
  {seg([('Alle', C['n_wpi']), ('Coördinator', sc['WPI coördinator']), ('Directie', sc['VGM-inspectie directie']), ('Spontaan', C['ingang']['spontaan']), ('Met open acties', n_open_w)])}{search_box('Zoek nummer, project of locatie')}
</div>
<div style="position:absolute;left:48px;right:48px;top:210px">{card(head + body + more_row(SHOWN10, len(rows), 'inspecties'), 'overflow:hidden')}</div>"""


def w10(selected=None, extra=''):
    return page('W10 · Inspecties' + (' met detail' if extra else ''), 'Inspecties', f'{C["n_wpi"]} inspecties · mei t/m nov 2026',
                chip_pub(), btn('Exporteren'), w10_body(selected) + extra, sidebar('Inspecties'))


def klasse_chip(k):
    return chip(k, P['mist'][0], SOFT, P['mist'][0], 24, 12, 500)


def w10_detail():
    nr = 'WPI-20261105-DAM-C2'
    w = [x for x in D['wpis'] if x['nr'] == nr][0]
    pw = C['per_wpi'][nr]
    acts = [a for a in D['acties'] if a['wpi'] == nr]
    regs = [r for r in D['regels'] if r['wpi'] == nr and r['oordeel'] in ('Afwijking', 'Verbeterpunt')]
    code = {'Afwijking': 'A', 'Verbeterpunt': 'V'}
    risico = {'DAM-2.03': 'Vallen van de last', 'DAM-2.06': 'Biologische agentia', 'DAM-2.07': 'Besloten ruimte'}
    rr = ''
    for i, r in enumerate(regs):
        an = [a['actie'].rsplit('-', 1)[1] for a in acts if a['ref'] == r['ref']]
        b = '' if i == len(regs) - 1 else f'border-bottom:1px solid {LINE};'
        name = risico.get(r['ref'], r['omschrijving'])
        rr += (f'<a style="display:flex;align-items:center;gap:16px;min-height:66px;padding:6px 0;{b}">'
               f'<span style="width:70px;font-size:13px;font-weight:600;color:{SOFT}">{r["ref"]}</span>'
               f'<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:500;line-height:1.3">{name}</div>'
               f'<div style="margin-top:4px">{klasse_chip(r["classificatie"])}</div></div>'
               f'{ochip(code[r["oordeel"]], 26, 13, True)}'
               f'<span style="width:70px;text-align:right;font-size:13px;color:{SOFT}">actie {" · ".join(an)}</span>'
               f'<span style="color:{SOFT}">{ico("chev", 18)}</span></a>')
    o = pw['oord']
    inner = f"""
{panel_head('clip', P['sky'][1], f"{d_nl(w['datum'])} · {short(w['inspecteur'])}", f"{w['product']} · {w['fase'].lower()}")}
<div style="font-size:14px;color:{SOFT};margin-top:10px">{nr} · {short(w['project'])} · {w['locatie']} · {w['ingang']}</div>
<div style="font-size:15px;margin-top:6px"><span style="color:{SOFT}">Getoetst:</span> <b style="font-weight:600">{getoetst(nr)}</b></div>
<a style="display:flex;align-items:center;gap:10px;margin-top:12px;height:44px;padding:0 14px;border-radius:14px;background:{P['butter'][0]};font-size:14px">
  {ico('doc', 18)}<span>Getoetst tegen <b style="font-weight:600">{TRA_REV}</b> · projectmap {TRA_REV_PM}</span><span style="margin-left:auto;font-weight:600">→ actie 1</span></a>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px">
  {mini_tile('Gezien', str(pw['n']), f"{o.get('Conform', 0)} [C] Conform", 'sage', 108)}
  {mini_tile('Bevindingen', str(o.get('Afwijking', 0) + o.get('Verbeterpunt', 0)), f"{o.get('Afwijking', 0)} [A] · {o.get('Verbeterpunt', 0)} [V]", 'blush', 108)}
  {mini_tile('Acties', str(len(acts)), f"{sum(a['status'] == 'Open' for a in acts)} open", 'sky', 108)}
</div>
<div style="margin-top:18px">{seg([('Bevindingen', ''), ('Rapport', ''), ('Foto’s', ''), ('Audittrail', '')])}</div>
<div style="margin-top:4px">{rr}</div>
<div style="position:absolute;left:32px;right:32px;bottom:28px;display:flex;gap:12px">
  <button style="flex:1;height:56px;border-radius:18px;background:{P['mist'][0]};font-size:16px;font-weight:600">Delen</button>
  <button style="flex:2;height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Rapport openen</button>
</div>"""
    return w10(nr, overlay_panel(inner, 560, 'Inspectie ' + nr))


# ======================= W11 acties =======================
HSM = 'Hoofd Service & Montage'
TITEL = {
    'WPI-20260914-DAM-C1-1': 'Last met de hand begeleid',
    'WPI-20261105-DAM-C2-1': 'TRA in projectmap ouder dan in QMS',
    'WPI-20261105-DAM-C2-2': 'Geen handenwasgelegenheid bij de werkplek',
    'WPI-20261105-DAM-C2-3': 'Werkplek niet vooraf gereinigd',
    'WPI-20261105-DAM-C2-7': 'Drinken in de werkzone',
    'WPI-20261105-DAM-C2-8': 'Verouderde TRA in projectmap op locatie',
    'WPI-20261002-POM-C1-1': 'Materiaal en gereedschap in de looproute',
    'WPI-20261103-ROO-C1-1': 'Geen handenwasgelegenheid bij de werkplek',
    'WPI-20261105-DAM-C2-5': 'Gasmeter blijft boven hangen bij afdalen',
    'WPI-20261105-DAM-C2-6': 'Hijsen niet als aparte stap op de LMRA',
    'WPI-20261105-DAM-C2-9': 'Handenwasset ontbreekt in montagewagen',
}


def w11_list():
    acts = [a for a in D['acties'] if a['status'] == 'Open' and a['toetser'] == HSM]
    acts.sort(key=lambda a: a['termijn'])
    return acts


def termijn_cell(a):
    dd = (dt.date.fromisoformat(a['termijn']) - PEIL).days
    dat = d_nl(a['termijn'])
    if dd < 0:
        return f'<span style="font-size:14px;color:{RED};font-weight:600;white-space:nowrap">{dat} · {-dd} d over</span>'
    return f'<span class="num" style="font-size:14px;white-space:nowrap">{dat}</span>'


def checkbox(label):
    return (f'<span role="checkbox" aria-checked="false" aria-label="{label}" style="width:22px;height:22px;border-radius:7px;'
            f'box-shadow:inset 0 0 0 1.5px #8A93A0;background:#fff;display:inline-block"></span>')


def w11_body(selected=None):
    acts = w11_list()
    cols = '22px 40px minmax(0,1fr) 190px 190px 20px'
    head = (f'<div style="display:grid;grid-template-columns:{cols};gap:16px;align-items:center;height:44px;padding:0 20px;font-size:13px;'
            f'color:{SOFT};font-weight:600;border-bottom:1px solid {LINE}">{checkbox("Alles selecteren")}<span></span><span>Bevinding</span>'
            f'<span>Actiehouder</span><span>Termijn</span><span></span></div>')
    code = {'Afwijking': 'A', 'Verbeterpunt': 'V'}
    rows = ''
    for a in acts[:SHOWN]:
        sel = a['actie'] == selected
        bg = f'background:{P["sky"][0]};' if sel else ''
        rows += (f'<a style="display:grid;grid-template-columns:{cols};gap:16px;align-items:center;height:56px;padding:0 20px;border-bottom:1px solid {LINE};{bg}">'
                 f'{checkbox("Selecteer " + a["actie"])}{ochip(code[a["oordeel"]], 26, 13, True)}'
                 f'<span style="font-size:15px;font-weight:600;white-space:nowrap">{TITEL[a["actie"]]}</span>'
                 f'<span style="font-size:14px">{short(a["actiehouder"])}</span>'
                 f'{termijn_cell(a)}<span style="color:{SOFT}">{ico("chev", 18)}</span></a>')
    return f"""
<div style="margin-top:24px;display:flex;justify-content:space-between;align-items:center">
  {seg([('Ik toets', C['act_toetser_open_hsm']), ('Ik ben actiehouder', C['act_houder_open_hsm']), ('Alle open', C['act_open_n']), ('Afgerond', C['n_af'])])}
  <div style="display:flex;gap:10px">{btn('Selectie bijwerken', disabled=True)}{btn('Filters', icon='layers')}</div>
</div>
<div style="position:absolute;left:48px;right:48px;top:210px">{card(head + rows + more_row(min(SHOWN, len(acts)), len(acts), 'acties'), 'overflow:hidden')}</div>"""


def w11(selected=None, extra=''):
    return page('W11 · Acties' + (' toetsen' if extra else ''), 'Acties',
                f'Peildatum 11-11-2026 · {C["act_open_n"]} open · {len(C["act_over"])} over termijn', chip_pub(),
                btn('Lijst maandagoverleg') + btn('Actie toevoegen', True, 'plus'), w11_body(selected) + extra,
                sidebar('Acties', who='Hoofd S&amp;M'))


def w11_toetsen():
    a = [x for x in D['acties'] if x['actie'] == 'WPI-20260914-DAM-C1-1'][0]
    dd = (PEIL - dt.date.fromisoformat(a['termijn'])).days

    def step(n, label, state):
        if state == 'now':
            dot = f'background:{DARK};color:#fff'
        else:
            dot = f'background:#fff;color:{SOFT};box-shadow:inset 0 0 0 1.5px #B8BEC7'
        return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px;width:120px">'
                f'<span class="num" style="width:30px;height:30px;border-radius:50%;{dot};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600">{n}</span>'
                f'<span style="font-size:13px;font-weight:{600 if state == "now" else 500};color:{INK if state == "now" else SOFT};text-align:center">{label}</span></div>')
    line = f'<span style="flex:1;height:2px;background:{LINE};margin-top:14px"></span>'
    inner = f"""
{panel_head('list', P['blush'][1], a['actie'], 'Last met de hand begeleid')}
<div style="display:flex;gap:8px;align-items:center;margin-top:16px;flex-wrap:wrap">{ochip('V', 26, 13)}{prio_chip('kort')}{klasse_chip('Hijsen · DAM-2.04')}</div>
<div style="font-size:16px;line-height:1.45;margin-top:14px">{a['bevinding']}</div>
<div style="margin-top:14px;padding:0 16px;border-radius:20px;box-shadow:0 0 0 1px {LINE}">
  {kv_row('Verbeteractie', 'Kettingtakel standaard in de montagewagen', '', False, 62)}
  {kv_row('Actiehouder', short(a['actiehouder']), '', False, 62)}
  {kv_row('Toetser', 'Jij · Hoofd S&amp;M', lock_chip('niet de actiehouder'), False, 62, False)}
  {kv_row('Termijn', d_nl(a['termijn']), f'<span style="font-size:14px;font-weight:600;color:{RED}">{dd} d over</span>', True, 62)}
</div>
<div style="display:flex;align-items:flex-start;margin-top:22px;padding:0 4px">
  {step(1, 'Open', 'now')}{line}{step(2, 'Uitgevoerd gemeld', 'todo')}{line}{step(3, 'Afgerond na toetsing', 'todo')}
</div>
<div style="position:absolute;left:32px;right:32px;bottom:28px">
  <div style="font-size:13px;color:{SOFT};text-align:center;margin-bottom:10px">Toetsen kan zodra de actiehouder klaar meldt</div>
  <div style="display:flex;gap:12px">
    <button disabled style="flex:1;height:56px;border-radius:18px;background:{P['mist'][0]};color:{SOFT};font-size:16px;font-weight:600">Toetsen</button>
    <button style="flex:1.4;height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Herinnering sturen</button>
  </div>
</div>"""
    return w11(a['actie'], overlay_panel(inner, 480, 'Actie ' + a['actie']))


# ======================= W12 programma =======================
SPONT = {w['nr']: w['ingang'] == 'spontaan' for w in D['wpis']}


def w12():
    mt = C['maand_nu_telling']
    vc = C['vp_cat']
    stt = {'gedaan': ('sage', GREEN), 'nog te doen': ('butter', '#5E4500'), 'gemist': ('blush', RED)}
    rows = ''
    mn = C['maand_nu']
    for i, p in enumerate(mn):
        b = '' if i == len(mn) - 1 else f'border-bottom:1px solid {LINE};'
        tone, fg = stt[p['status']]
        if p['status'] == 'gedaan':
            st = f'gedaan {p["datum"][8:10]}-{p["datum"][5:7]}'
            if SPONT.get(p.get('wpi')):
                st += ' · spontaan'
            right = f'<span style="width:150px;font-size:14px">{short(p["inspecteur"])}</span>'
        elif p['status'] == 'gemist':
            st = 'gemist'
            right = f'<span style="width:150px;font-size:14px;color:{SOFT}">klaar {d_nl(p["eind"])[:5]}</span>'
        else:
            st = 'te doen · uiterlijk 30-11'
            right = f'<span style="width:150px">{btn("Kies inspecteur")}</span>'
        regel = 'elke maand' if p['cat'] == 'lang' else 'minstens 1'
        rows += (f'<a style="display:flex;align-items:center;gap:16px;height:64px;{b}">'
                 f'<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600">{short(p["project"])} · {p["product"]}</div>'
                 f'<div style="font-size:13px;color:{SOFT};margin-top:3px">{p["locatie"]} · {regel}</div></div>'
                 f'<span style="width:190px">{status_chip(st, tone, fg)}</span>{right}</a>')
    left = card(card_head('November', f"{mt['gedaan']} gedaan · {mt.get('nog te doen', 0)} te doen · {mt.get('gemist', 0)} gemist",
                          f'<a style="font-size:14px;font-weight:600;display:inline-flex;align-items:center;height:44px">Alle maanden{ico("chev", 18)}</a>')
                + f'<div style="margin-top:8px">{rows}</div>'
                + f'<div style="display:flex;align-items:center;gap:10px;height:44px;border-top:1px solid {LINE};font-size:13px;color:{SOFT}">'
                  f'{status_chip("spontaan", "sage", GREEN)}Spontane WPI telt mee als werkplek en maand verplicht zijn</div>', 'padding:22px 24px 8px')
    rules = [('Lang project · langer dan 1 maand', 'Elke maand met ≥ 10 werkdagen 1 WPI'), ('Kort project met risicokenmerk', 'Minstens 1 WPI'),
             ('Overig kort project', '1 op 4 per kwartaal'), ('Directie', '1× per kwartaal')]
    rr = ''.join(kv_row(l, v, '', i == len(rules) - 1, 66) for i, (l, v) in enumerate(rules))
    right = card(card_head('Regels', 'in concept v1.4', info_btn('Bron per regel')) + f'<div style="margin-top:8px">{rr}</div>',
                 'padding:22px 24px 8px')
    tiles = f'''
<div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
  {w_tile('Verplichte WPI’s', str(len(C['vp_mis'])), f"{C['vp_x']} van {C['vp_y']} gedaan · lang {vc['lang'][0]}/{vc['lang'][1]}", 'blush', 'cal', 164, ' gemist')}
  {w_tile('Deze maand', str(mt['gedaan']), f"{mt.get('nog te doen', 0)} te doen · {mt.get('gemist', 0)} gemist", 'sky', 'clip', 164, f" van {sum(mt.values())}")}
  {w_tile('Directie', str(C['dir_kw_ok']), 'Q2, Q3 en Q4 2026', 'lilac', 'shield', 164, f" van {len(C['kwartalen'])}")}
  {w_tile('December', str(len(C['volgende_maand_proj'])), 'verplicht · lange projecten', 'mist', 'clock', 164)}
</div>'''
    body = tiles + f'''
<div style="position:absolute;left:48px;right:48px;top:336px;display:grid;grid-template-columns:1fr 380px;gap:20px">
  {left}{right}
</div>'''
    return page('W12 · Programma', 'Programma', 'Configuratie · Programma · peildatum 11-11-2026', chip_concept(),
                btn('Planning delen') + btn('Naar publiceren', True), body, sidebar('Configuratie', 'Programma'))


# ======================= W13 gebruikers en rollen =======================
def w13():
    users = [
        ('VC', 'VGM-coördinator', 'VGM-coördinator', ['Beheerder', 'Coördinator'], 'Hele organisatie', ''),
        ('QM', 'QHSE-manager', 'QHSE-manager', ['Coördinator'], 'Hele organisatie', ''),
        ('HS', 'Hoofd Service &amp; Montage', 'Hoofd Service &amp; Montage', ['Coördinator'], 'S&amp;M NL', ''),
        ('C1', 'Coördinator 1', 'Montagecoördinator', ['Coördinator', 'Inspecteur'], 'S&amp;M NL', ''),
        ('C2', 'Coördinator 2', 'Montagecoördinator', ['Coördinator', 'Inspecteur'], 'S&amp;M NL', ''),
        ('DL', 'Directielid', 'Operationeel directeur', ['Directie', 'Inspecteur'], 'Hele organisatie', ''),
        ('WV', 'Werkvoorbereider', 'Werkvoorbereider', ['Medewerker'], 'S&amp;M NL', ''),
        ('MV', 'Monteur, voorman', 'Monteur', ['Medewerker'], 'Op locatie', ''),
        ('OG', 'Contact waterschap', 'Extern, opdrachtgever', ['Lezer'], 'Eigen projecten', ''),
        ('CD', 'Coördinator Duitsland', 'Montagecoördinator', ['Coördinator'], 'S&amp;M DE', 'uitgenodigd'),
    ]
    rows = ''
    users = users[:6]
    for i, (ini, name, fn, roles, grp, st) in enumerate(users):
        b = f'border-bottom:1px solid {LINE};'
        rc = ''.join(chip(r, P['mist'][0], INK, P['mist'][0], 26, 13, 500) for r in roles)
        stc = status_chip('Uitgenodigd', 'butter', '#5E4500') if st else ''
        rows += (f'<a style="display:grid;grid-template-columns:36px 200px 210px minmax(0,1fr) 18px;gap:12px;align-items:center;height:56px;{b}">'
                 f'<span style="width:36px;height:36px;border-radius:50%;background:{P["sky"][0]};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600">{ini}</span>'
                 f'<div><div style="font-size:15px;font-weight:600;white-space:nowrap">{name}</div>'
                 f'<div style="font-size:13px;color:{SOFT};margin-top:2px;white-space:nowrap">{fn}</div></div>'
                 f'<div style="display:flex;gap:6px">{rc}{stc}</div>'
                 f'<span style="font-size:14px;color:{SOFT};white-space:nowrap">{grp}</span>'
                 f'<span style="color:{SOFT}">{ico("chev", 18)}</span></a>')
    rows += (f'<a style="display:flex;align-items:center;justify-content:space-between;height:52px;font-size:14px">'
             f'<span style="color:{SOFT}">6 van 10 gebruikers</span><span style="font-weight:600;display:inline-flex;align-items:center;gap:2px">Alle 10{ico("chev", 18)}</span></a>')
    left = card(rows, 'padding:6px 24px')
    rules = [
        ('Toetser en actiehouder', 'Nooit dezelfde persoon', lock_chip()),
        ('Nooit actiehouder', 'QHSE-manager', ''),
        ('Standaardtoetser', 'Hoofd S&amp;M', ''),
        ('Als standaardtoetser zelf houder is', 'Inspecteur toetst', ''),
        ('Ter plaatse uitgevoerd', 'Inspecteur toetst ter plaatse', ''),
        ('Trendactie met houder Hoofd S&amp;M', 'Directie toetst', ''),
    ]
    rr = ''.join(kv_row(l, v, r, i == len(rules) - 1, 62, not r) for i, (l, v, r) in enumerate(rules))
    right = card(card_head('Regels voor acties', '6 regels', btn('Regel', icon='plus')) + f'<div style="margin-top:6px">{rr}</div>',
                 'padding:22px 24px 6px')
    login = (f'<a style="display:flex;align-items:center;gap:14px;height:88px;border-radius:24px;background:{P["sage"][0]};padding:0 22px;margin-top:20px">'
             f'{icotile("shield", P["sage"][1], 44, 22, 14)}<div style="flex:1"><div style="font-size:15px;font-weight:600">Microsoft Entra ID · MFA</div>'
             f'<div style="font-size:14px;color:{SOFT};margin-top:2px">Externe lezers via e-mailcode</div></div><span style="color:{SOFT}">{ico("chev", 20)}</span></a>')
    body = f'''
<div style="margin-top:24px">{seg([('Gebruikers', 10), ('Rollen en rechten', 7), ('Groepen', 4)])}</div>
<div style="position:absolute;left:48px;right:48px;top:214px;display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:20px;align-items:start">
  {left}<div>{right}{login}</div>
</div>'''
    return page('W13 · Gebruikers en rollen', 'Gebruikers en rollen', 'Configuratie · Gebruikers en rollen', chip_concept(),
                btn('Gebruiker uitnodigen', True, 'plus'), body, sidebar('Configuratie', 'Gebruikers en rollen'))


# ======================= W14 AI en data =======================
def provider_card(name, status, tone, fg, facts, icon, active=False):
    ring = f'box-shadow:0 0 0 2px {INK};' if active else f'box-shadow:0 0 0 1px {LINE};'
    fx = ''.join(f'<div style="display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-top:8px"><span style="color:{SOFT}">{k}</span>'
                 f'<span style="font-weight:600;text-align:right">{v}</span></div>' for k, v in facts)
    act = ''
    return (f'<a style="display:block;position:relative;height:208px;border-radius:24px;background:#fff;{ring}padding:20px 22px">'
            f'{act}{icotile(icon, P["mist"][0], 40, 20, 13)}'
            f'<div style="font-size:16px;font-weight:600;margin-top:14px;white-space:nowrap">{name}</div>'
            f'<div style="margin-top:8px">{status_chip(status, tone, fg)}</div>'
            f'<div style="margin-top:6px">{fx}</div></a>')


def w14_body():
    provs = f'''
<div style="margin-top:28px;display:flex;justify-content:space-between;align-items:center"><div class="serif" style="font-size:20px">Aanbieder</div></div>
<div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
  {provider_card('Claude via Anthropic', 'Actief', 'sage', GREEN, [('Opslag', 'VS'), ('Proefgesprekken', 'geslaagd')], 'cloud', True)}
  {provider_card('Claude via EU-cloudregio', 'Niet getest', 'mist', SOFT, [('Opslag', 'EU-regio'), ('Contract', 'eigen cloud')], 'cloud')}
  {provider_card('DeepSeek via OpenRouter', 'Niet getest', 'mist', SOFT, [('Opslag', 'vastgezette host'), ('Partijen', 'twee')], 'cloud')}
  {provider_card('Open model, EU-gehost', 'Niet getest', 'mist', SOFT, [('Opslag', 'EER'), ('Doorgifte', 'geen')], 'cloud')}
</div>'''
    funcs = [('mic', 'Spraak naar tekst', 'Op toestel'), ('check', 'Begeleider', 'Claude via Anthropic'),
             ('doc', 'RI&amp;E en TRA omzetten', 'Claude via Anthropic'), ('camera', 'Foto’s beschrijven', 'Uit')]
    fc = ''.join(f'<a style="flex:1;display:flex;align-items:center;gap:12px;padding:0 18px;{"" if i == 0 else f"border-left:1px solid {LINE};"}">'
                 f'{icotile(ic, P["mist"][0], 36, 18, 11)}<div><div style="font-size:13px;color:{SOFT};font-weight:500">{l}</div>'
                 f'<div style="font-size:15px;font-weight:600;margin-top:2px">{v}</div></div></a>' for i, (ic, l, v) in enumerate(funcs))
    fr = ' · '.join(f'{l} <b style="font-weight:600">{v}</b>' for ic, l, v in funcs)
    func = card(f'<a style="display:flex;align-items:center;gap:14px;height:64px;padding:0 22px;font-size:14px;color:{SOFT}">'
                f'<span style="font-size:15px;font-weight:600;color:{INK}">Per functie</span><span style="flex:1;color:{INK}">{fr}</span>'
                f'<span style="color:{SOFT}">{ico("chev", 20)}</span></a>', 'margin-top:24px')

    def t(label, val, meta, tone, icon, fs=30):
        return (f'<a style="display:block;height:164px;border-radius:24px;background:{P[tone][0]};padding:22px 24px">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:15px;color:{SOFT};font-weight:500">{label}</div>'
                f'{icotile(icon, P[tone][1], 40, 20, 13)}</div>'
                f'<div class="num" style="font-size:{fs}px;font-weight:600;line-height:1.1;margin-top:2px">{val}</div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:10px">{meta}</div></a>')
    priv = f'''
<div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px"><div class="serif" style="font-size:20px">Privacy en bewaren</div>
<div style="display:flex;align-items:center;gap:12px;font-size:14px;font-weight:500">AI pas actief na afgeronde DPIA{toggle(True, 'AI pas actief na afgeronde DPIA')}</div></div>
<div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
  {t('DPIA', '7 van 7', 'Afgerond 28-04-2026 (fictief)', 'sage', 'shield')}
  {t('Grondslag', 'Gerechtvaardigd belang', 'Te bevestigen met FG', 'sky', 'doc', 20)}
  {t('Bewaren', '5 jaar', 'Spraak gewist na bevestiging', 'sage', 'clock')}
  {t('Namen → rollen', 'Aan', 'Inspecteur controleert eerst', 'lilac', 'person')}
</div>'''
    return provs + func + priv


def w14(extra=''):
    return page('W14 · AI en data' + (' detail' if extra else ''), 'AI en data', 'Configuratie · AI en data', chip_concept(),
                btn('Proefgesprek') + btn('Naar publiceren', True), w14_body() + extra, sidebar('Configuratie', 'AI en data'))


def w14_detail():
    def r(title, line, st, tone, fg, last=False):
        b = '' if last else f'border-bottom:1px solid {LINE};'
        return (f'<a style="display:flex;align-items:center;gap:14px;min-height:70px;{b}">'
                f'<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600">{title}</div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:3px;line-height:1.35">{line}</div></div>{status_chip(st, tone, fg)}</a>')
    inner = f'''
{panel_head('cloud', P['butter'][1], 'Aanbieder', 'Claude via Anthropic')}
<div style="display:flex;gap:8px;align-items:center;margin-top:14px">{status_chip('Actief', 'sage', GREEN)}<span style="font-size:14px;color:{SOFT}">DPIA en TIA afgerond 28-04-2026 (fictief)</span></div>
<div style="margin-top:12px">
  {r('Regio', 'Opslag VS · inferentie global of us · geen EU-optie', 'Doorgifte', 'blush', RED)}
  {r('Contractpartij', 'Anthropic Ireland, Limited (klant in de EER)', 'In voorwaarden', 'sage', GREEN)}
  {r('Verwerkersovereenkomst', 'DPA via de Commercial Terms', 'Van toepassing', 'sage', GREEN)}
  {r('Grondslag doorgifte', 'SCC module 2 en 3 (art. 46 lid 2 c AVG) plus TIA', 'TIA afgerond', 'sage', GREEN)}
  {r('Training en wissen', 'Geen training · wissen binnen 30 dagen', 'In voorwaarden', 'sage', GREEN)}
  {r('EU-route', 'Vertex AI “eu” of Bedrock EU · per model', 'Alternatief', 'mist', SOFT, True)}
</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:{SOFT}">{ico('info', 16)}Bronnen geraadpleegd 12-11-2026 · DPF-status controleren</div>
<div style="position:absolute;left:32px;right:32px;bottom:28px;display:flex;gap:12px">
  <button style="flex:1;height:56px;border-radius:18px;background:{P['mist'][0]};font-size:16px;font-weight:600">Voorwaarden</button>
  <button style="flex:1.4;height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">DPIA openen</button>
</div>'''
    return w14(overlay_panel(inner, 500, 'Aanbieder Claude via Anthropic'))


# ======================= W15 huisstijl =======================
def w15():
    def sw(col):
        return f'<span style="width:36px;height:36px;border-radius:12px;background:{col};flex:none"></span>'
    logo = (f'<div style="display:flex;gap:8px"><span style="width:56px;height:36px;border-radius:10px;background:{P["mist"][0]};box-shadow:inset 0 0 0 1px {LINE}"></span>'
            f'<span style="width:56px;height:36px;border-radius:10px;background:{DARK}"></span></div>')

    def row(label, value, lead='', meta='', last=False):
        b = '' if last else f'border-bottom:1px solid {LINE};'
        m = f'<span style="font-size:14px;color:{SOFT};margin-right:4px">{meta}</span>' if meta else ''
        return (f'<a style="display:flex;align-items:center;gap:14px;height:68px;{b}">{lead}'
                f'<div style="flex:1"><div style="font-size:13px;color:{SOFT};font-weight:500">{label}</div>'
                f'<div style="font-size:15px;font-weight:600;margin-top:3px">{value}</div></div>{m}<span style="color:{SOFT}">{ico("chev", 20)}</span></a>')
    rows = (f'<a style="display:flex;align-items:center;gap:14px;height:68px;border-bottom:1px solid {LINE}">'
              f'<div style="flex:1"><div style="font-size:13px;color:{SOFT};font-weight:500">Logo</div><div style="font-size:15px;font-weight:600;margin-top:3px">Licht en donker</div></div>'
              f'{logo}<span style="color:{SOFT}">{ico("chev", 20)}</span></a>'
            + row('Hoofdkleur rapport', '#2B5C8A', sw('#2B5C8A'), 'contrast 7,0 : 1')
            + row('Tweede kleur', '#E58A1F', sw('#E58A1F'), 'alleen vlakken')
            + row('Lettertype', 'Inter')
            + row('Voorblad', 'Met adresblok')
            + row('Taal app', 'Nederlands')
            + row('Rapporttalen', 'Nederlands · Duits · Engels', '', '', True))
    left = card(rows, 'padding:4px 24px')
    sheet = f'''
<div style="width:340px;height:480px;margin:18px auto 0;background:#fff;border-radius:6px;box-shadow:0 6px 24px rgba(20,26,34,.12);overflow:hidden;position:relative">
  <div style="height:10px;background:#2B5C8A"></div>
  <div style="padding:26px 28px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <span style="width:70px;height:24px;border-radius:5px;background:#E6E8EC"></span>
      <div style="text-align:right;display:flex;flex-direction:column;gap:5px;align-items:flex-end">
        <span style="width:90px;height:7px;border-radius:4px;background:#E6E8EC"></span><span style="width:70px;height:7px;border-radius:4px;background:#E6E8EC"></span></div></div>
    <div style="font-size:24px;font-weight:700;color:#2B5C8A;margin-top:70px">WPI-rapport</div>
    <div style="font-size:14px;font-weight:600;margin-top:6px">WPI-20261105-DAM-C2</div>
    <div style="margin-top:22px;display:flex;flex-direction:column;gap:7px;font-size:12px;color:{SOFT}">
      <span>05-11-2026 · Coördinator 2 (fictief)</span><span>RWZI Voorbeeldstad · P26-168 (fictief)</span><span>Damwand · verwijderen damwand</span></div>
    <div style="margin-top:20px;display:inline-flex;height:26px;align-items:center;padding:0 10px;border-radius:6px;background:#FCE9D2;font-size:12px;font-weight:600;color:#5E3A00">Acties: 8 open van 9</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:36px;background:#E58A1F"></div>
</div>'''
    right = (f'<div style="height:100%;border-radius:24px;background:{P["mist"][0]};padding:22px 24px">'
             f'<div style="display:flex;justify-content:space-between;align-items:center">'
             f'<div class="serif" style="font-size:20px">Voorbeeld</div>{seg([("Voorblad", ""), ("Rapportpagina", ""), ("App", "")], 0, "background:#E6E8EC")}</div>{sheet}</div>')
    body = f'''
<div style="margin-top:24px">{seg([('Huisstijl', ''), ('Organisatiegegevens', '')])}</div>
<div style="position:absolute;left:48px;right:48px;top:214px;bottom:28px;display:grid;grid-template-columns:560px 1fr;gap:24px;align-items:start">
  {left}{right}
</div>'''
    return page('W15 · Huisstijl', 'Huisstijl', 'Configuratie · Huisstijl', chip_concept(),
                btn('Standaard herstellen') + btn('Naar publiceren', True), body, sidebar('Configuratie', 'Huisstijl'))


# ======================= W17 organisaties =======================
def w17():
    def org(name, status, tone, fg, n, meta, icon):
        return (f'<a style="display:block;position:relative;height:200px;border-radius:24px;background:#fff;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04);padding:22px 24px">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start">{icotile(icon, P[tone][1], 44, 22, 14)}{status_chip(status, tone, fg)}</div>'
                f'<div style="font-size:17px;font-weight:600;margin-top:16px;white-space:nowrap">{name}</div>'
                f'<div class="num" style="font-size:30px;font-weight:600;line-height:1;margin-top:10px">{n}<span style="font-size:16px;color:{SOFT};font-weight:500"> {"gebruiker" if n == 1 else "gebruikers"}</span></div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:10px">{meta}</div></a>')
    orgs = f'''
<div style="margin-top:28px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
  {org('Noardling B.V.', 'Actief', 'sage', GREEN, 10, '4 groepen · v1.3 · AI actief', 'building')}
  {org('Bouwbedrijf Voorbeeld B.V. (fictief)', 'Proef', 'butter', '#5E4500', 1, 'concept v0.1 · kennisbank leeg · AI EU-gehost', 'building')}
  {org('Demo-omgeving (verkoop)', 'Demo', 'mist', SOFT, 2, '1 groep · v1.0 · voorbeelddata', 'building')}
</div>'''
    tpl = [('Begeleider', 'Kop tot gesprek met monteurs'), ('Onderwerpen', 'A–I met oordeelmodel'),
           ('Rapport', 'Vaste teksten VCA 7.1'), ('Dashboard', 'VCA 7.1 en 7.2'), ('Kennisbank', 'Leeg · klant uploadt zelf')]
    tr = ''.join(kv_row(l, v, '', i == len(tpl) - 1, 58, False) for i, (l, v) in enumerate(tpl))
    left = card(card_head('Sjabloon', 'Service &amp; Montage, VCA**', btn('Sjablonen')) + f'<div style="margin-top:6px">{tr}</div>', 'padding:22px 24px 6px')

    def see(ok, title, meta, last=False):
        b = '' if last else f'border-bottom:1px solid {LINE};'
        ic = (f'<span style="width:32px;height:32px;border-radius:50%;background:{P["sage"][0]};color:{GREEN};display:flex;align-items:center;justify-content:center">{ico("check", 18, 2.2)}</span>'
              if ok else f'<span style="width:32px;height:32px;border-radius:50%;background:{P["blush"][0]};color:{RED};display:flex;align-items:center;justify-content:center">{ico("close", 16, 2.2)}</span>')
        return (f'<div style="display:flex;align-items:center;gap:14px;min-height:66px;{b}">{ic}'
                f'<div><div style="font-size:15px;font-weight:600">{title}</div><div style="font-size:14px;color:{SOFT};margin-top:2px">{meta}</div></div></div>')
    right = card(card_head('Wat jij ziet', 'per organisatie gescheiden') + f'''<div style="margin-top:6px">
  {see(True, 'Naam, status en aantallen', 'gebruikers, groepen')}
  {see(True, 'Versie en AI-instelling', 'plus verbruik voor facturatie')}
  {see(False, 'Inspecties, acties, foto’s, namen', 'nooit')}
  {see(True, 'Ondersteuning', 'alleen na toestemming van de beheerder', True)}</div>''', 'padding:22px 24px 6px')
    body = orgs + f'''
<div style="position:absolute;left:48px;right:48px;top:374px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
  {left}{right}
</div>'''
    return page('W17 · Organisaties', 'Organisaties', 'Leveranciersomgeving · 3 organisaties', '',
                btn('Nieuwe organisatie', True, 'plus'), body, sidebar_leverancier())


def chart_v11():
    months = C['maanden']
    names = ['mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov']
    om = C['oordeel_maand']
    data = [(om[m].get('Afwijking', 0), om[m].get('Verbeterpunt', 0), om[m].get('Niet van toepassing', 0), om[m].get('Conform', 0)) for m in months]
    cols = ['#C8473D', '#C98A1E', '#B9BFC8', '#2F8A5B']
    W, H, base, top = 640, 250, 222, 24
    scale = (base - top) / 60
    bw, gapx = 44, (W - 40) / 7
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Gezien maatregelen per maand, gestapeld per oordeel">']
    for g in (0, 20, 40, 60):
        y = base - g * scale
        out.append(f'<line x1="32" x2="{W}" y1="{y:.1f}" y2="{y:.1f}" stroke="{LINE}" stroke-width="1"/>')
        out.append(f'<text x="24" y="{y + 4:.1f}" text-anchor="end" font-size="12" fill="{SOFT}" font-family="Inter">{g}</text>')
    for i, (m, d) in enumerate(zip(names, data)):
        x = 40 + i * gapx + (gapx - bw) / 2
        y = base
        segs = [(v, c) for v, c in zip(d, cols) if v]
        for j, (v, c) in enumerate(segs):
            hgt = v * scale
            ytop = y - hgt
            if j == len(segs) - 1:
                out.append(f'<path d="M{x:.1f} {y:.1f} V{ytop + 6:.1f} Q{x:.1f} {ytop:.1f} {x + 6:.1f} {ytop:.1f} H{x + bw - 6:.1f} Q{x + bw:.1f} {ytop:.1f} {x + bw:.1f} {ytop + 6:.1f} V{y:.1f} Z" fill="{c}"/>')
            else:
                out.append(f'<rect x="{x:.1f}" y="{ytop + 2:.1f}" width="{bw}" height="{max(hgt - 2, 1):.1f}" fill="{c}"/>')
            y = ytop
        out.append(f'<text x="{x + bw / 2:.1f}" y="{y - 8:.1f}" text-anchor="middle" font-size="13" font-weight="600" fill="{INK}" font-family="Inter">{sum(d)}</text>')
        out.append(f'<text x="{x + bw / 2:.1f}" y="{base + 20:.1f}" text-anchor="middle" font-size="13" fill="{SOFT}" font-family="Inter">{m}</text>')
    out.append('</svg>')
    return ''.join(out)


# ======================= W09 (goedgekeurd v2, ronde 2: programma als probleem) =======================
_MN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
_lm = max(C['vp_mis'], key=lambda o: o['maand'])
LAATST_MIS = f"{short(_lm['project'])} · {_MN[int(_lm['maand'][5:]) - 1]}"


def _w09_fix(html):
    old_tile = w_tile('Programma', '12', 'Verplichte WPI’s per werkplek', 'butter', 'cal', unit=' van 32')
    new_tile = w_tile('Programma', str(len(C['vp_mis'])), f"{C['vp_x']} van {C['vp_y']} gedaan", 'blush', 'cal', unit=' gemist')
    assert old_tile in html
    html = html.replace(old_tile, new_tile)
    old_w = w_tile('Eigen waarneming', '76', 'Doel 80% · 190 van 249 regels', 'sage', 'check', unit='%')
    assert old_w in html
    wn = C['waarnemingen']
    html = html.replace(old_w, w_tile('Waarnemingen', str(wn['totaal']), f"TRA {wn['TRA']} · onderwerpen {wn['Algemeen']}", 'sage', 'check'))
    side1 = w_tile('Inspecties', '15', '12 coördinator · 3 directie', 'mist', 'clip', 155)
    side2 = w_tile('Directie per kwartaal', '3', 'Q2, Q3 en Q4 2026 gedaan', 'lilac', 'shield', 155, ' van 3')
    assert side1 in html and side2 in html
    g = C['getoetst']
    insp = (f'<a style="display:block;position:relative;height:314px;border-radius:24px;background:{P["mist"][0]};padding:22px 24px">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start"><div style="font-size:15px;color:{SOFT};font-weight:500">Inspecties</div>{icotile("clip", P["mist"][1], 44, 22, 14)}</div>'
            f'<div class="num" style="font-size:40px;font-weight:600;line-height:1;margin-top:2px">{C["n_wpi"]}</div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:12px">{C["soort_wpi"]["WPI coördinator"]} coördinator · {C["soort_wpi"]["VGM-inspectie directie"]} directie</div>'
            f'<div style="height:1px;background:#E1E4E8;margin:22px 0 18px"></div>'
            f'<div style="font-size:13px;color:{SOFT};font-weight:500">Getoetst</div>'
            f'<div style="font-size:16px;font-weight:600;margin-top:4px">{g["taken"]} taken · {g["taakstappen"]} taakstappen</div>'
            f'<div style="font-size:13px;color:{SOFT};font-weight:500;margin-top:14px">Directie per kwartaal</div>'
            f'<div style="font-size:16px;font-weight:600;margin-top:4px">{C["dir_kw_ok"]} van {len(C["kwartalen"])} · Q2–Q4 2026</div></a>')
    html = html.replace(side1, insp).replace(side2, '')
    old_c = chart_svg()
    assert old_c in html
    html = html.replace(old_c, chart_v11())
    html = html.replace(legend_item('#B9BFC8', 'Overig'), legend_item('#B9BFC8', '[NVT] N.v.t.'))
    gemist = (f'<a style="display:block;position:relative;height:132px;border-radius:22px;background:#fff;padding:18px 20px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04)">'
              f'<div style="font-size:15px;font-weight:600;line-height:1.35;padding-right:28px;height:40px">Verplichte WPI’s niet gedaan</div>'
              f'<div style="display:flex;align-items:baseline;gap:6px;margin-top:12px"><span class="num" style="font-size:24px;font-weight:600;color:#B42318">{len(C["vp_mis"])}</span>'
              f'<span style="font-size:14px;color:{SOFT}">gemist</span></div>'
              f'<div style="font-size:13px;color:{SOFT};margin-top:4px">Laatst: {LAATST_MIS}</div>'
              f'<span style="position:absolute;right:16px;top:16px;color:{SOFT}">{ico("chev", 20)}</span></a>')
    first = attention('Geluid bemoeilijkt communicatie bij hijsen', '134 d', 'WPI-20260505-POM-C2-5')
    second = attention('Geluid bemoeilijkt communicatie bij hijsen', '126 d', 'WPI-20260513-IDV-C1-3')
    assert first in html and second in html
    geluid = (f'<a style="display:block;position:relative;height:132px;border-radius:22px;background:#fff;padding:18px 20px;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.04)">'
              f'<div style="font-size:15px;font-weight:600;line-height:1.35;padding-right:28px;height:40px">Geluid bemoeilijkt communicatie bij hijsen</div>'
              f'<div style="display:flex;align-items:baseline;gap:6px;margin-top:12px"><span class="num" style="font-size:24px;font-weight:600;color:#B42318">3</span>'
              f'<span style="font-size:14px;color:{SOFT}">acties · oudste 134 d</span></div>'
              f'<div style="font-size:13px;color:{SOFT};margin-top:4px">Thema · buiten de TRA</div>'
              f'<span style="position:absolute;right:16px;top:16px;color:{SOFT}">{ico("chev", 20)}</span></a>')
    html = html.replace(second, '').replace(first, gemist + geluid)
    # onderste rij meer lucht
    assert html.count('height:330px') == 1
    html = html.replace('height:330px', 'height:314px')
    html = html.replace('Geen stuurlijn bij begeleiden van de last', TITEL['WPI-20260914-DAM-C1-1'])
    html = html.replace('<div style="margin-top:28px;display:flex;justify-content:space-between;align-items:baseline">', '<div style="margin-top:22px;display:flex;justify-content:space-between;align-items:baseline">')
    html = html.replace('>Alle acties<', '>Alles bekijken<')
    return html


def w09_v2():
    return _w09_fix(w09())


def w09_panel_v2():
    return _w09_fix(w09_panel())


files = {
    'W07-rapportontwerper': w07(), 'W08-dashboardbouwer': w08(),
    'W09-dashboard': w09_v2(), 'W09-dashboard-paneel': w09_panel_v2(), 'W09b-trendanalyse': w09b(),
    'W10-inspecties': w10(), 'W10-inspecties-detail': w10_detail(),
    'W11-acties': w11(), 'W11-acties-toetsen': w11_toetsen(),
    'W12-programma': w12(), 'W13-gebruikers-rollen': w13(),
    'W14-ai-data': w14(), 'W14-ai-data-detail': w14_detail(),
    'W15-huisstijl': w15(), 'W17-organisaties': w17(),
}
if __name__ == '__main__':
    for k, v in files.items():
        open(f'{OUT}/{k}.html', 'w').write(v)
    print('ok', len(files))
