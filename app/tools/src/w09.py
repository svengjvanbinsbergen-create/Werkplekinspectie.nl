import sys, json, collections as C; sys.path.insert(0, '/home/claude/app/tools')
from lib import *
K = json.load(open('/home/claude/app/tools/cijfers.json'))
n = K['n_regels']; dek = K['dekking']; oo = K['oordeel']; months = K['maanden']; PEIL_ = K['periode'][1]
pct = lambda a, b: round(100 * a / b) if b else 0
D = json.load(open('/home/claude/wpi/run/data/voorbeelddata.json')); PEIL = D['peildatum']

def tilecard(title, sub, inner, right='', pad=20, extra=''):
    return card(h2(title, sub, right, 16) + inner, pad, extra)

def kpi(title, big, sub, state=None):
    st = {'bad': chip('onder doel', '#B42318', '#FDECEA', None, 12, 600), 'ok': chip('op doel', '#1E7A4C', '#E6F4EC', None, 12, 600),
          'let': chip('let op', '#8A4B00', '#FFF1DC', None, 12, 600)}.get(state, '')
    return card(f'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:13px;font-weight:600;color:{TXT2}">{title}</span>{st}</div>'
                f'<div style="{HFONT};font-size:28px;font-weight:600;margin-top:8px;line-height:1.1">{big}</div>'
                f'<div style="font-size:13px;color:{TXT2};margin-top:6px;line-height:1.45">{sub}</div>', 16, 'flex:1;min-width:0')

# ---------- tabbladen + filters ----------
tabbar = (tabs(['Overzicht', 'Klassen en TRA-regels', ('Acties', K['act_open_n']), 'Trendanalyse VCA 7.2'], 'Overzicht', 'margin-bottom:12px')
          + f'<div style="display:flex;gap:8px;align-items:center;margin-bottom:16px"><span style="font-size:13px;color:{TXT2};margin-right:4px">Filters</span>'
          + ''.join(chip(t, TXT, SURF, LINE, 13, 500, 'down') for t in [f'Periode {dmy(K["periode"][0])} t/m {dmy(PEIL)}', 'Service & Montage NL', 'Alle soorten inspectie', 'Alle producten', 'Alle opdrachtgevers'])
          + f'{chip("Filters wissen", PRI, PRIS, None, 13, 600)}</div>')

# ---------- KPI-rij ----------
x, y = K['vp_x'], K['vp_y']; lop = K['vp_lopend']; lok = K['vp_lopend_ok']
openA = K['act_open_n']; over = len(K['act_over']); afg = K['act_status']['Afgerond']
qs = K['kwartalen']
kpis = (f'<div style="display:flex;gap:12px;margin-bottom:16px">'
        + kpi('Programma per werkplek', f'{x} van {y}', f'verplichte WPI’s gedaan ({pct(x,y)}%) · {lop} lopen nog, waarvan {lok} al gedaan', 'bad')
        + kpi('Directie neemt deel', f'{K["dir_kw_ok"]} van {len(qs)}', f'kwartalen met een directie-WPI ({", ".join(q[:2] for q in qs)})', 'ok')
        + kpi('Inspecties', f'{K["n_wpi"]}', f'{K["soort_wpi"]["WPI coördinator"]} coördinator, {K["soort_wpi"]["VGM-inspectie directie"]} directie · {n} beoordeelde regels')
        + kpi('Eigen waarneming', f'{pct(dek["Waargenomen"], n)}%', f'{dek["Waargenomen"]} van {n} regels zelf gezien · doel 80% per klasse', 'let')
        + kpi('Open acties', f'{openA}', f'{over} over termijn · {K["act_open_prio"].get("kort",0)} kort, {K["act_open_prio"].get("planmatig",0)} planmatig · {afg} afgerond', 'bad')
        + '</div>')

