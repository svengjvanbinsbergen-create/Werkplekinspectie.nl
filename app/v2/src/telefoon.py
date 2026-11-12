# Telefoonbouwer v2 (koers 2): P01, P01s, P01b, P02, P03, P03c, P04, P04-detail, P05
# Leidende bouwsteen voor de hele telefoonset (ontwerp.md, "Afspraken 12-11 avond").
# Importeren zonder iets te schrijven:
#   import sys; sys.path.insert(0, '/home/claude/app/v2/src')
#   from telefoon import (phone, head, titleblock, progress, gevaar, dock, sheet, tabbar,
#                         label, standaard_chip, oc, status, alles_ok, info_btn, round_btn, ico, chip, P, INK, SOFT, DARK, LINE)
#   phone(titel, inner)                      -> volledig HTML-document 390x844 (#root)
#   head(left_html='', offline=False)        -> kop y 44: links (bijv. round_btn('back')), rechts Online/Offline + Voorbeeldinhoud
#   progress(n, klaar, huidig)               -> voortgangsbalk y 100
#   titleblock(context, titel, rechts='', sub='') -> contextregel 110-138 (28 px), titel 28 px op y 138
#   gevaar()                                 -> Direct gevaar 48 px op y 656 (12 px boven de onderbalk)
#   dock(label, icon='chev', filled=False, reden='', sub='') -> onderbalk y 716: Foto · Inspreken · hoofdknop
#        filled=True gevuld | sub='3 → afsluitvraag' actief omlijnd | anders grijs uitgeschakeld met reden
#   sheet(top, aria, context, titel, body_html, bottom_html='') -> sheet met sluitknop links, titel 22 px,
#        bottom_html + Direct gevaar onderaan (y 772)
#   label('Jij','jij') / label('Voorstel','ai') / standaard_chip() -> herkomstlabels (Standaard altijd grijs)
#   oc('A') oordeelchip met woord; status('nog'|'C'|'A'|'V'|'NVT') kaartstatus; alles_ok(top, tekst, meta) één-tik-knop
# Direct uitvoeren (python3 telefoon.py) schrijft P01-P05 naar screens/phone.
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(BASE, 'gen.py')).read().split('\nfiles = {')[0]
G = {}
exec(SRC, G)
globals().update({k: v for k, v in G.items() if not k.startswith('__')})

OUT = os.path.abspath(os.path.join(BASE, '..', 'screens', 'phone'))
os.makedirs(OUT, exist_ok=True)

RED = '#B42318'
MARK = 'background:#FFE7A3;color:%s;border-radius:4px;padding:1px 3px' % INK
TINT = P['sky'][0]        # één pasteltint voor alle maatregelkaarten
TITLE_Y = 110             # contextregel 110-138, titel begint op y=138 (vaste maten)
OORD = dict(OORDEEL)
OORD['GA'] = ('Geen afwijking waargenomen', '#4A5565', '#EEF0F3')
OORD['NB'] = ('Niet beoordeeld', '#4A5565', '#EEF0F3')
OORD['NVT'] = ('Niet van toepassing', '#4A5565', '#EEF0F3')


def svg(paths, size=20, sw=1.75):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths}</svg>')


LOCK = '<rect x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'
CLOUD_OFF = '<path d="M7.5 18.5h9.5a4 4 0 0 0 1.9-.5M20.6 15.2a4 4 0 0 0-3-4.65A6 6 0 0 0 9 6.4M6.2 9.6a4.5 4.5 0 0 0 1.3 8.9"/><path d="M4 4l16 16"/>'
KEYS = '<rect x="3" y="6.5" width="18" height="11" rx="2.5"/><path d="M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>'
CARD = f'border-radius:22px;background:#fff;box-shadow:0 0 0 1px {LINE},0 4px 16px rgba(20,26,34,.05)'


# ---------- kleine bouwstenen ----------
def oc(code, h=28):
    w, fg, bg = OORD[code]
    return (f'<span style="display:inline-flex;align-items:center;height:{h}px;padding:0 10px;border-radius:999px;'
            f'background:{bg};color:{fg};font-size:14px;font-weight:600;white-space:nowrap">[{code}] {w}</span>')


def status(code):
    if code == 'nog':
        return (f'<span style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;'
                f'background:#fff;color:{SOFT};font-size:14px;font-weight:500;box-shadow:inset 0 0 0 1px #C9CED6">nog niet</span>')
    if code == 'NVT':
        return (f'<span style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;'
                f'background:#fff;color:{SOFT};font-size:14px;font-weight:600">[NVT]</span>')
    w, fg, bg = OORD[code]
    return (f'<span style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:999px;'
            f'background:#fff;color:{fg};font-size:14px;font-weight:600">[{code}] {w}</span>')


def label(text, kind):
    if kind == 'jij':
        return chip(text, P['mist'][0], INK, P['mist'][0], 28, 14, 600)
    return chip(text, '#fff', ACCENT, '#fff', 28, 14, 600)


def offline_chip():
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;'
            f'background:{DARK};color:#fff;font-size:12px;font-weight:600;white-space:nowrap">{svg(CLOUD_OFF, 14)}Offline</span>')


