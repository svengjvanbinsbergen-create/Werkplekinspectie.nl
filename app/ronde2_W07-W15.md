# W07–W15 — opdracht ronde 2 (na criticus ronde 1)

Oordeel ronde 1: A wint inhoudelijk bij beide gebruikers op 8 van de 9 schermen (rapportonderdelen, programmaregels als zinnen, toetsen als aparte stap, AI per functie). NIET GEWONNEN: (c) W08–W12 tonen cijfers van oudere data dan v10, waardoor de set zichzelf tegenspreekt; (b) alle negen breken twee afspraken uit `ontwerp.md` en zijn te lang/leeg.

Bouwscripts van de vorige bouwer staan nu in `/home/claude/app/tools/` (lib.py, cijfers.py, render.py, shell_*.html) en `/home/claude/app/tools/src/w07.py … w15.py` (paden al omgezet). Data: `/home/claude/wpi/run/data/voorbeelddata.json` versie 10.1.

## GROOTSTE GAT — één bron voor alle cijfers
`python3 /home/claude/app/tools/cijfers.py` geeft op v10.1: 42 acties, 17 open (12 planmatig, 5 kort), 24 projecten, programma 12/32 (lang 3/16, kort met risico 9/16), open per toetser HSM 11, 25 afgerond. Bouw W08–W12 en hun notes uitsluitend uit `cijfers.json` — geen getal met de hand. Controleer specifiek:
- W09/W12: P26-391 in het raster; geen ✓ zonder WPI (P26-379 september); WPI's die al gedaan zijn in een lopende maand (P26-168, P26-156, P26-135 in november) tellen mee als gedaan, de maand zelf als "lopend"; september 3/9.
- W10: detail WPI-20261105-DAM-C2 met 9 acties / 8 open, inclusief -8 en -9; regel A → acties 1 en 8, regel G → 2 en 9; actietabel met kolom Toetser.
- W11: 17 open; "9 van de 42 ter plaatse getoetst" (reken na).

## Afspraken ontwerp.md (hele set)
- Chip "Voorbeeldinhoud · fictief" neutraal in de kop (niet "VOORBEELD · fictieve data").
- Navigatie-item "Versies en publiceren" (zoals W04–W06 en W16). Zet de gedeelde kop/nav in lib.py of shell_*.html gelijk aan W04–W06.
- W11: status "Uitgevoerd gemeld" (actiehouder meldt, toetser toetst) — en annotatie in lijn.
- "Waargenomen" niet in linkblauw (leest als link); gebruik de oordeel-/neutrale kleur.

## Per scherm
- W07: maatregel- en risicoteksten 1-op-1 uit `kennisbank.json` (DAM-2.05, DAM-2.07). Standaardopslag niet "SharePoint · QMS": "In de app (rapportarchief); periodiek export naar eigen QMS". Onderdeelnamen niet over drie regels (bredere kolom of kortere namen).
- W08: klassenamen niet afkappen; filters, doelen en "wie ziet wat" boven de vouw; lege vlakte weg.
- W09: korter (doel ≤ 2400 px, bijv. tabbladen Overzicht / Programma / Klassen & TRA / Acties, actief tabblad volledig getekend). Voeg de jaarlijkse trendanalyse (VCA 7.2: "inclusief te ondernemen acties en follow-up") toe als echt getekend onderdeel of als eigen scherm `W09b-trendanalyse.html`: conclusies per klasse, besloten acties met houder/toetser/termijn, follow-up van vorig jaar.
- W10: korter; tabbladen óf één pagina, niet beide.
- W11: rolconflict oplossen: de ingelogde beheerder toetst niet "als Hoofd S&M"; toon het scherm als Hoofd S&M of laat de beheerder alleen kijken.
- W13: rol "Leverancier" (of haal de verwijzing uit W15 weg); instelbare regels "functie X is nooit actiehouder" (QHSE-Manager) en "standaardtoetser" (Hoofd S&M; inspecteur als Hoofd S&M zelf actiehouder is); werkvoorbereider kan actiehouder zijn (dus geen "Lezer"); groepen/werkplekken met overerving; lege vlakte vullen of inkorten.
- W14: bij de actieve aanbieder verwerkingsregio en doorgifte buiten de EER met grondslag (art. 44–49 AVG; bijv. "EU-gegevensverwerking / SCC's — door klant te bevestigen"); DPIA-status als echte taak met eigenaar; VCA niet als wettelijke plicht noemen (grondslag gerechtvaardigd belang met VCA als bedrijfsbelang, of uitvoering arbeidsovereenkomst/wettelijke plicht Arbowet art. 5/8); leg uit hoe "namen worden vervangen door rollen" werkt (detectie + controle door inspecteur vóór opslaan) of zwak de belofte af.
- W15: tenantbeheer weg uit Huisstijl (of achter de rol Leverancier); kolommen vullen; tabbladen Pagina en App minstens compact getekend.

## Annotaties
Geen verouderde cijfers; erkende gebreken herstellen in plaats van onder "Verbeteringen" zetten; per scherm hoe de gebruiker het configureert en welke uitbreidingen er zijn.

Lever op dezelfde paden (plus eventuele W09b), render (1440, volledige pagina), bekijk, rapporteer kort per scherm met hoogtes.