# ---------- programma per werkplek (raster) ----------
pp = K['per_project']
CATN = {'lang': 'lang', 'risico': 'kort, risico', 'overig': 'kort'}
def pcell(o, active):
    base = 'display:flex;align-items:center;justify-content:center;height:22px;border-radius:4px;box-sizing:border-box'
    if o is None:
        return f'<td style="padding:3px 3px;border-bottom:1px solid #F1F3F6"><div style="{base};background:{"#F1F3F6" if active else "transparent"}"></div></td>'
    if not o['telt']:
        inner = icon('check', 14, '#1E7A4C', 2.5) if o['ok'] else icon('clock', 14, TXT2, 2)
        return f'<td style="padding:3px 3px;border-bottom:1px solid #F1F3F6"><div style="{base};border:1.5px dashed #9AA3AF">{inner}</div></td>'
    if o['ok']:
        return f'<td style="padding:3px 3px;border-bottom:1px solid #F1F3F6"><div style="{base};background:#E6F4EC">{icon("check", 14, "#1E7A4C", 2.5)}</div></td>'
    return f'<td style="padding:3px 3px;border-bottom:1px solid #F1F3F6"><div style="{base};background:#FDECEA">{icon("x", 14, "#B42318", 2.5)}</div></td>'
def act_m(p):
    return [m for m in months if p['start'][:7] <= m <= p['eind'][:7]]
rows = []
for pk in sorted(pp, key=lambda k: pp[k]['p']['start']):
    v = pp[pk]; p = v['p']; om = {o['maand']: o for o in v['obl']}; am = act_m(p)
    if v['y']:
        score = f'<b style="color:{"#1E7A4C" if v["x"]==v["y"] else "#B42318"}">{v["x"]} van {v["y"]}</b>'
    else:
        score = f'<span style="color:{TXT2}">loopt</span>'
    c = 'padding:3px 8px;border-bottom:1px solid #F1F3F6;font-size:13px;vertical-align:middle'
    rows.append('<tr>' + f'<td style="{c};font-weight:600;white-space:nowrap">{short(pk)}</td>'
                + f'<td style="{c};white-space:nowrap;overflow:hidden">{p["product"].split(" (")[0]} <span style="color:{TXT2};font-size:12px">· {CATN[v["cat"]]}</span></td>'
                + ''.join(pcell(om.get(m), m in am) for m in months) + f'<td style="{c};text-align:right;white-space:nowrap">{score}</td></tr>')
lg = lambda sw, t: f'<span style="display:flex;gap:6px;align-items:center">{sw}{t}</span>'
sw = lambda st, ic='': f'<span style="display:inline-flex;width:22px;height:16px;border-radius:3px;box-sizing:border-box;align-items:center;justify-content:center;{st}">{ic}</span>'
prog = tilecard('Programma per werkplek',
    f'VCA 7.1: elke maand een WPI per operationele werkplek. Project langer dan een maand: elke kalendermaand; kort met risicokenmerk: ten minste één (voetnoot 10). {len(pp)} projecten, peildatum {dmy(PEIL)}.',
    table(th([('Project', 56, 'left'), ('Product · soort', None, 'left')] + [(mnd(m), 18, 'center') for m in months] + [('Gedaan', 50, 'right')]), rows)
    + f'<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12px;color:{TXT2}">'
    + lg(sw('background:#E6F4EC', icon('check', 12, '#1E7A4C', 2.5)), 'verplichte WPI gedaan')
    + lg(sw('background:#FDECEA', icon('x', 12, '#B42318', 2.5)), 'gemist')
    + lg(sw('border:1.5px dashed #9AA3AF', icon('check', 12, '#1E7A4C', 2.5)), 'lopende periode, al gedaan')
    + lg(sw('border:1.5px dashed #9AA3AF', icon('clock', 12, TXT2, 2)), 'lopende periode, nog te doen')
    + lg(sw('background:#F1F3F6'), 'project actief, geen eigen verplichting') + '</div>',
    btn('Naar programma', 'ghost', 'arrow', 32, 13), 20)

dkw = K['dir_kw']
dir_html = ''.join(f'<div style="flex:1;text-align:center;padding:10px 4px;border-radius:8px;background:{"#E6F4EC" if dkw.get(q,0) else "#FDECEA"}"><div style="font-size:13px;font-weight:600;color:{"#1E7A4C" if dkw.get(q,0) else "#B42318"}">{q}</div><div style="display:flex;justify-content:center;margin-top:4px">{icon("check" if dkw.get(q,0) else "x", 18, "#1E7A4C" if dkw.get(q,0) else "#B42318", 2.5)}</div><div style="font-size:12px;color:#1E7A4C;margin-top:2px">{dkw.get(q,0)} WPI</div></div>' for q in qs)
directie = tilecard('Directie per kwartaal', 'VCA 7.1: minimaal eenmaal per kwartaal.', f'<div style="display:flex;gap:8px">{dir_html}</div>'
                    + f'<div style="font-size:12px;color:{TXT2};margin-top:8px">{qs[0]} telt vanaf {mnd(months[0])} (begin van de gegevens).</div>', '', 20, 'margin-bottom:12px')

