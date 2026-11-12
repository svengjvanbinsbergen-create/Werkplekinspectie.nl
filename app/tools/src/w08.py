import sys, json; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
K = json.load(open('/home/claude/app/tools/cijfers.json'))
months = K['maanden']; pp = K['per_project']
x, y = K['vp_x'], K['vp_y']; dek = K['dekking']; n = K['n_regels']
openA = K['act_open_n']; over = len(K['act_over'])
pct = lambda a, b: round(100 * a / b) if b else 0

# ---------- dashboards (keuze) ----------
dashboards = (f'<div style="display:flex;gap:12px;margin-bottom:16px">' + ''.join(
    f'<div style="flex:1;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;background:{SURF};border:{"1.5px solid "+PRI if on else "1px solid "+LINE}">'
    f'<span style="color:{PRI if on else TXT2}">{icon("chart", 22)}</span><div style="min-width:0"><div style="font-size:14px;font-weight:600">{nme}</div><div style="font-size:12px;color:{TXT2};margin-top:2px">{s}</div></div>'
    + (f'<span style="margin-left:auto">{chip("bewerken", PRI, PRIS, None, 12, 600)}</span>' if on else '') + '</div>'
    for nme, s, on in [('VGM-trend 2026', 'Directie, coördinatoren · 10 tegels', True), ('Programma-bewaking', 'Coördinatoren · 4 tegels', False), ('Mijn acties', 'Inspecteurs, op de telefoon · 3 tegels', False)])
    + f'<div style="display:flex;align-items:center;justify-content:center;gap:8px;width:200px;flex:none;border:1.5px dashed #9AA3AF;border-radius:10px;font-size:14px;font-weight:600;color:{PRI}">{icon("plus", 18)}Nieuw dashboard</div></div>')

# ---------- filters, doelen, wie ziet wat (boven de vouw) ----------
def frow(on, naam, std):
    return (f'<div style="display:flex;align-items:center;gap:10px;height:36px;border-bottom:1px solid #E9ECF0">{cb(on)}<span style="flex:1;font-size:14px">{naam}</span>'
            f'<span style="font-size:13px;color:{TXT2};white-space:nowrap">{std}</span></div>')
filters = card(h2('Dashboardfilters', 'Gelden voor alle tegels; de kijker kan ze wijzigen.', '', 16)
    + frow(True, 'Periode', 'dit jaar')
    + frow(True, 'Vestiging of afdeling', 'eigen vestiging')
    + frow(True, 'Soort inspectie', 'alle')
    + frow(True, 'Product (kennisbank)', 'alle')
    + frow(True, 'Opdrachtgever', 'alle')
    + frow(False, 'Inspecteur', 'niet voor lezers')
    + f'<div style="display:flex;gap:10px;align-items:center;margin-top:12px">{toggle(True)}<span style="font-size:14px">Vergelijken met vorige periode</span></div>', 16, 'flex:1;min-width:0')

def doel(naam, waarde, bron, vca=False):
    b = chip(bron, PRI, PRIS, None, 12, 600) if vca else f'<span style="font-size:12px;color:{TXT2}">{bron}</span>'
    return (f'<div style="display:flex;align-items:center;gap:10px;height:42px;border-bottom:1px solid #E9ECF0">'
            f'<div style="flex:1;min-width:0;font-size:14px;line-height:1.3">{naam}</div>{b}'
            f'<span style="display:inline-flex;align-items:center;height:30px;box-sizing:border-box;padding:0 10px;border:1px solid {LINE};border-radius:8px;font-size:14px;font-weight:600;white-space:nowrap;min-width:88px">{waarde}</span></div>')
doelen = card(h2('Doelen', 'Eén keer instellen; tegels en meldingen gebruiken ze.', btn('Doel', 'sec', 'plus', 32, 13), 16)
    + doel('Verplichte WPI’s per werkplek', '100%', 'VCA 7.1', True)
    + doel('Directie neemt deel aan een WPI', '1 per kwartaal', 'VCA 7.1', True)
    + doel('Trendanalyse vastgesteld', '1 per jaar', 'VCA 7.2', True)
    + doel('Eigen waarneming per klasse', '≥ 80%', 'eigen doel')
    + doel('Acties prioriteit kort afgerond', '≤ 14 dagen', 'eigen norm'), 16, 'flex:1.15;min-width:0')

def rr(rol, ziet):
    return f'<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #E9ECF0"><b style="width:92px;flex:none;font-size:14px">{rol}</b><span style="font-size:14px;line-height:1.4">{ziet}</span></div>'
