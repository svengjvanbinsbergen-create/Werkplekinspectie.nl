from mijn import *

ROLLEN = ['Inspecteur', 'Coördinator', 'Medewerker', 'Directie', 'Lezer', 'Beheerder', 'Leverancier']

def av(init, ext=False):
    bg, fg = ('#EEF0F3', TXT2) if ext else (PRIS, PRI)
    return f'<span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border-radius:999px;background:{bg};color:{fg};font-size:12px;font-weight:700">{init}</span>'
def rolchip(r):
    return chip(r, TXT, '#EEF0F3', None, 12, 600)
def flag(t):
    return chip(t, TXT2, '#FFFFFF', LINE, 12, 500)

# (init, naam, functie, rollen, bereik, status, kenmerk)
users = [
    ('VC', 'VGM-coördinator (fictief)', 'VGM-coördinator', ['Beheerder', 'Coördinator'], 'Hele organisatie', 'actief', None),
    ('QM', 'QHSE-manager (fictief)', 'QHSE-manager', ['Coördinator'], 'Hele organisatie', 'actief', 'nooit actiehouder'),
    ('HS', 'Hoofd Service & Montage (fictief)', 'Hoofd Service & Montage', ['Coördinator'], 'S&M NL', 'actief', 'standaardtoetser'),
    ('C1', 'Coördinator 1 (fictief)', 'Montagecoördinator', ['Coördinator', 'Inspecteur'], 'S&M NL', 'actief', None),
    ('C2', 'Coördinator 2 (fictief)', 'Montagecoördinator', ['Coördinator', 'Inspecteur'], 'S&M NL', 'actief', None),
    ('DL', 'Directielid (fictief)', 'Operationeel directeur', ['Directie', 'Inspecteur'], 'Hele organisatie', 'actief', None),
    ('WV', 'Werkvoorbereider (fictief)', 'Werkvoorbereider', ['Medewerker'], 'S&M NL', 'actief', None),
    ('MV', 'Monteur, voorman (fictief)', 'Monteur', ['Medewerker'], 'Projecten op locatie', 'actief', None),
    ('OG', 'Contact waterschap', 'extern, opdrachtgever', ['Lezer'], 'Eigen projecten', 'actief', None),
    ('CD', 'Coördinator Duitsland (fictief)', 'Montagecoördinator', ['Coördinator'], 'S&M DE', 'uitgenodigd', None),
]
def urow(u, sel=False):
    init, naam, functie, rollen, scope, st, kenm = u
    stt = chip('actief', '#1E7A4C', '#E6F4EC', None, 12, 600) if st == 'actief' else chip('uitgenodigd', '#8A4B00', '#FFF1DC', None, 12, 600)
    s = f'background:{PRIS};' if sel else ''
    k = f'<div style="margin-top:4px">{flag(kenm)}</div>' if kenm else ''
    return ('<tr>' + td(f'<div style="display:flex;gap:10px;align-items:center">{av(init, init == "OG")}<div style="min-width:0"><div style="font-weight:600">{naam.replace(' (fictief)', '')}</div></div></div>', 'left', s)
            + td(f'{functie}{k}', 'left', s)
            + td(' '.join(rolchip(r) for r in rollen), 'left', s) + td(scope, 'left', s) + td(stt, 'left', s) + '</tr>')
gebruikers = card(
    f'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px"><div style="{HFONT};font-size:18px;font-weight:600">Gebruikers</div><span style="flex:1"></span>'
    f'<div style="display:flex;align-items:center;gap:8px;width:260px;height:36px;box-sizing:border-box;padding:0 10px;border:1px solid {LINE};border-radius:8px;font-size:14px;color:{TXT2}">{icon("search", 16)}Zoek gebruiker of functie</div>'
    f'<div style="display:flex;gap:8px">{chip("Rol: alle", TXT, "#EEF0F3", None, 13, 500, "down")}{chip("Groep: alle", TXT, "#EEF0F3", None, 13, 500, "down")}</div></div>'
    + table(th([('Gebruiker', None, 'left'), ('Functie', 160, 'left'), ('Rollen', 186, 'left'), ('Bereik', 124, 'left'), ('Status', 100, 'left')]), [urow(u, u[0] == 'WV') for u in users])
    + f'<div style="padding:12px 16px;font-size:13px;color:{TXT2}">{len(users)} gebruikers · inloggen via Microsoft Entra ID (SSO) met MFA · externe lezers via e-mailcode · monteurs zonder account worden actiehouder als “Monteur ter plaatse”</div>',
    0, 'overflow:hidden')

