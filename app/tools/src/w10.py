import sys, json, re; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json'))
K = json.load(open('/home/claude/app/tools/cijfers.json'))
W = sorted(D['wpis'], key=lambda w: w['datum'], reverse=True)
SEL = 'WPI-20261105-DAM-C2'
R = [r for r in D['regels'] if r['wpi'] == SEL]
AC = sorted([a for a in D['acties'] if a['wpi'] == SEL], key=lambda a: int(a['actie'].split('-')[-1]))
w0 = next(w for w in W if w['nr'] == SEL)
pw = K['per_wpi']; s0 = pw[SEL]
TN = lambda t: t.replace(' (ter plaatse)', '').replace(', ter plaatse', '')
nr = lambda aid: aid.split('-')[-1]

# ---------- lijst ----------
def lrow(w):
    s = pw[w['nr']]; on = w['nr'] == SEL; o = s['oord']
    mini = ' '.join(f'<span style="font-size:12px;font-weight:600;color:{OORD[c][1]}">{o.get(OORD[c][0],0)} [{c}]</span>' for c in ['A', 'V'] if o.get(OORD[c][0], 0)) or f'<span style="font-size:12px;color:{TXT2}">geen [A] of [V]</span>'
    act = f'{s["open"]} open van {s["acties"]}' if s['acties'] else 'geen acties'
    dk = s['dek']; wg = dk.get('Waargenomen', 0)
    return (f'<div style="padding:10px 14px;border-bottom:1px solid #E9ECF0;{"background:"+PRIS+";box-shadow:inset 3px 0 0 "+PRI if on else ""}">'
            f'<div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13px;color:{TXT}">{w["nr"]}</b><span style="font-size:12px;color:{TXT2}">{dmy(w["datum"])}</span></div>'
            f'<div style="font-size:13px;color:{TXT};margin-top:2px">{w["product"].split(" (")[0]} · {w["fase"].lower()} · {short(w["project"])}</div>'
            f'<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px;font-size:12px;color:{TXT2}"><span>{short(w["inspecteur"])}</span><span style="display:flex;gap:8px">{mini}</span></div>'
            f'<div style="display:flex;justify-content:space-between;gap:8px;margin-top:2px;font-size:12px;color:{TXT2}"><span>{wg} van {s["n"]} zelf waargenomen</span><span>{act}</span></div></div>')
lijst = card(
    f'<div style="padding:14px 14px 10px 14px;border-bottom:1px solid {LINE}">'
    f'<div style="display:flex;align-items:center;gap:8px;height:36px;box-sizing:border-box;padding:0 10px;border:1px solid {LINE};border-radius:8px;font-size:14px;color:{TXT2}">{icon("search", 16)}Zoek WPI-nummer, project, locatie</div>'
    f'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">{chip("Soort: alle", TXT, "#EEF0F3", None, 12, 500, "down")}{chip("Product: alle", TXT, "#EEF0F3", None, 12, 500, "down")}{chip("Inspecteur: alle", TXT, "#EEF0F3", None, 12, 500, "down")}{chip("Met open acties", TXT2, SURF, LINE, 12, 500)}</div>'
    f'<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:{TXT2}"><span>{K["n_wpi"]} inspecties · nieuwste eerst</span><span>{K["soort_wpi"]["WPI coördinator"]} coördinator · {K["soort_wpi"]["VGM-inspectie directie"]} directie</span></div></div>'
    + ''.join(lrow(w) for w in W), 0, 'overflow:hidden')

# ---------- detail: kop ----------
def kv(k, v):
    return f'<div><div style="font-size:12px;color:{TXT2}">{k}</div><div style="font-size:14px;color:{TXT};margin-top:2px;line-height:1.4">{v}</div></div>'
