import json
from mijn import *
KB = {r['id']: r for r in json.load(open('/home/claude/wpi/run/data/kennisbank.json'))['DAM']['regels']}

REP = '#2B5C8A'  # voorbeeldwaarde rapport-accent uit Huisstijl (W15)

def onderdeel(nr, naam, on=True, lock=False, sel=False, sub=None):
    bg = PRIS if sel else SURF
    bd = f'1.5px solid {PRI}' if sel else f'1px solid {LINE}'
    if nr == 'tekst':
        num = f'<span title="Sleep om te verplaatsen" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;border-radius:6px;background:#EEF0F3;color:{TXT2}">{icon("book", 15)}</span>'
    elif nr == '':
        num = f'<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;border-radius:6px;border:1px dashed {LINE};color:{TXT2};font-size:12px;font-weight:600;box-sizing:border-box">–</span>'
    else:
        num = f'<span title="Sleep om te verplaatsen" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;flex:none;border-radius:6px;background:{"#FFFFFF" if sel else "#EEF0F3"};font-size:12px;font-weight:700;color:{TXT2}">{nr}</span>'
    lk = f'<span style="display:inline-flex;align-items:center;gap:3px">{icon("lock", 12, TXT2)}vast</span> · ' if lock else ''
    s = f'<div style="font-size:12px;color:{TXT2};line-height:1.35;margin-top:1px;white-space:nowrap">{lk}{sub}</div>' if (sub or lock) else ''
    s = s.replace(' · </div>', '</div>')
    col = TXT if on else TXT2
    return (f'<div style="display:flex;align-items:center;gap:10px;min-height:46px;box-sizing:border-box;padding:6px 10px 6px 8px;border:{bd};border-radius:8px;background:{bg};margin-bottom:6px">'
            f'{num}<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:{600 if sel else 500};color:{col};line-height:1.3;white-space:nowrap">{naam}</div>{s}</div>'
            f'{toggle(on, disabled=lock)}</div>')

col1 = card(
    h2('Onderdelen', 'Sleep aan het nummer om de volgorde te wijzigen. Uit = niet in het rapport.', '', 16)
    + onderdeel(0, 'Voorblad', True, sub='uit Huisstijl')
    + onderdeel(1, 'Kop', True, True, sub='project, taak')
    + onderdeel(2, 'Samenvatting', True, sub='tellingen, actielijst, paraaf')
    + onderdeel(3, 'Algemene observatie', True, sub='onderwerpen A–I')
    + onderdeel(4, 'Taakgerichte toetsing', True, False, True, sub='TRA-regels van de taak')
    + onderdeel(5, 'Positieve bevindingen', True, True, sub='VCA 7.1')
    + onderdeel(6, 'Bevindingen en acties', True, True, sub='met VCA 7.1 d en e')
    + onderdeel(7, 'Gesprek met monteurs', True, sub='wat zij inbrachten')
    + onderdeel(8, "Foto's", True, sub='middelgroot, 2 per rij')
    + onderdeel(9, 'Gegevenstabel', True, True, sub='dashboard, trend')
    + f'<div style="height:1px;background:{LINE};margin:12px 0"></div>'
    + label('Uitgeschakeld', 'margin-bottom:8px')
    + onderdeel('', 'Inhoudsopgave', False)
    + onderdeel('', 'Open acties dit project', False, sub='uit eerdere inspecties')
    + f'<div style="margin-top:10px">{btn("Onderdeel toevoegen", "sec", "plus", 40, 14, "width:100%;justify-content:center")}</div>'
    + f'<div style="display:flex;gap:8px;align-items:flex-start;margin-top:14px;font-size:13px;color:{TXT2};line-height:1.45">{icon("lock", 16, TXT2)}<span>Vast: nodig voor VCA 7.1 of voor het dashboard. Alleen een beheerder kan dit uitzetten, met een reden die in de versiegeschiedenis komt.</span></div>',
    16)

