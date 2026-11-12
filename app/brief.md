# Brief — configureerbare inspectie-app (ontwerpfase)

Alles in het Nederlands. Lees dit hele bestand en `/home/claude/app/bar/lat.md`.

## Doel
Schermontwerpen voor een app waarmee VGM-verantwoordelijken werkplekinspecties laten uitvoeren met een AI-begeleider. Eerste klant: Noardling B.V. (Sneek; waterzuiveringstechniek; Service & Montage op locaties van waterschappen; VCA**). De app moet ook aan andere bedrijven verkocht kunnen worden. Unique selling point: ALLES is per bedrijf configureerbaar, en dan een niveau hoger dan een checklist:
- de begeleider zelf (hoe de AI de inspecteur door de inspectie leidt: stappen, volgorde, vragen, toon, verplichte velden, wanneer doorvragen, afsluitregels, welke kennisbronnen hij gebruikt);
- de eigen arbocatalogus / kennisbank: risico's, standaardmaatregelen, klassen, per product/taak/taakstap, te selecteren uit een catalogus;
- uploaden van een RI&E en taakrisicoanalyses (TRA's, bijvoorbeeld Excel) die de AI omzet naar de kennisbank, met controle door een mens vóór publicatie;
- het uitkomstdocument (rapport): indeling, onderdelen, velden, huisstijl;
- het resultatendashboard (overzicht van alle inspecties, trends, acties).
Toegankelijk bewerkbaar en specificeerbaar: een VGM-coördinator zonder programmeerkennis moet het kunnen.

## Wat al bestaat en werkt (gebruik als inhoudelijke basis en voorbeeldinhoud)
De Noardling-methode is in een eerdere ronde uitgewerkt; de begeleider-instructie (skill) staat in `/home/claude/app/ref/wpi-begeleider.md` en de werkwijze in `/home/claude/wpi/run/brief.md`. Kern:
- Inspectie: kop → product en taak kiezen → algemene observatie (negen onderwerpen A–I) → taakgerichte toetsing aan de TRA-maatregelen van de taak die nu wordt uitgevoerd → foto's met toelichting → gesprek met de monteurs → bevindingen en acties → afsluitvraag → rapport.
- Oordeelmodel: Conform / Afwijking / Verbeterpunt alleen met eigen waarneming; "Geen afwijking waargenomen" = alleen bevestigd via de afsluitvraag; Niet beoordeeld; Niet van toepassing. Oordeel en waarneming komen altijd van de inspecteur: de AI verzint niets, vraagt ernaar en vult niets zelf in.
- Acties: bevinding, verbeteractie, direct genomen maatregel, classificatie, prioriteit (direct/kort/planmatig), actiehouder, toetser (nooit gelijk aan actiehouder), termijn, status; afgerond pas na toetsing.
- Kennisbank: 21 product-TRA's, 666 risicoregels met vaste ID's (bv. DAM-2.06), fasen, taken, taakstappen, risico, maatregelen (collectief/individueel/PBM), klasse. Bestanden: `/home/claude/wpi/kb/*.md` en `/home/claude/wpi/run/data/kennisbank.json`.
- Voorbeelddata (fictief) voor schermen met resultaten: `/home/claude/wpi/run/data/voorbeelddata.json` (15 WPI's, 249 regels, 40 acties, 23 projecten).
- VCA 2026/6.1 vraag 7.1 en 7.2: `/home/claude/wpi/run/data/vca_7_letterlijk.md`.

## Harde grenzen
- Nederlands. Eigen neutraal ontwerp, klaar voor latere huisstijl per klant (een VGM-merk volgt later): gebruik het gedeelde ontwerp in `/home/claude/app/ontwerp.md`; geen Noardling-huisstijl, geen SafetyCulture-look.
- AI-aanbieder is een instelling (Claude eerst; later bijvoorbeeld DeepSeek via OpenRouter of EU-gehost open model). Toon dat in de configuratie, inclusief waar de data heen gaat.
- De AI verzint nooit waarnemingen of oordelen; dat moet in de schermen zichtbaar zijn (wat de inspecteur zei tegenover wat de AI structureert).
- Telefoon: bediening met één hand, met handschoenen, buiten, spraak als hoofdinvoer, foto's; touch targets ≥ 48 px; werkt ook zonder bereik (laat zien hoe).
- Fictieve voorbeeldinhoud mag (Noardling-producten, fictieve namen); geen lorem ipsum. Markeer niets als echt dat niet echt is.
- Elk scherm krijgt annotaties: uitbreidingsmogelijkheden, verbetermogelijkheden en hoe de gebruiker dit configureert. Die schrijf je NIET in het scherm zelf maar in een apart bestand (zie hieronder).

## Meetbare helft
Elke stap van een inspectie en elk configureerbaar onderdeel heeft een eigen ontworpen scherm. De lijst staat in `/home/claude/app/schermen.md`; die lijst is leidend.

## Vorm van je werk
- Eén zelfstandig HTML-bestand per scherm, met alleen inline `style="…"` op elementen plus één `<style>`-blok in de head voor basis (body margin, font-face/Google Fonts link, a-kleuren). Geen JavaScript, geen externe afbeeldingen (iconen als inline stroke-SVG), geen emoji.
- Telefoonschermen: root precies 390 × 844 px. Webschermen: root 1440 px breed, hoogte zoals nodig (meet en noteer).
- Bestandsnaam = schermcode uit `schermen.md`, bv. `P04-tra-toetsing.html`, in `/home/claude/app/screens/phone/` of `/home/claude/app/screens/web/`.
- Annotaties per scherm in `/home/claude/app/notes/<schermcode>.md`: drie kopjes "Hoe configureert de klant dit", "Uitbreidingen", "Verbeteringen", elk 2–5 korte punten.
- Render elk scherm zelf met Playwright (headless Chromium) naar PNG in `/home/claude/app/shots/` en bekijk het: geen overlap, niets afgesneden, contrast ≥ 4.5:1.
