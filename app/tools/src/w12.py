import sys, json; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
K = json.load(open('/home/claude/app/tools/cijfers.json'))
months = K['maanden']; PEIL = K['periode'][1]
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json')); PEIL = D['peildatum']
MNDL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
mlang = lambda m: f'{MNDL[int(m[5:7])-1].capitalize()} {m[:4]}'
cur = PEIL[:7]; volg = K['volgende_maand']

def regel(nr, titel, wat, params, bron, on=True):
    return card(
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div style="display:flex;gap:10px;align-items:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:{PRIS};color:{PRI};font-size:13px;font-weight:700;flex:none">{nr}</span><span style="font-size:15px;font-weight:600">{titel}</span></div>{toggle(on)}</div>'
        + f'<div style="font-size:14px;line-height:1.9;margin-top:10px">{wat}</div>'
        + (f'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">{params}</div>' if params else '')
        + f'<div style="font-size:12px;color:{TXT2};margin-top:10px;line-height:1.45">{bron}</div>', 16, 'flex:1;min-width:0')
def inp(v):
    return f'<span style="display:inline-flex;align-items:center;gap:4px;height:28px;box-sizing:border-box;padding:0 8px;border:1px solid {LINE};border-radius:6px;background:{SURF};font-weight:600;color:{TXT};vertical-align:middle;white-space:nowrap">{v}{icon("down", 14, TXT2)}</span>'
regels = (f'<div style="display:flex;gap:12px;margin-bottom:12px">'
    + regel(1, 'Lange projecten', f'Project langer dan {inp("1 maand")} op één locatie: elke kalendermaand {inp("1 WPI")}.', '', 'VCA 7.1: eenmaal per maand per operationele werkplek')
    + regel(2, 'Korte projecten met risico', f'Kort project met een risicokenmerk: ten minste {inp("1 WPI")} tijdens het project.',
            chip('hijsen met mobiele kraan', TXT, '#EEF0F3', None, 12, 500) + chip('besloten ruimte met vergunning', TXT, '#EEF0F3', None, 12, 500) + chip('open water', TXT, '#EEF0F3', None, 12, 500) + chip('+ kenmerk', PRI, PRIS, None, 12, 600),
            'VCA 7.1 voetnoot 10: naar verhouding, rekening houdend met de risico’s')
    + regel(3, 'Overige korte projecten', f'Kort project zonder risicokenmerk: {inp("1 op de 4")} per {inp("kwartaal")}, naar boven afgerond.', '', 'Voetnoot 10, eigen invulling (procedure 5.5, voorstel)')
    + regel(4, 'Directie', f'Een directielid neemt ten minste {inp("1×")} per {inp("kwartaal")} deel aan een WPI.', '', 'VCA 7.1: (operationele) directieleden, minimaal eenmaal per kwartaal')
    + '</div>')
bronkaart = card(f'<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
    f'<span style="font-size:14px;font-weight:600">Projecten komen uit</span>{field(None, "Projectplanning, dagelijks", 240, True)}'
    f'<span style="font-size:13px;color:{TXT2}">{K["n_proj"]} projecten · bijgewerkt {dmy(PEIL)} · risico uit werkvoorbereiding</span>'
    f'<span style="flex:1"></span>{btn("Project toevoegen", "sec", "plus", 34, 13)}</div>', 14, 'margin-bottom:20px')

x, y = K['vp_x'], K['vp_y']; cl = K['vp_cat']
def stat(t, big, sub, tone=None):
    col = {'bad': '#B42318', 'ok': '#1E7A4C'}.get(tone, TXT)
    return card(f'<div style="font-size:13px;color:{TXT2};font-weight:600">{t}</div><div style="{HFONT};font-size:24px;font-weight:600;color:{col};margin-top:4px">{big}</div><div style="font-size:12px;color:{TXT2};margin-top:4px;line-height:1.4">{sub}</div>', 14, 'flex:1;min-width:0')