pi = K['prog_insp']; gp, gu = K['prog_gepland'], K['prog_uitgevoerd']
ins_rows = ''.join(f'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #E9ECF0"><span style="flex:1;font-size:14px">{short(k)}</span><span style="font-size:14px;font-weight:600">{v["uitgevoerd"]} van {v["gepland"]}</span></div>' for k, v in pi.items())
inzet = tilecard('Planning per inspecteur', 'Uitgevoerd van gepland, per persoon.', ins_rows
    + f'<div style="margin-top:12px;padding:12px;border-radius:8px;background:#FFF1DC;font-size:13px;line-height:1.5;color:#5C3300">De inspecteurs halen hun planning bijna ({gu} van {gp}), de werkplekken niet ({x} van {y}). Plannen per project, niet per persoon.</div>', '', 20, 'margin-bottom:12px')

vm = K['vp_maand']; mx = max(v['y'] + v['lopend'] for v in vm.values())
bars = ''
for m in months:
    v = vm[m]; tot = v['y'] + v['lopend']
    if not tot: continue
    lab = f'{v["ok"]}/{v["y"]}' + (f' +{v["lopend"]}' if v['lopend'] else '')
    bars += (f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:12px;font-weight:600;white-space:nowrap">{v["ok"]}/{v["y"]}</span>'
             f'<div style="width:26px;height:{11*mx}px;display:flex;flex-direction:column-reverse;background:#F1F3F6;border-radius:3px;overflow:hidden">'
             f'<span style="flex:none;height:{11*v["ok"]}px;background:#1E7A4C"></span><span style="flex:none;height:{11*(v["y"]-v["ok"])}px;background:#B42318"></span>'
             f'<span style="flex:none;height:{11*v["lopend_ok"]}px;background:repeating-linear-gradient(135deg,#9BCFB2 0 3px,#E6F4EC 3px 6px)"></span>'
             f'<span style="flex:none;height:{11*(v["lopend"]-v["lopend_ok"])}px;background:repeating-linear-gradient(135deg,#B8C0CC 0 3px,#EEF0F3 3px 6px)"></span></div>'
             f'<span style="font-size:12px;color:{TXT2}">{mnd(m)}</span></div>')
nov = vm[months[-1]]
permaand = tilecard('Verplichtingen per maand', 'Gedaan van verplicht, per maand.', f'<div style="display:flex;gap:4px;align-items:flex-end">{bars}</div>'
    + f'<div style="font-size:12px;color:{TXT2};margin-top:8px;line-height:1.5">{mnd(months[-1]).capitalize()} loopt: {nov["lopend"]} verplichtingen open, {nov["lopend_ok"]} al gedaan (gearceerd).</div>')

# ---------- oordelen per maand (SVG) ----------
OC = [('Afwijking', '#B42318', 'A'), ('Verbeterpunt', '#C46A00', 'V'), ('Conform', '#1E7A4C', 'C'), ('Geen afwijking waargenomen', '#8E98A6', 'GA'), ('Niet beoordeeld', '#C9CED6', 'NB'), ('Niet van toepassing', '#E3E6EB', 'NVT')]
om = K['oordeel_maand']; wm = K['wpi_maand']
W_, H_ = 500, 200; bw = 42; gap = (W_ - 40 - bw * len(months)) / (len(months) - 1); sc = 3.1
svg = [f'<svg width="{W_}" height="{H_+44}" viewBox="0 0 {W_} {H_+44}" style="display:block">']
for t in [0, 20, 40, 60]:
    yy = H_ - t * sc
    svg.append(f'<line x1="32" x2="{W_}" y1="{yy}" y2="{yy}" stroke="#E3E6EB"/><text x="26" y="{yy+4}" text-anchor="end" font-size="12" fill="{TXT2}" font-family="Inter">{t}</text>')
