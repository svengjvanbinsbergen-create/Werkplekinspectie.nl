# Voorbeeldrapport WPI-20261105-DAM-C2 — opdracht ronde 4

Je neemt het werk over van een eerdere bouwer. Zijn bouwscript staat in `/home/claude/wpi/run/build/build_rapport.py` (herbouwen en renderen met `render.sh` in dezelfde map; foto-placeholders in `build/fotos/`). Het huidige rapport: `/home/claude/wpi/run/out/WPI-20261105-DAM-C2 Voorbeeldrapport.docx` en `.pdf` (11 pagina's). Lees eerst `/home/claude/wpi/run/brief.md` en het bouwscript volledig, render de huidige PDF en bekijk elke pagina, zodat je weet wat er staat. Werk het script bij; bouw het rapport niet opnieuw vanaf nul. Huisstijl: skill `anthropic-skills:noardling-docx-bouwer`.

## Stand na ronde 3 (oordeel van een onafhankelijke criticus)
A wint ruim bij beide lezers (coördinator en VCA-auditor) tegen het SafetyCulture-voorbeeldrapport; alle VCA 7.1-elementen aanwezig en letterlijk juist; negen onderdelen in de goede volgorde; tellingen kloppen. Niet gewonnen: vormgeving nipt verloren en een paar consistentie- en geloofwaardigheidspunten. Het script bevat al controles (negen koppen, VCA-tekst letterlijk, toetser ≠ actiehouder, enz.); houd die in stand.

## Data: versie 7 (`/home/claude/wpi/run/data/voorbeelddata.json`) — opnieuw inlezen
- Ref A is nu Afwijking (verouderde TRA op een lopende klus = maatregel niet goed toegepast). Tellingen: 9 Conform, 4 Afwijking (A, G, DAM-2.06, DAM-2.07), 0 Verbeterpunt, 2 alleen bevestigd (F, H), 2 niet beoordeeld (DAM-2.02, DAM-2.08); dekking 13 / 2 / 2.
- Zeven acties. -1 (A): kort, 12-11-2026, Werkvoorbereider, alleen de TRA-vervanging. Nieuw -6 (A): LMRA-hijsvoorstel, planmatig, 31-12-2026, Coördinator 2. -3 (DAM-2.06): alleen het vooraf reinigen, Werkvoorbereider. Nieuw -7 (DAM-2.06): toolbox hygiëne (drinken in de werkzone), kort, 19-11-2026, Coördinator 2, toetser Hoofd S&M. -5 heeft nu oordeel Afwijking (gelijk aan de regel; bron blijft "Idee monteurs"). Regel: het oordeel van een actie is altijd gelijk aan het oordeel van de regel. Teksten van bevinding en verbeteractie komen uit de data.
- Nieuw veld `direct_genomen_maatregel` per actie (gevuld bij -2, -4, -7). Toon alleen wat in dat veld staat; schrap "direct genomen maatregel" bij acties waar het veld leeg is. Laat de waarnemingen in onderdeel 3/4 hiermee kloppen (bij G: water en zeep gehaald; bij DAM-2.06: drinken uit de werkzone gehaald). "Direct gecorrigeerd" blijft nee bij -2 en -7, omdat de bevinding zelf niet is opgelost; leg dat verschil in één zin uit bij onderdeel 6.
- Maak het script zo dat het stopt als het oordeel van een actie afwijkt van dat van zijn regel.

## Grootste gat
Bij C staat dat de inspecteur een vastgeroeste bout zag doorslijpen, terwijl DAM-2.08 (bevestigingen losmaken) "niet gezien" is; slijpen in een kanaal met 4-gasmeting zonder opmerking over heet werk is niet geloofwaardig. Haal het slijpen uit C en beschrijf bij C een andere concrete PBM-waarneming (bijvoorbeeld handschoenen en laarzen bij werken in het slib, bril of gelaatsscherm bij het afspuiten). DAM-2.08 blijft niet beoordeeld met reden.

## Verder
1. Afspuiten met een tuinslang (aerosolen): noem bij DAM-2.06 dat dit met lage druk gebeurt en wat de monteur draagt, passend bij de maatregelen in de kennisbank (controleer welke er staan), zodat "Buiten TRA: geen" houdbaar is.
2. Vierspronghijsketting: zeg dat de twee vrije parten zijn opgehaakt in de hoofdring.
3. Monteurs heten "M1" en "M2" (fictief), zodat ze niet botsen met de refs A en B.
4. Het afsluitblok "bevestiging en bespreking" naar het einde van onderdeel 2 (Samenvatting); geen eigen nummer.
5. Kleur: oranje en blauw zijn huisstijlkleuren voor de kaders (oranje = keuze Noardling, blauw = VCA) en blijven. Geef de oordelen tinten die nergens anders voorkomen: Conform groen, Afwijking rood, Verbeterpunt paars, Geen afwijking waargenomen grijs, Niet beoordeeld donkergrijs (altijd met code). Labelcellen in de kop neutraal grijs in plaats van lichtblauw. De VOORBEELD-markering in een andere vorm dan een oordeelcel (rode rand of tekst, geen gevulde cel), of donkerrood.
6. Niet-afbrekend koppelteken (U+2011) in ALLE codes in het hele document: TRA-ID's, WPI-nummers, actienummers, projectnummers. Bouw een controle in die stopt als een code met een gewoon koppelteken in een tabelcel staat. Let op: dan moet de rest van het script (opzoeken op ID) met het gewone koppelteken blijven werken.
7. Bijlage minimaal 8 pt; 12 pagina's is acceptabel als dat nodig is.
8. Lettertype: probeer Muli in te sluiten. Muli heet tegenwoordig Mulish. Probeer het npm-pakket `@fontsource/mulish` binnen te halen (in een eigen map, bijv. /tmp/fonts: `npm pack @fontsource/mulish` en uitpakken), zet de woff/woff2-bestanden om naar ttf met fonttools (`pip install --break-system-packages fonttools brotli`), installeer ze in ~/.fonts met een fontconfig-alias Muli → Mulish (of hernoem de familie naar Muli), `fc-cache -f`, en render opnieuw. Controleer met `pdffonts` dat Muli/Mulish in de PDF zit. Lukt het niet, zeg waarom.
9. Lege ruimte: geen staande pagina meer dan 15% leeg, behalve vlak voor een nieuw onderdeel dat met kopregel plus twee rijen bij elkaar moet blijven.

Controleer opnieuw elke PDF-pagina als afbeelding. Lever op hetzelfde pad (docx + pdf).
