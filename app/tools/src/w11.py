import sys, json, re, datetime as DT; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
K = json.load(open('/home/claude/app/tools/cijfers.json'))
A = D['acties']; PEIL = D['peildatum']; OD = K['act_open_detail']
HSM = 'Hoofd Service & Montage'
TN = lambda t: t.replace(' (ter plaatse)', '').replace(', ter plaatse', '')
SEL = 'WPI-20260914-DAM-C1-1'
openA = sorted([a for a in A if a['status'] == 'Open'], key=lambda a: (a['termijn'], a['actie']))
nOpen = K['act_open_n']; nAf = K['act_status']['Afgerond']; nAll = K['n_acties']
nGem = K['act_status'].get('Uitgevoerd gemeld', 0); nVerv = K['act_status'].get('Vervallen', 0)
kort = lambda t: short(t).replace(HSM, 'Hoofd S&amp;M')

def stab(name, nn, sub, on=False, tone=None):
    col = {'bad': '#B42318', 'let': '#8A4B00'}.get(tone, TXT)
    return (f'<div style="flex:1;min-width:0;padding:12px 14px;border-radius:10px;background:{SURF};border:{"1.5px solid "+PRI if on else "1px solid "+LINE}">'
            f'<div style="font-size:13px;color:{TXT2};font-weight:600">{name}</div><div style="{HFONT};font-size:24px;font-weight:600;color:{col};margin-top:2px">{nn}</div>'
            f'<div style="font-size:12px;color:{TXT2};margin-top:2px;line-height:1.4">{sub}</div></div>')
status = (f'<div style="display:flex;gap:12px;margin-bottom:12px">'
          + stab('Open', nOpen, f'{K["act_open_prio"].get("direct",0)} direct · {K["act_open_prio"].get("kort",0)} kort · {K["act_open_prio"].get("planmatig",0)} planmatig', True)
          + stab('Uitgevoerd gemeld', nGem, 'actiehouder meldt klaar, wacht op toetsing')
          + stab('Afgerond', nAf, f'na toetsing · {K["optijd"]} binnen termijn')
          + stab('Vervallen', nVerv, 'alleen met reden')
          + f'<div style="width:1px;background:{LINE};flex:none"></div>'
          + stab('Over termijn', len(K['act_over']), 'open, termijn voorbij', False, 'bad')
          + stab('Binnen 7 dagen', len(K['act_binnen7']), 'termijn tot en met ' + dmy((DT.date.fromisoformat(PEIL) + DT.timedelta(days=7)).isoformat())[:5], False, 'let') + '</div>')

seg = (f'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">'
       f'<div style="display:flex;border:1px solid {LINE};border-radius:8px;overflow:hidden;background:{SURF}">'
       + ''.join(f'<span style="display:flex;align-items:center;height:36px;padding:0 14px;font-size:14px;font-weight:600;{"background:"+PRIS+";color:"+PRI if i==0 else "color:"+TXT2};{"border-left:1px solid "+LINE if i else ""}">{t}</span>'
                 for i, t in enumerate([f'Alle open ({nOpen})', f'Ik toets ({K["act_toetser_open_hsm"]})', f'Ik ben actiehouder ({K["act_houder_open_hsm"]})']))
       + '</div><div style="display:flex;gap:8px">'
       + ''.join(chip(t, TXT, SURF, LINE, 13, 500, 'down') for t in ['Prioriteit', 'Actiehouder', 'Toetser', 'Klasse', 'Bron', 'Project'])
       + '</div></div>')

def termijncel(a):
    d = OD[a['actie']]['dagen_tot_termijn']
    if d < 0: t = chip(f'{-d} d over termijn', '#B42318', '#FDECEA', None, 12, 600)
    elif d <= 7: t = chip(f'nog {d} d', '#8A4B00', '#FFF1DC', None, 12, 600)
    else: t = f'<span style="font-size:12px;color:{TXT2}">nog {d} dagen</span>'
    return f'{dmy(a["termijn"])}<div style="margin-top:3px">{t}</div>'