def head(left='', offline=False):
    st = offline_chip() if offline else online()
    return (f'<div style="position:absolute;left:24px;right:24px;top:44px;height:48px;display:flex;align-items:center;gap:12px">'
            f'{left}<div style="flex:1"></div><div style="display:flex;gap:6px">{st}{fictief()}</div></div>')


def progress(n, done, cur, states=None):
    """states: optionele lijst per segment: 'done' | 'cur' | 'open'."""
    if states is None:
        states = ['done' if i < done else ('cur' if i == cur else 'open') for i in range(n)]
    col = {'done': INK, 'cur': '#8A93A0', 'open': LINE}
    seg = ''.join(f'<span style="flex:1;height:4px;border-radius:2px;background:{col[st]}"></span>' for st in states)
    return f'<div style="position:absolute;left:24px;right:24px;top:100px;display:flex;gap:4px">{seg}</div>'


def titleblock(kicker, title, right='', sub=''):
    # rechterknop (info/lijst) als 48 px tikvlak naast de kickerregel, zodat de titel de volle breedte houdt
    r = f'<div style="position:absolute;right:0;top:-10px">{right}</div>' if right else ''
    s = f'<div style="margin-top:8px">{sub}</div>' if sub else ''
    return (f'<div style="position:absolute;left:24px;right:24px;top:{TITLE_Y}px;display:flex;gap:12px">'
            f'<div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500;height:28px;line-height:28px;padding-right:{104 if right.count('<button') > 1 else 56}px">{kicker}</div>'
            f'<div style="font-size:28px;font-weight:700;letter-spacing:-.02em;line-height:1.2">{title}</div>{s}</div>{r}</div>')


def gevaar_html(extra_style=''):
    return (f'<button aria-label="Direct gevaar, werk stilleggen. Houd 2 seconden ingedrukt" '
            f'style="height:48px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 2px {RED};color:{RED};'
            f'display:flex;align-items:center;gap:8px;padding:0 14px;{extra_style}">'
            f'{ico("alert", 20)}<span style="flex:1;text-align:left;font-size:14px;font-weight:700;white-space:nowrap">Direct gevaar · werk stilleggen</span>'
            f'<span style="font-size:14px;font-weight:500;white-space:nowrap">houd 2 s</span></button>')


DOCK_Y = 708   # onderbalk; reden-/uitlegregel eindigt op y 806 (boven de home-indicatorzone)


def gevaar(top=DOCK_Y - 12 - 48):
    return gevaar_html(f'position:absolute;left:24px;right:24px;top:{top}px')


def dock(primary, icon='chev', filled=False, reden='', sub=''):
    """Vaste onderbalk (y 716). filled=True: hoofdknop gevuld (stap af).
    sub='…': actief maar niet gevuld (omlijnd), met uitleg eronder (bijv. '3 open → afsluitvraag').
    anders: uitgeschakeld, grijs gevuld, met reden eronder."""
    if filled:
        pb, pl, dis, rd = f'background:{DARK};color:#fff', INK, '', ''
    elif sub:
        pb, pl, dis = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 2px {INK}', INK, ''
        rd = f'<span style="font-size:14px;font-weight:500;color:{SOFT};white-space:nowrap;line-height:16px">{sub}</span>'
    else:
        pb, pl, dis = 'background:#E3E6EA;color:#4A5565', '#4A5565', ' aria-disabled="true"'
        rd = f'<span style="font-size:14px;font-weight:500;color:#4A5565;white-space:nowrap;line-height:16px">{reden}</span>'
    extra = reden or sub
    return (
        f'<div style="position:absolute;left:0;right:0;top:{DOCK_Y}px;height:{844 - DOCK_Y}px">'
        f'<div style="position:absolute;left:24px;top:4px;width:72px;display:flex;flex-direction:column;align-items:center;gap:2px">'
        f'<button aria-label="Foto" style="width:56px;height:56px;margin-top:0;border-radius:50%;background:{P["mist"][0]};'
        f'display:flex;align-items:center;justify-content:center">{ico("camera", 24)}</button>'
        f'<span style="font-size:14px;line-height:18px;font-weight:500;color:{SOFT}">Foto</span></div>'
        f'<div style="position:absolute;left:159px;top:0;width:72px;display:flex;flex-direction:column;align-items:center;gap:4px">'
        f'<button aria-label="Inspreken" style="width:72px;height:72px;border-radius:50%;background:{DARK};color:#fff;'
        f'display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(20,26,34,.22)">{ico("mic", 28, 2)}</button>'
        f'<span style="font-size:14px;line-height:18px;font-weight:500;color:{SOFT}">Inspreken</span></div>'
        f'<div style="position:absolute;right:14px;top:4px;width:150px;display:flex;flex-direction:column;align-items:center;gap:2px">'
        f'<button aria-label="{primary}{(" — " + extra.replace("→", "open, naar de")) if extra else ""}"{dis} style="width:56px;height:56px;margin-top:0;border-radius:50%;{pb};'
        f'display:flex;align-items:center;justify-content:center">{ico(icon, 24, 2.2)}</button>'
        f'<span style="font-size:14px;line-height:18px;font-weight:600;color:{pl}">{primary}</span>{rd}</div></div>')


