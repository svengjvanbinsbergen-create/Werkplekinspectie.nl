import json
from mijn import *
K = json.load(open('/home/claude/app/tools/cijfers.json'))

OKC, LETC = '#1E7A4C', '#8A4B00'
ok = lambda t='vastgelegd': chip(t, OKC, '#E6F4EC', None, 12, 600, 'check')
let = lambda t='te regelen': chip(t, LETC, '#FFF1DC', None, 12, 600, 'alert')
neu = lambda t: chip(t, TXT2, '#EEF0F3', None, 12, 600)
pijl = icon('arrow', 14, TXT2)
def hop(t, ic):
    return f'<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:999px;background:{SURF};border:1px solid {LINE};white-space:nowrap">{icon(ic, 14)}{t}</span>'

def prov(naam, sub, route, punten, status, on=False):
    bd = f'1.5px solid {PRI}' if on else f'1px solid {LINE}'
    pts = ''.join(f'<div style="display:flex;gap:8px;align-items:flex-start;padding:3px 0;font-size:13px;line-height:1.45">{icon(ic, 16, c)}<span>{t}</span></div>' for ic, c, t in punten)
    return (f'<div style="flex:1;min-width:0;background:{SURF};border:{bd};border-radius:10px;padding:14px;box-sizing:border-box">'
            f'<div style="display:flex;gap:10px;align-items:flex-start">{radio(on)}<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:600;line-height:1.3">{naam}</div>'
            f'<div style="margin-top:6px">{status}</div><div style="font-size:13px;color:{TXT2};margin-top:6px;line-height:1.45">{sub}</div></div></div>'
            f'<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:10px 0 8px 0;padding:8px;border-radius:8px;background:#F1F3F6;font-size:12px;font-weight:600;color:{TXT}">{route}</div>{pts}</div>')
OK = ('check', OKC); LET = ('alert', LETC); INF = ('help', TXT2)

aanbieders = (f'<div style="display:flex;gap:12px;margin-bottom:12px">'
    + prov('Claude via Anthropic', 'Eigen API van Anthropic. Getest met de begeleider.',
           hop('App (EU)', 'server') + pijl + hop('Anthropic (VS)', 'cpu'),
           [(*OK, 'Proefgesprekken geslaagd'), (*LET, 'Opslag in de VS; een EU-optie is er niet'), (*LET, 'DPIA en transfer impact assessment nog niet af')],
           let('in gebruik onder voorbehoud'), True)
    + prov('Claude via EU-regio van een cloudplatform', 'Google Vertex AI (endpoint “eu” of europe-west1) of Amazon Bedrock in een EU-regio.',
           hop('App (EU)', 'server') + pijl + hop('Cloud, EU-regio', 'shield'),
           [(*LET, 'Nog niet getest'), (*INF, 'Beschikbaarheid per model en regio verschilt'), (*INF, 'Eigen cloudcontract en verwerkersovereenkomst')],
           neu('niet getest'))
    + prov('DeepSeek via OpenRouter', 'OpenRouter stuurt door naar een host; die host zet je vast.',
           hop('App (EU)', 'server') + pijl + hop('OpenRouter', 'globe') + pijl + hop('gekozen host (vastgezet)', 'cpu'),
           [(*LET, 'Twee partijen: overeenkomst en doorgiftegrondslag voor beide'), (*LET, 'DeepSeeks eigen dienst slaat op in China'), (*INF, 'EU in-region routing alleen met Business-plan')],
           neu('niet getest'))
    + prov('Open model, EU-gehost', 'Open model bij een Europese host of op eigen server.',
           hop('App (EU)', 'server') + pijl + hop('EU-host', 'shield'),
           [(*OK, 'Host en beheer in de EER: geen doorgifte'), (*LET, 'Nog niet getest; Nederlands verschilt per model'), (*INF, 'Subverwerkers van de host controleren')],
           neu('niet getest'))
    + '</div>')

