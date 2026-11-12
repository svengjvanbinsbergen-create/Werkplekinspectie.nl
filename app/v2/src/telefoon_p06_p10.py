# v2-schermen P06–P10b (telefoon), ronde 4.
# Kop, Direct gevaar, onderbalk, sheet, labels en oordeelchips komen uit telefoon.py (leidende bouwsteen van P01–P05).
# Feiten: voorbeelddata.json v10.4 (WPI-20261105-DAM-C2 en acties), kennisbank.json (DAM-2.07). Alles fictief.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import telefoon as T
from telefoon import (phone, head, titleblock, gevaar, dock, sheet, tabbar, label, standaard_chip, oc, status,
                      round_btn, chip, icotile, online, fictief, P, INK, SOFT, DARK, LINE, ACCENT, CARD, RED)

OUT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'screens', 'phone'))
GREEN = '#1E7A4C'
ACTIE = 'Montagewagen van deze ploeg aanvullen met een handenwasset (jerrycan, zeep, papier, desinfectiegel).'  # letterlijk uit voorbeelddata
ACTIE_ID = 'WPI-20261105-DAM-C2-2'
EXTRA = {
    'pen': '<path d="M4 20l4.2-1 10.3-10.3a2.1 2.1 0 0 0-3-3L5.2 16 4 20z"/><path d="M13.5 7.5l3 3"/>',
    'blur': '<circle cx="12" cy="12" r="8.5" stroke-dasharray="2.2 2.6"/><circle cx="12" cy="12" r="3.5"/>',
    'share': '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6.5 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5"/>',
    'eye': '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'keyboard': T.KEYS,
}


def ico(name, size=24, sw=1.75, color='currentColor'):
    if name in EXTRA:
        return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
                f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{EXTRA[name]}</svg>')
    return T.ico(name, size, sw, color)


def grijs(t):
    # Standaard-herkomst als kleine grijze tekst (in kaarten met meerdere waarden)
    return f'<span style="font-size:14px;color:{SOFT};white-space:nowrap">{t}</span>'


def jij(text, meta=None, pad=12):
    m = f'<div style="font-size:14px;color:{SOFT};margin-top:4px">{meta}</div>' if meta else ''
    return (f'<div style="padding:{pad}px 16px;background:#fff;display:flex;gap:12px;align-items:baseline">{label("Jij", "jij")}'
            f'<div style="flex:1"><div style="font-size:16px;line-height:1.45">{text}</div>{m}</div></div>')


def voorstel(text):
    return (f'<div style="padding:12px 16px;background:{P["lilac"][0]};display:flex;gap:12px;align-items:baseline">{label("Voorstel", "ai")}'
            f'<div style="flex:1;font-size:16px;line-height:1.45">{text}</div></div>')


def wacht_bereik(lab):
    return (f'<div style="padding:12px 16px;background:{P["mist"][0]};display:flex;gap:10px;align-items:center;min-height:48px">'
            f'<span style="color:{SOFT}">{ico("clock", 18)}</span>'
            f'<div style="flex:1;font-size:14px;color:{SOFT}"><span style="font-weight:600;color:{INK}">{lab}</span> · voorstel volgt bij bereik</div></div>')


def dock2(primary, reden, icon='check'):
    return dock(primary, icon, reden=reden)  # bouwsteen telefoon.py: reden eindigt boven y 810


def sheet_zonder_gevaar(top, aria, kicker, title, body, bottom=''):
    # zelfde sheetkop als telefoon.sheet (sluitknop links, titel 22), zonder Direct gevaar: toetsen is geen inspectiestap
    return (f'<div style="position:absolute;inset:0;background:rgba(20,26,34,.38)"></div>'
            f'<div role="dialog" aria-label="{aria}" style="position:absolute;left:0;right:0;top:{top}px;bottom:0;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -8px 32px rgba(20,26,34,.16);padding:0 24px">'
            f'<div style="width:40px;height:5px;border-radius:3px;background:#C9CED6;margin:10px auto 0"></div>'
            f'<div style="display:flex;align-items:center;gap:14px;margin-top:12px">{round_btn("close", label="Sluiten")}'
            f'<div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">{kicker}</div>'
            f'<div style="font-size:22px;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin-top:2px">{title}</div></div></div>{body}'
            f'<div style="position:absolute;left:24px;right:24px;bottom:24px;display:flex;flex-direction:column;gap:12px">{bottom}</div></div>')