def standaard_chip(h=28):
    """Herkomstlabel 'Standaard': altijd grijs (#F3F4F6 / #4A5565)."""
    return chip('Standaard', '#F3F4F6', '#4A5565', '#F3F4F6', h, 14, 600)


def tabbar(active='Vandaag'):
    def tab(name, lab):
        a = lab == active
        return (f'<a style="width:64px;display:flex;flex-direction:column;align-items:center;gap:4px;padding-top:12px;'
                f'color:{INK if a else SOFT};font-size:12px;font-weight:{600 if a else 500}">{ico(name, 24)}{lab}</a>')
    return (f'<nav style="position:absolute;left:0;right:0;bottom:0;height:88px;background:#fff;border-top:1px solid {LINE};display:flex;justify-content:space-around;padding:0 8px">'
            f'{tab("home", "Vandaag")}{tab("list", "Acties")}'
            f'<div style="width:72px;position:relative"><button aria-label="Nieuwe inspectie of melding" style="position:absolute;left:4px;top:-26px;width:64px;height:64px;border-radius:50%;background:{DARK};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px #fff,0 8px 20px rgba(20,26,34,.18)">{ico("plus", 28, 2)}</button></div>'
            f'{tab("report", "Rapporten")}{tab("person", "Profiel")}</nav>')


def sheet(top, aria, kicker, title, body, bottom='', terug=''):
    """terug='Terug naar onderwerpen': sluitknop wordt een terugpijl (genest sheet)."""
    # sheet herhaalt de Direct-gevaar-balk onderaan
    return (f'<div style="position:absolute;inset:0;background:rgba(20,26,34,.38)"></div>'
            f'<div role="dialog" aria-label="{aria}" style="position:absolute;left:0;right:0;top:{top}px;bottom:0;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -8px 32px rgba(20,26,34,.16);padding:0 24px">'
            f'<div style="width:40px;height:5px;border-radius:3px;background:#C9CED6;margin:10px auto 0"></div>'
            f'<div style="display:flex;align-items:center;gap:14px;margin-top:12px">'
            f'{round_btn("back", label=terug) if terug else round_btn("close", label="Sluiten")}'
            f'<div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">{kicker}</div>'
            f'<div style="font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin-top:2px">{title}</div></div></div>{body}'
            f'<div style="position:absolute;left:24px;right:24px;bottom:24px;display:flex;flex-direction:column;gap:12px">{bottom}{gevaar_html()}</div>'
            f'</div>')


def inner_of(html):
    return html.split('overflow:hidden;background:#FFFFFF">', 1)[1].rsplit('</div></body>', 1)[0]


# ---------- oordeel-bediening ----------
def oordeel_btn2(code, selected=False, locked=False):
    w, fg, bg = OORD[code]
    if locked:
        return (f'<button aria-disabled="true" style="flex:1;height:72px;border-radius:20px;background:{P["mist"][0]};color:{SOFT};'
                f'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">'
                f'<span style="font-size:15px;font-weight:700">{code}</span><span style="font-size:14px;font-weight:600">{w}</span></button>')
    if selected:
        sty = f'background:{bg};color:{fg};box-shadow:inset 0 0 0 2px {fg}'
        top = f'<span style="display:flex;align-items:center;gap:4px;font-size:15px;font-weight:700">{ico("check", 16, 2.4)}{code}</span>'
    else:
        sty = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6'
        top = f'<span style="font-size:15px;font-weight:700">{code}</span>'
    return (f'<button aria-pressed="{str(selected).lower()}" style="flex:1;height:72px;border-radius:20px;{sty};'
            f'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">'
            f'{top}<span style="font-size:14px;font-weight:600">{w}</span></button>')


def oordeel_rij(top, voor, sel=None):
    nvt = (f'<button style="height:48px;padding:0 16px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #C9CED6;'
           f'font-size:14px;font-weight:600;color:{SOFT}">NVT</button>')
    return (f'<div style="position:absolute;left:24px;right:24px;top:{top}px;height:48px;display:flex;align-items:center">'
            f'<div style="flex:1;font-size:14px;color:{SOFT};font-weight:500">Oordeel voor: <span style="color:{INK};font-weight:600">{voor}</span></div>{nvt}</div>'
            f'<div style="position:absolute;left:24px;right:24px;top:{top + 54}px;display:flex;gap:10px">'
            f'{oordeel_btn2("C", sel == "C")}{oordeel_btn2("A", sel == "A")}{oordeel_btn2("V", sel == "V")}</div>')


def mcard(kind, name, st, selected=False, h=100):
    ring = f'box-shadow:0 0 0 2px {INK};' if selected else ''
    return (f'<a style="display:block;height:{h}px;border-radius:20px;background:{TINT};padding:14px 16px;{ring}">'
            f'<div style="font-size:14px;color:{SOFT};font-weight:500">{kind}</div>'
            f'<div style="font-size:16px;font-weight:600;line-height:1.25;margin-top:4px;height:20px">{name}</div>'
            f'<div style="margin-top:10px">{status(st)}</div></a>')