grenzen = (f'<div style="display:flex;gap:12px;align-items:center;padding:12px 16px;margin-bottom:12px;border:1px solid {LINE};border-radius:10px;background:{SURF}">{icon("shield", 20, TXT2)}'
           f'<div style="flex:1;font-size:14px;line-height:1.5"><b>Bij elke aanbieder dezelfde grenzen.</b> <span style="color:{TXT2}">De begeleider verzint geen waarnemingen en vult geen oordeel in; een nieuwe aanbieder gaat pas live na de proefgesprekken (W16).</span></div>'
           f'{btn("Grenzen bekijken", "sec", "arrow", 32, 13)}</div>')

# verwerking bij de actieve aanbieder
def vrow(k, v, st):
    return (f'<div style="display:grid;grid-template-columns:190px 1fr 200px;gap:16px;align-items:start;padding:10px 0;border-bottom:1px solid #E9ECF0">'
            f'<div style="font-size:14px;font-weight:600">{k}</div><div style="font-size:14px;line-height:1.5">{v}</div><div style="display:flex;justify-content:flex-end">{st}</div></div>')
verwerking = card(h2('Verwerking bij Claude via Anthropic', 'Wat er geldt en wat de klant zelf moet regelen. De app zegt niets toe dat niet in de voorwaarden van de aanbieder staat.', btn('Voorwaarden openen', 'sec', 'file', 32, 13), 16)
    + vrow('Regio', '<b>VS (opslag)</b> · inferentie global of us · <b>doorgifte buiten de EER: zeker</b>. Anthropic: “Currently, "us" is the only available workspace geo”; voor inferentie zijn alleen “us” en “global” beschikbaar.', let('geen EU-optie'))
    + vrow('Contractpartij', 'Anthropic Ireland, Limited (klant in de EER). Verwerking in de VS bij Anthropic, PBC en subverwerkers volgens de openbare lijst.', ok('in voorwaarden'))
    + vrow('Overeenkomst', 'Verwerkersovereenkomst (DPA) van toepassing via de Commercial Terms (“incorporated into these Terms by reference”); geen aparte handtekening.', ok('van toepassing'))
    + vrow('Grondslag doorgifte', 'Art. 46 lid 2 onder c AVG: standaardcontractbepalingen module 2 en 3 in de DPA. Aanvullend een transfer impact assessment (TIA) voor de VS. Art. 45 (adequaatheid, EU-VS Data Privacy Framework): alleen als Anthropic is gecertificeerd; niet genoemd in de DPA, controleren op dataprivacyframework.gov. Art. 49: alleen voor incidentele gevallen, niet als vaste grondslag.', let('TIA te doen'))
    + vrow('Training en wissen', 'Geen training op klantinhoud (Commercial Terms). Wissen binnen 30 dagen na einde overeenkomst; nieuwe subverwerker: 15 dagen bezwaar (DPA).', ok('in voorwaarden'))
    + f'<div style="font-size:13px;color:{TXT2};margin-top:10px;line-height:1.5">Bronnen, geraadpleegd 12-11-2026: Anthropic Data residency (platform.claude.com), Commercial Terms en Data Processing Addendum (anthropic.com/legal). Wijzigen die, dan zet de leverancier deze regels terug op “te controleren”.</div>',
    16)

# EU-alternatief per aanbieder
def arow(a, eu, beperk):
    return '<tr>' + td(f'<b>{a}</b>') + td(eu) + td(f'<span style="color:{TXT2}">{beperk}</span>') + '</tr>'