stand = (f'<div style="display:flex;gap:12px;margin-bottom:12px">'
         + stat('Verplichte WPI’s gedaan', f'{x} van {y}', f'{round(100*x/y)}% · perioden die om zijn', 'bad')
         + stat('Lange projecten', f'{cl["lang"][0]} van {cl["lang"][1]}', 'kalendermaanden met een WPI', 'bad')
         + stat('Kort met risico', f'{cl["risico"][0]} van {cl["risico"][1]}', 'projecten met ten minste één WPI', 'bad')
         + stat('Overige korte projecten', f'{len(K["overig"])}', 'in de planning; regel 3 telt nu niet mee')
         + stat('Directie', f'{K["dir_kw_ok"]} van {len(K["kwartalen"])}', ', '.join(q[:2] for q in K['kwartalen']) + ' 2026', 'ok')
         + stat('Lopende perioden', f'{K["vp_lopend"]}', f'waarvan {K["vp_lopend_ok"]} al gedaan')
         + '</div>')

CATR = {'lang': 'elke maand', 'risico': 'ten minste één', 'overig': '1 op 4'}
def mrow(p):
    s = p['status']
    if s == 'gedaan':
        st = chip(f'gedaan {dmy(p["datum"])[:5]}', '#1E7A4C', '#E6F4EC', None, 12, 600, 'check'); who = short(p['inspecteur']) + f'<div style="font-size:12px;color:{TXT2}">{p["wpi"]}</div>'
    elif s == 'al gedaan':
        st = chip(f'al gedaan in {mnd(p["datum"][:7])}', '#1E7A4C', '#E6F4EC', None, 12, 600, 'check'); who = short(p['inspecteur'])
    elif s == 'gemist':
        st = chip(f'gemist · klaar {dmy(p["eind"])[:5]}', '#B42318', '#FDECEA', None, 12, 600, 'x'); who = f'<span style="color:{TXT2}">–</span>'
    else:
        st = chip(f'nog te doen · uiterlijk {dmy(p["uiterlijk"])[:5]}', '#8A4B00', '#FFF1DC', None, 12, 600, 'clock')
        who = field(None, 'Kies inspecteur', 160, True, None, False, '', 32)
    return ('<tr>' + td(f'<b>{short(p["project"])}</b>') + td(f'{p["product"]}<div style="font-size:12px;color:{TXT2}">{p["locatie"]}</div>')
            + td(f'{dmy(p["start"])} – {dmy(p["eind"])}<div style="font-size:12px;color:{TXT2}">{p["dur"]} dagen · {CATR[p["cat"]]}</div>')
            + td(f'<span style="color:{TXT2}">{", ".join(p["risk"]) or "–"}</span>') + td(st) + td(who) + '</tr>')
mt = K['maand_nu_telling']
deze = card(h2(f'{mlang(cur)} · stand op {dmy(PEIL)}', f'Projecten die deze maand lopen of liepen: {mt.get("gedaan",0)+mt.get("al gedaan",0)} gedaan, {mt.get("nog te doen",0)} nog te doen, {mt.get("gemist",0)} gemist. De maand loopt nog; in de stand hierboven tellen alleen perioden die om zijn.', btn('Planning delen met inspecteurs', 'sec', 'send', 32, 13), 16)
    + table(th([('Project', 60, 'left'), ('Product en locatie', None, 'left'), ('Looptijd en regel', 170, 'left'), ('Risico', 140, 'left'), ('Status', 190, 'left'), ('Inspecteur', 150, 'left')]),
            [mrow(p) for p in K['maand_nu']]), 16, 'margin-bottom:12px')

vp_n = K['volgende_maand_proj']
decrow = ''.join(f'<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #E9ECF0"><b style="width:64px;flex:none;font-size:13px">{short(p["project"])}</b><span style="flex:1;min-width:0;font-size:13px;line-height:1.4">{p["product"]}<span style="color:{TXT2}"> · tot {dmy(p["eind"])}</span><br><span style="font-size:12px;color:{TXT2}">{p["locatie"]}</span></span>{field(None, "Kies inspecteur", 160, True, None, False, "", 32)}</div>' for p in vp_n)
nl_ = sum(1 for p in vp_n if p['cat'] == 'lang')
december = card(h2(f'{mlang(volg)} · vooruitblik', f'{len(vp_n)} projecten lopen door, waarvan {nl_} lang: {nl_} verplichte WPI’s.', '', 16) + decrow, 16, 'flex:1;min-width:0')