# geselecteerde gebruiker
def kv(k, v):
    return f'<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #E9ECF0;font-size:14px"><span style="color:{TXT2}">{k}</span><span style="text-align:right;font-weight:500">{v}</span></div>'
detail = card(
    f'<div style="display:flex;gap:12px;align-items:center">{av("WV")}<div><div style="{HFONT};font-size:16px;font-weight:600">Werkvoorbereider</div><div style="font-size:13px;color:{TXT2}">functie Werkvoorbereider</div></div></div>'
    + f'<div style="font-size:13px;font-weight:600;margin:14px 0 6px 0">Rollen</div>'
    + ''.join(f'<div style="display:flex;align-items:center;gap:10px;height:32px">{cb(r == "Medewerker")}<span style="font-size:14px">{r}</span></div>' for r in ROLLEN[:6])
    + f'<div style="height:8px"></div>'
    + kv('Groep', 'Service & Montage NL')
    + kv('Kan actiehouder zijn', f'<span style="color:#1E7A4C">ja</span>')
    + kv('Kan toetser zijn', 'ja, niet bij eigen acties')
    + kv('Open acties als actiehouder', '4')
    + f'<div style="font-size:13px;color:{TXT2};margin-top:10px;line-height:1.45">Medewerker: ziet en werkt eigen acties bij (W11, P10), meldt ze als “Uitgevoerd gemeld”. Geen configuratie, geen dashboard met namen.</div>',
    16)

# regels actiehouder / toetser
def sel(t):
    return (f'<span style="display:inline-flex;align-items:center;gap:6px;height:30px;box-sizing:border-box;padding:0 10px;margin:0 2px;border:1px solid {LINE};border-radius:8px;background:{SURF};font-size:14px;font-weight:600;color:{TXT};white-space:nowrap;vertical-align:middle">{t}{icon("down", 14, TXT2)}</span>')
def regel(inner, on=True, lock=False, sub=None):
    ctrl = f'<span style="display:flex;gap:6px;align-items:center;color:{TXT2}">{icon("lock", 14)}{toggle(True, True)}</span>' if lock else toggle(on)
    s = f'<div style="font-size:13px;color:{TXT2};margin-top:4px;line-height:1.45">{sub}</div>' if sub else ''
    return (f'<div style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #E9ECF0">'
            f'<div style="flex:1;min-width:0;font-size:14px;line-height:2.1">{inner}{s}</div><div style="padding-top:6px">{ctrl}</div></div>')
regels = card(
    h2('Actiehouder en toetser', 'Regels in gewone zinnen. De app vult bij een nieuwe actie de toetser in volgens deze regels; de inspecteur kan alleen kiezen wat de regels toestaan.', '', 16)
    + regel('Toetser en actiehouder zijn <b>nooit dezelfde persoon</b>.', lock=True, sub='Vast. VCA 7.1 vraagt verantwoordelijken voor uitvoering én toetsing; de app maakt dat twee personen.')
    + regel(f'Functie {sel("QHSE-manager")} is nooit actiehouder.', sub='Toetst en bewaakt; voert zelf geen verbeteracties uit.')
    + regel(f'Standaardtoetser is {sel("Hoofd Service & Montage")}.')
    + regel(f'Is de standaardtoetser zelf actiehouder, dan toetst {sel("de inspecteur van de inspectie")}.', sub='In de voorbeelddata: 10 acties met Hoofd Service & Montage als actiehouder; toetser steeds de inspecteur (4 afgerond, 6 open).')
    + regel(f'Is een actie ter plaatse uitgevoerd, dan toetst {sel("de inspecteur, ter plaatse")}.', sub='Zoals actie WPI-20261105-DAM-C2-4: Monteur ter plaatse is actiehouder, Coördinator 2 toetst ter plaatse.')
    + regel(f'Actiehouder kan zijn: rollen {sel("Medewerker, Coördinator, Inspecteur, Directie")} en monteurs zonder account.')
    + f'<div style="margin-top:12px">{btn("Regel toevoegen", "sec", "plus", 34, 14)}</div>',
    16)