def arow(a):
    sel = a['actie'] == SEL; st = f'background:{PRIS};' if sel else ''
    bron = {'Inspectie': '', 'Buiten TRA': ' · buiten de TRA', 'Idee monteurs': ' · idee van de monteurs'}[a['bron']]
    bij = '' if a['ref'] == 'Buiten TRA' else f' · bij {a["ref"]}'
    first = (f'<div style="display:flex;gap:8px;align-items:center"><b style="font-size:13px">{a["actie"]}</b>{oord(OCODE[a["oordeel"]], True, False)}</div>'
             f'<div style="margin-top:3px">{a["bevinding"]}</div><div style="font-size:12px;color:{TXT2};margin-top:3px">{a["classificatie"]}{bron}{bij}</div>')
    me_h = a['actiehouder'] == HSM; me_t = TN(a['toetser']) == HSM
    pers = (f'{kort(a["actiehouder"])}' + (f' <span style="font-size:12px;color:{TXT};font-weight:700">(jij)</span>' if me_h else '')
            + f'<div style="font-size:12px;color:{TXT2};margin-top:3px">toetser {kort(TN(a["toetser"]))}' + (f' <span style="color:{TXT};font-weight:700">(jij)</span>' if me_t else '') + '</div>')
    act = btn('Toetsen', 'sec', 'checksq', 30, 12) if me_t else (f'<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:{TXT2}">{icon("lock", 14)}niet jouw toetsing</span>' if me_h else '')
    return ('<tr>' + td(first, 'left', st) + td(prio(a['prioriteit']), 'left', st) + td(pers, 'left', st) + td(termijncel(a), 'left', st) + td(act, 'left', st) + '</tr>')

lijst = card(
    f'<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px">'
    f'<div style="{HFONT};font-size:16px;font-weight:600">Open acties ({nOpen}) · op termijn</div>'
    f'<div style="display:flex;gap:8px">{btn("Herinnering sturen", "sec", "bell", 32, 13)}{btn("Lijst maandagoverleg", "sec", "download", 32, 13)}</div></div>'
    + table(th([('Actie en bevinding', None, 'left'), ('Prio', 64, 'left'), ('Actiehouder en toetser', 144, 'left'), ('Termijn', 104, 'left'), ('', 96, 'left')]), [arow(a) for a in openA])
    + f'<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;font-size:13px;color:{TXT2}"><span>{icon("right", 16, TXT2, 1.75, "display:inline-block;vertical-align:-3px")} Afgerond ({nAf}) · {K["optijd"]} binnen termijn · {K["act_terplaatse"]} van de {nAll} ter plaatse getoetst</span><span>Toetser en actiehouder verschillen bij alle {nAll - K["zelf_toets"]} acties</span></div>',
    0, 'overflow:hidden')

# ---------- detail ----------
a = next(x for x in A if x['actie'] == SEL)
regel = next(r for r in D['regels'] if r['wpi'] == a['wpi'] and r['ref'] == a['ref'])
rtitel = re.split(r'[:;/]', regel['omschrijving'])[0].strip()
dover = -OD[SEL]['dagen_tot_termijn']
def kv(k, v):
    return f'<div style="padding:8px 0;border-bottom:1px solid #E9ECF0"><div style="font-size:12px;color:{TXT2}">{k}</div><div style="font-size:14px;margin-top:2px;line-height:1.45">{v}</div></div>'
def tl(d, t, col=TXT2, ic='clock'):
    return f'<div style="display:flex;gap:10px;align-items:flex-start;padding:5px 0"><span style="color:{col};margin-top:1px">{icon(ic, 16, col)}</span><div style="font-size:13px;line-height:1.4">{t}<div style="font-size:12px;color:{TXT2}">{d}</div></div></div>'
herinner = (DT.date.fromisoformat(a['termijn']) - DT.timedelta(days=3)).isoformat()
escal = (DT.date.fromisoformat(a['termijn']) + DT.timedelta(days=1)).isoformat()
detail = card(
    f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font-size:12px;color:{TXT2}">Actie</div><div style="{HFONT};font-size:18px;font-weight:600;margin-top:2px">{a["actie"]}</div></div>{chip(f"{dover} dagen over termijn", "#B42318", "#FDECEA", None, 12, 600)}</div>'
    + f'<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">{chip("Open", TXT, "#EEF0F3", None, 12, 600)}{oord(OCODE[a["oordeel"]], True)}{prio(a["prioriteit"])}{chip(a["classificatie"], TXT, "#EEF0F3", None, 12, 500)}</div>'
    + kv('Bevinding', a['bevinding'])
    + kv('Bij regel', f'{a["ref"]} · {rtitel}')
    + kv('Direct genomen maatregel', a['direct_genomen_maatregel'] or f'<span style="color:{TXT2}">geen</span>')
    + kv('Verbeteractie', a['verbeteractie'])
    + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">' + kv('Actiehouder', a['actiehouder']) + kv('Toetser', f'{TN(a["toetser"])} (jij)') + kv('Termijn', dmy(a['termijn'])) + kv('Uit inspectie', f'<a>{a["wpi"]}</a>') + '</div>'
    + f'<div style="margin-top:12px;font-size:13px;font-weight:600">Verloop</div>'
    + tl(dmy(a['datum']), 'Aangemaakt bij de inspectie', TXT2, 'plus')
    + tl(dmy(herinner), 'Herinnering aan de actiehouder (3 dagen vóór termijn)', TXT2, 'bell')
    + tl(dmy(escal), 'Termijn verstreken; gemeld aan jou en de VGM-coördinator', '#B42318', 'alert')
    + tl('nog niet', 'Uitgevoerd gemeld door de actiehouder', TXT2, 'clock'), 16)