def card(top, inner):
    return f'<div style="position:absolute;left:24px;right:24px;top:{top}px;overflow:hidden;{CARD}">{inner}</div>'


def okknop(aria, txt=''):
    # bevestigen in de kaart: ronde ✓ (of pil met tekst), neutraal
    if txt:
        return (f'<button aria-label="{aria}" style="height:48px;padding:0 16px;border-radius:999px;background:{DARK};color:#fff;'
                f'font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:6px;flex:none">{ico("check", 18, 2.2)}{txt}</button>')
    return (f'<button aria-label="{aria}" style="width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 1px #C9CED6;'
            f'display:inline-flex;align-items:center;justify-content:center;flex:none;color:{INK}">{ico("check", 20, 2.2)}</button>')


def photo(h, blur=True, mark=True, small=False):
    # voorbeeldafbeelding: kanaal met ladder en gasmeter, getekend (geen echte foto)
    svg = f'''<svg width="100%" height="100%" viewBox="0 0 342 {h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D3DE"/><stop offset="1" stop-color="#8E9BAA"/></linearGradient></defs>
<rect width="342" height="{h}" fill="url(#g)"/>
<rect x="0" y="{h*0.62:.0f}" width="342" height="{h*0.38:.0f}" fill="#6F7C8B"/>
<rect x="40" y="0" width="22" height="{h}" fill="#5D6977" opacity=".55"/>
<g stroke="#3F4A57" stroke-width="5" stroke-linecap="round"><line x1="150" y1="-4" x2="150" y2="{h+4}"/><line x1="196" y1="-4" x2="196" y2="{h+4}"/>
''' + ''.join(f'<line x1="150" y1="{y}" x2="196" y2="{y}"/>' for y in range(18, h, 34)) + f'''</g>
<rect x="204" y="34" width="26" height="40" rx="5" fill="#E8B23A"/><rect x="209" y="40" width="16" height="12" rx="2" fill="#2B333D"/>
<circle cx="268" cy="{h*0.74:.0f}" r="20" fill="#D9C7B8"/><rect x="250" y="{h*0.74+16:.0f}" width="36" height="40" rx="10" fill="#E07A2E"/>
</svg>'''
    b = ''
    if blur:
        b = (f'<div style="position:absolute;left:236px;top:{h*0.74-34:.0f}px;width:64px;height:64px;border-radius:50%;'
             f'backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);background:rgba(217,199,184,.55)"></div>')
    m = ''
    if mark:
        m = (f'<div style="position:absolute;left:190px;top:20px;width:54px;height:68px;border-radius:50%;border:3px solid #FFD43B"></div>'
             f'<span style="position:absolute;left:236px;top:12px;width:26px;height:26px;border-radius:50%;background:#FFD43B;color:{INK};font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">1</span>')
    return f'{svg}{b}{m}'


def setfoto(h):
    # voorbeeldafbeelding: handenwasset in de bus (jerrycan, zeep, papier)
    return f'''<svg width="100%" height="100%" viewBox="0 0 96 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<rect width="96" height="96" fill="#D7DCE2"/><rect y="64" width="96" height="32" fill="#9AA4AF"/>
<rect x="12" y="30" width="30" height="40" rx="5" fill="#2F6FB5"/><rect x="18" y="24" width="10" height="8" rx="2" fill="#24558C"/>
<rect x="48" y="40" width="12" height="30" rx="4" fill="#F2F4F6"/><rect x="51" y="34" width="6" height="7" rx="1.5" fill="#3E9B6B"/>
<rect x="64" y="46" width="22" height="24" rx="11" fill="#FFFFFF"/><circle cx="75" cy="58" r="4" fill="#C9CED6"/>
</svg>'''



# ======================= P06 foto =======================
def p06():
    tool = lambda icon, lab: (
        f'<button style="flex:1;height:52px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #C9CED6;color:{INK};'
        f'display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:16px;font-weight:600">{ico(icon, 20)}{lab}</button>')
    info = (f'<button aria-label="Privacy bij foto\'s" style="position:absolute;right:4px;top:4px;width:48px;height:48px;display:flex;align-items:center;justify-content:center">'
            f'<span style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;color:{INK}">{ico("info", 18)}</span></button>')
    inner = f'''
{head(round_btn('back', label='Terug'), True)}
{titleblock('DAM-2.07 · Continue 4-gasmeting', 'Foto 1')}
<div style="position:absolute;left:24px;right:24px;top:190px;height:206px;border-radius:24px;overflow:hidden">{photo(206)}{info}</div>
<div style="position:absolute;left:24px;right:24px;top:408px;display:flex;gap:10px">{tool('pen', 'Markeren')}{tool('blur', 'Vervagen')}</div>
{card(476, jij('“Gasmeter hangt boven aan de ladder, niet bij de man.”', '0:09 · op toestel') + wacht_bereik('Toelichting'))}
{gevaar()}
{dock('Vastleggen', 'check', True)}'''
    return phone('P06 · Foto', inner)