# groepen en werkplekken met overerving
def erft(t):
    return chip(t, TXT2, '#EEF0F3', None, 12, 500)
def eigen(t):
    return chip(t, PRI, PRIS, None, 12, 600, 'pen')
def node(t, sub, depth=0, chips='', ic='building', on=False):
    lijn = f'border-left:1px solid {LINE};' if depth else ''
    return (f'<div style="margin-left:{max(depth-1,0)*24 + (12 if depth else 0)}px;{lijn}padding-left:{12 if depth else 0}px">'
            f'<div style="display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:8px;{"background:"+PRIS+";" if on else ""}">'
            f'<span style="color:{PRI if on else TXT2};padding-top:1px">{icon(ic, 18)}</span>'
            f'<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:14px;font-weight:600">{t}</span><span style="font-size:13px;color:{TXT2};white-space:nowrap">{sub}</span></div>'
            f'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">{chips}</div></div></div></div>')
groepen = card(
    h2('Groepen en werkplekken', 'Een groep erft begeleider, kennisbank, rapport en programma van de groep erboven, tenzij je iets eigen maakt.', btn('Groep toevoegen', 'sec', 'plus', 32, 13), 16)
    + node('Noardling B.V.', '10 gebruikers · 3 op dit niveau', 0, eigen('begeleider v1.3') + eigen('kennisbank: 21 TRA’s') + eigen('WPI-rapport') + eigen('programma: procedure 5.5'))
    + node('Service & Montage NL', '6 gebruikers, met subgroep', 1, erft('erft alles'), 'users', True)
    + node('Projecten op locatie', '2 gebruikers · 24 projecten', 2, erft('erft alles') + eigen('lezers per opdrachtgever'), 'map')
    + node('Service & Montage DE', '1 gebruiker (uitgenodigd)', 1, erft('erft begeleider en kennisbank') + eigen('rapporttaal Duits') + eigen('voorblad DE'), 'users')
    + node('Fabriek Sneek', 'nog geen gebruikers', 1, erft('erft begeleider') + eigen('kennisbank: fabrieks-TRA’s') + eigen('eigen programma'), 'users')
    + f'<div style="font-size:13px;color:{TXT2};margin-top:8px;line-height:1.5"><b style="color:{TXT}">Procedure 5.5</b> (voorstel) bepaalt het inspectieprogramma: project langer dan een maand op één locatie elke kalendermaand een WPI; kort project met minstens één risicokenmerk ten minste één WPI; overige korte projecten één op de vier per kwartaal (zie Programma, W12).</div>'
    + f'<div style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;color:{TXT2}">{erft("erft")}<span>van de groep erboven</span><span style="width:8px"></span>{eigen("eigen")}<span>afwijkend in deze groep</span></div>'
    + f'<div style="font-size:13px;font-weight:600;margin:16px 0 6px 0">Wat geldt waar</div>'
    + table(th([('Onderdeel', None, 'left'), ('S&M NL', 92, 'center'), ('Projecten', 92, 'center'), ('S&M DE', 92, 'center'), ('Fabriek', 92, 'center')]),
            ['<tr>' + td(n) + ''.join(td(erft('erft') if c == 'e' else eigen('eigen'), 'center') for c in cs) + '</tr>' for n, cs in [
                ('Begeleider', 'eeee'), ('Kennisbank', 'eeeo'), ('Rapport', 'eeoe'), ('Programma', 'eeeo'), ('Lezers', 'eoee')]]),
    16)