def info_btn(label_, name='info'):
    return (f'<button aria-label="{label_}" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:{INK}">'
            f'<span style="width:36px;height:36px;border-radius:50%;background:{P["mist"][0]};display:flex;align-items:center;justify-content:center">{ico(name, 20)}</span></button>')


def regel_sub(code):
    return (f'<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:{SOFT};font-weight:500">Regel {oc(code)}'
            f'{standaard_chip()}</div>')


# ======================= P01 start: twee ingangen =======================
def p01():
    inner = f'''
{head()}
{titleblock('Donderdag 5 november', 'Vandaag')}
<div style="position:absolute;left:24px;right:24px;top:196px;background:{P['sage'][0]};border-radius:22px;padding:14px 60px 14px 16px;display:flex;gap:14px;align-items:center">
  {icotile('device', '#FFFFFF', 44, 22, 14, '#2F5D1E')}
  <div><div style="font-size:16px;font-weight:600;line-height:1.25">Klaar voor offline</div>
  <div style="font-size:14px;color:{SOFT};margin-top:2px">TRA Damwand rev. 3 · kennisbank v1.3 op toestel</div></div>
  <button aria-label="Banner sluiten" style="position:absolute;right:8px;top:50%;margin-top:-24px;width:48px;height:48px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:{SOFT}">{ico('close', 18, 2)}</button>
</div>
<a style="position:absolute;left:24px;right:24px;top:304px;height:136px;{CARD};padding:20px;display:block">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div style="font-size:14px;color:{SOFT};font-weight:500">Ingepland vandaag</div>
    {icotile('cal', P['sky'][1], 48, 24, 16)}
  </div>
  <div style="font-size:22px;font-weight:600;letter-spacing:-.02em;margin-top:4px">Damwand · P26-168</div>
  <div style="font-size:14px;color:{SOFT};margin-top:6px">RWZI Voorbeeldstad · 2 monteurs</div>
</a>
<div style="position:absolute;left:24px;right:24px;top:456px;display:flex;gap:12px">
  <a style="flex:1;height:136px;background:{P['butter'][0]};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:14px;color:{SOFT};font-weight:500">Open punten</div>
    <div class="num" style="font-size:40px;font-weight:600;margin-top:10px;line-height:1">2</div>
    <div style="font-size:14px;color:{SOFT};margin-top:10px">op Damwand</div>
    <span style="position:absolute;right:16px;bottom:16px;color:{INK}">{ico('arrow', 20)}</span>
  </a>
  <a style="flex:1;height:136px;background:#fff;box-shadow:0 0 0 1px {LINE};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:14px;color:{SOFT};font-weight:500">Spontaan</div>
    <div style="font-size:18px;font-weight:600;line-height:1.25;margin-top:10px">Ik kom hier langs</div>
    <span style="position:absolute;right:16px;bottom:16px;color:{INK}">{ico('plus', 20)}</span>
  </a>
</div>
<button style="position:absolute;left:24px;right:24px;top:612px;height:60px;border-radius:20px;background:{DARK};color:#fff;font-size:17px;font-weight:600">Start ingeplande inspectie</button>
{tabbar()}'''
    return phone('P01 · Start', inner)


def veld(label_, waarde, herkomst_html, last=False, actief=False):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    ring = f'box-shadow:inset 0 0 0 2px {INK};border-radius:14px;' if actief else ''
    return (f'<a style="display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 12px;{b}{ring}">'
            f'<div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">{label_}</div>'
            f'<div style="font-size:16px;font-weight:600;margin-top:2px">{waarde}</div></div>{herkomst_html}</a>')


def p01s():
    rows = (veld('Projectnummer', 'P26-333', label('Jij', 'jij'), actief=True)
            + veld('Inspecteur', 'Coördinator 2 (fictief)', standaard_chip())
            + veld('Datum', 'Ma 10 augustus 2026', standaard_chip(), last=True))
    inner = f'''
{head(round_btn('back', label='Terug naar Vandaag'))}
{titleblock('Spontaan · niet ingepland', 'Ik kom hier langs')}
<div style="position:absolute;left:24px;right:24px;top:196px;border-radius:22px;background:#fff;box-shadow:0 0 0 1px {LINE};padding:4px">{rows}</div>
<div style="position:absolute;left:24px;right:24px;top:420px;border-radius:22px;background:{P['mist'][0]};padding:16px 18px">
  <div style="display:flex;align-items:center;gap:8px;font-size:14px;color:{SOFT};font-weight:500">Uit project P26-333 {standaard_chip(24)}</div>
  <div style="font-size:18px;font-weight:600;margin-top:8px">Roosterreiniger</div>
  <div style="font-size:14px;color:{SOFT};margin-top:4px">RWZI Testdorp · Waterschap Voorbeeld-Zuid</div>
</div>
<button style="position:absolute;left:24px;right:24px;top:612px;height:60px;border-radius:20px;background:{DARK};color:#fff;font-size:17px;font-weight:600">Start inspectie</button>
{tabbar()}'''
    return phone('P01s · Spontaan langs', inner)