# ======================= P07 actie: vier blokken, vier tikken =======================
def prio_n(lab, sel=False):
    if sel:
        sty, chk = f'background:#FFF1DC;color:#8A4B00;box-shadow:inset 0 0 0 2px #8A4B00', ico('check', 18, 2.2)
    else:
        sty, chk = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6', ''
    return (f'<button aria-pressed="{str(sel).lower()}" style="flex:1;height:52px;border-radius:999px;{sty};'
            f'display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:16px;font-weight:600">{chk}{lab}</button>')


def keuze(lab, sel=False):
    if sel:
        sty, chk = f'background:#FFF1DC;color:#8A4B00;box-shadow:inset 0 0 0 2px #8A4B00', ico('check', 16, 2.4)
    else:
        sty, chk = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6', ''
    return (f'<button aria-pressed="{str(sel).lower()}" style="flex:1;height:48px;border-radius:999px;{sty};'
            f'display:inline-flex;align-items:center;justify-content:center;gap:5px;font-size:15px;font-weight:600;white-space:nowrap">{chk}{lab}</button>')


MAATREGEL = 'Water, zeep en papier uit het bedrijfsgebouw gehaald en bij de werkplek gezet, vóór de monteurs verder gingen.'  # direct_genomen_maatregel C2-2


def kop07(offline):
    titel = 'Nieuwe actie <span style="vertical-align:5px;margin-left:6px">' + oc('A') + '</span>'
    return head(round_btn('back', label='Terug'), offline) + titleblock('G · Gevaarlijke stoffen, hygiëne en milieu', titel)


def p07_body(offline=False):
    # stap 1 van 2: wat moet er gebeuren (Jij + verbeteractie, prioriteit)
    chev = f'<span style="color:{SOFT};display:inline-flex">{ico("chev", 18)}</span>'
    if not offline:
        vs = (f'<div style="padding:4px 16px 12px;background:{P["lilac"][0]};border-top:1px solid #E1D9FA">'
              f'<div style="display:flex;align-items:center;gap:8px;height:56px">{label("Voorstel", "ai")}<div style="flex:1"></div>'
              f'<button aria-label="Verbeteractie aanpassen" style="flex:none;width:48px;height:48px;border-radius:50%;background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6;display:inline-flex;align-items:center;justify-content:center">{ico("pen", 18)}</button>'
              f'{okknop("Verbeteractie overnemen", "Overnemen")}</div>'
              f'<div style="font-size:16px;line-height:1.4">{ACTIE}</div></div>')
        blok1 = jij('“Geen handenwasset in de bus.”', '0:14') + vs
        onder = dock2('Volgende', 'eerst voorstel', 'chev')
    else:
        veld = (f'<a style="display:flex;align-items:center;gap:12px;padding:0 16px;height:64px;background:{P["mist"][0]};border-top:1px solid {LINE}">'
                f'<span style="color:{SOFT}">{ico("keyboard", 20)}</span>'
                f'<div style="flex:1;font-size:16px;color:{SOFT};white-space:nowrap">Verbeteractie typen</div>{grijs("voorstel bij bereik")}</a>')
        blok1 = jij('“Geen handenwasset in de bus.”', '0:14 · op toestel') + veld
        onder = dock2('Volgende', 'eerst actie', 'chev')
    return f'''
{kop07(offline)}
<div style="position:absolute;left:24px;right:24px;top:186px;display:flex;flex-direction:column;gap:14px">
  <div style="overflow:hidden;{CARD}">{blok1}</div>
  <div>
    <div style="height:28px;display:flex;align-items:center;gap:8px"><span style="font-size:14px;color:{SOFT};font-weight:500">Prioriteit</span>{label('Jij', 'jij')}</div>
    <div style="display:flex;gap:8px;margin-top:4px">{keuze('Direct')}{keuze('Kort', True)}{keuze('Planmatig')}</div>
  </div>
  <a aria-label="Wie en wanneer, standaard ingevuld" style="display:flex;align-items:center;gap:10px;padding:0 16px;height:60px;{CARD}">
    <span style="color:{SOFT};display:inline-flex">{ico('person', 18)}</span>
    <div style="flex:1"><div style="font-size:14px;color:{SOFT}">Wie en wanneer · Standaard</div><div style="font-size:16px">Coördinator 2 · do 19 nov</div></div>{chev}</a>
</div>
{gevaar()}
{onder}'''