def veld(on, naam, bron, lock=False):
    kleur = {'Kennisbank': ('#1F5FBF', PRIS), 'Inspecteur': (TXT, '#EEF0F3'), 'Berekend': (TXT2, '#FFFFFF')}[bron]
    b = chip(bron, kleur[0], kleur[1], LINE if bron == 'Berekend' else None, 12, 600)
    lk = f'<span style="color:{TXT2}">{icon("lock", 14)}</span>' if lock else ''
    return (f'<div style="display:flex;align-items:center;gap:10px;height:40px;border-bottom:1px solid #E9ECF0">'
            f'<span style="color:{GRIP}">{icon("grip", 16)}</span>{cb(on, lock)}'
            f'<span style="flex:1;min-width:0;font-size:14px;white-space:nowrap;color:{TXT if on else TXT2}">{naam}</span>{lk}{b}</div>')

def var(t):
    return f'<span style="display:inline-block;font-size:13px;font-weight:600;color:{PRI};background:{PRIS};border-radius:6px;padding:0 6px;line-height:1.6">{t}</span>'

col2 = (card(
    h2('Onderdeel 4 · Taakgerichte toetsing', 'Wat de inspecteur bij de TRA-maatregelen zag, per regel.', btn('Meer', 'ghost', 'more', 32), 16)
    + field('Titel in het rapport', '4. Taakgerichte toetsing')
    + f'<div style="height:14px"></div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Inleidende tekst</div>'
    + f'<div style="border:1px solid {LINE};border-radius:8px;padding:10px 12px;font-size:14px;line-height:1.7;color:{TXT}">Getoetst tegen TRA {var("product")} {var("TRA-revisie")}{var("revisie-opmerking")}. Hieronder alle {var("aantal regels")} risicoregels van die TRA voor de taak “{var("taak")}”, met de maatregelen letterlijk uit de TRA. Getoetst: werken de monteurs op dat moment volgens die maatregelen?</div>'
    + f'<div style="font-size:12px;color:{TXT2};margin-top:6px">{var("TRA-revisie")} = revisie in het QMS waartegen getoetst is; {var("revisie-opmerking")} alleen als de projectmap afwijkt. Invoegen: typ / of {var("+ veld")}</div>'
    + f'<div style="height:16px"></div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:8px">Welke regels</div>'
    + f'<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px">{radio(True)}<div style="font-size:14px;line-height:1.4">Alle regels van de gekozen taak, ook {oord("GA", True)} en {oord("NB", True)}<div style="font-size:12px;color:{TXT2};margin-top:2px">Laat zien wat níet bekeken is.</div></div></div>'
    + f'<div style="display:flex;gap:10px;align-items:center;margin-bottom:4px">{radio(False)}<span style="font-size:14px;color:{TXT}">Alleen regels met een eigen waarneming</span></div>'
    + f'<div style="display:flex;gap:10px;align-items:flex-start;margin-top:12px">{cb(True)}<div style="font-size:14px;line-height:1.4">Waarnemingen buiten de TRA onder de tabel<div style="font-size:12px;color:{TXT2};margin-top:2px">Ook als er geen zijn (“Buiten TRA: geen”); signaal dat de TRA een risico mist.</div></div></div>'
    + f'<div style="height:16px"></div>'
    + f'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px"><span style="font-size:13px;font-weight:600">Kolommen en velden</span><span style="font-size:12px;color:{TXT2}">Bron</span></div>'
    + veld(True, 'TRA-ID en oordeel', 'Inspecteur', True)
    + veld(True, 'Risico (letterlijk)', 'Kennisbank')
    + veld(True, 'Maatregelen (letterlijk)', 'Kennisbank')
    + veld(True, 'Waarneming', 'Inspecteur', True)
    + veld(True, 'Verwijzing foto, actie', 'Berekend')
    + veld(False, 'Taakstap', 'Kennisbank')
    + veld(False, 'Klasse', 'Kennisbank')
    + veld(False, 'Versie TRA-regel', 'Berekend')
    + f'<div style="height:14px"></div>'
    + f'<div style="display:flex;flex-direction:column;gap:12px">{field("Sorteren", "TRA-ID oplopend", None, True)}{field("Oordeel tonen als", "Code + woord", None, True, None, False, "", 36)}</div>'
    + f'<div style="font-size:12px;color:{TXT2};margin-top:6px;line-height:1.45">Een oordeel staat altijd met code en woord, nooit alleen als kleur.</div>',
    20)
)

