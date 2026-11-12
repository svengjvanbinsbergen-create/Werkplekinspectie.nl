# Projectcontext voor DeepSeek

Dit bestand wordt automatisch als systeemprompt meegestuurd naar DeepSeek
(zie tools/deepseek_harness.py). Houd het kort en feitelijk: alles hier kost
tokens bij elke call. Leidende bron bij twijfel: handoff/HANDOFF.md en
wpi/run/koers2.md.

## Wat is dit project
- Naam: Werkplekinspectie.nl
- Opdrachtgever: Sven van Binsbergen, IVK-stagiair (4e jaar) bij Noardling B.V.
  (Sneek). Doel: VCA-hercertificering tegen VCA 2026/6.1.
- Inhoud: (1) een nieuwe WPI-methode (werkplekinspectie) + voorstel/procedure,
  (2) een verkoopbaar, configureerbaar WPI-app-ontwerp, (3) voorbeeldrapport,
  (4) trenddashboard. Alles op FICTIEVE voorbeelddata; nog geen echte software.

## De methode (kern — geldt boven alles)
- Een WPI toetst of de vastgelegde werkwijze (de TRA-maatregelen) op dat moment
  op de werkvloer wordt uitgevoerd. "Werken wij zoals we zeggen dat we werken?"
- Momentopname: alleen wat de inspecteur ziet telt. Geen verplichte vragenlijst.
- Oordeelmodel: alleen [C] Conform, [A] Afwijking, [V] Verbeterpunt (altijd met
  eigen waarneming), optioneel [NVT]. "Geen afwijking / niet beoordeeld" bestaat
  NIET meer.
- Eenheid van oordeel = de risicoregel uit de TRA (of het algemene onderwerp).
  Tellingen heten "waarnemingen" of "regels", nooit "maatregelen gezien".
- AI verzint NOOIT waarnemingen, oordelen of prioriteiten. Alles wat de AI
  voorstelt heet "Voorstel" en moet door de inspecteur bevestigd worden.

## Taal en toon
- Alles in het Nederlands (teksten, code-commentaar, commits).
- Sven werkt vaak vanaf de mobiele app; houd antwoorden overzichtelijk.

## Techniek / structuur
- `wpi/` — methode, data, build-scripts voor rapport/voorstel/dashboard.
  - `wpi/run/data/voorbeelddata.json` (v11.1) en `kennisbank.json` = ENIGE bron
    voor cijfers. Nooit met de hand tellen; altijd uit de data afleiden.
  - `wpi/run/koers2.md` = leidende methodebeschrijving.
- `app/` — app-ontwerp: statische HTML-schermen (telefoon 390×844, web
  1440×900), ontwerpregels in `app/ontwerp.md` (lees de laatste secties).
- `tools/` — dit harnas + render-/meethulp (render.py, measure.py).
- `handoff/HANDOFF.md` — volledige overdracht en actuele stand.

## Harde conventies (uit de methode)
- Geen VCA-sub-letters verzinnen: schrijf "VCA 7.1"/"VCA 7.2" met letterlijke
  tekst uit wpi/run/data/vca_7_letterlijk.md.
- Actieregels zijn streng (toetser ≠ actiehouder; QHSE-Manager nooit
  actiehouder; afgerond pas na toetsing). Zie HANDOFF §2.
- Ontwerp: Apple-achtig, rustig, alleen Inter (geen serif), telefoon zonder
  scroll, ≤ 2 gevulde knoppen per scherm. Zie app/ontwerp.md.

## Rolverdeling met Claude
- Claude bewaakt methode/VCA-correctheid en reviewt alles (criticus).
- DeepSeek doet mechanisch bouw-/renderwerk dat Claude daarna toetst.
- Bij twijfel of iets klopt met de methode: stel een vraag, verzin niets.