def p07():
    return phone('P07 · Actie: wat', p07_body())


def p07b():
    return phone('P07b · Actie offline', p07_body(True))


# ======================= P07d wie en wanneer (stap 2 van 2) =======================
def p07d_body():
    chev = f'<span style="color:{SOFT};display:inline-flex">{ico("chev", 18)}</span>'
    rij = lambda icon, lab, waarde, rechts, last=False: (
        f'<div style="display:flex;align-items:center;gap:10px;min-height:60px;{"" if last else f"border-bottom:1px solid {LINE};"}">'
        f'<span style="color:{SOFT};display:inline-flex">{ico(icon, 18)}</span>'
        f'<div style="flex:1;white-space:nowrap"><div style="font-size:14px;color:{SOFT}">{lab}</div><div style="font-size:16px">{waarde}</div></div>{rechts}</div>')
    # Besluit 2: geen per-rij bevestiging meer; alles auto-ingevuld met "Standaard" + aanpasbaar via tik.
    rijen = (rij('person', 'Actiehouder', 'Coördinator 2', standaard_chip() + chev)
             + rij('cal', 'Termijn · kort', 'do 19 nov', standaard_chip() + chev)
             + rij('shield', 'Toetser', 'Hoofd S&amp;M', standaard_chip() + chev, True))
    tp = (f'<div style="padding:8px 16px 12px;background:{P["lilac"][0]};border-radius:22px">'
          f'<div style="display:flex;align-items:center;gap:8px">{label("Voorstel", "ai")}<span style="font-size:14px;color:{SOFT};flex:1">uit jouw transcript</span>{okknop("Maatregel ter plaatse bevestigen")}</div>'
          f'<div style="font-size:16px;line-height:1.4;margin-top:4px">{MAATREGEL}</div></div>')
    return f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Nieuwe actie · samenvatting', 'Wie en wanneer')}
<div style="position:absolute;left:24px;right:24px;top:186px;display:flex;flex-direction:column;gap:12px">
  <div style="padding:0 16px;{CARD}">{rijen}</div>
  <div>
    <div style="height:28px;display:flex;align-items:center;gap:8px"><span style="font-size:14px;color:{SOFT};font-weight:500">Ter plaatse</span>{label('Jij', 'jij')}</div>
    <div style="display:flex;gap:8px;margin-top:4px">{keuze('Niets')}{keuze('Maatregel', True)}{keuze('Opgelost')}</div>
  </div>
  {tp}
