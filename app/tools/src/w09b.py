import sys, json; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
K = json.load(open('/home/claude/app/tools/cijfers.json'))
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json')); PEIL = D['peildatum']
months = K['maanden']; n = K['n_regels']; oo = K['oordeel']; dek = K['dekking']
pct = lambda a, b: round(100 * a / b) if b else 0
TK = K['trend_klasse']; TH = K['trend_helften']
thema = {(t['klasse'], t['thema']): t for t in K['thema']}
def tn(k, t): return thema[(k, t)]['n']
afw_per_klasse = {}
for b in K['tra_afw']: afw_per_klasse[b['klasse']] = afw_per_klasse.get(b['klasse'], 0) + 1
bui = dict((o, c) for o, c in K['buiten_tra_cnt'])

tabbar = tabs(['Overzicht', 'Klassen en TRA-regels', ('Acties', K['act_open_n']), 'Trendanalyse VCA 7.2'], 'Trendanalyse VCA 7.2', 'margin-bottom:16px')

# ---------- VCA-kader + voortgang ----------
vca = (f'<div style="flex:1.25;min-width:0;background:{PRIS};border:1px solid #C5D7F2;border-radius:10px;padding:16px 20px;box-sizing:border-box">'
       f'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">{chip("VCA 2026/6.1 · 7.2", PRI, SURF, "#C5D7F2", 12, 700)}<span style="font-size:14px;font-weight:600;color:#174A96">Letterlijke eis</span></div>'
       f'<div style="font-size:14px;line-height:1.55;color:{TXT}">“Vindt er een trendanalyse plaats van bij inspecties geconstateerde bevindingen (positieve en negatieve)?”</div>'
       f'<ul style="margin:8px 0 0 0;padding-left:18px;font-size:14px;line-height:1.6;color:{TXT}"><li>Bevindingen worden geclassificeerd.</li><li>Er wordt een jaarlijkse trendanalyse gemaakt, inclusief te ondernemen acties en follow-up.</li></ul>'
       f'<div style="font-size:13px;color:{TXT2};margin-top:8px">Documenten: trendanalyse; overzicht verbeteracties.</div>'
       f'<div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#FFF1DC;border:1px solid #F1D3A6;font-size:13px;line-height:1.5;color:#5C3300"><b>Eigen keuze Noardling (procedure):</b> analyse in december over het kalenderjaar; vaststellen door het Hoofd Service &amp; Montage; stand van de acties maandelijks in het coördinatorenoverleg. Instelbaar in Programma en Dashboardbouwer.</div></div>')
