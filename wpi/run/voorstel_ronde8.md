# Voorstel — opdracht ronde 8 (na criticus ronde 7)

Oordeel ronde 7: A wint bij directie/Hoofd S&M én bij de VCA-auditor (letterlijke eisen, dekking per minimumeis, getallen DAM-C2 kloppen). NIET GEWONNEN: B wint op vormgeving en leesbaarheid; kostengat; drie consistentiefouten; 7.1b-tegenstrijdigheid; TRA-lijst ontbreekt. Data is nu versie 10.2.

## GROOTSTE GAT — wat kost het programma?
Vul de rekentabel in 5.5 voorbeeldmatig in met de fictieve `projecten` en `programma` uit `voorbeelddata.json` (24 projecten, mei–nov 2026; gemarkeerd VOORBEELD/fictief): aantal verplichte WPI's per maand en per jaar (extrapolatie met bandbreedte), minuten per WPI (inspectie op locatie + afronden rapport; neem een onderbouwde aanname en noem hem zo), uren per jaar per inspecteur, plus eenmalige inrichting. Zet de uitkomst in één alinea in de samenvatting ("Bij een planning zoals in het voorbeeld: X–Y WPI's per jaar, ca. Z uur per coördinator per maand"). Reken met `python3` na; geen getal met de hand.

## Consistentie
1. Dialoog -3: laat de inspecteur zelf de afspraak noemen: "Ik heb met de operator afgesproken dat hij de rest afspuit vóór het uithijsen, terwijl er niemand in het kanaal is; de mangatwacht spuit op de bokken na." — zodat Claude niets vastlegt wat de inspecteur niet zei.
2. 5.8-kader: "bij -1, -2, -3 en -7 is direct een maatregel genomen; de actie blijft open" (controleer tegen data 10.2).
3. "Wat ging opvallend goed": het voorbeeldrapport neemt de positieve bevindingen op in onderdeel 5 (in ronde 8 van het rapport wordt dat gecontroleerd). Haal de zin "nog niet in het voorbeeldrapport" weg uit hoofdstuk 3 en B15, en verwijs naar onderdeel 5 van het rapport.
4. 7.1b: neem in 5.3 op dat een directielid dat zelf een WPI uitvoert op dat moment operationeel leidinggevende is voor die werkplek (of schrap "en voor de werkplek" bij de zelfstandige directie-WPI) — kies het eerste, met één zin waarom.
5. R1 (risico's): de QHSE-Manager ondersteunt de nulmeting; eigenaar van de trendanalyse is het Hoofd S&M (in lijn met 5.9).

## Bronnen en lezer
6. Tabel met de 21 product-TRA's (code, product, aantal regels; totaal 666) als checklistbron, uit `/home/claude/wpi/run/data/kennisbank.json` / `/home/claude/wpi/kb/WPI-kennisbank-index.md`; vermeld de bronversie/revisie zoals die in de kennisbank staat en dat de WPI altijd tegen de actuele QMS-versie toetst. Zet hem in bijlage A of als compacte tabel; hoofddocument blijft ≤ 20 pagina's.
7. Risico R3 aanvullen: de ICT-manager wil AI eerst in Copilot (bedrijfsstandaard) beproeven; en: toetsen of een gedeeld Claude-account binnen de voorwaarden van de aanbieder past. Noem beide als te nemen besluit, zonder oordeel.

## Vormgeving (B won)
8. Veldcodes die botsen hernoemen: risico's blijven R1–R5; velden van een TRA-regel worden TR1–TR6, actievelden AC1–AC15 (of vergelijkbaar), kopvelden K… Pas alle verwijzingen aan (zoek ook "veld R5"). Bijlagen niet met letters die ook onderwerpen zijn: houd "bijlage A/B/C" maar schrijf onderwerpen als "onderwerp A–I" overal voluit.
9. Neem in hoofdstuk 2 of 4 een beeld op: een uitsnede van pagina 1–2 van het voorbeeldrapport (`/home/claude/wpi/run/out/WPI-20261105-DAM-C2 Voorbeeldrapport.pdf`, pdftoppm) en een schermafbeelding van het dashboard (`/home/claude/wpi/run/out/dashboard/index.html`, Playwright 1440) — klein, met bijschrift "voorbeeld, fictieve data".
10. Voorblad: de bijlagenrij als korte lijst. "Nu nodig": groepeer de besluiten in twee of drie blokken met één zin per blok in plaats van elf nummers.

Render alle pagina's en bekijk ze. Hoofddocument ≤ 20 pagina's. Je beoordeelt je eigen werk niet. Rapporteer paginatal en wat je hebt aangepast.