# ======================= P01b open punten =======================
def punt(code, regel, tekst, nr, stat, stat_style):
    return (f'<a style="display:block;{CARD};padding:16px 18px">'
            f'<div style="display:flex;justify-content:space-between;align-items:center">{oc(code)}'
            f'<span style="height:28px;padding:0 10px;border-radius:999px;font-size:14px;font-weight:600;display:inline-flex;align-items:center;{stat_style}">{stat}</span></div>'
            f'<div style="font-size:16px;font-weight:600;line-height:1.4;margin-top:12px">{tekst}</div>'
            f'<div style="font-size:14px;color:{SOFT};margin-top:8px">{regel} · {nr}</div></a>')


def p01b():
    inner = f'''
{head(round_btn('back', label='Terug naar Vandaag'))}
{titleblock('Damwand · eerdere inspecties', 'Open punten')}
<div style="position:absolute;left:24px;right:24px;top:196px;display:flex;flex-direction:column;gap:12px">
  {punt('V', 'DAM-2.04', 'Last met de hand op positie begeleid bij het damwandframe; geen takel of ander mechanisch hulpmiddel gebruikt.', 'WPI-20260914-DAM-C1-1', 'Over termijn', f'background:{P["blush"][0]};color:{RED}')}
  {punt('A', 'DAM-1.07', 'Kraan opgesteld zonder dat de ligging van het kabeltracé bij de opdrachtgever was nagevraagd.', 'WPI-20260925-DAM-DL-2', 'Termijn 20-11', f'background:{P["mist"][0]};color:{SOFT}')}
<a style="height:64px;padding:0 14px;border-radius:22px;background:{P['mist'][0]};display:flex;align-items:center;gap:14px">
  {icotile('check', '#fff', 40, 20, 12)}
  <div style="flex:1;font-size:16px;font-weight:500">Afgerond</div>
  <span class="num" style="font-size:16px;font-weight:600;color:{SOFT}">3</span><span style="color:{SOFT}">{ico('chev', 20)}</span>
</a>
</div>
{tabbar()}'''
    return phone('P01b · Open punten', inner)


# ======================= P02 product en taak =======================
def p02():
    inner = f'''
{head(round_btn('back', label='Terug'))}
{titleblock('RWZI Voorbeeldstad · P26-168', 'Wat doen de monteurs nu?')}
<a style="position:absolute;left:24px;right:24px;top:222px;height:76px;padding:0 16px;{CARD};display:flex;align-items:center;gap:14px">
  {icotile('layers', P['sky'][1], 44, 22, 14)}
  <div style="flex:1"><div style="display:flex;align-items:center;gap:8px;font-size:14px;color:{SOFT};font-weight:500">Product {standaard_chip(24)}</div>
  <div style="font-size:16px;font-weight:600;margin-top:2px">Damwand</div></div>
  <span style="font-size:14px;font-weight:600;color:{SOFT};display:flex;align-items:center;gap:2px">Wijzig{ico('chev', 18)}</span>
</a>
<div style="position:absolute;left:24px;right:24px;top:314px;border-radius:22px;overflow:hidden;box-shadow:0 0 0 1px {LINE}">
  <div style="padding:14px 18px;background:#fff;display:flex;gap:12px;align-items:center">
    {label('Jij', 'jij')}<div style="font-size:16px;line-height:1.45">“Ze halen de damwand er nu uit.”</div>
  </div>
  <a style="display:flex;align-items:center;gap:14px;padding:16px 18px;background:{P['lilac'][0]}">
    <div style="flex:1">
      {label('Voorstel', 'ai')}
      <div style="font-size:22px;font-weight:600;letter-spacing:-.01em;margin-top:10px">Verwijderen damwand</div>
      <div style="font-size:14px;color:{SOFT};margin-top:4px">Demontage · 8 TRA-regels · geen taakstappen</div>
    </div>
  </a>
</div>
<a style="position:absolute;left:24px;right:24px;top:506px;height:64px;padding:0 16px;border-radius:22px;background:{P['mist'][0]};display:flex;align-items:center;gap:14px">
  {icotile('list', '#fff', 40, 20, 12)}
  <div style="flex:1;font-size:16px;font-weight:500">Andere taak</div>
  <span style="font-size:14px;color:{SOFT}">5 meer</span><span style="color:{SOFT}">{ico('chev', 20)}</span>
</a>
{gevaar()}
{dock('Vastleggen', 'check', True)}'''
    return phone('P02 · Product en taak', inner)


# ======================= gedeelde keuzes =======================
def kies_chip(code, selected=False):
    """Oordeelkeuze als chip met woord (C/A/V/NVT); gekozen = pastel + vinkje + rand."""
    if code == 'NVT':
        w, fg, bg = 'Niet van toepassing', SOFT, '#EEF0F3'
    else:
        w, fg, bg = OORD[code]
    if selected:
        sty = f'background:{bg};color:{fg};box-shadow:inset 0 0 0 2px {fg}'
        chk = ico('check', 16, 2.4)
    else:
        sty = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6'
        chk = ''
    return (f'<button aria-pressed="{str(selected).lower()}" style="height:48px;padding:0 10px;border-radius:999px;{sty};flex:1 1 auto;'
            f'display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:14px;font-weight:600;white-space:nowrap">{chk}[{code}] {w}</button>')


