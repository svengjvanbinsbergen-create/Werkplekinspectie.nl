# WPI-dashboard — opdracht ronde 5

Artefact `1e23fed8-fcdb-41ba-aa22-a0e54b8fd0ea`; werkbestanden `/home/claude/wpi/run/out/dashboard/` (o.a. `test/build8.py`, `test/ref8.py`). Lees `/home/claude/wpi/run/brief.md`.

## Stand (criticus ronde 4, eigen narekening)
Vrijwel alle cijfers kloppen; geen scriptfouten; wint bij Hoofd S&M en auditor, en bij het directielid onder voorbehoud. NIET GEWONNEN: twee onjuiste zinnen in "In twee minuten", te smalle herkenning van terugkerende bevindingen, en vormgeving.

## Data: versie 9.3 — opnieuw inlezen
- WPI-20260911-BAN-C2 hoort nu bij een eigen project P26-391 (Bandfilter, Rioolgemaal Demowijk), niet meer bij P26-379. Koppel WPI's aan projecten op projectnummer EN controleer locatie (en product); toon een waarschuwing als die niet overeenkomen.
- WPI-20261105-DAM-C2: direct genomen maatregelen bij -1, -3, -4 zijn gevuld; actiehouder -4 = "Monteur ter plaatse".
- Twee acties van WPI-20260925-DAM-DL hebben nu een bevinding die past bij hun TRA-regel (kraancapaciteit; kabeltracé).

## GROOTSTE GAT: "In twee minuten" spreekt de eigen cijfers tegen
- "De coördinatoren deden 15 van hun 17" → coördinatoren 12 van 14, directie 3 van 3 (genereer uit de data).
- "11 projecten kregen geen enkele" → tel projecten zonder enige WPI over de hele looptijd (nu 9; reken opnieuw na op 9.3). Een project met een uitgevoerde WPI mag nooit in die lijst staan.
- Bouw in het controlescript een check die elke zin in de boodschappen en de conclusie tegen de berekening legt (geen handgeschreven getallen).

## Overige punten
1. Terugkerende bevindingen: groepeer niet op exacte tekst maar op TRA-regel-ID of algemeen onderwerp plus klasse, én op tekstgelijkenis (normaliseer, kernwoorden), en laat de groepering zien. Dan tellen DAM-C2-2 (handenwasgelegenheid), DAM-C2-7 (drinken in de werkzone) en de gasmeter-bevindingen (ROO-C1-3, DAM-C2-4/-5) mee. Pas TREND-acties daarop aan (gasmeter erbij in de trendactie voor besloten ruimte).
2. Lopende maand: tel een verplichting die al gehaald is direct mee; laat alleen de nog niet gehaalde wachten tot de maand voorbij is. Toon november als "x gehaald, y loopt nog". Beginmaand van een lang project: tel een maand alleen als verplicht als het project er minstens 10 werkdagen in loopt (maak dat een zichtbare definitie en noem het een voorstel).
3. Trenddoelen: formuleer positief en meetbaar ("bij ≥ 90% van de WPI's met hijsen is de hijszone Conform waargenomen in Q1–Q2 2027"), niet "geen nieuwe bevindingen". Controledatum passend bij het doel. TREND-2026-2: actiehouder van de open TRA-aanvullingen klopt met de data (Hoofd S&M).
4. Doorlooptijd: toon naast afgeronde acties ook de leeftijd van open acties per prioriteit; zeg dat het gemiddelde zonder open acties te gunstig is.
5. Voor de auditor een vastgelegd stuk: een knop/weergave "Trendanalyse vastleggen" die een afdrukbare versie geeft van conclusie, klassen, trendacties en follow-up (print-CSS die alle relevante tabbladen in één document zet), met opgesteld door / vastgesteld op / versie. Positieve bevindingen: toon bij Conform-regels in het WPI-detail ook de waarneming als die in de data staat, of zeg dat de waarneming in het rapport staat met een verwijzing naar het WPI-nummer.
6. Vormgeving: Overzicht korter (trendacties op Overzicht als compacte lijst: nummer, wat, actiehouder, termijn, status; het volledige blok op een eigen plek of uitklapbaar); op de telefoon trendacties als kaarten; "Waargenomen" niet in blauw (blauw = alleen bevestigd); programmatabel op de telefoon met vaste eerste kolom en de laatste maand zichtbaar; "geen gegevens" maar één keer; Overzicht meldt op de kaarten dat het filters negeert.

Test lokaal op 400, 1280 en 1920 px, licht en donker. Lees na opslaan index.html en app.js volledig terug. Rapporteer: nieuwe kerncijfers, wat je per punt deed, wat niet lukte.