toets = card(
    f'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">{icon("checksq", 20, PRI)}<div style="{HFONT};font-size:16px;font-weight:600">Toetsen</div></div>'
    + f'<div style="font-size:13px;color:{TXT2};line-height:1.45;margin-bottom:12px">Jij bent toetser. De {a["actiehouder"].lower()} heeft nog niet uitgevoerd gemeld; je kunt ook zelf ter plaatse toetsen.</div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Is de verbeteractie uitgevoerd?</div>'
    + f'<div style="display:flex;border:1px solid {LINE};border-radius:8px;overflow:hidden;margin-bottom:12px">'
    + ''.join(f'<span style="flex:1;display:flex;align-items:center;justify-content:center;height:36px;font-size:13px;font-weight:600;{"background:"+PRIS+";color:"+PRI if i==0 else "color:"+TXT2};{"border-left:1px solid "+LINE if i else ""}">{t}</span>' for i, t in enumerate(['Ja', 'Gedeeltelijk', 'Nee']))
    + '</div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Bewijs</div>'
    + f'<div style="display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border:1.5px dashed #9AA3AF;border-radius:8px;font-size:13px;color:{TXT2};margin-bottom:6px">{icon("camera", 18)}Foto of document toevoegen</div>'
    + f'<div style="font-size:12px;color:{TXT2};margin-bottom:12px">Verplicht bij prioriteit direct en kort.</div>'
    + f'<div style="display:flex;gap:10px">{field("Getoetst op", "kies datum", None, True)}{field("Hoe getoetst", "Ter plaatse", None, True)}</div>'
    + f'<div style="height:10px"></div>{field("Opmerking", "Wat heb je gezien?")}'
    + f'<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">{btn("Afronden na toetsing", "pri", "check", 44, 14, "justify-content:center")}{btn("Terug naar actiehouder, met reden", "sec", None, 40, 14, "justify-content:center")}</div>',
    16, 'margin-top:12px')

def regel_(t, v, lock=False, on=True):
    lk = f'<span style="color:{TXT2}">{icon("lock", 14)}</span>' if lock else ''
    return f'<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #E9ECF0"><span style="margin-top:2px">{toggle(on, lock)}</span><div style="flex:1;min-width:0"><div style="font-size:14px;line-height:1.35">{t}</div><div style="font-size:13px;color:{TXT2};margin-top:1px">{v}</div></div>{lk}</div>'
bewaking = card(h2('Termijnbewaking en toetsregels', 'Voor alle acties; wie standaard toetst: Gebruikers en rollen.', btn('Bewerken', 'sec', 'pen', 32, 13), 16)
    + f'<div>'
    + regel_('Herinnering aan actiehouder', '3 dagen vóór termijn')
    + regel_('Melding bij verstreken termijn', 'toetser en VGM-coördinator')
    + regel_('Lijst voor het maandagoverleg', 'elke maandag 07:00')
    + regel_('Standaardtermijn per prioriteit', 'direct 0 · kort 14 · planmatig zelf')
    + regel_('Melding aan toetser bij “Uitgevoerd gemeld”', 'direct')
    + regel_('Bewijs verplicht bij toetsen', 'direct en kort')
    + regel_('Toetser is nooit de actiehouder', 'afgedwongen', True)
    + regel_('Afgerond pas na toetsing', 'afgedwongen', True)
    + '</div>', 16, 'margin-top:12px')

body = (page_head('', 'Acties', 'Actieplan uit de inspecties (VCA 7.1): actiepunten, verantwoordelijken voor uitvoering en toetsing, en tijdsplanning.',
                  btn('Exporteren als actieplan', 'sec', 'download') + btn('Actie toevoegen', 'pri', 'plus'))
        + status + seg
        + f'<div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1;min-width:0">{lijst}</div><div style="width:360px;flex:none">{detail}{toets}{bewaking}</div></div>')
open('/home/claude/app/screens/web/W11-acties.html', 'w').write(page('W11', 'Acties', 'Acties', body, 'Gepubliceerd', user=('HS', 'Hoofd Service &amp; Montage')))