def kies_rij(sel):
    return (f'<div style="display:flex;flex-wrap:wrap;gap:8px">'
            f'{kies_chip("C", sel == "C")}{kies_chip("A", sel == "A")}{kies_chip("V", sel == "V")}{kies_chip("NVT", sel == "NVT")}</div>')


def alles_ok(top, text, meta):
    """Grote één-tik-knop (bewaard voor compatibiliteit; koers 2 gebruikt hem niet meer)."""
    return (f'<button style="position:absolute;left:24px;right:24px;top:{top}px;height:64px;border-radius:20px;background:{DARK};color:#fff;'
            f'display:flex;align-items:center;justify-content:center;gap:10px">'
            f'<span style="height:28px;padding:0 8px;border-radius:8px;background:rgba(255,255,255,.18);font-size:15px;font-weight:700;display:flex;align-items:center">C</span>'
            f'<span style="text-align:left"><span style="display:block;font-size:17px;font-weight:600">{text}</span>'
            f'<span style="display:block;font-size:14px;color:#D5D9DF">{meta}</span></span></button>')


# ======================= P04 toetsen: kaarten van de taak, alleen aantikken wat je ziet =======================
def in_orde_btn(wat=''):
    """Snelle route: één tik legt [C] vast met waarneming 'gezien: in orde' (Jij); toast biedt ongedaan maken."""
    # neutraal-grijze getinte pil — zelfde familie als oc(), geen witte omlijning
    return (f'<button aria-label="Gezien, in orde{(": " + wat) if wat else ""}" style="height:44px;padding:0 12px;border-radius:999px;'
            f'background:#F3F4F6;border:0;display:inline-flex;align-items:center;gap:6px;'
            f'font-size:14px;font-weight:600;color:#4A5565;white-space:nowrap">'
            f'{ico("check", 16, 2.4)}Gezien · in orde</button>')


def toast(top, tekst):
    return (f'<div role="status" style="position:absolute;left:24px;right:24px;top:{top}px;height:52px;border-radius:16px;background:#fff;'
            f'box-shadow:0 0 0 1px {LINE},0 8px 24px rgba(20,26,34,.16);display:flex;align-items:center;gap:10px;padding:0 6px 0 16px">'
            f'<span style="color:{OORD["C"][1]}">{ico("check", 18, 2.4)}</span>'
            f'<span style="flex:1;font-size:14px;font-weight:500;white-space:nowrap">{tekst}</span>'
            f'<button style="height:44px;padding:0 8px;border-radius:12px;font-size:14px;font-weight:600;color:{INK};white-space:nowrap">Ongedaan maken</button></div>')


def bevestigd_inline():
    # Inline bevestiging in de conform-familie: zachte groene tint i.p.v. witte omlijning.
    bg = OORD["C"][2]
    fg = OORD["C"][1]
    return (f'<div role="status" style="height:44px;border-radius:16px;background:{bg};'
            f'display:flex;flex-direction:column;justify-content:center;'
            f'gap:1px;padding:0 12px;overflow:hidden">'
            f'<div style="display:flex;align-items:center;gap:6px;min-width:0">'
            f'<span aria-hidden="true" style="width:16px;height:16px;border-radius:999px;flex:0 0 auto;'
            f'background:conic-gradient({fg} 0 75%, rgba(0,0,0,0.12) 75% 100%);display:grid;place-items:center">'
            f'<span style="width:10px;height:10px;border-radius:999px;background:{bg};display:grid;place-items:center;color:{fg}">'
            f'{ico("check", 8, 2.6)}</span></span>'
            f'<span style="font-size:13px;font-weight:600;color:{INK};white-space:nowrap">Vastgelegd</span>'
            f'<span style="font-size:12px;color:{SOFT};white-space:nowrap">· 3 s</span>'
            f'</div>'
            f'<div style="display:flex;align-items:center;gap:8px;min-width:0">'
            f'<button style="height:20px;padding:0;border:0;background:transparent;font-size:12px;font-weight:600;color:{INK};white-space:nowrap">Ongedaan maken</button>'
            f'<span style="font-size:12px;color:{SOFT};white-space:nowrap">tik = nu</span>'
            f'</div></div>')