vaste = card(
        h2('Vaste teksten', 'Normteksten komen uit de normbibliotheek en blijven letterlijk.', '', 16)
        + f'<div style="border:1px solid {LINE};border-radius:8px;padding:12px">'
          f'<div style="font-size:14px;font-weight:600">VCA 2026/6.1 · vraag 7.1 d en e</div><div style="margin-top:6px">{chip("Gekoppeld aan norm", "#1E7A4C", "#E6F4EC", None, 12, 600, "link")}</div>'
          f'<div style="font-size:13px;color:{TXT2};margin-top:4px;line-height:1.45">Inspectieverslag (d) en actieplan (e), letterlijk · in onderdeel 6, boven de acties (pagina 7)</div>'
          f'<div style="font-size:12px;color:{TXT2};margin-top:6px;line-height:1.45">Wijzigt de norm, dan krijg je een melding en kies je zelf wanneer de nieuwe tekst ingaat.</div></div>'
        + f'<div style="border:1px solid {LINE};border-radius:8px;padding:12px;margin-top:8px">'
          f'<div style="font-size:14px;font-weight:600">Uitleg oordeelmodel</div><div style="margin-top:6px">{chip("Eigen tekst · v1.2", TXT2, "#EEF0F3", None, 12, 600)}</div>'
          f'<div style="font-size:13px;color:{TXT2};margin-top:4px;line-height:1.45">Onder de kop van onderdeel 3 · bewerkbaar door coördinator</div></div>'
        + f'<div style="margin-top:10px">{btn("Vaste tekst toevoegen", "sec", "plus", 36, 14, "width:100%;justify-content:center")}</div>',
        16)

col2b = card(
    f'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;{HFONT};font-size:16px;font-weight:600">{icon("spark", 20, ACC)}<span>Samenvatting door de begeleider<span style="display:block;font-family:Inter,sans-serif;font-size:13px;font-weight:500;color:{TXT2}">in onderdeel 2</span></span></div>{toggle(True)}</div>'
    + f'<div style="font-size:13px;color:{TXT2};line-height:1.5">Boven de tellingen in onderdeel 2. De begeleider stelt 2–3 zinnen totaalbeeld voor, in het Nederlands en uitsluitend uit wat de inspecteur zei. Pas na bevestiging door de inspecteur gaat de tekst het rapport in.</div>'
    + f'<div style="margin-top:12px;border-radius:8px;background:{ACCS};padding:10px 12px">'
      f'<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">{ai_chip("Voorstel")}<span style="font-size:12px;color:{TXT2}">zo verschijnt het in de app</span></div>'
      f'<div style="font-size:13px;color:{TXT};line-height:1.5">“Goed: veiligstellen, PBM, kraanopstelling en het sturen van de last. Afwijkingen: verouderde TRA in de projectmap, geen handenwasgelegenheid, werkplek niet vooraf gereinigd, gasmeter niet op werkhoogte. Verbeterpunt: hijsen staat niet als stap op de LMRA (DAM-2.03).”</div></div>'
    + f'<div style="display:flex;gap:10px;align-items:center;margin-top:12px">{cb(True, True)}<span style="font-size:13px;color:{TXT}">In het rapport vermelden: “bevestigd door de inspecteur”</span></div>'
    + f'<div style="display:flex;gap:10px;align-items:center;margin-top:8px">{cb(False)}<span style="font-size:13px;color:{TXT}">Patronen uit eerdere inspecties op dit project noemen</span></div>',
    20, 'margin-top:12px')