toegang = card(h2('Wie ziet wat', 'Per rol: welke tegels en welke gegevens.', '', 16)
    + rr('Directie', 'Alle tegels · alle vestigingen')
    + rr('Coördinator', 'Alle tegels · eigen vestiging')
    + rr('Inspecteur', 'Alleen “Mijn acties” · eigen acties')
    + rr('Lezer', 'Alle tegels, alleen lezen · zonder namen van personen')
    + f'<div style="display:flex;gap:10px;align-items:center;margin-top:12px">{toggle(True)}<span style="font-size:14px">Elke maand als PDF naar de directie</span></div>', 16, 'flex:1.1;min-width:0')

instellingen = f'<div style="display:flex;gap:12px;margin-bottom:16px;align-items:stretch">{filters}{doelen}{toegang}</div>'

# ---------- tegelbibliotheek ----------
def libtile(naam, ic, eigen=False, sel=False, sub=''):
    tag = f'<span style="margin-left:auto;color:{ACC}" title="uit de WPI-methode">{icon("spark", 16, ACC)}</span>' if eigen else ''
    bd = f'1.5px solid {PRI}' if sel else f'1px solid {LINE}'
    return (f'<div style="display:flex;gap:8px;align-items:flex-start;box-sizing:border-box;padding:8px 10px;border:{bd};border-radius:8px;background:{PRIS if sel else SURF};margin-bottom:6px">'
            f'<span style="color:#8A94A3;margin-top:1px">{icon("grip", 16)}</span><span style="color:{PRI if sel else TXT2}">{icon(ic, 18)}</span>'
            f'<div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;color:{TXT};line-height:1.3">{naam}</div><div style="font-size:12px;color:{TXT2};line-height:1.35;margin-top:2px">{sub}</div></div>{tag}</div>')
lib_col = card(
    h2('Tegels', 'Sleep naar het dashboard.', '', 16)
    + f'<div style="display:flex;align-items:center;gap:8px;height:36px;box-sizing:border-box;padding:0 10px;border:1px solid {LINE};border-radius:8px;font-size:14px;color:{TXT2};margin-bottom:10px">{icon("search", 16)}Zoek tegel</div>'
    + f'<div style="display:flex;gap:6px;align-items:flex-start;font-size:12px;color:{TXT2};margin-bottom:12px;line-height:1.4">{icon("spark", 14, ACC)}<span>uit de WPI-methode: dekking, TRA-regels, programma, toetser</span></div>'
    + label('Programma (VCA 7.1)', 'margin:4px 0 8px 0')
    + libtile('Programma per werkplek', 'calendar', True, False, 'Verplicht en gedaan') + libtile('Directie per kwartaal', 'users', True, False, 'Deelname aan een WPI')
    + label('Oordelen (VCA 7.2)', 'margin:14px 0 8px 0')
    + libtile('Dekking per klasse', 'eye', True, True, 'Zelf gezien of bevestigd') + libtile('Afwijkende TRA-regels', 'book', True, False, 'Regel-ID’s met A of V')
    + libtile('Buiten de TRA', 'alert', True, False, 'Mist de TRA een risico?') + libtile('Oordelen per maand', 'chart', False, False, 'Regels per oordeel') + libtile('Bevindingen per klasse', 'list', False, False, '[A] en [V] per klasse')
    + label('Acties', 'margin:14px 0 8px 0')
    + libtile('Open acties per toetser', 'checksq', True, False, 'Wie moet nog toetsen') + libtile('Termijnbewaking', 'clock', False, False, 'Over termijn of bijna') + libtile('Doorlooptijd', 'target', False, False, 'Per prioriteit, met norm')
    + label('Vrij', 'margin:14px 0 8px 0')
    + libtile('Kerngetal met doel', 'target', False, False, 'Eén getal met doellijn') + libtile('Tabel uit gegevens', 'table', False, False, 'Vrije kolommen'), 14)

# ---------- canvas ----------
def tile(span, title, inner, sel=False):
    bd = f'2px solid {PRI}' if sel else f'1px solid {LINE}'
    handles = ''
    if sel:
        for pos in ['top:-5px;left:-5px', 'top:-5px;right:-5px', 'bottom:-5px;left:-5px', 'bottom:-5px;right:-5px']:
            handles += f'<span style="position:absolute;{pos};width:8px;height:8px;background:#FFFFFF;border:2px solid {PRI};border-radius:2px"></span>'
    return (f'<div style="grid-column:span {span};position:relative;background:{SURF};border:{bd};border-radius:10px;padding:12px;box-sizing:border-box">{handles}'
            f'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:13px;font-weight:600;color:{TXT}">{title}</span><span style="color:{TXT2}">{icon("more", 16)}</span></div>{inner}</div>')
