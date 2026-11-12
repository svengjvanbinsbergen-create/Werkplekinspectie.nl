from mijn import *
REP = '#2B5C8A'; SEC = '#E58A1F'

def sw(col, naam, waarde, ratio, ok, gebruik):
    st = chip(f'contrast {ratio} : 1 op wit', '#1E7A4C', '#E6F4EC', None, 12, 600, 'check') if ok else chip(f'contrast {ratio} : 1 · alleen voor vlakken', '#8A4B00', '#FFF1DC', None, 12, 600, 'alert')
    return (f'<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #E9ECF0">'
            f'<span style="width:40px;height:40px;flex:none;border-radius:8px;background:{col};border:1px solid rgba(20,26,34,.12)"></span>'
            f'<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-size:14px;font-weight:600">{naam}</span><span style="font-family:Menlo,monospace;font-size:13px">{waarde}</span></div><div style="font-size:12px;color:{TXT2};margin-top:2px">{gebruik}</div><div style="margin-top:6px">{st}</div></div></div>')

links = (card(h2('Logo', 'SVG of PNG, liefst met transparante achtergrond. Een lichte en een donkere variant.', '', 16)
    + f'<div style="display:flex;gap:12px">'
    + f'<div style="flex:1;height:84px;border-radius:8px;border:1px solid {LINE};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px;background:#FFFFFF"><span style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border:1.5px dashed #9AA3AF;border-radius:6px;font-size:13px;font-weight:600;color:{TXT2}">logo</span><span style="font-size:12px;color:{TXT2}">licht</span></div>'
    + f'<div style="flex:1;height:84px;border-radius:8px;background:{REP};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:6px"><span style="display:inline-flex;align-items:center;height:28px;padding:0 10px;border:1.5px dashed #FFFFFF;border-radius:6px;font-size:13px;font-weight:600;color:#FFFFFF">logo</span><span style="font-size:12px;color:#FFFFFF">donker</span></div></div>'
    + f'<div style="display:flex;gap:8px;margin-top:10px">{btn("Licht vervangen", "sec", "upload", 34, 13)}{btn("Donker vervangen", "sec", "upload", 34, 13)}</div>', 16)
    + '<div style="height:12px"></div>'
    + card(h2('Kleuren', 'Contrast wordt gecontroleerd; tekst krijgt minimaal 4,5 : 1.', '', 16)
        + sw(REP, 'Hoofdkleur rapport', REP, '7,0', True, 'koppen, tabelkoppen, lijnen in het rapport')
        + sw(SEC, 'Tweede kleur', SEC, '2,6', False, 'accentvlakken op het voorblad; nooit voor tekst')
        + sw(PRI, 'Knoppen in de app', PRI, '6,1', True, 'primaire knoppen en focus; standaard van de app')
        + f'<div style="font-size:12px;color:{TXT2};margin-top:10px;line-height:1.45">Kleuren voor oordelen ([C] [A] [V] [GA] [NB]) en voor voorstellen van de begeleider liggen vast, zodat ze in elk bedrijf hetzelfde betekenen.</div>', 16)
)

lettertype = card(h2('Lettertype', 'Voor rapport en app. Leesbaarheid gaat voor: minimaal 12 px in het rapport, 16 px op de telefoon.', '', 16)
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">{field("Koppen", "Inter, vet", None, True)}{field("Tekst", "Inter", None, True)}</div>'
        + f'<div style="margin-top:10px">{btn("Eigen lettertype uploaden (.woff2, .ttf)", "ghost", "upload", 32, 13, "padding:0")}</div>', 16)

taal = card(h2('Taal', None, '', 16)
        + f'{field("Taal van de app", "Nederlands", None, True, "Per gebruiker te wijzigen; begeleider spreekt dezelfde taal")}'
        + f'<div style="font-size:13px;font-weight:600;margin:14px 0 8px 0">Rapporttalen</div>'
        + f'<div style="display:flex;gap:8px;flex-wrap:wrap">{chip("Nederlands · standaard", "#FFFFFF", PRI, None, 13, 600, "check")}{chip("Duits", PRI, PRIS, None, 13, 600, "check")}{chip("Engels", TXT2, "#FFFFFF", LINE, 13, 500)}</div>'
        + f'<div style="font-size:13px;color:{TXT2};margin-top:8px;line-height:1.45">Duits voor projecten in Duitsland (groep S&M DE). Vaste teksten en TRA-maatregelen gebruiken de eigen termenlijst; normteksten alleen als er een officiële vertaling is.</div>', 16)

def lay(naam, on, inner):
    bd = f'2px solid {PRI}' if on else f'1px solid {LINE}'
    return (f'<div style="flex:1;text-align:center"><div style="height:118px;border:{bd};border-radius:6px;background:#FFFFFF;padding:8px;box-sizing:border-box;overflow:hidden">{inner}</div>'
            f'<div style="font-size:13px;font-weight:{600 if on else 500};margin-top:6px;color:{TXT if on else TXT2}">{naam}</div></div>')