# ---------- voorbeeldweergave ----------
def bron(t, kind):
    c = {'k': (PRI, PRIS), 'i': (TXT, '#EEF0F3'), 'b': (TXT2, '#FFFFFF')}[kind]
    return f'<span style="display:inline-block;font-size:12px;font-weight:600;color:{c[0]};background:{c[1]};border:1px solid {LINE};border-radius:4px;padding:0 5px;line-height:1.5">{t}</span>'

def maatr_html(rid):
    out = []
    for m in KB[rid]['maatregelen']:
        soort, tekst = m.split(': ', 1)
        out.append(f'<span style="color:{REP};font-weight:600">Maatregel, {soort.lower()}:</span> {e(tekst)}')
    return '<br>'.join(out)

def rrow(rid, code, waarn, ref):
    w, fg, bg = OORD[code]
    return (f'<tr><td style="vertical-align:top;padding:8px;border:1px solid #CBD2DB;background:{bg};width:74px">'
            f'<div style="font-size:12px;font-weight:700;color:{REP}">{rid}</div><div style="font-size:12px;font-weight:600;color:{fg};margin-top:2px">[{code}] {w}</div></td>'
            f'<td style="vertical-align:top;padding:8px;border:1px solid #CBD2DB;font-size:12px;line-height:1.45;color:{TXT}"><b>Risico:</b> {e(KB[rid]["risico"])}<br>{maatr_html(rid)}</td>'
            f'<td style="vertical-align:top;padding:8px;border:1px solid #CBD2DB;font-size:12px;line-height:1.45;color:{TXT}">{waarn}<div style="color:{REP};font-weight:600;margin-top:3px">{ref}</div></td></tr>')

W205 = 'Stuurlijn vanaf het roosterpad, buiten de draaicirkel. Bij het uithijsen van het tweede deel stuurt de monteur met een lijn van ongeveer vijf meter, achter het hek.'
W207 = ('4-gasmeter bij het tweede deel niet op werkhoogte; verder volgens de TRA. Werkvergunning besloten ruimte aanwezig. Mechanische ventilatie niet nodig: het kanaal is aan de bovenzijde open en de meting tot op de bodem (O2, H2S, CO, LEL) was in orde, genoteerd op de vergunning. '
        'Bij het tweede deel hing de meter bovenaan de ladder; de mangatwacht had zicht op de monteur. Ter plaatse: monteur naar boven, meter aan de borstband, op diepte opnieuw gemeten. Geen alarm; bumptest van vanmorgen.')

u = lambda t: f'<u style="text-decoration-style:dotted">{t}</u>'
def ingeklapt(t):
    return f'<tr><td colspan="3" style="padding:6px 8px;border:1px solid #CBD2DB;font-size:12px;color:{TXT2};background:#F6F7F9">{t}</td></tr>'
THEAD = (f'<thead><tr style="background:{REP}"><th style="text-align:left;vertical-align:top;font-size:12px;color:#FFFFFF;padding:6px 8px;width:74px">TRA-regel<div style="margin-top:4px">{bron("Inspecteur", "i")}</div></th>'
         f'<th style="text-align:left;vertical-align:top;font-size:12px;color:#FFFFFF;padding:6px 8px">Risico en maatregelen volgens de TRA<div style="margin-top:4px">{bron("Kennisbank", "k")}</div></th>'
         f'<th style="text-align:left;vertical-align:top;font-size:12px;color:#FFFFFF;padding:6px 8px">Waarneming van de inspecteur<div style="margin-top:4px">{bron("Inspecteur", "i")}</div></th></tr></thead>')