def kpi(big, sub):
    return f'<div style="{HFONT};font-size:22px;font-weight:600;color:{TXT}">{big}</div><div style="font-size:12px;color:{TXT2};margin-top:2px;line-height:1.4">{sub}</div>'

# dekking per klasse: alle klassen, laagste aandeel eerst, volledige namen
kd = sorted(K['klasse_dek'].items(), key=lambda kv: (kv[1].get('Waargenomen', 0) / kv[1]['tot'], -kv[1]['tot']))
def stack(d):
    t = d['tot']; w = d.get('Waargenomen', 0); a = d.get('Alleen bevestigd', 0); nb = d.get('Niet beoordeeld', 0) + d.get('N.v.t.', 0)
    return (f'<div style="position:relative;flex:1;min-width:60px"><span style="position:absolute;left:80%;top:-3px;bottom:-3px;border-left:2px solid {TXT}"></span><div style="display:flex;height:12px;border-radius:3px;overflow:hidden;background:#F1F3F6">'
            f'<span style="width:{100*w/t:.1f}%;background:#2F6FD0"></span><span style="width:{100*a/t:.1f}%;background:#A9C2EA"></span>'
            f'<span style="width:{100*nb/t:.1f}%;background:repeating-linear-gradient(135deg,#B8C0CC 0 3px,#E3E6EB 3px 6px)"></span></div></div>')
dek_rows = ''.join(f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px"><span style="width:200px;flex:none;font-size:12px;line-height:1.3;color:{TXT};white-space:nowrap">{k}</span>{stack(d)}'
                   f'<span style="width:84px;flex:none;text-align:right;font-size:12px;white-space:nowrap;{"color:#8A4B00;font-weight:700" if pct(d.get("Waargenomen",0), d["tot"])<80 else "color:"+TXT2}">{d.get("Waargenomen",0)}/{d["tot"]} · {pct(d.get("Waargenomen",0), d["tot"])}%</span></div>' for k, d in kd)
leg = lambda col, t: f'<span style="display:flex;gap:4px;align-items:center"><span style="width:10px;height:10px;background:{col};border-radius:2px"></span>{t}</span>'
dek_tile = (dek_rows + f'<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:{TXT2}">'
            + leg('#2F6FD0', 'Waargenomen') + leg('#A9C2EA', 'Alleen bevestigd') + leg('repeating-linear-gradient(135deg,#B8C0CC 0 3px,#E3E6EB 3px 6px)', 'Niet beoordeeld of n.v.t.')
            + f'<span style="display:flex;gap:4px;align-items:center"><span style="width:2px;height:12px;background:{TXT}"></span>doel 80%</span></div>')

def cell(o):
    b = 'width:18px;flex:none;height:18px;border-radius:3px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center'
    if o is None: return f'<span style="{b};background:#F1F3F6"></span>'
    if not o['telt']: return f'<span style="{b};border:1.5px dashed #9AA3AF">' + (icon('check', 12, '#1E7A4C', 2.5) if o['ok'] else '') + '</span>'
    if o['ok']: return f'<span style="{b};background:#E6F4EC">{icon("check", 12, "#1E7A4C", 2.5)}</span>'
    return f'<span style="{b};background:#FDECEA">{icon("x", 12, "#B42318", 2.5)}</span>'
keys = sorted(pp, key=lambda k: pp[k]['p']['start'])[-7:]
prow = ''
for pk in keys:
    v = pp[pk]; om = {o['maand']: o for o in v['obl']}
    sc = f'{v["x"]}/{v["y"]}' if v['y'] else 'loopt'
    prow += (f'<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><span style="width:62px;flex:none;font-size:12px;color:{TXT};white-space:nowrap">{short(pk)}</span>'
             + ''.join(cell(om.get(m)) for m in months) + f'<span style="margin-left:6px;font-size:12px;color:{TXT2};white-space:nowrap">{sc}</span></div>')