def rtile(ref, naam, st=None, open_punt='', bevestigd=False):
    # Zelfde kaarthoogte/breedte; alleen de onderste 44px-staat wisselt.
    # open_punt wordt niet meer op de toetskaart getoond (rode actieverwijzing eraf, ronde 6)
    onder = bevestigd_inline() if bevestigd else (oc(st, 28) if st else in_orde_btn(naam))
    # hele kaart is het tikvlak naar de sheet; de snelle knop ligt erboven
    return (f'<div style="position:relative;border-radius:18px;background:{TINT};padding:6px 8px 6px 10px;display:flex;flex-direction:column;gap:4px">'
            f'<a aria-label="{ref} {naam} openen" style="position:absolute;inset:0;border-radius:18px"></a>'
            f'<div style="min-height:36px"><div style="font-size:15px;font-weight:600;line-height:18px">{naam}</div></div>'
            f'<div style="height:44px;display:flex;align-items:center;position:relative">{onder}</div></div>')


def sec_btn(icon, text):
    return (f'<button style="flex:1;height:48px;border-radius:16px;background:{P["mist"][0]};display:flex;align-items:center;'
            f'justify-content:center;gap:8px;font-size:15px;font-weight:600">{ico(icon, 20)}{text}</button>')


def p04_body(toast_html=''):
    tiles = [('DAM-2.01', 'Vallen van hoogte', 'C'), ('DAM-2.02', 'Fysieke belasting', None),
             ('DAM-2.03', 'Vallen van de last', 'V'), ('DAM-2.04', 'Beknelling en pletten', None, 'C1-1 over termijn'),
             ('DAM-2.05', 'Begeleiden van de last …', None), ('DAM-2.06', 'Biologische Agentia', 'A'),
             ('DAM-2.07', 'Besloten ruimte', 'A'), ('DAM-2.08', 'Plotseling verschuiven', None)]
    # Alleen de zojuist getikte kaart (Vallen van hoogte) toont de inline bevestiging.
    grid = rtile('DAM-2.01', 'Vallen van hoogte', 'C', bevestigd=True) + ''.join(rtile(*t) for t in tiles[1:])
    knoppen = (f'<div style="display:flex">{info_btn("Algemene onderwerpen", "list")}{info_btn("Nog een taak of stap toetsen", "plus")}</div>')
    return f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Toetsen · Damwand · TRA rev. 3', 'Verwijderen damwand', knoppen)}