alternatief = card(h2('EU-alternatief per aanbieder', 'Wat er nodig is om de verwerking in de EU te houden, met de beperkingen die de aanbieder zelf noemt.', '', 16)
    + table(th([('Aanbieder', 190, 'left'), ('EU-route', None, 'left'), ('Beperkingen', None, 'left')]), [
        arow('Claude', 'Google Vertex AI: multi-region “eu” of regionaal endpoint (bijv. europe-west1). Amazon Bedrock: cross-region inference in Europa (Ierland, Parijs, Frankfurt, Stockholm), per model te controleren.',
             'Vertex: regionale endpoints alleen voor Claude Sonnet 4.6 en ouder; multi-region en regionaal 10% duurder. Het door Anthropic beheerde aanbod op Google Cloud/AWS slaat op in de VS.'),
        arow('DeepSeek via OpenRouter', 'In-Region Routing via eu.openrouter.ai (Europa: EU/EER, VK, Zwitserland); Business- of Enterprise-plan.',
             'Geen terugval: zonder EU-endpoint voor het model faalt het verzoek. Account-, factuur-, beveiligings- en misbruikgegevens kunnen in de VS staan.'),
        arow('Open model', 'Host met datacenter en beheer in de EER.', 'Kwaliteit Nederlands en spraakbegrip per model testen.'),
    ]), 16)

# per functie (compact)
def frow(f, aanb, gaat, on=True):
    return (f'<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #E9ECF0">{toggle(on)}'
            f'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">{f}</div><div style="font-size:13px;color:{TXT2};margin-top:2px;line-height:1.4">{gaat}</div></div>'
            f'{field(None, aanb, 200, True, None, False, "", 32)}</div>')
functies = card(h2('Per functie', 'Elke functie een eigen aanbieder of uit. Foto’s, telefoonnummers en gps-locatie gaan nooit mee.', '', 16)
    + frow('Spraak naar tekst', 'Op toestel (offline)', 'niets: de opname blijft op de telefoon')
    + frow('Begeleider', 'Claude via Anthropic', 'transcript (namen vervangen), TRA-regels, oordeelmodel')
    + frow('RI&E en TRA omzetten', 'Claude via Anthropic', 'het geüploade bestand; mens keurt goed (W06)')
    + frow('Samenvatting rapport', 'Claude via Anthropic', 'bevestigde waarnemingen van deze inspectie')
    + frow('Foto’s beschrijven', 'Uit', 'niets', False), 16)

# AVG
def avg(t, st, sub=None):
    s_ = f'<div style="font-size:13px;color:{TXT2};margin-top:2px;line-height:1.45">{sub}</div>' if sub else ''
    return f'<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #E9ECF0"><div style="flex:1;min-width:0"><div style="font-size:14px">{t}</div>{s_}</div>{st}</div>'
def stap(t, klaar):
    ic = (f'<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;border-radius:999px;background:{OKC}">{icon("check", 12, "#FFFFFF", 2.5)}</span>' if klaar
          else f'<span style="display:inline-block;width:18px;height:18px;flex:none;box-sizing:border-box;border-radius:999px;border:1.5px solid #9AA3AF"></span>')
    return f'<div style="display:flex;gap:10px;align-items:center;padding:4px 0;font-size:14px;color:{TXT if klaar else TXT2}">{ic}{t}</div>'
avgk = card(h2('AVG en DPIA', 'Zolang de DPIA niet af is, staat de aanbieder op “in gebruik onder voorbehoud” (art. 35 AVG).', let('2 van 7 klaar'), 16)
    + f'<div style="font-size:14px;font-weight:600;margin-bottom:6px">Grondslag verwerking</div>'
    + field(None, 'Gerechtvaardigd belang (art. 6 lid 1 onder f AVG)', None, True)
    + f'<div style="font-size:13px;color:{TXT2};margin-top:6px;line-height:1.5">Belang: veilig werken en het VCA-certificaat als bedrijfsbelang (VCA is geen wettelijke plicht). Andere keuze: wettelijke verplichting via Arbowet art. 5 en 8. De klant kiest, met FG of jurist.</div>'
    + f'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:14px 0 8px 0">{field("DPIA-eigenaar", "QHSE-manager", None, True)}{field("Termijn", "18-12-2026")}{field("Advies", "FG (extern)", None, True)}</div>'
    + stap('Beschrijving van de verwerking (uit deze pagina)', True)
    + stap('Noodzaak en evenredigheid', True)
    + stap('Transfer impact assessment VS (Anthropic)', False)
    + stap('Risico’s voor monteurs en inspecteurs', False)
    + stap('Maatregelen: vervagen, namen vervangen, bewaartermijnen', False)
    + stap('Instemming ondernemingsraad (WOR art. 27)', False)
    + stap('Besluit en vastleggen in het dossier', False)
    + '<div style="height:6px"></div>'
    + avg('Gezichten op foto’s vervagen op het toestel', toggle(True))
    + avg('Inzage- en verwijderverzoek uitvoeren', btn('Persoon zoeken', 'sec', 'search', 32, 13)), 16)