</div>
{gevaar()}
{dock2('Vastleggen', 'nog 2')}'''


def p07d():
    return phone('P07d · Actie: wie en wanneer', p07d_body())


# ======================= P07e nog een actie bij dit punt? (na Vastleggen) =======================
def p07e():
    body = (f'<div style="margin-top:18px;display:flex;align-items:center;gap:12px">'
            f'{icotile("check", P["sage"][1], 44, 22, 14, "#2F5D1E")}'
            f'<div><div style="font-size:16px;font-weight:600">{ACTIE_ID}</div>'
            f'<div style="font-size:14px;color:{SOFT}">Coördinator 2 · kort · do 19 nov</div></div></div>')
    bottom = (f'<div style="display:flex;gap:12px">'
              f'<button style="flex:1;height:56px;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1px #C9CED6;font-size:16px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px">{ico("plus", 18, 2)}Nog een actie</button>'
              f'<button style="flex:1;height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Klaar</button></div>')
    return phone('P07e · Nog een actie?', p07d_body() + sheet(470, 'Actie vastgelegd', 'Vastgelegd · G · Gevaarlijke stoffen', 'Nog een actie bij dit punt?', body, bottom))


# ======================= P07c termijn (sheet over P07) =======================
def p07c():
    days = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
    cells = [''] * 6 + list(range(1, 31))
    while len(cells) % 7:
        cells.append('')
    hdr = ''.join(f'<div style="height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;color:{SOFT};font-weight:500">{d}</div>' for d in days)
    grid = ''
    for c in cells:
        if c == '':
            grid += '<div></div>'
            continue
        sty = (f'background:#FFF1DC;color:#8A4B00;font-weight:700;box-shadow:inset 0 0 0 2px #8A4B00' if c == 19 else
               f'background:{P["mist"][0]};font-weight:700' if c == 5 else f'color:{"#6B7480" if c < 5 else INK}')
        lab = ' aria-label="donderdag 19 november, standaard bij kort" aria-pressed="true"' if c == 19 else ''
        grid += (f'<button{lab} style="height:48px;display:flex;align-items:center;justify-content:center">'
                 f'<span class="num" style="width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;{sty}">{c}</span></button>')
    body = f'''
  <div style="margin-top:14px;display:flex;align-items:center;gap:8px">{standaard_chip()}{grijs('kort · 14 dagen')}</div>
  <div style="margin-top:14px;font-size:16px;font-weight:600">November 2026</div>
  <div style="margin-top:6px;display:grid;grid-template-columns:repeat(7,1fr)">{hdr}{grid}</div>'''
    bottom = f'<button style="height:56px;border-radius:18px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Do 19 november</button>'
    return phone('P07c · Termijn', p07d_body() + sheet(150, 'Termijn kiezen', 'Actie · Kort', 'Termijn', body, bottom))


# ======================= P08a gesprek met monteurs (vaste stap vóór afsluiten) =======================
IDEE_5 = 'Idee van de monteurs uitwerken: klem of karabijn uitzoeken…'  # C2-5, eerste deel; volledige tekst achter een tik
IDEE_9 = 'Handenwasset als vaste uitrusting van elke montagewagen op de voorraadlijst zetten.'


def p08a():
    def idee(tekst, meta, last=False):
        return (f'<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 16px;{"" if last else "border-bottom:1px solid #E1D9FA;"}">'
                f'<div style="flex:1"><div style="font-size:16px;line-height:1.4">{tekst}</div>'
                f'<div style="display:flex;align-items:center;gap:8px;margin-top:6px">{label("Voorstel", "ai")}<span style="font-size:14px;color:{SOFT}">{meta}</span></div></div>{okknop("Idee overnemen als actie")}</div>')
    ideeen = (idee(IDEE_9, 'G · planmatig') + idee(IDEE_5, 'DAM-2.07 · planmatig', True))
    inner = f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Damwand · 2 monteurs · 2 ideeën', 'Gesprek met monteurs')}
<div style="position:absolute;left:24px;right:24px;top:186px;display:flex;flex-direction:column;gap:10px">
  <div style="overflow:hidden;{CARD}">{jij('“Gasmeter zit bij het afdalen in de weg. Handenwasset vast in elke wagen.”', '0:31')}</div>
  <div style="overflow:hidden;background:{P['lilac'][0]};border-radius:22px">{ideeen}</div>
</div>
{gevaar()}
{dock2('Vastleggen', 'nog 2')}'''
    return phone('P08a · Gesprek met monteurs', inner)


# ======================= P08 afronden (koers 2: momentopname, geen afsluitvraag) =======================
def p08():
    # tellingen uit voorbeelddata v11, WPI-20261105-DAM-C2: 15 regels (8 onderwerpen, 7 TRA-regels); C 10, A 4 (8 acties), V 1 (1 actie)
    chev = f'<span style="color:{SOFT};display:inline-flex">{ico("chev", 18)}</span>'
    getoetst = (f'<a style="display:flex;align-items:center;gap:12px;padding:12px 16px;min-height:72px">'
                f'{icotile("clip", P["mist"][0], 40, 20, 12)}'
                f'<div style="flex:1"><div style="font-size:14px;color:{SOFT};font-weight:500">Getoetst tijdens bezoek</div>'
                f'<div style="font-size:16px;font-weight:600;margin-top:2px">Verwijderen damwand</div>'
                f'<div style="font-size:14px;color:{SOFT};margin-top:2px">7 TRA-regels · 8 onderwerpen</div></div>{chev}</a>')
    rij = lambda code, n, meta, last=False: (
        f'<a style="display:flex;align-items:center;gap:10px;min-height:64px;padding:8px 16px;{"" if last else f"border-bottom:1px solid {LINE};"}">'
        f'<div style="flex:1"><div>{oc(code).replace("</span>", f" · {n}</span>")}</div>'
        f'<div style="font-size:14px;color:{SOFT};margin-top:4px">{meta}</div></div>{chev}</a>')
    bevindingen = (rij('C', 10, 'o.a. Veiligstellen, PBM, Hijsen en kraan')
                   + rij('A', 4, '8 acties')
                   + rij('V', 1, '1 actie', True))
    controle = (f'<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:{GREEN};font-weight:600">'
                f'{ico("check", 18, 2.2)}Elke [A] en [V] heeft een actie</div>')
    foto = (f'<a style="padding:0 16px;min-height:56px;display:flex;gap:10px;align-items:center;background:{P["lilac"][0]};border-radius:18px">'
            f'<span style="color:{INK};display:inline-flex">{ico("camera", 20)}</span><span style="flex:1;font-size:16px">Foto 1 · toelichting</span>'
            f'{label("Voorstel", "ai")}{chev}</a>')
    inner = f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Damwand · WPI-20261105-DAM-C2', 'Afronden')}