def stap(nr, t, sub, st):
    col = {'ok': ('#1E7A4C', '#E6F4EC', 'check'), 'bezig': ('#8A4B00', '#FFF1DC', 'clock'), 'open': (TXT2, '#EEF0F3', 'clock')}[st]
    return (f'<div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid #E9ECF0"><span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:{col[1]};color:{col[0]};flex:none">{icon(col[2], 14, col[0], 2.5)}</span>'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">{nr}. {t}</div><div style="font-size:13px;color:{TXT2};line-height:1.4">{sub}</div></div></div>')
CONCL = [  # (klasse, herkomst, tekst)
    ('Hijsen', 'jij', f'Terugkerend: geen stuurlijn bij het begeleiden van de last ({tn("Hijsen","Geen stuurlijn gebruikt bij het begeleiden van de last")}×) en hijszone niet volledig afgezet ({tn("Hijsen","Hijszone niet volledig afgezet tijdens het hijsen")}×), verspreid over {afw_per_klasse["Hijsen"]} TRA-regels. Geluid bij hijsen staat {bui["Geluid van naastgelegen installatie bemoeilijkt communicatie bij hijsen"]}× buiten de TRA: dat risico ontbreekt.'),
    ('Gevaarlijke stoffen en hygiëne', 'jij', f'Handenwasgelegenheid ontbreekt {tn("Gevaarlijke stoffen en hygiëne","Geen handenwasgelegenheid bij de werkplek")}× en eten of drinken in de werkzone {tn("Gevaarlijke stoffen en hygiëne","Eten of drinken in de werkzone")}×, bij verschillende producten. Het zit in de uitrusting van de wagens, niet bij één ploeg.'),
    ('Besloten ruimte en gas', 'voorstel', f'Alle {TK["Besloten ruimte en gas"]["tot"]} regels zelf waargenomen; {TK["Besloten ruimte en gas"]["A"]} afwijkingen, waarvan {TK["Besloten ruimte en gas"]["neg_H2"]} in sep–nov. Geen mangatwacht ({tn("Besloten ruimte en gas","Geen mangatwacht aanwezig bij het betreden")}×) en gasmeter niet op werkhoogte.'),
    ('Documenten en voorbereiding', 'voorstel', f'Verouderde TRA in de projectmap. Maar {TK["Documenten en voorbereiding"]["W"]} van {TK["Documenten en voorbereiding"]["tot"]} regels zelf waargenomen ({pct(TK["Documenten en voorbereiding"]["W"], TK["Documenten en voorbereiding"]["tot"])}%).'),
    ('Gedrag en werkwijze', 'voorstel', f'Laagste dekking: {TK["Gedrag en werkwijze"]["W"]} van {TK["Gedrag en werkwijze"]["tot"]} zelf waargenomen ({pct(TK["Gedrag en werkwijze"]["W"], TK["Gedrag en werkwijze"]["tot"])}%), {TK["Gedrag en werkwijze"]["GA"]} alleen bevestigd. Weinig bevindingen zegt hier weinig.'),
]
nj = sum(1 for c in CONCL if c[1] == 'jij'); nv = len(CONCL) - nj
voortgang = card(h2('Voortgang', f'Trendanalyse over {mnd(months[0])}–{mnd(months[-1])} 2026 · eigenaar Hoofd Service & Montage', '', 16)
    + stap(1, 'Cijfers', f'Automatisch uit {K["n_wpi"]} rapporten, peildatum {dmy(PEIL)}', 'ok')
    + stap(2, 'Conclusies per klasse', f'{nj} bevestigd, {nv} voorstellen te beoordelen', 'bezig')
    + stap(3, 'Te ondernemen acties', '4 besloten, 1 voorstel', 'bezig')
    + stap(4, 'Vaststellen', 'Door Hoofd Service & Montage, in het coördinatorenoverleg', 'open')
    + stap(5, 'Follow-up', 'Status van de besloten acties: maandelijks, en in de analyse van 2027', 'open'), 16, 'flex:1;min-width:0')
top = f'<div style="display:flex;gap:12px;margin-bottom:16px;align-items:stretch">{vca}{voortgang}</div>'

# ---------- basis ----------
def stat(t, big, sub):
    return f'<div style="flex:1;min-width:0;padding:0 16px;border-left:1px solid #E9ECF0"><div style="font-size:13px;color:{TXT2};font-weight:600">{t}</div><div style="{HFONT};font-size:24px;font-weight:600;margin-top:4px">{big}</div><div style="font-size:12px;color:{TXT2};margin-top:2px;line-height:1.4">{sub}</div></div>'
basis = card(f'<div style="display:flex;margin-left:-16px">'
    + stat('Inspecties', K['n_wpi'], f'{TH["wpi_H1"]} in mei–aug, {TH["wpi_H2"]} in sep–nov')
    + stat('Beoordeelde regels', n, f'{dek["Waargenomen"]} zelf waargenomen ({pct(dek["Waargenomen"], n)}%)')
    + stat('Positief', f'{oo["Conform"]}', '[C] Conform, met eigen waarneming')
    + stat('Negatief', K['n_neg'], f'{oo["Afwijking"]} [A] · {oo["Verbeterpunt"]} [V]')
    + stat('Alleen bevestigd', oo['Geen afwijking waargenomen'], '[GA] via de afsluitvraag')
    + stat('Acties', K['n_acties'], f'{K["act_status"]["Afgerond"]} afgerond, {K["act_open_n"]} open') + '</div>', 16, 'margin-bottom:16px')

# ---------- conclusies per klasse ----------
cmap = {c[0]: c for c in CONCL}
def herk(kind):
    if kind == 'jij':
        return chip('Jij', TXT, '#EEF0F3', None, 12, 600)
    return ai_chip('Voorstel')
rows = []
order = sorted(TK.items(), key=lambda kv: (-(kv[1]['A'] + kv[1]['V']), -kv[1]['tot']))
zonder = [(k, t) for k, t in order if t['A'] + t['V'] == 0]
for k, t in order:
    if t['A'] + t['V'] == 0: continue
    c = cmap.get(k)
    trend = f'{t["neg_H1"]} → {t["neg_H2"]}'
    acts = f'{t["act_open"]} open · {t["act_af"]} af' + (f'<div style="font-size:12px;color:#B42318">{t["act_te_laat"]} te laat</div>' if t['act_te_laat'] else '')
    if c:
        st = f'background:{ACCS};border:1px solid #D9D0FA' if c[1] == 'voorstel' else f'background:{SURF};border:1px solid {LINE}'
        knop = (f'<div style="display:flex;gap:6px;margin-top:6px">{btn("Overnemen", "sec", "check", 28, 12)}{btn("Aanpassen", "ghost", "pen", 28, 12)}</div>' if c[1] == 'voorstel'
                else f'<div style="font-size:12px;color:{TXT2};margin-top:4px">Geschreven door VGM-coördinator, 10-11-2026</div>')
        concl = f'<div style="{st};border-radius:8px;padding:8px 10px"><div style="margin-bottom:4px">{herk(c[1])}</div><div style="font-size:13px;line-height:1.5">{c[2]}</div>{knop}</div>'
    else:
        concl = f'<span style="font-size:13px;color:{TXT2}">Geen conclusie: {t["A"]+t["V"]} bevinding{"en" if t["A"]+t["V"]>1 else ""}</span>'
    rows.append('<tr>' + td(f'<b>{k}</b><div style="font-size:12px;color:{TXT2}">{t["tot"]} regels' + (f' · {t["bui"]} buiten TRA' if t['bui'] else '') + '</div>')
                + td(str(t['C']), 'center') + td(f'<b style="color:#B42318">{t["A"]}</b>', 'center') + td(f'<b style="color:#8A4B00">{t["V"]}</b>', 'center')
                + td(trend, 'center', 'white-space:nowrap') + td(f'{pct(t["W"], t["tot"])}%', 'center', ('color:#8A4B00;font-weight:700' if pct(t['W'], t['tot']) < 80 else ''))
                + td(acts) + td(concl) + '</tr>')
zw = ', '.join(f'{k} ({t["C"]} [C] van {t["tot"]})' for k, t in zonder)
rows.append('<tr>' + td(f'<b>Zonder bevindingen</b><div style="font-size:12px;color:{TXT2}">{len(zonder)} klassen</div>') + f'<td colspan="7" style="font-size:13px;padding:9px 10px;border-bottom:1px solid #E9ECF0;line-height:1.5">{oord("C", True)} Positief: {zw}. Dekking Fysieke belasting {pct(TK["Fysieke belasting"]["W"], TK["Fysieke belasting"]["tot"])}%: {TK["Fysieke belasting"]["NB"]} regels niet beoordeeld.</td></tr>')
concl_card = card(h2('Conclusies per klasse', f'Positieve en negatieve bevindingen per klasse. Trend: [A]+[V] in mei–aug ({TH["wpi_H1"]} WPI’s) tegenover sep–nov ({TH["wpi_H2"]} WPI’s). De cijfers rekent de app; een conclusie schrijft een mens of neemt een voorstel over.', btn('Alle voorstellen bekijken', 'acc', 'spark', 32, 13), 16)
    + table(th([('Klasse', 178, 'left'), ('[C]', 30, 'center'), ('[A]', 30, 'center'), ('[V]', 30, 'center'), ('Trend', 62, 'center'), ('Gezien', 50, 'center'), ('Acties', 82, 'left'), ('Conclusie', None, 'left')]), rows), 16, 'margin-bottom:16px')

# ---------- te ondernemen acties ----------
def arow(nr, wat, aanl, houder, toetser, termijn, status, voorstel=False):
    st = f'background:{ACCS};' if voorstel else ''
    s = ai_chip('Voorstel') if voorstel else chip(status, TXT, '#EEF0F3', None, 12, 600)
    return ('<tr>' + td(f'<b>{nr}</b>', 'left', st + 'white-space:nowrap') + td(wat, 'left', st) + td(f'<span style="color:{TXT2}">{aanl}</span>', 'left', st)
            + td(houder, 'left', st) + td(toetser, 'left', st) + td(termijn, 'left', st + 'white-space:nowrap') + td(s, 'left', st) + '</tr>')
x, y = K['vp_x'], K['vp_y']
acties = card(h2('Te ondernemen acties', 'Besloten bij deze trendanalyse. Toetser is nooit de actiehouder; is het Hoofd S&amp;M actiehouder, dan toetst de directie.', btn('Actie', 'sec', 'plus', 32, 13), 16)
    + table(th([('Nr', 92, 'left'), ('Actie', None, 'left'), ('Aanleiding', 178, 'left'), ('Actiehouder', 120, 'left'), ('Toetser', 120, 'left'), ('Termijn', 84, 'left'), ('Status', 92, 'left')]), [
        arow('TA-2026-1', 'Hijs-TRA’s aanvullen met het risico “communicatie bij omgevingsgeluid”, met maatregelen (portofoons, vaste handseinen).', f'Hijsen · {bui["Geluid van naastgelegen installatie bemoeilijkt communicatie bij hijsen"]}× buiten de TRA', 'Coördinator 1', 'Hoofd S&amp;M', '31-03-2027', 'Besloten'),
        arow('TA-2026-2', 'Stuurlijn en afzetting van de hijszone als vaste vragen op de LMRA; toolbox in alle ploegen.', f'Hijsen · {tn("Hijsen","Geen stuurlijn gebruikt bij het begeleiden van de last")}× stuurlijn, {tn("Hijsen","Hijszone niet volledig afgezet tijdens het hijsen")}× afzetting', 'Coördinator 2', 'Hoofd S&amp;M', '28-02-2027', 'Besloten'),
        arow('TA-2026-3', 'Handenwasset als vaste uitrusting in alle montagewagens en op de maandelijkse wagencontrole (sluit aan op WPI-20261105-DAM-C2-9).', f'Gevaarlijke stoffen · {tn("Gevaarlijke stoffen en hygiëne","Geen handenwasgelegenheid bij de werkplek")}× handenwas', 'Werkvoorbereider', 'Hoofd S&amp;M', '31-01-2027', 'Besloten'),
        arow('TA-2026-4', 'Inspecties plannen per project in plaats van per inspecteur (Programma).', f'Programma · {x} van {y} verplichte WPI’s', 'Hoofd S&amp;M', 'Directielid', '31-12-2026', 'Besloten'),
        arow('TA-2026-5', 'Toolbox besloten ruimte: mangatwacht en gasmeting op werkhoogte.', f'Besloten ruimte · {TK["Besloten ruimte en gas"]["A"]} [A]', 'Coördinator 1', 'Hoofd S&amp;M', 'kies', '', True),
    ]) + f'<div style="font-size:12px;color:{TXT2};margin-top:8px">Acties uit de trendanalyse krijgen het nummer TA-&lt;jaar&gt;-&lt;volgnr&gt; en staan ook in Acties, naast de acties uit de inspecties.</div>', 16, 'margin-bottom:16px')

# ---------- follow-up ----------
dp = K['doorloop_prio']
fu_ins = card(h2('Follow-up van de acties uit de inspecties', f'Stand op {dmy(PEIL)}; per klasse in de tabel hierboven.', '', 16)
    + ''.join(f'<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #E9ECF0;font-size:14px"><span>{a}</span><b style="white-space:nowrap">{b}</b></div>' for a, b in [
        ('Acties uit inspecties', K['n_acties']),
        ('Afgerond na toetsing', f'{K["act_status"]["Afgerond"]}, waarvan {K["optijd"]} binnen termijn'),
        ('Open', f'{K["act_open_n"]}, waarvan {len(K["act_over"])} over termijn'),
        ('Ter plaatse getoetst', f'{K["act_terplaatse"]} van {K["n_acties"]}'),
        ('Doorlooptijd prioriteit kort', f'{nl(dp["kort"][0], 1)} dagen (norm 14)')]), 16, 'flex:1;min-width:0')
fu_vorig = card(h2('Follow-up van de vorige trendanalyse', 'Wat is er gedaan met de acties van vorig jaar?', '', 16)
    + f'<div style="display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px dashed #9AA3AF;border-radius:8px">{icon("history", 20, TXT2)}'
      f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">Trendanalyse 2025: niet in de app</div><div style="font-size:13px;color:{TXT2};line-height:1.5;margin-top:2px">Gemaakt vóór de invoering van de app. Neem de acties van toen over om hun stand hier te volgen, of voeg het document toe als bijlage.</div>'
      f'<div style="display:flex;gap:8px;margin-top:10px">{btn("Acties van 2025 overnemen", "sec", "plus", 32, 13)}{btn("Document toevoegen", "sec", "upload", 32, 13)}</div></div></div>'
    + f'<div style="font-size:13px;line-height:1.5;margin-top:12px">Volgend jaar staat hier per actie TA-2026-1 t/m TA-2026-5: status, getoetst door wie en wanneer, en of de klasse in de cijfers van 2027 is verbeterd.</div>', 16, 'flex:1;min-width:0')
fu = f'<div style="display:flex;gap:12px;align-items:stretch">{fu_ins}{fu_vorig}</div>'

body = (page_head('', 'Trendanalyse 2026',
                  f'VCA 7.2 · bevindingen van {mnd(months[0])} t/m {mnd(months[-1])} 2026 · concept, nog niet vastgesteld',
                  btn('Als PDF', 'sec', 'download') + btn('Ter vaststelling aanbieden', 'pri', 'send'))
        + tabbar + top + basis + concl_card + acties + fu)
open('/home/claude/app/screens/web/W09b-trendanalyse.html', 'w').write(page('W09b', 'Trendanalyse 2026', 'Dashboard', body, 'Gepubliceerd', crumb=['Dashboard', 'Trendanalyse 2026'], fname='W09b-trendanalyse'))