def vel(inner, pag, top=''):
    return (f'<div style="background:#FFFFFF;border:1px solid #C9CFD8;border-radius:4px;padding:14px 16px 12px 16px;box-sizing:border-box">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid {REP};padding-bottom:8px">'
            f'<span style="display:inline-flex;align-items:center;justify-content:center;height:24px;padding:0 8px;border:1px dashed #9AA3AF;border-radius:4px;font-size:12px;color:{TXT2}">logo</span>'
            f'<span style="font-size:12px;color:{TXT2}">{top}</span></div>{inner}'
            f'<div style="display:flex;justify-content:space-between;margin-top:14px;padding-top:6px;border-top:1px solid {LINE};font-size:12px;color:{TXT2}"><span>WPI-rapport WPI-20261105-DAM-C2</span><span>pagina {pag} van 11</span></div></div>')
def omkader(inner, lab='Onderdeel 4'):
    return (f'<div style="position:relative;margin-top:16px;outline:2px dashed {PRI};outline-offset:6px;border-radius:2px">'
            f'<span style="position:absolute;top:-19px;right:-6px;font-size:12px;font-weight:600;color:#FFFFFF;background:{PRI};border-radius:4px;padding:0 6px;line-height:1.6">{lab}</span>{inner}</div>')
p5 = vel(f'<div style="font-size:12px;color:{TXT2};margin-top:10px">… einde onderdeel 3</div>' + omkader(
    f'<div style="font-size:16px;font-weight:700;color:{REP}">4. Taakgerichte toetsing</div>'
    f'<div style="font-size:12px;line-height:1.5;color:{TXT};margin:6px 0 8px 0">Getoetst tegen TRA {u("Damwand")} {u("rev. 3 (fictief)")}{u(", actuele revisie in het QMS (in de projectmap lag rev. 2; zie A)")}. Hieronder alle {u("8")} risicoregels van die TRA voor de taak “{u("Verwijderen damwand")}”, met de maatregelen letterlijk uit de TRA. Getoetst: werken de monteurs op dat moment volgens die maatregelen?</div>'
    f'<table style="width:100%;border-collapse:collapse;table-layout:fixed">{THEAD}<tbody>'
    + ingeklapt('DAM-2.01 t/m DAM-2.04 · in deze weergave ingeklapt')
    + rrow('DAM-2.05', 'C', W205, 'Zie foto 3.') + '</tbody></table>'), 5, '')
p6 = vel(omkader(
    f'<table style="width:100%;border-collapse:collapse;table-layout:fixed">{THEAD}<tbody>'
    + ingeklapt('DAM-2.06 [A] Afwijking · ingeklapt')
    + rrow('DAM-2.07', 'A', W207, 'Zie actie 4, actie 5, foto 5.')
    + ingeklapt('DAM-2.08 [C] Conform · ingeklapt') + '</tbody></table>'
    f'<div style="font-size:12px;line-height:1.5;color:{TXT};margin-top:8px">Buiten TRA: geen; al het geziene werk valt onder de acht TRA-regels van deze taak (afspuiten: DAM-2.06).</div>', 'Onderdeel 4, vervolg')
    + f'<div style="margin-top:20px;font-size:16px;font-weight:700;color:{REP}">5. Positieve bevindingen</div>'
    + f'<div style="font-size:12px;line-height:1.5;color:{TXT};margin-top:4px">10 regels met het oordeel Conform; de volledige waarneming staat bij dezelfde ref in onderdeel 3 of 4.</div>', 6)
preview_page = p5 + '<div style="height:12px"></div>' + p6

