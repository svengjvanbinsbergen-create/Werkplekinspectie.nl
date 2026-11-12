# Ronde 11b (afspraak eenheid): waarnemingen/regels; getoetst = x taken · y taakstappen. Bron = index.v11.html.
import json
base = '/home/claude/wpi/run/out/dashboard/'
src = open(base + 'index.v11.html').read()
K = lambda k, f='toon': "<b data-draw='k' data-source='kern' data-field='%s' data-where='k=%s'>—</b>" % (f, k)
T = lambda t: "<b data-draw='t' data-t='%s'>—</b>" % t
TS = lambda t: "<span data-draw='t' data-t='%s'>—</span>" % t
P = []
def rep(old, new): P.append((old, new, False))

rep(K('waar') + " regels). De coördinatoren", K('waar') + " waarnemingen). De coördinatoren")
rep(f"WPI’s met {K('regels')} vastgelegde regels: alleen wat de inspecteur zag, Conform",
    f"WPI’s met {K('regels')} vastgelegde regels: alleen wat de inspecteur zag. Waarnemingen {K('waar')} ({K('g_tra')} TRA-regels · {K('g_alg')} onderwerpen · {K('g_bui')} buiten TRA): Conform")
rep(f"Verbeterpunt {K('verb')}, en {K('nvt')} keer expliciet niet van toepassing.", f"Verbeterpunt {K('verb')}; daarnaast {K('nvt')} regels expliciet niet van toepassing.")
rep(" regels gezien zijn te klein", " waarnemingen zijn te klein")
rep("Hoogste aandeel van de regels gezien in de klasse (bij minstens " + K('min_n') + " regels gezien)", "Hoogste aandeel van de waarnemingen in de klasse (bij minstens " + K('min_n') + " waarnemingen)")
i = src.index("<li><b>Momentopname: wat is getoetst.</b>"); j = src.index("Ingang: ", i)
rep(src[i:j], f"<li><b>Momentopname: wat is getoetst.</b> Getoetst in {K('wpis')} WPI’s: {K('taken_n')} taken · {K('stap_ts')} taakstappen (een taak op taakniveau waar de TRA geen taakstap kent, anders per taakstap). {K('een_taak')} WPI’s toetsten één taak; samen gaat het om {K('taken_uniek')} verschillende taken uit de product-TRA’s, het vaakst {K('taak_top','tekst')} ({K('taak_top')} WPI’s). ")
rep(f"regels gezien per WPI {K('c_mpw')} tegenover {K('d_mpw')}; getoetste taken en taakstappen per WPI {K('c_spw')} tegenover {K('d_spw')}.",
    f"waarnemingen per WPI {K('c_mpw')} tegenover {K('d_mpw')}; getoetst {K('c_tk')} taken · {K('c_ts')} taakstappen tegenover {K('d_tk')} taken · {K('d_ts')} taakstappen.")
rep("<li><b>Momentopname</b>: een WPI toetst", "<li><b>Waarneming</b>: het oordeel over één regel (een risicoregel uit de TRA of een algemeen onderwerp). Per regel legt de inspecteur vast welke maatregel(en) hij zag en welke het oordeel bepaalde. Tellingen gaan over waarnemingen of regels, niet over losse maatregelen. <b>Getoetst</b>: taken en, waar de TRA ze kent, taakstappen (“x taken · y taakstappen”).</li>\n<li><b>Momentopname</b>: een WPI toetst")
rep("welke taakstap(pen) de monteurs uitvoeren (<b>getoetst</b>), en per maatregel die hij ziet een oordeel:", "welke taakstap(pen) de monteurs uitvoeren, en per regel waarvan hij de maatregel(en) ziet een oordeel:")
rep("<tr><td>Regels gezien per WPI</td>", "<tr><td>Waarnemingen per WPI</td>")
rep(f"<tr><td>Getoetste taken en taakstappen per WPI</td><td class='w-num'>{T('c_spw')}</td><td class='w-num'>{T('d_spw')}</td></tr>",
    f"<tr><td>Getoetste taken</td><td class='w-num'>{T('c_tk')}</td><td class='w-num'>{T('d_tk')}</td></tr>\n<tr><td>Getoetste taakstappen</td><td class='w-num'>{T('c_ts')}</td><td class='w-num'>{T('d_ts')}</td></tr>")
rep(f"<div class='w-tile'><span>Regels in de WPI’s</span>{T('regels')}<small>waarvan {TS('waar')} gezien (✓✕△) · {TS('nvt')} n.v.t.</small></div>",
    f"<div class='w-tile'><span>Waarnemingen</span>{T('waar')}<small>{TS('g_tra')} TRA-regels · {TS('g_alg')} onderwerpen · {TS('g_bui')} buiten TRA · {TS('nvt')} regels n.v.t.</small></div>")
rep(TS('pos_pct') + " van de regels gezien</small>", TS('pos_pct') + " van de waarnemingen</small>")
rep(f"<div class='w-tile'><span>Getoetste taken en taakstappen</span>{T('stappen')}<small>{TS('ts')} op taakstapniveau · WPI’s:",
    f"<div class='w-tile'><span>Getoetst</span>{T('getoetst')}<small>taken · taakstappen · WPI’s:")

out = src
for old, new, _ in P:
    assert out.count(old) == 1, (out.count(old), old[:90])
    out = out.replace(old, new)
for bad in ['regels gezien', 'maatregelen gezien', "data-t='ts'", "data-t='stappen'", "_spw"]:
    assert bad not in out, bad
assert '"' not in out and chr(92) not in out
open(base + 'index.html', 'w').write(out)
json.dump(P, open(base + 'test/edits11b_html.json', 'w'), ensure_ascii=False)
print(len(P), 'vervangingen')