# namen vervangen door rollen
naam = lambda t: f'<span style="background:#FDECEA;color:#B42318;border-radius:4px;padding:0 4px;font-weight:600">{t}</span>'
rol = lambda t: f'<span style="background:{PRIS};color:{PRI};border-radius:4px;padding:0 4px;font-weight:600">{t}</span>'
namen = card(h2('Namen vervangen door rollen', 'Zo veel mogelijk, met controle door de inspecteur.', '', 16)
    + f'<div style="font-size:14px;line-height:1.6;padding:10px 12px;border:1px solid {LINE};border-radius:8px">“{naam("Pieter")} hangt de meter bovenaan de ladder” {icon("arrow", 14, TXT2, extra="display:inline-block;vertical-align:-2px")} “{rol("Monteur 1")} hangt de meter bovenaan de ladder”</div>'
    + f'<div style="font-size:14px;line-height:1.55;margin-top:10px">De app herkent namen uit de kop en de gebruikerslijst, vervangt ze door de rol en markeert twijfel. De inspecteur ziet de tekst zoals die verstuurd wordt en bevestigt vóór verzenden en opslaan.</div>'
    + f'<div style="font-size:13px;color:{LETC};margin-top:8px;line-height:1.5">Grens: een naam die de app niet kent, kan erdoor glippen als de inspecteur hem mist.</div>', 16)

def br(t, v, lock=False):
    lk = f'<span style="color:{TXT2}">{icon("lock", 14)}</span>' if lock else ''
    return f'<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #E9ECF0"><span style="flex:1;font-size:14px">{t}</span>{lk}{field(None, v, 200, not lock, None, False, "", 32)}</div>'
kosten = (f'<div style="display:flex;gap:16px;align-items:flex-end;margin-top:14px;padding-top:12px;border-top:1px solid {LINE}"><div style="flex:1;font-size:14px;line-height:1.5"><b>Kosten</b><br><span style="color:{TXT2}">Gemeten verbruik; per inspectie zichtbaar na 10 echte inspecties. Bij de limiet: vaste vragenlijst, rapport volgt later.</span></div>{field("Maandlimiet", "€ 50", 100)}{field("Melding bij", "80%", 100, True)}</div>')
bewaar = card(h2('Bewaartermijnen en kosten', 'Na de termijn verwijderd, na een lijst ter controle.', '', 16)
    + br('Inspecties, rapporten en acties', '5 jaar na afronding') + br('Foto’s', 'zelfde als het rapport')
    + br('Spraakopnames', 'wissen na bevestiging') + br('Logboek AI-verzoeken', '90 dagen')
    + br('Bij Anthropic', 'volgens DPA', True) + kosten, 16)

body = (kop('Configuratie / AI en data', 'AI en data',
            'Kies welke AI-aanbieder de begeleider gebruikt, zie waar de gegevens heen gaan en regel AVG, DPIA en bewaartermijnen. Bij elke aanbieder gelden dezelfde grenzen (W03); een nieuwe aanbieder gaat pas live na de proefgesprekken (W16).',
            btn('Proefgesprek met deze instelling', 'sec', 'msg') + btn('Naar publiceren', 'pri', 'arrow'))
        + aanbieders + verwerking + '<div style="height:12px"></div>' + alternatief
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;align-items:start"><div>{avgk}<div style="height:12px"></div>{namen}</div><div>{functies}<div style="height:12px"></div>{bewaar}</div></div>')

open('/home/claude/app/screens/web/W14-ai-data.html', 'w').write(page('W14', 'AI en data', 'AI en data', body, 'Concept'))