col3 = card(
    f'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">'
    f'<div style="{HFONT};font-size:16px;font-weight:600">Voorbeeldweergave</div>'
    f'<div style="display:flex;align-items:center;gap:6px;font-size:13px;color:{TXT2}">'
    f'<span style="display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border:1px solid {LINE};border-radius:8px">{icon("left", 16)}</span>'
    f'<span>pagina 5–6 van 11</span>'
    f'<span style="display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border:1px solid {LINE};border-radius:8px">{icon("right", 16)}</span></div></div>'
    + f'<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;flex-wrap:wrap"><span style="display:flex;gap:8px;align-items:center;font-size:13px;color:{TXT}">{toggle(True)}Toon bron per veld</span><span style="display:flex;gap:8px;align-items:center;font-size:13px;color:{TXT}">{toggle(True)}Markeer gekozen onderdeel</span></div>'
    + f'<div style="background:#E9ECF0;border-radius:8px;padding:12px">{preview_page}</div>'
    + f'<div style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:12px;color:{TXT2};line-height:1.45">{icon("eye", 16, TXT2)}<span>Gevuld met voorbeeldinspectie WPI-20261105-DAM-C2; paginering zoals het voorbeeldrapport (11 pagina’s). Kies een andere inspectie om te zien hoe het rapport bij weinig of veel bevindingen uitvalt.</span></div>',
    16)

sjablonen = (
    f'<div style="display:flex;gap:12px;margin-bottom:16px">'
    + ''.join(
        f'<div style="flex:1;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;background:{SURF};border:{"1.5px solid "+PRI if on else "1px solid "+LINE}">'
        f'<span style="color:{PRI if on else TXT2}">{icon("file", 22)}</span><div style="min-width:0"><div style="font-size:14px;font-weight:600;color:{TXT}">{n}</div><div style="font-size:12px;color:{TXT2};margin-top:2px">{s}</div></div></div>'
        for n, s, on in [('WPI-rapport (volledig)', 'Concept v1.4 · gepubliceerd v1.3', True),
                         ('Directie-overzicht', '1 pagina · alleen samenvatting en acties', False),
                         ('Versie voor opdrachtgever', 'Zonder interne namen en gegevenstabel', False)])
    + f'<div style="display:flex;align-items:center;justify-content:center;gap:8px;width:200px;flex:none;border:1px dashed #9AA3AF;border-radius:10px;font-size:14px;font-weight:600;color:{PRI}">{icon("plus", 18)}Nieuw document</div>'
    + '</div>')

uitvoer = card(
    h2('Uitvoer en opslag', None, '', 16)
    + f'<div style="display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:16px">'
    + field('Bestandsnaam', 'WPI-{datum}-{productcode}-{initialen}', None, False, 'Wordt ook het WPI-nummer', True)
    + field('Formaten', 'Word (.docx) en PDF', None, True)
    + field('Opslaan in', 'In de app (rapportarchief)', None, True, 'Periodiek export naar eigen QMS (map en ritme instelbaar); offline: wachtrij')
    + field('Na bevestiging versturen aan', 'Actiehouders en toetsers', None, True, 'Ieder krijgt alleen eigen acties')
    + '</div>', 20, 'margin-top:12px')

body = (kop('Configuratie / Rapport', 'Rapportontwerper',
                  'Bepaal wat er in het WPI-rapport staat: onderdelen, velden en vaste normteksten. Logo, kleuren en voorblad komen uit Huisstijl. Rechts zie je meteen het resultaat met een bestaande inspectie.',
                  btn('Voorbeeld met WPI-20261105-DAM-C2', 'sec', 'down') + btn('Proefrapport downloaden', 'sec', 'download') + btn('Naar publiceren', 'pri', 'arrow'))
        + sjablonen
        + f'<div style="display:flex;gap:12px;align-items:flex-start">'
        + f'<div style="width:290px;flex:none">{col1}<div style="height:12px"></div>{vaste}</div>'
        + f'<div style="width:340px;flex:none">{col2}{col2b}</div>'
        + f'<div style="flex:1;min-width:0">{col3}</div></div>'
        + uitvoer)

open('/home/claude/app/screens/web/W07-rapportontwerper.html', 'w').write(page('W07', 'Rapportontwerper', 'Rapport', body, 'Concept', 'Wijzigingen in concept v1.5'))