bar = lambda w, h=6, c='#D3D8DF': f'<div style="width:{w}%;height:{h}px;background:{c};border-radius:2px;margin-bottom:5px"></div>'
voorblad = card(h2('Rapportvoorblad', 'Opgebouwd uit velden; geen vast plaatje, dus altijd met het juiste WPI-nummer en project.', '', 16)
    + f'<div style="display:flex;gap:10px">'
    + lay('Strak', True, f'<div style="height:22px;background:{REP};border-radius:2px;margin-bottom:10px"></div>' + bar(70, 8, '#9AA3AF') + bar(50) + bar(40))
    + lay('Met adresblok', False, bar(30, 6, '#9AA3AF') + '<div style="height:16px"></div>' + bar(70, 8, '#9AA3AF') + bar(50) + f'<div style="height:22px;background:#E3E6EB;border-radius:2px;margin-top:12px"></div>')
    + lay('Met foto', False, f'<div style="height:50px;background:#E3E6EB;border-radius:2px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:{TXT2}">{icon("image", 18)}</div>' + bar(70, 8, '#9AA3AF') + bar(50))
    + '</div>'
    + f'<div style="font-size:13px;font-weight:600;margin:16px 0 4px 0">Velden op het voorblad</div>'
    + ''.join(f'<div style="display:flex;align-items:center;gap:10px;height:34px">{cb(on)}<span style="font-size:14px">{t}</span></div>' for t, on in [
        ('Titel: “WPI-rapport”', True), ('WPI-nummer', True), ('Project, opdrachtgever en locatie', True), ('Datum en inspecteur', True), ('Adres van de vestiging', True), ('Acties: open van totaal', True), ('Foto van de werkplek', False)])
    + f'<div style="font-size:13px;font-weight:600;margin:14px 0 8px 0">Afwijkend voorblad</div>'
    + f'<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid {LINE};border-radius:8px;font-size:13px;line-height:1.45">{icon("building", 18, TXT2)}<span style="flex:1">Voor <b>Service & Montage DE</b>: Duits voorblad met adres van de Duitse vestiging</span>{icon("pen", 16, TXT2)}</div>'
    + f'<div style="margin-top:8px">{btn("Regel toevoegen", "ghost", "plus", 32, 13)}</div>', 16)

# voorbeelden
cover = (f'<div style="width:300px;height:424px;margin:0 auto;background:#FFFFFF;border:1px solid #C9CFD8;border-radius:4px;box-sizing:border-box;position:relative;overflow:hidden">'
         f'<div style="height:110px;background:{REP};padding:18px 20px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-start">'
         f'<span style="display:inline-flex;align-items:center;height:26px;padding:0 8px;border:1.5px dashed #FFFFFF;border-radius:4px;font-size:12px;font-weight:600;color:#FFFFFF">logo</span>'
         f'<span style="font-size:12px;color:#FFFFFF;text-align:right;line-height:1.4">Noardling B.V.<br>Pieter Zeemanstraat 6<br>8606 JR Sneek</span></div>'
         f'<div style="height:8px;background:{SEC}"></div>'
         f'<div style="padding:28px 20px 0 20px"><div style="font-size:28px;font-weight:700;color:{REP}">WPI-rapport</div>'
         f'<div style="font-size:15px;font-weight:600;color:{TXT};margin-top:6px">WPI-20261105-DAM-C2</div>'
         f'<div style="font-size:12px;color:{TXT};margin-top:16px;line-height:1.6">Datum: 05-11-2026, 09:40–10:50 uur<br>Werkplek: RWZI Voorbeeldstad, Waterschap Voorbeeld-Noord<br>Project: P26-168 (fictief); damwand, verwijderen damwand<br>Inspecteur: Coördinator 2 (fictief)<br>Acties: 8 open van 9</div></div>'
         f'<div style="position:absolute;left:20px;right:20px;bottom:16px;border-top:1px solid {LINE};padding-top:8px;font-size:12px;color:{TXT2}">Voorbeeld, fictieve gegevens</div></div>')
apphead = (f'<div style="border:1px solid {LINE};border-radius:8px;overflow:hidden">'
           f'<div style="height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#FFFFFF;border-bottom:1px solid {LINE}">'
           f'<span style="display:inline-flex;align-items:center;height:22px;padding:0 6px;border:1.5px dashed #9AA3AF;border-radius:4px;font-size:12px;font-weight:600;color:{TXT2};white-space:nowrap">logo</span>'
           f'<span style="font-size:13px;font-weight:600">Werkplekinspecties</span><span style="flex:1"></span>{btn("Nieuw", "pri", "plus", 30, 12)}</div>'
           f'<div style="padding:10px 12px;font-size:12px;color:{TXT2};background:{BG}">Bovenbalk van de app met het logo</div></div>')
