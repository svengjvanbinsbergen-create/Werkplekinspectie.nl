# Brief — Noardling WPI nieuwe methode (eerste versie)

Alles wat je oplevert is in het Nederlands. Lees dit hele bestand voordat je begint.

## Context
Noardling B.V. (Sneek; merken Landustrie, Desah, Hubert; waterzuiveringstechniek) is VCA**-gecertificeerd en zit in de hercertificering tegen VCA 2026/6.1. De afdeling Service & Montage monteert en onderhoudt installaties (vijzels, roosterreinigers, beluchters, pompen enz.) op locaties van opdrachtgevers (RWZI's, gemalen).

De hercertificeerder oordeelde: de huidige werkplekinspecties (WPI's) zijn niet duidelijk genoeg en voldoen niet aan de bedoeling van een WPI. Nu: een vaste checklist in de app AMS, zonder koppeling met de taak die de monteurs op dat moment uitvoeren. Ook ontbreekt een trendanalyse (VCA 7.2).

## De nieuwe methode
De inspecteur (Montage Coördinator of directielid) opent op locatie op zijn telefoon de Claude-app in een WPI-projectmap (één gedeeld Noardling Claude-account). De skill `wpi-begeleider` leidt hem door de inspectie; de inspecteur spreekt waarnemingen in en maakt foto's. Claude plaatst alles in de juiste velden en maakt een Word-rapport. Kern: Noardling heeft 21 productspecifieke TRA's (taak → taakstap → risico → maatregelen). De inspecteur toetst of de monteurs op dat moment werken volgens de maatregelen uit de TRA van het product en de taak waar ze mee bezig zijn, naast een algemene observatie.

Verloop van een WPI (skill):
0. Kop: inspecteur + functie, soort inspectie (WPI coördinator / VGM-inspectie directie), datum/tijd, opdrachtgever, locatie, projectnummer, aanwezige monteurs, omstandigheden.
1. Product en taak: product kiezen (21 in kennisbank), Claude toont fasen/taken, inspecteur kiest waar de monteurs mee bezig zijn. WPI-nummer: `WPI-JJJJMMDD-<productcode>-<initialen>`.
2. Algemene observatie, negen onderwerpen: A Voorbereiding en documenten (VGM-projectplan, TRA, werkvergunning, LMRA) · B Veiligstellen (LOTOTO) · C PBM · D Arbeidsmiddelen en gereedschap (staat, keuring) · E Hijsen en kraan · F Werkplek en omgeving · G Gevaarlijke stoffen, hygiëne en milieu · H Noodvoorzieningen · I Gedrag en samenwerking.
3. Taakgerichte toetsing: Claude toont per risicoregel (vast ID zoals `DAM-2.03`) de maatregelen; inspecteur vertelt wat hij ziet. Oordeel per regel: Conform (= positieve bevinding; alleen met een eigen waarneming van de inspecteur) / Afwijking / Verbeterpunt / Niet van toepassing. Het oordeel komt altijd van de inspecteur; Claude vraagt ernaar en vult het niet zelf in. Waarnemingen die bij geen ID passen: "Buiten TRA" (signaal dat de TRA een risico mist).
4. Foto's: genummerd, elk met toelichting van de inspecteur, gekoppeld aan onderwerp of TRA-ID.
5. Gesprek met de monteurs: besproken, reactie, eigen ideeën.
6. Bevindingen en acties: omschrijving, classificatie, prioriteit (direct / kort = binnen 2 weken / planmatig), direct gecorrigeerd ja/nee, actiehouder, termijn. Daarnaast: wat ging opvallend goed.
7. Afsluitvraag: "op de overige maatregelen niets aan te merken?" → "Geen afwijking waargenomen", anders "Niet beoordeeld". Inspecteur bevestigt samenvatting.
   ÉÉN MODEL (besluit van de lead, geldt voor voorstel, rapport, dashboard en data): Conform, Afwijking en Verbeterpunt bestaan alleen mét een eigen waarneming = "Waargenomen". "Geen afwijking waargenomen" bestaat alleen via de afsluitvraag, zonder eigen waarneming = "Alleen bevestigd". Geeft de inspecteur bij een regel wél een waarneming zonder afwijking, dan is het oordeel Conform. Het niveau waargenomen / alleen bevestigd / niet beoordeeld is dus afgeleid van het oordeel, geen apart veld.
8. Rapport (Word, vaste indeling): 1 Kop · 2 Samenvatting · 3 Algemene observatie · 4 Taakgerichte toetsing (alle regels van de taak) · 5 Positieve bevindingen · 6 Bevindingen en acties (status Open) · 7 Gesprek met monteurs · 8 Foto's met toelichting · 9 Gegevenstabel (platte tabel, bron voor trendanalyse).

Classificaties (14): PBM / Veiligstellen-LOTOTO / Hijsen / Werken op hoogte of bij water / Arbeidsmiddelen en keuring / Orde en netheid / Gevaarlijke stoffen en hygiëne / Besloten ruimte en gas / Fysieke belasting / Noodvoorzieningen / Documenten en voorbereiding / Gedrag en werkwijze / Omgeving en afzetting / Milieu. Elke risicoregel in de kennisbank heeft een vaste klasse (veld `klasse` in kennisbank.json); een bevinding op die regel krijgt die klasse. "Buiten TRA" is geen klasse maar een aparte vlag (soort = Buiten TRA) naast een gewone klasse.

Acties: toetser is standaard het Hoofd Service & Montage (voorstel); is hij zelf actiehouder, dan toetst de inspecteur; bij een direct gecorrigeerde actie toetst de inspecteur ter plaatse. De QHSE-Manager is geen actiehouder (ondersteunt hooguit). Eén actie = één verbeteractie; "direct gecorrigeerd" = de verbeteractie zelf is ter plaatse uitgevoerd; een direct genomen maatregel die alleen het lopende werk veilig maakt laat de actie open; een structureel vervolg is altijd een aparte actie. de status wordt bijgewerkt in het coördinatorenoverleg op maandag: het Hoofd S&M (of de coördinator namens hem) geeft per actienummer de nieuwe status door in de WPI-projectmap, Claude werkt het dashboard bij; het verslag van het overleg vermeldt de besproken actienummers.

## Besluiten en harde grenzen
- Claude verzint geen waarnemingen; oordeel en waarneming komen van de inspecteur. Claude biedt wel bij elke stap de gewenste velden aan.
- Diepgang schaalt met de inspecteur: een korte WPI en een diepe WPI zijn beide geldig; geen tijdslimiet.
- Bruikbaar op telefoon met spraak.
- Alleen eigen monteurs; onderaannemers/derden worden niet als veld bij bevindingen vastgelegd.
- Geen SharePoint. Rapporten leven in de Claude-omgeving en worden periodiek in het QMS opgeslagen. De trendrapportage/het dashboard leest de gegevenstabellen uit alle rapporten.
- Elke actie krijgt een nummer `<WPI-nummer>-<volgnr>`; status van acties wordt in het dashboard bijgehouden en in het coördinatorenoverleg (maandag) besproken.
- AMS vervalt voor WPI's als de methode werkt.
- Namen van monteurs alleen in de kop, niet bij afzonderlijke afwijkingen (AVG).
- Rollen: Hoofd Service & Montage is eigenaar van de procedure en eindverantwoordelijk; QHSE-Manager ondersteunt hooguit. Montage Coördinatoren: elk minimaal 1 WPI per maand. Directielid: minimaal 1 per kwartaal (4 per jaar).
- Noardling-dossierprincipe: onderscheid zichtbaar maken tussen wat de VCA letterlijk eist (blauw kader) en Noardlings eigen keuze (oranje kader). Aantoonbaarheid gaat boven beschrijving.
- Demo draait op FICTIEVE data: elk demostuk draagt duidelijk zichtbaar de markering "VOORBEELD — fictieve data". Geen echte namen van personen of opdrachtgevers.

## VCA 2026/6.1 — de meetbare helft (elke minimumeis moet aantoonbaar gedekt zijn)
7.1 Periodieke werkplekinspecties door operationeel leidinggevenden. Minimumeisen:
 a. procedure die beschrijft: (1) uitvoering van de inspecties, (2) de positieve bevindingen, (3) opvolging van verbeterpunten, (4) gebruik van de checklist;
 b. inspecties minstens eenmaal per maand per operationele werkplek door operationeel leidinggevenden (voetnoot: bij werk van korte duur een programma waarmee de frequentie naar verhouding wordt gehaald, rekening houdend met risico's);
 c. mag ook door operationele medewerkers onder verantwoordelijkheid van een operationeel leidinggevende;
 d. inspectieverslagen met: positieve bevindingen, geconstateerde afwijkingen, uit te voeren verbeteracties, uitvoeringsverantwoordelijken, tijdsduur voor uitvoering;
 e. actieplan met: actiepunten uit de inspecties, verantwoordelijken voor uitvoering en toetsing, tijdsplanning;
 f. (operationele) directieleden nemen minimaal eenmaal per kwartaal deel aan een WPI op een werklocatie.
 Documenten: procedure + inspectieprogramma; verslagen van inspecties en de follow-up.
7.2 Trendanalyse van bij inspecties geconstateerde bevindingen (positieve en negatieve). Minimumeisen:
 a. bevindingen worden geclassificeerd;
 b. jaarlijkse trendanalyse, inclusief te ondernemen acties en follow-up.
 Documenten: trendanalyse; overzicht verbeteracties.
De letterlijke tekst staat in `/home/claude/wpi/run/data/vca_7_letterlijk.md`.

## Bestanden
- `/home/claude/wpi/kb/` — kennisbank: 21 bestanden `TRA-<code>-<product>.md` + index (666 risicoregels).
- `/home/claude/wpi/run/data/kennisbank.json` — dezelfde kennisbank als JSON: per productcode naam + regels (id, fase, taak, risico, maatregelen).
- `/home/claude/wpi/run/data/voorbeelddata.json` — FICTIEVE dataset versie 10: 15 WPI's mei–nov 2026 (`wpis`), 249 beoordeelde regels (`regels`: oordeel, classificatie, soort Algemeen/TRA/Buiten TRA, `waargenomen` = Waargenomen / Alleen bevestigd / Niet beoordeeld / N.v.t., afgeleid van het oordeel), 42 acties (`acties`: prioriteit, actiehouder, termijn, status, afgerond_op, `bron` = Inspectie / Idee monteurs / Buiten TRA, `toetser`, `getoetst_op`, `bevinding` = wat er is geconstateerd, `verbeteractie` = de uit te voeren actie; regels hebben `acties` = lijst van actienummers; `omschrijving` = volledige risicotekst, niet afgekapt). Toetser en actiehouder zijn nooit dezelfde; een actie is pas Afgerond na toetsing; bij direct gecorrigeerde acties toetst de inspecteur ter plaatse. Elke afwijking en elk verbeterpunt heeft een actie, ook waarnemingen buiten de TRA, `programma` (gepland vs uitgevoerd per maand per inspecteur), `peildatum` 2026-11-11. Vijf producten komen meerdere keren voor, zodat dezelfde TRA-regels in meerdere WPI's getoetst zijn.
- In de dataset (vanaf versie 8) ook `projecten`: fictieve projectplanning met per project start, eind en risicokenmerken (hijsen met mobiele kraan, besloten ruimte met vergunning, open water). Regel (voorstel procedure 5.5): project langer dan een maand op één locatie = elke kalendermaand een WPI; kort project met minstens één risicokenmerk = ten minste één WPI; overige korte projecten = één op de vier per kwartaal.
- `/home/claude/wpi/run/bar/lat.md` — beschrijving van de lat (SafetyCulture) met URL's.
- De huidige procedure, volledige tekst: `/home/claude/wpi/run/data/procedure_oud.md`.
- Letterlijke eistekst VCA 2026/6.1 vraag 7.1 en 7.2: `/home/claude/wpi/run/data/vca_7_letterlijk.md`.
- Schrijf je output naar `/home/claude/wpi/run/out/`.

## Huisstijl
Word-documenten voor Noardling bouw je met de skill `anthropic-skills:noardling-docx-bouwer` (laad die met de Skill-tool en volg hem). Voor grafieken: skill `dataviz`.