<div style="position:absolute;left:24px;right:24px;top:186px;display:flex;flex-direction:column;gap:12px">
  <div style="overflow:hidden;{CARD}">{getoetst}</div>
  <div style="overflow:hidden;{CARD}">{bevindingen}</div>
  {controle}
  {foto}
</div>
{gevaar()}
{dock2('Afronden', 'eerst foto 1')}'''
    return phone('P08 · Afronden', inner)


# ======================= P09 rapport klaar =======================
def p09():
    page = (f'<div style="width:92px;height:124px;background:#fff;border-radius:8px;box-shadow:0 4px 14px rgba(20,26,34,.12);padding:10px;flex:none">'
            f'<div style="height:8px;width:60%;background:{INK};border-radius:2px"></div>'
            f'<div style="height:5px;width:80%;background:{LINE};border-radius:2px;margin-top:8px"></div>'
            f'<div style="display:flex;gap:3px;margin-top:10px">' +
            ''.join(f'<span style="flex:{n};height:6px;background:{c}"></span>' for n, c in ((10, '#2F8A5B'), (4, '#C8473D'), (1, '#C98A1E'))) +
            '</div>' + ''.join(f'<div style="height:5px;width:{w}%;background:{LINE};border-radius:2px;margin-top:6px"></div>' for w in (90, 70, 85, 60, 75, 50)) +
            '</div>')
    inner = f'''
{head(round_btn('close', label='Sluiten'), True)}
{titleblock('WPI-20261105-DAM-C2 · Damwand', 'Rapport klaar')}
<span style="position:absolute;right:24px;top:114px">{icotile('check', P['sage'][1], 56, 28, 18, '#2F5D1E')}</span>
<a style="position:absolute;left:24px;right:24px;top:204px;height:168px;border-radius:24px;background:{P['sky'][0]};padding:22px;display:flex;gap:20px;align-items:center">
  {page}
  <div style="flex:1"><div style="font-size:15px;color:{SOFT};font-weight:500">Rapport</div>
  <div style="font-size:22px;font-weight:600;letter-spacing:-.01em;margin-top:4px">9 onderdelen</div>
  <div style="font-size:14px;color:{SOFT};margin-top:6px">15 regels · 1 foto · 9 acties</div></div>
  <span style="color:{INK}">{ico('chev', 22)}</span>
</a>
<a style="position:absolute;left:24px;right:24px;top:392px;height:96px;border-radius:24px;background:{P['butter'][0]};padding:0 20px;display:flex;gap:14px;align-items:center">
  {icotile('device', '#fff', 44, 22, 14)}
  <div style="flex:1"><div style="font-size:17px;font-weight:600">Op deze telefoon</div>
  <div style="font-size:14px;color:{SOFT};margin-top:2px">3 wachten op bereik</div></div>
  <span style="color:{INK}">{ico('chev', 22)}</span>
</a>
<div style="position:absolute;left:24px;right:24px;bottom:40px;display:flex;gap:12px">
  <button style="flex:1;height:60px;border-radius:20px;background:{P['mist'][0]};font-size:17px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px">{ico('eye', 20)}Bekijken</button>
  <button style="flex:1;height:60px;border-radius:20px;background:{DARK};color:#fff;font-size:17px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px">{ico('share', 20)}Delen</button>