for i, m in enumerate(months):
    x0 = 40 + i * (bw + gap); yy = H_; c = om[m]; tot = sum(c.values())
    for o, col, code in OC:
        v = c.get(o, 0)
        if not v: continue
        hgt = v * sc; yy -= hgt
        svg.append(f'<rect x="{x0:.1f}" y="{yy:.1f}" width="{bw}" height="{hgt:.1f}" fill="{col}"/>')
        if hgt >= 15:
            fc = '#FFFFFF' if code in ('A', 'V', 'C') else TXT
            svg.append(f'<text x="{x0+bw/2:.1f}" y="{yy+hgt/2+4:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{fc}" font-family="Inter">{v}</text>')
    svg.append(f'<text x="{x0+bw/2:.1f}" y="{yy-6:.1f}" text-anchor="middle" font-size="12" font-weight="600" fill="{TXT}" font-family="Inter">{tot}</text>')
    svg.append(f'<text x="{x0+bw/2:.1f}" y="{H_+18}" text-anchor="middle" font-size="13" fill="{TXT}" font-family="Inter">{mnd(m)}</text>')
    svg.append(f'<text x="{x0+bw/2:.1f}" y="{H_+36}" text-anchor="middle" font-size="12" fill="{TXT2}" font-family="Inter">{wm[m]} WPI</text>')
svg.append('</svg>')
leg = ''.join(f'<span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:12px;border-radius:2px;background:{col};{"border:1px solid #C9CED6;box-sizing:border-box" if code=="NVT" else ""}"></span>[{code}] {o} ({oo.get(o,0)})</span>' for o, col, code in OC)
maand = tilecard('Oordelen per maand', f'Beoordeelde regels per oordeel; {n} regels in {K["n_wpi"]} inspecties. Positief (Conform): {oo["Conform"]}.',
                 ''.join(svg) + f'<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:12px;color:{TXT2}">{leg}</div>')

# ---------- dekking per klasse ----------
kd = sorted(K['klasse_dek'].items(), key=lambda kv: (kv[1].get('Waargenomen', 0) / kv[1]['tot'], -kv[1]['tot']))
drows = ''
for k, d in kd:
    t = d['tot']; w = d.get('Waargenomen', 0); a = d.get('Alleen bevestigd', 0); nb = d.get('Niet beoordeeld', 0) + d.get('N.v.t.', 0)
    low = 100 * w / t < 80
    drows += (f'<div style="display:flex;align-items:center;gap:10px;padding:3px 0">'
              f'<span style="width:190px;flex:none;font-size:13px;color:{TXT};white-space:nowrap">{k}</span>'
              f'<div style="position:relative;flex:1"><span style="position:absolute;left:80%;top:-3px;bottom:-3px;border-left:2px solid {TXT}"></span>'
              f'<div style="display:flex;height:14px;border-radius:3px;overflow:hidden;background:#F1F3F6">'
              f'<span style="width:{100*w/t:.2f}%;background:#2F6FD0"></span><span style="width:{100*a/t:.2f}%;background:#A9C2EA"></span>'
              f'<span style="width:{100*nb/t:.2f}%;background:repeating-linear-gradient(135deg,#B8C0CC 0 3px,#E3E6EB 3px 6px)"></span></div></div>'
              f'<span style="width:96px;flex:none;white-space:nowrap;text-align:right;font-size:13px;{"font-weight:700;color:#8A4B00" if low else "color:"+TXT}">{w}/{t} · {round(100*w/t)}%</span></div>')
L = lambda col, t: f'<span style="display:flex;gap:6px;align-items:center"><span style="width:12px;height:12px;border-radius:2px;background:{col}"></span>{t}</span>'
dekking = tilecard('Waar is feitelijk gekeken?', 'Per klasse: zelf waargenomen tegenover alleen bevestigd via de afsluitvraag. Doel 80% waargenomen.',
    drows + f'<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12px;color:{TXT2}">'
    + L('#2F6FD0', f'Waargenomen ({dek["Waargenomen"]})') + L('#A9C2EA', f'Alleen bevestigd ({dek["Alleen bevestigd"]})')
    + L('repeating-linear-gradient(135deg,#B8C0CC 0 3px,#E3E6EB 3px 6px)', f'Niet beoordeeld, n.v.t. ({dek["Niet beoordeeld"]+dek["N.v.t."]})')
    + f'<span style="display:flex;gap:6px;align-items:center"><span style="width:2px;height:14px;background:{TXT}"></span>doel</span></div>')

