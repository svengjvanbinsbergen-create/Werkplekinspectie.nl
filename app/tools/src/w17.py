from mijn import *

def trow(naam, sjab, st, omvang, ai, versie, sel=False):
    stc = {'actief': ('#1E7A4C', '#E6F4EC'), 'proef': ('#8A4B00', '#FFF1DC'), 'demo': (TXT2, '#EEF0F3')}[st[0]]
    s = f'background:{PRIS};' if sel else ''
    return ('<tr>' + td(f'<div style="display:flex;gap:10px;align-items:flex-start">{icon("building", 18, TXT2)}<div><b>{naam}</b><div style="font-size:13px;color:{TXT2};margin-top:2px">sjabloon: {sjab}</div></div></div>', 'left', s)
            + td(chip(st[1], stc[0], stc[1], None, 12, 600), 'left', s) + td(omvang, 'left', s)
            + td(ai, 'left', s) + td(versie, 'left', s) + '</tr>')

lijst = card(h2('Organisaties', '3 organisaties. Gegevens zijn per organisatie gescheiden; de leverancier ziet alleen deze kenmerken.', '', 16)
    + table(th([('Organisatie', None, 'left'), ('Status', 96, 'left'), ('Omvang', 110, 'left'), ('AI-aanbieder', 170, 'left'), ('Versie', 64, 'left')]), [
        trow('Noardling B.V.', 'eigen inrichting (eerste klant)', ('actief', 'actief'), '4 groepen<br>10 gebruikers', 'Claude via Anthropic, onder voorbehoud', 'v1.3', True),
        trow('Voorbeeld Installatietechniek B.V.', 'Service & Montage, VCA**', ('proef', 'proef'), '1 groep<br>4 gebruikers<br>proef tot 31-01-2027', 'Open model, EU-gehost', 'v1.0'),
        trow('Demo-omgeving (verkoop)', 'Service & Montage, VCA** met voorbeelddata', ('demo', 'demo'), '1 groep<br>2 gebruikers', 'Claude via Anthropic', 'v1.0'),
    ]), 16)

nieuw = card(h2('Nieuwe organisatie', 'De klant richt daarna zelf in; de leverancier vult geen inhoud.', '', 16)
    + field('Naam', 'Bouwbedrijf Voorbeeld B.V.')
    + '<div style="height:12px"></div>' + field('Starten vanuit sjabloon', 'Service & Montage, VCA**', None, True)
    + '<div style="height:12px"></div>' + field('Eerste beheerder (e-mail)', 'vgm@bouwbedrijf.voorbeeld', None, False, 'Krijgt een uitnodiging; kiest zelf AI-aanbieder (W14) en huisstijl (W15).')
    + '<div style="height:12px"></div>' + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">{field("Status", "Proef", None, True)}{field("Proef tot", "31-03-2027")}</div>'
    + '<div style="height:12px"></div>' + field('Opslag app-gegevens', 'EU (Nederland)', None, True, 'Vast per organisatie; los van de AI-aanbieder.')
    + f'<div style="margin-top:14px">{btn("Organisatie aanmaken", "pri", "plus", 40, 14, "width:100%;justify-content:center")}</div>', 16)

def li(t, ic='check', c='#1E7A4C'):
    return f'<div style="display:flex;gap:8px;align-items:flex-start;padding:4px 0;font-size:14px;line-height:1.45">{icon(ic, 16, c)}<span>{t}</span></div>'
sjabloon = card(h2('Sjabloon “Service & Montage, VCA**”', 'Wat een nieuwe organisatie meekrijgt.', btn('Sjablonen beheren', 'sec', 'copy', 32, 13), 16)
    + li('Begeleider met de stappen kop tot en met afsluitvraag en de grenzen uit W03')
    + li('Algemene onderwerpen A–I en het oordeelmodel')
    + li('Rapport met de vaste teksten VCA 7.1 d en e')
    + li('Dashboard voor VCA 7.1 en 7.2, programma volgens de regels voor lange en korte projecten')
    + li('Geen kennisbank: eigen producten en TRA’s uploadt de klant zelf (W06)', 'help', TXT2), 16)

zicht = card(h2('Wat de leverancier ziet', None, '', 16)
    + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    + '<div>' + li('Naam, status, aantallen gebruikers en groepen') + li('Gepubliceerde versie en AI-instelling') + li('Verbruik voor facturatie') + '</div>'
    + '<div>' + li('Geen inspecties, acties, foto’s of namen', 'x', '#B42318') + li('Ondersteuning in een organisatie alleen na toestemming van de beheerder, met einddatum en logboek', 'lock', TXT2) + '</div></div>', 16)

body = (kop('Leveranciersomgeving / Organisaties', 'Organisaties',
            'Alleen voor de rol Leverancier (W13): klanten aanmaken vanuit een sjabloon en hun status volgen. Huisstijl en inrichting doet elke klant zelf.',
            btn('Nieuwe organisatie', 'pri', 'plus'))
        + f'<div style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1;min-width:0">{lijst}<div style="height:12px"></div>'
        + f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">{sjabloon}{zicht}</div></div>'
        + f'<div style="width:340px;flex:none">{nieuw}</div></div>')

html = (
    page('W17', 'Organisaties', 'Organisaties', body, 'Gepubliceerd', user=('LV', 'Leverancier'), crumb=['Leveranciersomgeving', 'Organisaties']))
# in de leveranciersomgeving staat in de kop geen klantorganisatie
i = html.index('</header>')
kopdeel = html[:i].replace('Noardling B.V.', 'Alle organisaties', 1)
open('/home/claude/app/screens/web/W17-organisaties.html', 'w').write(kopdeel + html[i:])