</div>'''
    return phone('P09 · Rapport klaar', inner)


# ======================= P10 acties (toetser) =======================

# ======================= P10 acties (toetser) =======================
def seg(items, active):
    out = ''
    for lab, n in items:
        a = lab == active
        out += (f'<button aria-pressed="{str(a).lower()}" style="flex:1;height:48px;border-radius:12px;'
                f'{"background:#fff;box-shadow:0 2px 8px rgba(20,26,34,.10);font-weight:600;" if a else f"color:{SOFT};font-weight:500;"}'
                f'font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px">{lab}'
                f'<span class="num" style="min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:{DARK if a else P["mist"][1]};color:{"#fff" if a else INK};font-size:12px;font-weight:600;display:inline-flex;align-items:center;justify-content:center">{n}</span></button>')
    return f'<div role="tablist" style="height:56px;padding:4px;border-radius:16px;background:{P["mist"][0]};display:flex;gap:4px">{out}</div>'


def status_chip(t):
    return chip(t, P['sky'][1], '#1F3F66', P['sky'][1], 28, 14, 600)


def p10_list():
    inner = f'''
{head('')}
{titleblock('Hoofd Service &amp; Montage · wo 11 nov', 'Acties')}
<div style="position:absolute;left:24px;right:24px;top:188px">{seg([('Te toetsen', 1), ('Zelf uitvoeren', 6)], 'Te toetsen')}</div>
<a style="position:absolute;left:24px;right:24px;top:258px;height:286px;border-radius:24px;background:#fff;padding:20px;box-shadow:0 6px 24px rgba(20,26,34,.07),0 0 0 1px {LINE};display:block">
  <div style="display:flex;justify-content:space-between;align-items:flex-start"><span style="display:inline-flex;gap:6px">{status_chip('Uitgevoerd gemeld')}{chip('Voorbeeldscenario', '#fff', SOFT, '#C9CED6', 28, 14, 500)}</span></div>
  <div style="font-size:18px;font-weight:600;line-height:1.3;margin-top:8px">{ACTIE}</div>
  <div style="font-size:14px;color:{SOFT};margin-top:6px">Kort · do 19 nov · Coördinator 2 (fictief)</div>
  <button style="position:absolute;left:20px;right:20px;bottom:18px;height:52px;border-radius:16px;background:{DARK};color:#fff;font-size:16px;font-weight:600">Toetsen</button>
</a>
<div style="position:absolute;left:24px;right:24px;top:558px;display:flex;gap:12px">
  <a style="flex:1;height:140px;background:{P['mist'][0]};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:15px;color:{SOFT};font-weight:500">Lopend</div>
    <div class="num" style="font-size:40px;font-weight:600;margin-top:10px;line-height:1">10</div>
    <div style="font-size:14px;color:{SOFT};margin-top:10px">jij toetst</div>
    <span style="position:absolute;right:16px;bottom:16px">{ico('arrow', 20)}</span></a>
  <a style="flex:1;height:140px;background:{P['blush'][0]};border-radius:24px;padding:18px;position:relative;display:block">
    <div style="font-size:15px;color:{SOFT};font-weight:500">Over termijn</div>
    <div class="num" style="font-size:40px;font-weight:600;margin-top:10px;line-height:1;color:{RED}">3</div>
    <div style="font-size:14px;color:{SOFT};margin-top:10px">zelf uitvoeren</div>
    <span style="position:absolute;right:16px;bottom:16px">{ico('arrow', 20)}</span></a>