# ---------- bevindingen per klasse (compact) ----------
nk = K['neg_klasse']; mxk = nk[0][1]
krow = ''
for k, v in nk[:6]:
    a = K['neg_klasse_A'].get(k, 0); vv = K['neg_klasse_V'].get(k, 0)
    krow += (f'<div style="display:flex;align-items:center;gap:10px;padding:4px 0"><span style="width:190px;flex:none;font-size:13px;white-space:nowrap">{k}</span>'
             f'<div style="flex:1;display:flex;height:14px"><span style="width:{100*a/mxk:.1f}%;background:#B42318"></span><span style="width:{100*vv/mxk:.1f}%;background:#C46A00"></span></div>'
             f'<span style="width:96px;flex:none;text-align:right;font-size:13px;white-space:nowrap"><b>{v}</b> <span style="color:{TXT2}">({a} A · {vv} V)</span></span></div>')
rest = sum(v for k, v in nk[6:])
top2 = nk[0][1] + nk[1][1]
klasse = tilecard('Bevindingen per klasse', f'{K["n_neg"]} afwijkingen en verbeterpunten; {nk[0][0]} en {nk[1][0].lower()} samen {top2} ({pct(top2, K["n_neg"])}%).', krow
    + f'<div style="font-size:12px;color:{TXT2};margin-top:6px">{len(nk)-6} andere klassen samen {rest}. TRA-regels en buiten de TRA: tabblad Klassen en TRA-regels.</div>'
    + f'<div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:{TXT2}">' + L('#B42318', '[A] Afwijking') + L('#C46A00', '[V] Verbeterpunt') + '</div>',
    btn('Klassen en TRA-regels', 'ghost', 'arrow', 32, 13))

# ---------- acties (compact) ----------
A = {a['actie']: a for a in D['acties']}
to = K['act_toetser_open']
def overrow(aid):
    a = A[aid]; dd = -K['act_open_detail'][aid]['dagen_tot_termijn']
    tag = chip(f'{dd} d over termijn', '#B42318', '#FDECEA', None, 12, 600) if dd > 0 else chip(f'termijn {dmy(a["termijn"])}', '#8A4B00', '#FFF1DC', None, 12, 600)
    return (f'<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #E9ECF0"><div style="flex:1;min-width:0"><b style="font-size:13px">{aid}</b>'
            f'<div style="font-size:12px;color:{TXT2};margin-top:2px;line-height:1.4">{a["bevinding"]}</div></div>{tag}</div>')
acties = tilecard('Acties', f'{openA} open: {over} over termijn, {len(K["act_binnen7"])} binnen 7 dagen. Open per toetser: '
                  + ', '.join(f'{short(k).replace("Hoofd Service & Montage", "Hoofd S&amp;M")} {v}' for k, v in sorted(to.items(), key=lambda kv: -kv[1])) + '.',
                  ''.join(overrow(a) for a in sorted(K['act_over'], key=lambda i: A[i]['termijn'])) + ''.join(overrow(a) for a in K['act_binnen7']),
                  btn('Naar acties', 'ghost', 'arrow', 32, 13))

body = (page_head('', 'VGM-trend 2026',
                  f'Werkplekinspecties {mnd(months[0])} t/m {mnd(months[-1])} 2026 · peildatum {dmy(PEIL)} · uit de gegevenstabellen van {K["n_wpi"]} rapporten',
                  btn('Aanpassen', 'sec', 'layout') + btn('PDF voor directie', 'sec', 'download') + btn('Trendanalyse 2026', 'pri', 'file'))
        + tabbar + kpis
        + f'<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px"><div style="flex:1;min-width:0">{prog}</div><div style="width:330px;flex:none">{directie}{inzet}{permaand}</div></div>'
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start">{maand}{dekking}</div>'
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">{klasse}{acties}</div>')
open('/home/claude/app/screens/web/W09-dashboard.html', 'w').write(page('W09', 'Dashboard', 'Dashboard', body, 'Gepubliceerd'))