ORD = ['Conform', 'Afwijking', 'Verbeterpunt', 'Geen afwijking waargenomen', 'Niet beoordeeld', 'Niet van toepassing']
oordelen = ' '.join(oord(OCODE[o], True, False) + f'<span style="font-size:13px;margin:0 8px 0 3px">{c}</span>' for o, c in sorted(s0['oord'].items(), key=lambda kv: ORD.index(kv[0])))
kop = card(
    f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
    f'<div><div style="display:flex;gap:8px;align-items:center">{chip(w0["soort"], PRI, PRIS, None, 12, 600)}{chip("Samenvatting bevestigd door inspecteur", "#1E7A4C", "#E6F4EC", None, 12, 600, "check")}{chip("Inrichting v1.3", TXT, "#EEF0F3", None, 12, 500)}</div>'
    f'<div style="{HFONT};font-size:22px;font-weight:600;margin-top:8px">{SEL}</div>'
    f'<div style="font-size:14px;color:{TXT2};margin-top:4px">{w0["product"]} · fase {w0["fase"].lower()} · taak “{w0["taken"][0]}”</div></div>'
    f'<div style="display:flex;gap:8px">{btn("Rapport (Word)", "sec", "download", 36, 13)}{btn("Delen", "sec", "send", 36, 13)}</div></div>'
    f'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 16px;margin-top:16px;padding-top:14px;border-top:1px solid #E9ECF0">'
    + kv('Datum', dmy(w0['datum'])) + kv('Inspecteur', short(w0['inspecteur'])) + kv('Project', short(w0['project'])) + kv('Monteurs', f'{w0["monteurs"]} eigen monteurs')
    + kv('Opdrachtgever', w0['opdrachtgever']) + kv('Locatie', w0['locatie']) + f'<div style="grid-column:span 2">{kv("Oordelen", oordelen)}</div>'
    + '</div>', 20)

# ---------- regels ----------
def titel(o):
    t = re.split(r'[:;/]', o)[0].strip()
    return t
DK = {'Waargenomen': f'<span style="color:{TXT};font-weight:600">Waargenomen</span>',
      'Alleen bevestigd': f'<span style="color:{TXT2}">Alleen bevestigd</span>',
      'Niet beoordeeld': f'<span style="color:{TXT2}">Niet beoordeeld</span>', 'N.v.t.': f'<span style="color:{TXT3}">N.v.t.</span>'}
def rrow(r):
    sel = r['ref'] == 'DAM-2.07'; st = f'background:{PRIS};' if sel else ''
    acts = (f'<span style="font-weight:600">' + ' · '.join(nr(a) for a in r['acties']) + '</span>') if r['acties'] else f'<span style="color:{TXT2}">–</span>'
    return ('<tr>' + td(f'<b>{r["ref"]}</b>', 'left', st + 'white-space:nowrap') + td(titel(r['omschrijving']), 'left', st) + td(oord(OCODE[r['oordeel']], True), 'left', st)
            + td(DK[r['waargenomen']], 'left', st) + td(f'<div style="display:flex;gap:4px;flex-wrap:wrap">{acts}</div>', 'left', st) + '</tr>')
reg_tab = table(th([('Ref', 52, 'left'), ('Onderwerp of risico', None, 'left'), ('Oordeel', 208, 'left'), ('Dekking', 104, 'left'), ('Acties', 44, 'left')]), [rrow(r) for r in R])
regels = card(h2('Regels', f'{s0["alg"]} algemene onderwerpen (A–I) en {s0["tra"]} regels uit de TRA {w0["product"]}, taak “{w0["taken"][0]}”. {s0["dek"]["Waargenomen"]} van {s0["n"]} zelf waargenomen.',
              f'{chip("Alle " + str(s0["n"]), PRI, PRIS, None, 12, 600)}{chip("Alleen [A] en [V]", TXT, "#EEF0F3", None, 12, 500)}', 16) + reg_tab, 16, 'margin-top:12px')

a4 = next(a for a in AC if a['ref'] == 'DAM-2.07' and a['direct_gecorrigeerd'])
herkomst = card(
    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="{HFONT};font-size:16px;font-weight:600">Herkomst DAM-2.07</div>{oord("A")}</div>'
    f'<div style="display:grid;grid-template-columns:1fr;gap:12px">'
    f'<div style="border:1px solid {LINE};border-radius:10px;padding:12px"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">{chip("Jij", TXT, "#EEF0F3", None, 12, 700, "mic")}<span style="font-size:12px;color:{TXT2}">ingesproken door de inspecteur</span></div>'
    f'<div style="font-size:13px;line-height:1.55">“Kanaal is besloten ruimte, vergunning is er en de collega boven is mangatwacht. Maar de vier-gasmeter hangt bovenaan de ladder, niet bij de man beneden. Heb ik meteen laten omhangen, op de borstband. Dat is een afwijking.”</div></div>'
    f'<div style="border:1px solid #D9D0FA;border-radius:10px;padding:12px;background:{ACCS}"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">{ai_chip("Voorstel")}<span style="font-size:12px;color:{TXT2}">door de begeleider gestructureerd</span></div>'
    f'<div style="font-size:13px;line-height:1.55">Koppeling aan <b>DAM-2.07</b> (besloten ruimte, gasbewaking). Oordeel <b>Afwijking</b>, zoals de inspecteur zei. Actie {nr(a4["actie"])}: verbeteractie ter plaatse uitgevoerd (direct gecorrigeerd), ter plaatse getoetst.</div>'
    f'<div style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:12px;font-weight:600;color:#1E7A4C">{icon("check", 14, "#1E7A4C", 2.5)}Bevestigd door de inspecteur, ongewijzigd</div></div></div>', 16, 'margin-top:12px')

