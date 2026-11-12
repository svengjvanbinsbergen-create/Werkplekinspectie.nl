# WPI-dashboard — opdracht ronde 4

Artefact: slug `1e23fed8-fcdb-41ba-aa22-a0e54b8fd0ea` (type Data, inhoud in de database van het artefact; werkbestanden in `/home/claude/wpi/run/out/dashboard/`, controlescript `test/ref6.py`, testopstelling `test/mk.py`). Lees eerst `/home/claude/wpi/run/brief.md`.

## Stand na ronde 3 (onafhankelijke criticus met eigen schermafbeeldingen en narekening)
- Alle nagerekende cijfers kloppen; geen scriptfouten; filters en doorklikken werken; VOORBEELD-markering overal; oordeelmodel juist.
- A wint nu bij alle drie de lezers (Hoofd S&M nipt, directielid, auditor). NIET GEWONNEN: verliest op vormgeving, en VCA 7.1 "maandelijks per operationele werkplek" ontbreekt.

## Data: versie 8 (`/home/claude/wpi/run/data/voorbeelddata.json`) — opnieuw inlezen
- Nieuw: `projecten` (23 fictieve projecten met start, eind en drie risicokenmerken). De `project`-waarde komt overeen met `wpis.project`. Zie de regel in de brief.
- Bij 26 acties zijn `bevinding` en `verbeteractie` nu passend gemaakt (eerder sloten ze in 14 gevallen niet op elkaar aan). Bevindingen over een ontbrekende mangatwacht zijn nu direct gecorrigeerd en afgerond. Buiten-TRA-acties hebben een concrete TRA-aanvulling als verbeteractie. WPI-20261105-DAM-C2 is ongewijzigd.
- Reken alles opnieuw uit met je controlescript.

## GROOTSTE GAT: programma per operationele werkplek (VCA 7.1 + voetnoot 10)
Bereken uit `projecten` en `wpis` per project wat verplicht was volgens de regel, tot de peildatum:
- project langer dan een maand (eind − start > 31 dagen): elke kalendermaand van start t/m min(eind, peildatum) één WPI op dat project;
- kort project met minstens één risicokenmerk: ten minste één WPI;
- overige korte projecten: één op de vier per kwartaal (in deze data hebben vrijwel alle korte projecten een kenmerk; toon het toch).
Toon bovenaan de tab Programma een tabel project × maand met ✓ / ✕ / leeg (niet verplicht), "x van y verplichte WPI's" totaal en per project, en doorklikken naar de gemiste projecten. Zet de bestaande tabel per inspecteur eronder als "inzet per inspecteur (ondergrens)". Neem het cijfer op in de drie boodschappen of de conclusie (het zal laag zijn: dat is de boodschap). Voeg een trendactie toe als de dekking per werkplek onder de norm ligt (wie: Hoofd S&M stelt maandelijks het inspectieprogramma op uit de projectplanning; meetbaar doel en controledatum). Markeer dat de projectplanning fictief is.

## Overige punten
1. Terugkerende bevindingen: blok "Terugkerende bevindingen" (groeperen op bevindingtekst: aantal, WPI's, producten, klassen). Noem de belangrijkste in de conclusie en verwerk ze in een trendactie.
2. Trendacties aanscherpen: elke trendactie een meetbaar doel en een controledatum, en een kolom "Laatst besproken / voortgang" (leeg in het voorbeeld). TREND-2026-2: maatregel tegen communicatie bij lawaai (portofoons of vaste handseinen bij hijsen), plus een datum voor de openstaande TRA-aanvullingen. TREND-2026-3: wegwerken van de achterstand met een concrete datum; actiehouder niet de persoon bij wie de achterstand ligt. TREND-2026-1: niet twee klassen en twee maatregelen bundelen; splits of beperk. Maximaal zeven trendacties.
3. Overzicht: maak de cijfers in de drie boodschappen en de conclusie klikbaar (zelfde mechanisme als de tegels; bijvoorbeeld "4 acties over de termijn" opent die acties) en voeg één compacte grafiek toe die op een beamer de kern laat zien (bijvoorbeeld de dekking van het programma per werkplek per maand, of afwijkingen per klasse).
4. WPI-detail: kopregel met soort, opdrachtgever, locatie, project, fase/taak en aantal monteurs; actienummers klikbaar met bevinding, verbeteractie, direct genomen maatregel, actiehouder, toetser, termijn en status. Tabel afgeronde acties: kolommen prioriteit, termijn en TRA-ID/klasse erbij.
5. Vormgeving:
   - staven per klasse: vaste breedte voor de waardekolom zodat de staven gelijk eindigen; toon naast het aandeel ook het aantal (n), zodat een klasse met n = 1 niet even zwaar oogt als een met n = 46 (bijvoorbeeld staaflengte op aantal, aandeel als label);
   - één codering voor "Alleen bevestigd" in alle grafieken;
   - lege grafiekvakken inklappen met een korte melding; bij een classificatiefilter het aantal WPI's tellen met regels in die klasse;
   - "nog 1 dag" (enkelvoud); "—" en "0" niet klikbaar en niet onderstreept;
   - `color-scheme: light dark` op de pagina, of keuzelijsten met de themakleuren;
   - donker thema: het felle mintgroen temperen;
   - de TRA-tab en de Acties-tab zijn te lang (3300–3700 px op 1280, 5000–6500 px op telefoon): klap secundaire blokken standaard in en zet het filterblok op de telefoon inklapbaar.

Test opnieuw lokaal op 400, 1280 en 1920 px, licht en donker, met doorklikken vanuit de boodschappen en de programmamatrix. Lees na het opslaan index.html en app.js volledig terug.