prog_tile = (f'<div style="display:flex;gap:4px;margin-bottom:4px"><span style="width:62px;flex:none"></span>' + ''.join(f'<span style="width:18px;flex:none;text-align:center;font-size:12px;color:{TXT2}">{mnd(m)[0]}</span>' for m in months) + '</div>' + prow
             + f'<div style="font-size:12px;color:{TXT2};margin-top:4px">Nog {len(pp)-len(keys)} projecten · samen {x} van {y} verplichte WPI’s</div>')

om = K['oordeel_maand']
bars = ''
for m in months:
    c = om[m]; segs = ''
    for o, col in [('Afwijking', '#B42318'), ('Verbeterpunt', '#C46A00'), ('Conform', '#1E7A4C'), ('Geen afwijking waargenomen', '#8E98A6'), ('Niet beoordeeld', '#C9CED6')]:
        segs += f'<span style="display:block;height:{c.get(o,0)*1.5:.0f}px;background:{col}"></span>'
    bars += f'<div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex:1"><div style="display:flex;flex-direction:column-reverse;width:18px">{segs}</div><span style="font-size:12px;color:{TXT2}">{mnd(m)}</span></div>'
maand_tile = f'<div style="display:flex;align-items:flex-end;gap:4px;height:92px">{bars}</div><div style="font-size:12px;color:{TXT2};margin-top:6px">Van onder: [A] [V] [C] [GA] [NB]</div>'

afw_tile = ''.join(f'<div style="display:flex;gap:8px;font-size:12px;padding:5px 0;border-bottom:1px solid #E9ECF0"><span style="font-weight:600;width:62px;flex:none">{b["ref"]}</span><span style="color:{TXT2};flex:1;min-width:0">{b["klasse"]}</span><span style="white-space:nowrap">{b["A"]} A · {b["V"]} V</span></div>' for b in K['tra_afw'][:4])
afw_tile += f'<div style="font-size:12px;color:{TXT2};margin-top:6px">{K["n_tra_refs_afw"]} van {K["n_tra_refs"]} getoetste regels</div>'
toets = K['act_toetser_open']; mx = max(toets.values())
toets_tile = ''.join(f'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:110px;flex:none;font-size:12px;color:{TXT};white-space:nowrap">{short(k).replace("Hoofd Service & Montage","Hoofd S&amp;M")}</span><span style="height:12px;width:{v/mx*90:.0f}px;background:#2F6FD0;border-radius:2px"></span><span style="font-size:12px">{v}</span></div>' for k, v in sorted(toets.items(), key=lambda kv: -kv[1]))

bc = K['buiten_tra_cnt']
bui_tile = (f'<div style="{HFONT};font-size:22px;font-weight:600">{len(K["buiten_tra"])}</div><div style="font-size:12px;color:{TXT2};line-height:1.4;margin-bottom:6px">waarnemingen zonder TRA-regel</div>'
            + ''.join(f'<div style="font-size:12px;line-height:1.4;padding:3px 0;border-top:1px solid #E9ECF0"><b>{c}×</b> {o}</div>' for o, c in bc[:2]))
over_n = len(K['act_over']); b7 = len(K['act_binnen7'])
term_tile = (f'<div style="display:flex;gap:16px;margin-bottom:8px"><div>{kpi(str(over_n), "over termijn")}</div><div>{kpi(str(b7), "termijn binnen 7 dagen")}</div><div>{kpi(str(K["optijd"])+"/"+str(K["n_af"]), "afgerond binnen termijn")}</div></div>'
             + ''.join(f'<div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:4px 0;border-top:1px solid #E9ECF0"><span style="font-weight:600">{a}</span><span style="color:#B42318;white-space:nowrap">{-K["act_open_detail"][a]["dagen_tot_termijn"]} d over</span></div>' for a in sorted(K['act_over'], key=lambda a: K['act_open_detail'][a]['dagen_tot_termijn'])[:2]))