</div>
{tabbar('Acties')}'''
    return phone('P10 · Acties (toetser)', inner)



def p10_detail():
    def chk(item, gezien):
        neutral = f'background:#fff;color:{INK};box-shadow:inset 0 0 0 1px #C9CED6'
        g = f'background:#E6F4EC;color:{GREEN};box-shadow:inset 0 0 0 2px {GREEN}' if gezien else neutral
        return (f'<div style="display:flex;align-items:center;gap:8px;height:56px;border-top:1px solid {LINE}">'
                f'<span style="flex:1;font-size:16px">{item}</span>'
                f'<button aria-pressed="{str(gezien).lower()}" style="height:48px;padding:0 14px;border-radius:999px;font-size:15px;font-weight:600;{g};display:inline-flex;align-items:center;gap:6px">'
                f'{ico("check", 16, 2.2) if gezien else ""}Gezien</button>'
                f'<button aria-pressed="false" style="height:48px;padding:0 14px;border-radius:999px;font-size:15px;font-weight:600;{neutral}">Ontbreekt</button></div>')
    thumb = f'<div style="width:48px;height:48px;border-radius:12px;overflow:hidden;flex:none">{setfoto(48)}</div>'
    body = f'''
  <a style="margin-top:12px;display:flex;align-items:center;gap:12px;min-height:64px;padding:0 16px;{CARD}">
    {thumb}<div style="flex:1"><div style="font-size:16px;font-weight:600">Melding bekijken</div>
    <div style="font-size:14px;color:{SOFT};margin-top:2px">Coördinator 2 · di 10 nov · alle 4</div></div>
    <span style="color:{SOFT};display:inline-flex">{ico('chev', 20)}</span></a>
  <div style="margin-top:10px;{CARD};overflow:hidden">
    {jij('“Set ligt in de bus. Jerrycan en zeep zitten erin.”')}
    {voorstel('Genoemd: jerrycan, zeep')}
  </div>
  <div style="margin-top:10px;padding:12px 16px 0;{CARD}">
    <div style="font-size:16px;line-height:1.4;padding-bottom:8px">{ACTIE}</div>
    {chk('Papier', True)}{chk('Desinfectiegel', False)}
  </div>'''
    bottom = (f'<div style="font-size:14px;color:{SOFT}">Afronden legt vast: Hoofd S&amp;M · wo 11 nov</div>'
              f'<div style="display:flex;gap:12px">'
              f'<button style="flex:1;height:56px;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1px #C9CED6;font-size:16px;font-weight:600">Afkeuren</button>'
              f'<button aria-disabled="true" style="flex:2;height:56px;border-radius:18px;background:#E3E6EA;color:#4A5565;font-size:16px;font-weight:600">Afronden · nog 1</button></div>')
    return phone('P10 · Toetsen (sheet)', T.inner_of(p10_list()) + sheet_zonder_gevaar(96, 'Actie toetsen', ACTIE_ID, 'Toetsen', body, bottom))


# ======================= P10b uitgevoerd melden (actiehouder) =======================
def p10b():
    thumb = f'<div style="width:96px;height:96px;border-radius:18px;overflow:hidden;flex:none">{setfoto(96)}</div>'
    inner = f'''
{head(round_btn('back', label='Terug'))}
{titleblock('Open · kort · do 19 nov', 'Uitgevoerd melden')}
<div style="position:absolute;left:24px;right:24px;top:190px;border-radius:22px;background:{P['butter'][0]};padding:14px 18px">
  <div style="font-size:14px;color:{SOFT};font-weight:500">Verbeteractie</div>
  <div style="font-size:16px;font-weight:600;line-height:1.4;margin-top:4px">{ACTIE}</div>
  <div style="font-size:14px;color:{SOFT};margin-top:4px">{ACTIE_ID}</div>
</div>
{card(356, f'<div style="padding:14px 16px;display:flex;gap:14px;align-items:flex-start">{thumb}<div style="flex:1">{label("Jij", "jij")}<div style="font-size:16px;line-height:1.45;margin-top:6px">“Handenwasset in de bus gelegd: jerrycan, zeep, papier en desinfectiegel.”</div></div></div>' + voorstel('Alle 4 onderdelen genoemd'))}
<div style="position:absolute;left:24px;right:24px;top:574px;padding:0 16px;height:64px;display:flex;align-items:center;gap:12px;{CARD}">
  <span style="color:{SOFT};display:inline-flex">{ico('shield', 20)}</span>
  <span style="flex:1;font-size:16px">Toetser Hoofd S&amp;M</span>{grijs('krijgt bericht')}
</div>
{dock('Melden', 'check', True)}'''
    return phone('P10b · Uitgevoerd melden', inner)


files = {
    'P06-foto': p06(), 'P07-actie': p07(), 'P07b-actie-offline': p07b(), 'P07c-termijn': p07c(), 'P07d-wie-wanneer': p07d(), 'P07e-nog-een-actie': p07e(),
    'P08a-gesprek-monteurs': p08a(), 'P08-afronden': p08(), 'P09-rapport-klaar': p09(), 'P10-acties-toetsen': p10_list(),
    'P10-detail': p10_detail(), 'P10b-uitgevoerd-melden': p10b(),
}
for k, v in files.items():
    open(f'{OUT}/{k}.html', 'w').write(v)
if os.path.exists(f'{OUT}/P07-detail.html'):
    os.remove(f'{OUT}/P07-detail.html')  # ronde 4: actiehouder wordt inline bevestigd, sheet vervalt
print('ok', list(files))