# rechtenmatrix
Y = '<div style="display:flex;justify-content:center">' + icon('check', 18, '#1E7A4C', 2.25) + '</div>'
N = f'<span style="color:{TXT2}">–</span>'
def yt(t):
    return f'<div style="display:flex;flex-direction:column;align-items:center;gap:2px">{icon("check", 18, "#1E7A4C", 2.25)}<span style="font-size:12px;color:{TXT2};white-space:nowrap">{t}</span></div>'
mat = [
    ('Inspecties', [
        ('Inspectie uitvoeren op de telefoon', [Y, Y, N, Y, N, N, N]),
        ('Inspecties en rapporten bekijken', [yt('eigen'), yt('groep'), yt('eigen acties'), yt('alle'), yt('eigen projecten'), yt('alle'), N]),
        ('Bevestigd rapport corrigeren', [N, yt('met reden'), N, N, N, N, N]),
    ]),
    ('Acties', [
        ('Actiehouder zijn, actie bijwerken en klaar melden', [Y, Y, Y, Y, N, N, N]),
        ('Actie toetsen en afronden', [yt('als toetser'), yt('als toetser'), yt('als toetser'), yt('als toetser'), N, N, N]),
        ('Actiehouder, toetser en termijn wijzigen', [N, Y, N, Y, N, N, N]),
    ]),
    ('Configuratie en resultaten', [
        ('Begeleider, kennisbank, rapport, programma bewerken (concept)', [N, Y, N, N, N, Y, N]),
        ('Publiceren (altijd een tweede persoon)', [N, Y, N, N, N, Y, N]),
        ('Gebruikers, AI en data, huisstijl', [N, N, N, N, N, Y, N]),
        ('Dashboard bekijken', [yt('mijn acties'), Y, yt('mijn acties'), Y, yt('zonder namen'), Y, N]),
        ('Organisaties (klanten) beheren, W17', [N, N, N, N, N, N, yt('geen inspectiedata')]),
    ]),
]
mrows = []
for g, items in mat:
    mrows.append(f'<tr><td colspan="8" style="padding:10px 10px 6px 10px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:{TXT2};background:#FAFBFC;border-bottom:1px solid #E9ECF0">{g}</td></tr>')
    for naam, cells in items:
        mrows.append('<tr>' + td(naam) + ''.join(td(c, 'center') for c in cells) + '</tr>')
matrix = card(
    h2('Rollen en rechten', 'Zes rollen binnen de organisatie en de rol Leverancier daarbuiten. Een rol aanpassen of een eigen rol maken kan; de vaste regels blijven gelden.', btn('Eigen rol maken', 'sec', 'plus', 32, 13), 16)
    + table(th([('Recht', None, 'left')] + [(r, 100, 'center') for r in ROLLEN]), mrows)
    + f'<div style="display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13px;color:{TXT2};line-height:1.5">{icon("lock", 16, TXT2)}<span><b style="color:{TXT}">Leverancier</b> is de rol van het bedrijf dat de app levert. Die ziet in deze organisatie geen inspecties, namen of foto’s; alleen het aanmaken en inrichten van organisaties (vanuit een sjabloon) en technische ondersteuning na toestemming van de beheerder. Dat gebeurt in een eigen leveranciersomgeving (W17).</span></div>',
    16)

body = (kop('Configuratie / Gebruikers en rollen', 'Gebruikers en rollen',
            'Wie mag wat, in welke groep, en wie wordt actiehouder of toetser. Rechten bepalen ook wat iemand in het dashboard en in de rapporten ziet.',
            btn('Koppeling Entra ID', 'sec', 'key') + btn('Gebruiker uitnodigen', 'pri', 'plus'))
        + f'<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px"><div style="flex:1;min-width:0">{gebruikers}</div><div style="width:296px;flex:none">{detail}</div></div>'
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start">{regels}{groepen}</div>'
        + matrix)

open('/home/claude/app/screens/web/W13-gebruikers-rollen.html', 'w').write(page('W13', 'Gebruikers en rollen', 'Gebruikers en rollen', body, 'Concept'))