pagina = (f'<div style="width:300px;margin:0 auto;background:#FFFFFF;border:1px solid #C9CFD8;border-radius:4px;box-sizing:border-box;padding:14px 16px">'
          f'<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid {REP};padding-bottom:6px">'
          f'<span style="display:inline-flex;align-items:center;height:20px;padding:0 6px;border:1.5px dashed #9AA3AF;border-radius:4px;font-size:12px;font-weight:600;color:{TXT2}">logo</span>'
          f'<span style="font-size:12px;color:{TXT2}"></span></div>'
          f'<div style="font-size:15px;font-weight:700;color:{REP};margin-top:10px">6. Bevindingen en acties</div>'
          f'<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:12px"><tr style="background:{REP};color:#FFFFFF"><td style="padding:4px 6px;font-weight:600">Nr</td><td style="padding:4px 6px;font-weight:600">Bevinding</td><td style="padding:4px 6px;font-weight:600">Termijn</td></tr>'
          f'<tr><td style="padding:4px 6px;border-bottom:1px solid {LINE}">1</td><td style="padding:4px 6px;border-bottom:1px solid {LINE}">[A] TRA in projectmap verouderd</td><td style="padding:4px 6px;border-bottom:1px solid {LINE}">12-11</td></tr>'
          f'<tr><td style="padding:4px 6px">4</td><td style="padding:4px 6px">[A] Gasmeter niet op werkhoogte</td><td style="padding:4px 6px">05-11</td></tr></table>'
          f'<div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:6px;border-top:1px solid {LINE};font-size:12px;color:{TXT2}"><span>WPI-20261105-DAM-C2</span><span style="white-space:nowrap">pagina 7 van 11</span></div></div>')
phone = (f'<div style="display:flex;gap:12px;align-items:flex-start">'
         f'<div style="width:150px;flex:none;border:1px solid {LINE};border-radius:14px;overflow:hidden;background:{BG}">'
         f'<div style="height:22px"></div>'
         f'<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#FFFFFF;border-bottom:1px solid {LINE}"><span style="display:inline-flex;align-items:center;height:18px;padding:0 4px;border:1.5px dashed #9AA3AF;border-radius:4px;font-size:12px;font-weight:600;color:{TXT2}">logo</span><span style="font-size:12px;font-weight:600">Inspectie</span></div>'
         f'<div style="padding:10px"><div style="height:8px;width:80%;background:#D3D8DF;border-radius:2px;margin-bottom:6px"></div><div style="height:8px;width:60%;background:#D3D8DF;border-radius:2px;margin-bottom:14px"></div>'
         f'<div style="height:30px;border-radius:8px;background:{PRI};margin-bottom:8px"></div>'
         f'<div style="display:flex;justify-content:center"><span style="width:36px;height:36px;border-radius:999px;background:{PRI};display:flex;align-items:center;justify-content:center">{icon("mic", 18, "#FFFFFF")}</span></div></div></div>'
         f'<div style="font-size:13px;color:{TXT2};line-height:1.5">Logo in de bovenbalk van telefoon en web. Knoppen en focus houden de app-kleur {PRI}; de microfoon en oordeelkleuren liggen vast.</div></div>')
def pane(t, inner):
    return (f'<div style="font-size:13px;font-weight:600;color:{TXT};margin:14px 0 8px 0">{t}</div>'
            f'<div style="background:#E9ECF0;border-radius:8px;padding:12px">{inner}</div>')
voorbeeld = card(f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px"><div style="{HFONT};font-size:16px;font-weight:600">Voorbeeld</div>'
                 f'<span style="font-size:13px;color:{TXT2}">met WPI-20261105-DAM-C2</span></div>'
                 + pane('Voorblad', cover) + pane('Pagina in het rapport', pagina) + pane('App', phone), 16)

body = (kop('Configuratie / Huisstijl', 'Huisstijl',
                  'Logo, kleuren, lettertype, taal en rapportvoorblad van deze organisatie. Rechts zie je het resultaat op voorblad, rapportpagina en app; de inhoud van het rapport richt je in bij Rapport.',
                  btn('Terug naar standaard', 'sec', 'refresh') + btn('Naar publiceren', 'pri', 'arrow'))
        + tabs(['Huisstijl', 'Organisatiegegevens'], 'Huisstijl', 'margin-bottom:16px')
        + f'<div style="display:flex;gap:12px;align-items:flex-start"><div style="width:380px;flex:none">{links}<div style="height:12px"></div>{lettertype}</div><div style="width:360px;flex:none">{voorblad}<div style="height:12px"></div>{taal}</div><div style="flex:1;min-width:0">{voorbeeld}</div></div>')

open('/home/claude/app/screens/web/W15-huisstijl.html', 'w').write(page('W15', 'Huisstijl', 'Huisstijl', body, 'Concept'))