# ---------- acties ----------
def arow(a):
    st = chip('Afgerond', '#1E7A4C', '#E6F4EC', None, 12, 600) if a['status'] == 'Afgerond' else chip('Open', TXT, '#EEF0F3', None, 12, 600)
    tp = ', ter plaatse' in a['toetser'] or '(ter plaatse)' in a['toetser']
    dgm = f'<span style="margin-left:6px">{chip("ter plaatse maatregel genomen", TXT2, "#EEF0F3", None, 12, 500)}</span>' if a['direct_genomen_maatregel'] else ''
    idee = f'<span style="margin-left:6px">{chip("idee van de monteurs", ACC if False else TXT2, "#EEF0F3", None, 12, 500)}</span>' if a['bron'] == 'Idee monteurs' else ''
    dc = f'<span style="margin-left:6px">{chip("direct gecorrigeerd", "#1E7A4C", "#E6F4EC", None, 12, 600)}</span>' if a['direct_gecorrigeerd'] else ''
    bron = '' if a['bron'] == 'Inspectie' else f' · {a["bron"].lower()}'
    return ('<tr>' + td(f'<b>{nr(a["actie"])}</b><div style="font-size:12px;color:{TXT2};white-space:nowrap">{a["ref"]}</div>' + '' + f'')
            + td(f'{a["bevinding"]}<div style="margin-top:3px;color:{TXT2}"><b style="color:{TXT}">Actie:</b> {a["verbeteractie"]}{dgm}{dc}{idee}</div>')
            + td(short(a['actiehouder'])) + td(short(TN(a['toetser'])).replace('Hoofd Service & Montage','Hoofd S&amp;M') + (f'<div style="font-size:12px;color:{TXT2}">ter plaatse</div>' if tp else ''))
            + td(f'<div style="display:flex;gap:4px;flex-wrap:wrap">{prio(a["prioriteit"])}{st}</div><div style="margin-top:4px;white-space:nowrap">{dmy(a["termijn"])}</div>') + '</tr>')
acties = card(h2(f'Acties ({s0["acties"]})', f'{AC[0]["actie"]} t/m -{nr(AC[-1]["actie"])}: {s0["open"]} open, {s0["acties"]-s0["open"]} afgerond na toetsing. Toetsen en termijnbewaking in Acties.', btn('Naar acties', 'ghost', 'arrow', 32, 13), 16)
    + table(th([('Nr', 46, 'left'), ('Bevinding en actie', None, 'left'), ('Actiehouder', 104, 'left'), ('Toetser', 96, 'left'), ('Prio, status, termijn', 112, 'left')]),
            [arow(a) for a in AC]), 16, 'margin-top:12px')

detail = (kop
          + f'<div style="margin-top:12px">{tabs([("Regels en acties", None), ("Rapport", None), ("Foto’s", None), ("Gesprek met monteurs", None), ("Audittrail", None)], "Regels en acties")}</div>'
          + regels + acties)

body = (page_head('', 'Inspecties', f'Alle werkplekinspecties en VGM-inspecties directie: {K["n_wpi"]} inspecties, {K["n_regels"]} regels, {K["n_acties"]} acties.',
                  btn('Exporteren', 'sec', 'download') + btn('Gegevenstabel (CSV)', 'sec', 'table'))
        + f'<div style="display:flex;gap:12px;align-items:flex-start"><div style="width:284px;flex:none">{lijst}{herkomst}<div style="font-size:12px;color:{TXT2};line-height:1.45;margin-top:8px">Klik op een regel om te zien wat de inspecteur zei en wat de begeleider ervan maakte. Het oordeel komt altijd van de inspecteur.</div></div><div style="flex:1;min-width:0">{detail}</div></div>')
open('/home/claude/app/screens/web/W10-inspecties.html', 'w').write(page('W10', 'Inspecties', 'Inspecties', body, 'Gepubliceerd', crumb=['Inspecties', SEL]))