<div style="position:absolute;left:24px;right:24px;top:184px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start">{grid}</div>
{toast_html}
{gevaar()}
{dock('Klaar met toetsen', 'check', True)}'''


def p04():
    # Geen zwevende toast meer: bevestiging zit inline op de kaart zelf (besluit 1).
    return phone('P04 · Toetsen', p04_body())


def mkeuze(naam, selected=False, last=False):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    mark = (f'<span style="width:28px;height:28px;border-radius:50%;background:{INK};color:#fff;display:flex;align-items:center;justify-content:center;flex:none">{ico("check", 16, 2.4)}</span>'
            if selected else f'<span style="width:28px;height:28px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #C9CED6;flex:none"></span>')
    return (f'<a aria-pressed="{str(selected).lower()}" style="display:flex;align-items:center;gap:12px;min-height:48px;padding:6px 0;{b}">'
            f'<div style="flex:1;font-size:15px;line-height:1.3;font-weight:{600 if selected else 500}">{naam}</div>{mark}</a>')


def p04_detail():
    lijst = (mkeuze('Mechanische ventilatie (indien nodig)') + mkeuze('Continue 4-gasmeting', True)
             + mkeuze('Werkvergunning besloten ruimte')
             + mkeuze('Aangestelde mangatwacht met communicatiemiddelen (indien nodig)', last=True))
    body = f'''
  <div style="margin-top:12px;display:flex;align-items:center;gap:8px;font-size:14px;color:{SOFT};font-weight:500">Welke maatregel zag je?</div>
  <div style="margin-top:4px">{lijst}</div>
  <div style="margin-top:10px;border-radius:20px;padding:10px 10px 12px 16px;box-shadow:0 0 0 1px {LINE}">
    <div style="display:flex;align-items:center;gap:8px">{label('Jij', 'jij')}<span style="flex:1"></span>
      {round_btn('camera', label='Foto bij deze maatregel')}{round_btn('mic', label='Inspreken bij deze maatregel')}</div>
    <div style="font-size:16px;line-height:1.45;margin-top:4px">“Gasmeter hangt boven aan de ladder, niet bij de man.”</div>
  </div>
  <div style="margin-top:12px">{kies_rij('A')}</div>'''
    bottom = f'<button style="height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Vastleggen</button>'
    return phone('P04 · Risico (sheet)', p04_body() + sheet(84, 'Besloten ruimte, DAM-2.07', 'DAM-2.07 · TRA Damwand rev. 3', 'Besloten ruimte', body, bottom))


# ======================= P03 algemene onderwerpen: geheugensteun (sheet over P04) =======================
def onderwerp(letter, naam, state=None, last=False):
    b = '' if last else f'border-bottom:1px solid {LINE};'
    right = oc(state) if state else in_orde_btn(naam)
    return (f'<div style="display:flex;align-items:center;gap:12px;min-height:54px;padding:4px 0;{b}">'
            f'<a aria-label="{letter} {naam} openen" style="display:flex;align-items:center;gap:12px;flex:1;min-height:44px">'
            f'<span style="width:32px;height:32px;border-radius:10px;background:{P["mist"][0]};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex:none">{letter}</span>'
            f'<span style="flex:1;font-size:16px;font-weight:500;line-height:1.3">{naam}</span></a>{right}</div>')


ONDERWERPEN = [('A', 'Voorbereiding en documenten'), ('B', 'Veiligstellen (LOTOTO)'), ('C', 'PBM'),
               ('D', 'Arbeidsmiddelen en gereedschap'), ('E', 'Hijsen en kraan'), ('F', 'Werkplek en omgeving'),
               ('G', 'Gevaarlijke stoffen, hygiëne en milieu'), ('H', 'Noodvoorzieningen'), ('I', 'Gedrag en samenwerking')]


def p03():
    st = {'A': 'A', 'B': 'C', 'C': 'C', 'D': 'C', 'E': 'C'}
    lst = ''.join(onderwerp(l, n, st.get(l), i == len(ONDERWERPEN) - 1) for i, (l, n) in enumerate(ONDERWERPEN))
    body = f'<div style="margin-top:8px">{lst}</div>'
    return phone('P03 · Algemeen (geheugensteun)', p04_body() + sheet(76, 'Algemene onderwerpen', 'Geheugensteun · niet verplicht', 'Algemeen', body))


def p03c():
    body = f'''
  <div style="margin-top:14px;border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px {LINE}">
    <div style="padding:12px 12px 12px 16px">
      <div style="display:flex;align-items:center;gap:8px">{label('Jij', 'jij')}<span style="flex:1;font-size:14px;color:{SOFT}">op toestel · 0:14</span>
        {round_btn('camera', label='Foto bij dit onderwerp')}{round_btn('mic', label='Opnieuw inspreken')}</div>
      <div style="font-size:16px;line-height:1.45;margin-top:4px">“Geen handenwasset in de bus.”</div>
    </div>
    <div style="padding:10px 16px;background:{P['mist'][0]};display:flex;align-items:center;gap:10px;font-size:14px;color:{SOFT};font-weight:500">
      {svg(CLOUD_OFF, 18)}Voorstel volgt bij bereik</div>
  </div>
  <div style="margin-top:16px;font-size:14px;color:{SOFT};font-weight:500">Jouw oordeel</div>
  <div style="margin-top:8px">{kies_rij('A')}</div>'''
    bottom = f'<button style="height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Vastleggen</button>'
    base = p04_body().replace(online(), offline_chip())
    return phone('P03c · Onderwerp G', base + sheet(250, 'Onderwerp G', 'Algemeen · G', 'Gevaarlijke stoffen, hygiëne en milieu', body, bottom, terug='Terug naar onderwerpen'))


# ======================= P05 inspreken / voorstel bevestigen =======================
def p05():
    inner = f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Ingesproken', 'Klopt dit?')}
<div style="position:absolute;left:24px;right:24px;top:222px;border-radius:22px;overflow:hidden;box-shadow:0 0 0 1px {LINE}">
  <div style="padding:14px 18px;background:#fff">
    <div style="display:flex;align-items:center;gap:10px">{label('Jij', 'jij')}<span style="font-size:14px;color:{SOFT}">op toestel · 0:24</span></div>
    <div style="font-size:16px;line-height:1.45;margin-top:10px">“Hijsen staat niet apart op de LMRA, alleen mondeling besproken.”</div>
  </div>
  <div style="padding:16px 18px 6px;background:{P['lilac'][0]}">
    <div style="display:flex;align-items:center;gap:10px">{label('Voorstel', 'ai')}<span style="font-size:14px;color:{SOFT}">DAM-2.03 · Individueel</span></div>
    <div style="font-size:22px;font-weight:600;letter-spacing:-.01em;margin-top:12px"><mark style="{MARK}">LMRA voor het hijsen</mark></div>
    <a style="display:flex;align-items:center;height:48px;margin-top:6px;border-top:1px solid #DCD3F7;font-size:16px;font-weight:600;color:{ACCENT}">
      <span style="flex:1">Andere maatregel</span>{ico('chev', 20)}</a>
  </div>
</div>
<div style="position:absolute;left:24px;right:24px;top:506px;display:flex;gap:10px">
  <button style="flex:1;height:56px;border-radius:18px;background:{P['mist'][0]};font-size:16px;font-weight:600">Aanpassen</button>
  <button style="flex:1;height:56px;border-radius:18px;background:{P['mist'][0]};font-size:16px;font-weight:600">Overslaan</button>
</div>
{gevaar()}
{dock('Vastleggen', 'check', True)}'''
    return phone('P05 · Inspreken bevestigen', inner)


def build():
    files = {
        'P01-start': p01(),
        'P01s-spontaan': p01s(),
        'P01b-overige-punten': p01b(),
        'P02-product-taak': p02(),
        'P03-algemeen': p03(),
        'P03c-onderwerp': p03c(),
        'P04-tra-toetsing': p04(),
        'P04-detail': p04_detail(),
        'P05-inspreken': p05(),
    }
    for k, v in files.items():
        open(f'{OUT}/{k}.html', 'w').write(v)
    print('ok', list(files))


if __name__ == '__main__':
    build()