canvas = card(
    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    f'<span style="font-size:13px;color:{TXT2}">Voorbeeldweergave met de gegevens tot {dmy(K["periode"][1])}</span>'
    f'<div style="display:flex;gap:6px;align-items:center;font-size:13px;color:{TXT2}">{icon("eye", 16)}Bekijken als <b style="color:{TXT}">Directie</b>{icon("down", 14)}</div></div>'
    + '<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:10px">'
    + tile(3, 'Werkplekken', kpi(f'{x}/{y}', 'verplichte WPI’s'))
    + tile(3, 'Directie', kpi(f'{K["dir_kw_ok"]}/{len(K["kwartalen"])}', 'kwartalen'))
    + tile(3, 'Waargenomen', kpi(f'{pct(dek["Waargenomen"], n)}%', f'{dek["Waargenomen"]} van {n} regels'))
    + tile(3, 'Open acties', kpi(f'{openA}', f'{over} over termijn'))
    + tile(12, 'Dekking per klasse', dek_tile, True)
    + tile(7, 'Programma per werkplek', prog_tile)
    + tile(5, 'Oordelen per maand', maand_tile)
    + tile(7, 'Afwijkende TRA-regels', afw_tile)
    + tile(5, 'Open acties per toetser', toets_tile)
    + f'<div style="grid-column:span 12;display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border:1.5px dashed #9AA3AF;border-radius:10px;font-size:14px;font-weight:600;color:{PRI}">{icon("plus", 18)}Sleep hier een tegel</div>'
    + '</div>', 14)

# ---------- tegelinstellingen ----------
def opt(lbl, val):
    return field(lbl, val, None, True) + '<div style="height:10px"></div>'
seg = lambda items, on: (f'<div style="display:flex;border:1px solid {LINE};border-radius:8px;overflow:hidden">' + ''.join(
    f'<span style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:34px;font-size:13px;font-weight:600;{"background:"+PRIS+";color:"+PRI if i==on else "color:"+TXT2};{"border-left:1px solid "+LINE if i else ""}">{icon(ic,16)}{t}</span>' for i, (t, ic) in enumerate(items)) + '</div>')
inst = card(
    h2('Tegel: Dekking per klasse', 'Hoeveel van wat beoordeeld is, heeft de inspecteur zelf gezien?', '', 16)
    + tabs(['Gegevens', 'Weergave', 'Toegang'], 'Gegevens', 'margin-bottom:14px')
    + opt('Gegevens uit', 'Regels (oordelen per inspectie)')
    + opt('Meten', 'Aantal regels')
    + opt('Opsplitsen naar', 'Dekking (3 waarden)')
    + opt('Per', 'Klasse van de bevinding')
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Filter op deze tegel</div>'
    + f'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">{chip("Soort regel: alle", TXT, "#EEF0F3", None, 12, 500)}{chip("+ filter", PRI, PRIS, None, 12, 600)}</div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Weergave</div>'
    + seg([('Balk', 'chart'), ('Tabel', 'table'), ('Getal', 'target')], 0) + '<div style="height:10px"></div>'
    + opt('Sorteren', 'Laagste aandeel eerst')
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Doellijn</div>'
    + f'<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">{field(None, "Eigen waarneming ≥ 80%", None, True)}</div>'
    + opt('Vergelijken met', 'Vorige periode (zelfde lengte)')
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Melding bij drempel</div>'
    + f'<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">{toggle(True)}<span style="font-size:13px;line-height:1.4">Klasse onder 60% waargenomen: melding aan coördinator</span></div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Klik op een balk opent</div>'
    + field(None, 'Inspecties, regels met dit filter', None, True) + '<div style="height:10px"></div>'
    + f'<div style="font-size:13px;font-weight:600;margin-bottom:6px">Uitleg bij de tegel</div><div style="border:1px solid {LINE};border-radius:8px;padding:8px 12px;font-size:13px;line-height:1.5">Alleen bevestigd = “niets op aan te merken” bij de afsluitvraag, zonder eigen waarneming.</div>'
    + f'<div style="display:flex;gap:8px;margin-top:14px">{btn("Dupliceren", "sec", "copy", 34, 13)}{btn("Verwijderen", "sec", "trash", 34, 13)}</div>', 16)

body = (page_head('', 'Dashboardbouwer',
                  'Stel het resultatendashboard samen: tegels uit de beschikbare gegevens, filters, doelen en per rol wie wat ziet.',
                  btn('Sjabloon VCA 7.1 en 7.2', 'sec', 'copy') + btn('Bekijken', 'sec', 'eye') + btn('Naar publiceren', 'pri', 'arrow'))
        + dashboards + instellingen
        + f'<div style="display:flex;gap:12px;align-items:flex-start">'
        + f'<div style="width:264px;flex:none">{lib_col}</div>'
        + f'<div style="flex:1;min-width:0">{canvas}</div>'
        + f'<div style="width:292px;flex:none">{inst}</div></div>')
open('/home/claude/app/screens/web/W08-dashboardbouwer.html', 'w').write(page('W08', 'Dashboardbouwer', 'Dashboardbouwer', body, 'Concept'))