vm = K['vp_maand']; mx = max(v['y'] + v['lopend'] for v in vm.values())
bars = ''
for m in months:
    v = vm[m]
    if not v['y'] + v['lopend']: continue
    lab = f'{v["ok"]}/{v["y"]}'
    bars += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:12px;font-weight:600">{lab}</span>'
             f'<div style="width:34px;height:{12*mx}px;display:flex;flex-direction:column-reverse;background:#F1F3F6;border-radius:3px;overflow:hidden">'
             f'<span style="flex:none;height:{12*v["ok"]}px;background:#1E7A4C"></span><span style="flex:none;height:{12*(v["y"]-v["ok"])}px;background:#B42318"></span>'
             f'<span style="flex:none;height:{12*v["lopend_ok"]}px;background:repeating-linear-gradient(135deg,#9BCFB2 0 3px,#E6F4EC 3px 6px)"></span>'
             f'<span style="flex:none;height:{12*(v["lopend"]-v["lopend_ok"])}px;background:repeating-linear-gradient(135deg,#B8C0CC 0 3px,#EEF0F3 3px 6px)"></span></div>'
             f'<span style="font-size:12px;color:{TXT2}">{mnd(m)}</span></div>')
L = lambda col, t: f'<span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:12px;background:{col};border-radius:2px"></span>{t}</span>'
nv = vm[cur]
gemist = card(h2('Verplichtingen per maand', 'Gedaan van verplicht, voor perioden die om zijn; de lopende maand gearceerd.', '', 16)
    + f'<div style="display:flex;gap:6px;align-items:flex-end">{bars}</div>'
    + f'<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:{TXT2}">' + L('#1E7A4C', 'gedaan') + L('#B42318', 'gemist')
    + L('repeating-linear-gradient(135deg,#9BCFB2 0 3px,#E6F4EC 3px 6px)', 'lopend, al gedaan') + L('repeating-linear-gradient(135deg,#B8C0CC 0 3px,#EEF0F3 3px 6px)', 'lopend, nog te doen') + '</div>'
    + f'<div style="font-size:12px;color:{TXT2};margin-top:6px">{mnd(cur).capitalize()}: {nv["ok"]}/{nv["y"]} afgesloten (project klaar), {nv["lopend"]} lopend waarvan {nv["lopend_ok"]} al gedaan.</div>', 16, 'flex:1;min-width:0')

pi = K['prog_insp']
def icell(e):
    if not e: return td('–', 'center', f'color:{TXT2}')
    u, g = e; ok = u >= g
    col = '#1E7A4C' if ok else '#B42318'; bg = '#E6F4EC' if ok else '#FDECEA'
    return td(f'<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:{bg};color:{col};font-weight:600;font-size:12px">{icon("check" if ok else "x", 12, col, 2.5)}{u}/{g}</span>', 'center')
irows = ['<tr>' + td(f'<b>{short(k)}</b>') + ''.join(icell(v['maanden'].get(m)) for m in months) + td(f'<b>{v["uitgevoerd"]} van {v["gepland"]}</b>', 'right') + '</tr>' for k, v in pi.items()]
perinsp = card(h2('Planning per inspecteur', f'Uitgevoerd van gepland per maand. Samen {K["prog_uitgevoerd"]} van {K["prog_gepland"]}; per werkplek {x} van {y}.', '', 16)
    + table(th([('Inspecteur', 120, 'left')] + [(mnd(m), None, 'center') for m in months] + [('Totaal', 70, 'right')]), irows)
    + f'<div style="margin-top:12px;padding:12px;border-radius:8px;background:#FFF1DC;font-size:13px;line-height:1.5;color:#5C3300">De planning per persoon is bijna gehaald, maar dekt de werkplekken niet. Plan per project (zie {MNDL[int(cur[5:7])-1]} en {MNDL[int(volg[5:7])-1]} hierboven), niet per persoon.</div>', 16)

body = (page_head('', 'Inspectieprogramma 2026',
                  'Wanneer moet er een WPI zijn? De regels rekenen per werkplek uit wat verplicht is; de planning laat zien wat nog moet en wie het doet.',
                  btn('Programma als PDF', 'sec', 'download') + btn('Naar publiceren', 'pri', 'arrow'))
        + f'<div style="{HFONT};font-size:18px;font-weight:600;margin-bottom:10px">Regels</div>' + regels + bronkaart
        + f'<div style="{HFONT};font-size:18px;font-weight:600;margin:4px 0 10px 0">Stand en planning</div>' + stand + deze
        + f'<div style="display:flex;gap:12px;margin-bottom:12px;align-items:stretch">{december}{gemist}</div>'
        + perinsp)
open('/home/claude/app/screens/web/W12-programma.html', 'w').write(page('W12', 'Programma', 'Programma', body, 'Concept'))
