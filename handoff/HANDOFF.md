# HANDOFF — WPI-methode Noardling + configureerbare WPI-app

Overdracht voor Claude Code. Stand: 12-11-2026, 15:10. Opdrachtgever: Sven van Binsbergen, IVK-stagiair (4e jaar) bij Noardling B.V. in Sneek, VCA-hercertificering tegen VCA 2026/6.1. Werk altijd in het Nederlands. Sven werkt vaak vanaf de mobiele app. Hij wil dat je hem vragen stelt om hem beter te helpen; maak bij twijfel een redelijke keuze en meld die.

Alles in dit pakket is ontwerp en voorbeeldmateriaal op **fictieve** data. Er wordt (nog) niets gebouwd als echte software.

---

## 1. Wat er gemaakt wordt (vier onderdelen + app-ontwerp)

| # | Onderdeel | Vorm | Bestand(en) | Stand |
|---|---|---|---|---|
| 1 | Voorbeeld-WPI-rapport WPI-20261105-DAM-C2 | Word in Noardling-huisstijl, 11 p. | `wpi/run/out/WPI-20261105-DAM-C2 Voorbeeldrapport.docx/.pdf` | **WINT** blind van het SafetyCulture-voorbeeldrapport (rust, coördinator én auditor, VCA 7.1 foutloos). Daarna kleine nabewerking gedaan. |
| 2 | Voorstel "Nieuwe methode werkplekinspecties" incl. procedure (bijlage A) | Word, 45 p. (samenvatting p. 2–3, hoofddocument p. 5–15, bijlagen A–I) | `wpi/run/out/Voorstel nieuwe methode werkplekinspecties.docx/.pdf` | Laatste criticus: wint op rust en bij beide lezers (nipt), fouten in c. Die zijn verwerkt, **nog niet herbeoordeeld**. Oranje invulplekken wachten op Sven. |
| 3 | WPI-trenddashboard | Claude-artifact (Data-type), slug `1e23fed8-fcdb-41ba-aa22-a0e54b8fd0ea`, link https://claude.ai/artifact/4isSYDiWXJB35z41NUGnkq | lokale stand `wpi/run/out/dashboard/index.v11b.html`, `app.v11b.js`, `data11/`; bouw/controle `test/build11.py`, `test/check11.py` | Omgezet naar momentopname + data 11.1, alle cijfers nagerekend, **nog niet herbeoordeeld**. |
| 4 | App-ontwerp (verkoopbaar, configureerbaar) | Statische HTML-schermen: telefoon 390×844, web 1440×900, met annotatie per scherm | `app/v2/screens/phone/*.html`, `app/v2/screens/web/*.html`, `app/v2/notes/*.md`, renders `app/v2/shots/*.png` | Web: laatste criticus won op rust + beide gebruikers; fouten verwerkt, niet herbeoordeeld. **Telefoon: wint niet** (zie §7, open keuzes). |
| — | Overzichtspagina van alle 55 schermen | Claude-artifact, slug `13c52de2-961e-4de6-8efb-5b8ac7965413`, https://claude.ai/artifact/3SbaMftoPcp7yfTEH2uWaN | bouwen met `app/tools/overzicht2.py` (status in `app/tools/overzicht_status2.html`) | Bijgewerkt 12-11 15:03. |

Oudere tussenstanden (zelfde artifact-account): overzicht v1-stijl `1eb804fd-323a-4297-817f-1c9f1adc66a0`, richtingvoorstel v2 `3c7c6386-b379-4d93-a755-823415f5b252`. Niet meer bijwerken.

---

## 2. De methode — lees dit eerst (koers 2, geldt boven alles)

Bron: `wpi/run/koers2.md` (leidend), `wpi/run/brief.md` (ouder; actieregels gelden nog, oordeelmodel is vervangen).

**Kern (Sven):** een WPI toetst of wat het bedrijf als werkwijze heeft vastgelegd (de TRA-maatregelen) op dat moment op de werkvloer wordt uitgevoerd. *"Werken wij zoals we zeggen dat we werken?"* Het is een **momentopname**: alleen wat de inspecteur ziet telt. Geen verplichte vragenlijst.

Verloop:
1. **Kop.** Twee ingangen: *ingepland* (uit het programma, kop vooraf gevuld) of *spontaan* (inspecteur komt toevallig langs). Minimaal: projectnummer, naam inspecteur, datum. Rest afgeleid uit het project.
2. **Wat doen de monteurs nu?** Taak (+ taakstap waar de TRA die kent). AI stelt voor, inspecteur bevestigt.
3. **Toetsen wat je ziet** tegen de risicoregels/maatregelen van die taak/stap + standaardmaatregelen (LMRA, PBM). Wat je niet ziet, leg je niet vast. Geen "regel x van y", geen afsluitvraag.
4. **Algemene onderwerpen** (PBM, orde en netheid, LMRA, documenten …) = **operationeel als geheugensteun**, optioneel.
5. **Gesprek met de monteurs** (vast) → **afronden**: wat ging goed, afwijkingen met acties.

**Oordeelmodel:** alleen **[C] Conform**, **[A] Afwijking**, **[V] Verbeterpunt** — altijd met eigen waarneming; optioneel **[NVT]**. "Geen afwijking waargenomen / alleen bevestigd" en "Niet beoordeeld" **bestaan niet meer**. Rapport zegt alleen "Getoetst tijdens bezoek: taak X, stap(pen) Y".

**Eenheid (afspraak 12-11):** eenheid van oordeel = de **risicoregel** uit de TRA (of het algemene onderwerp). Per regel legt de inspecteur vast welke maatregel(en) hij zag en welke het oordeel bepaalde. Tellingen heten "waarnemingen" of "regels", nooit "maatregelen gezien". "Getoetst" = "x taken · y taakstappen". (In de app-schermen is oordeel per maatregel als uitbreiding voorzien; data en rapport werken op regelniveau.)

**Toetsniveau:** de TRA-bestanden zijn de **gegeneraliseerde "(2)"-versies**; maar **128 van 666** regels hebben een taakstap (vooral LOTOTO/inschakelen). Daarom toetsniveau = **taak**, taakstap waar die bestaat. In de app is "toetsniveau" een instelling per klant. In het voorstel is dit **besluit 23** (taakstappen terug in de TRA's of taak als niveau accepteren) — Sven moet nog kiezen.

**Actieregels (ongewijzigd, streng):**
- oordeel van de actie = oordeel van de regel;
- toetser ≠ actiehouder; standaardtoetser Hoofd Service & Montage; is die zelf houder → de inspecteur toetst;
- afgerond pas na toetsing;
- één actie = één verbeteractie; structureel vervolg en idee van monteurs = aparte actie;
- **"Direct gecorrigeerd"** (letterlijk overal gelijk): *"de verbeteractie zelf is ter plaatse uitgevoerd; de inspecteur toetst dan ter plaatse. Een direct genomen maatregel maakt alleen het lopende werk veilig; de actie blijft open tot de verbeteractie is uitgevoerd en getoetst."*
- QHSE-Manager is nooit actiehouder;
- AI verzint nooit waarnemingen en kiest nooit een oordeel of prioriteit; alles wat de AI voorstelt heet "Voorstel" en moet bevestigd worden; herkomstlabels Jij / Voorstel / Standaard.
- Geen VCA-sub-letters verzinnen ("7.1 d" bestaat niet in de norm): schrijf "VCA 7.1"/"VCA 7.2" met letterlijke tekst uit `wpi/run/data/vca_7_letterlijk.md`.

**Programma (VCA 7.1):** elke operationele werkplek ten minste maandelijks; voetnoot 10 voor werk van korte duur (Noardling-keuze: korte projecten met risicokenmerk altijd 1, overige 1 op 4 per kwartaal); lange-projectmaand telt pas vanaf **10 werkdagen** (eigen keuze, **auditrisico**, staat als besluit 8 met alternatief "elke maand waarin gewerkt wordt"); directie per kwartaal. Spontane WPI telt mee als hij op een verplichte werkplek/maand valt.

---

## 3. Data (enige bron voor alle cijfers — nooit met de hand tellen)

- `wpi/run/data/voorbeelddata.json` — **versie 11.1** ("11 — momentopname …"). 15 WPI's (13 ingepland, 2 spontaan: WPI-20260810-ROO-C2, WPI-20261103-ROO-C1), 192 regels (C 152 / A 22 / V 16 / NVT 2; 98 algemeen, 87 TRA, 5 buiten TRA), 42 acties (17 open, 25 afgerond), 24 projecten. Velden per WPI o.a. `ingang`, `getoetste_stappen`, `tra_revisie` (alleen DAM-C2: "TRA Damwand, rev. 3 (fictief), 15-10-2026"; projectmap rev. 2). Oudere versies staan ernaast (`_v10_*`, `_v11_0`).
- Voorbeeld-WPI **WPI-20261105-DAM-C2** (P26-168, RWZI Voorbeeldstad, ingepland, taak "Verwijderen damwand", geen taakstappen in bron): 15 regels — TRA DAM-2.01 C, 2.03 V, 2.04 C, 2.05 C, 2.06 A, 2.07 A, 2.08 C; onderwerpen A A, B–E C, G A, H C, I C. 9 acties: 1 direct (C2-4, direct gecorrigeerd, afgerond), 5 kort (C2-1, -2, -3, -7, -8), 3 planmatig (-5, -6, -9); 8 open. C2-5 en C2-9 = idee monteurs.
- `wpi/run/data/kennisbank.json` — 21 producten, 666 TRA-regels, per regel id, fase, taak, **taakstap** (meestal null), risico, maatregelen (letterlijk), klasse (14 klassen; geen "Onderaannemer", geen "TRA onvolledig" → vlag "Buiten TRA"). Controle: `kennisbank_controle.md`. Bron-TRA's: `uploads/*.xltx` (openpyxl; Trommelfilter = "Drumscreen"), tussenstap `wpi/kb/TRA-*.md`; scripts `wpi/scripts/` (`extract.py`, `tomd.py`, `taakstap_extract.py`, `v11.py`).
- `app/tools/cijfers.py` → `cijfers.json`: alle app-webcijfers. Programma-logica gelijk aan het dashboard (15 van 32 gedaan, 17 gemist, lang 5/15, kort met risico 10/17, 2 lopend). Sleutels o.a. `waarnemingen` (totaal/TRA/Algemeen/buiten_TRA), `getoetst` (taken 15, taakstappen 11), `vp_*`, `act_*`, `thema`.
- `wpi/run/data/vca_7_letterlijk.md` (letterlijke VCA 2026/6.1 vraag 7.1 en 7.2), `procedure_oud.md` (oude procedure: coördinatoren samen min. 24 WPI/jaar).

---

## 4. Bouwen en renderen

**Rapport:** `python3 wpi/run/build/build_rapport.py` → docx + pdf (LibreOffice). Script bevat veel consistentiechecks (VCA-tekst letterlijk, actieregels, tellingen, overzicht = kernzinnen, TRA-revisie uit data, geen "bumptest"/"adembescherming"-zinnen). Muli-font moet in `~/.fonts` staan (anders afwijkende opmaak). Negen vaste onderdelen (3 = "Algemene waarnemingen", 4 = getoetste TRA-regels, 9 = gegevenstabel 9a–9d liggend).

**Voorstel:** in `wpi/build/`: inhoud `deel_v4.py` (+ `kop_v4.py`), kosten `kosten.py`; bouwen `python3 samen.py` en daarna twee keer `TAB=17 bash run_v4.sh toc4.json`. Beelden in `wpi/build/beeld/`. Back-ups `*.bak`, `r9/`.

**Dashboard:** lokaal testen via `wpi/run/out/dashboard/test/light.html|dark.html` (runtime-stub); data bouwen `test/build11.py`, nacontrole `test/check11.py`. Publiceren naar het artifact gaat met de claude-artifacts-tools (db_write/upload_asset; app.js in delen, gerichte vervangingen). In Claude Code is die publicatie mogelijk niet beschikbaar — dan alleen lokaal bijwerken en Sven vragen het te publiceren.

**App-schermen (v2, geldend):**
- Telefoon: `app/v2/src/telefoon.py` (P01–P05 én de gedeelde **bouwstenen**: `phone, head, titleblock, progress, gevaar, dock, sheet, tabbar, label, standaard_chip, oc, status, in_orde_btn, toast, kies_chip, kies_rij` …) en `app/v2/src/telefoon_p06_p10.py` (importeert telefoon.py). Renders: `/home/claude/tools/render.py` / `app/v2/src/telefoon_render.py`.
- Web: `app/v2/src/config_web.py` (W01–W06b, W16, W02-bouwbedrijf, W04-inrichting/-leeg) en `app/v2/src/web_resultaten_beheer.py` (W07–W15, W17, W09b); renders `render_config_web.py`, `render_web_rb.py`. Oorspronkelijke goedgekeurde sjabloon: `app/v2/src/gen.py` (niet meer aanpassen).
- Elke render-run controleert contrast ≥ 4,5:1, afgesneden tekst, overloop, tikdoelen.
- Overzichtspagina: `python3 app/tools/overzicht2.py` → `app/overzicht2/` → publiceren als artifact (mode replace).
- v1-schermen (`app/screens/`, `app/tools/src/`) zijn verouderd; alleen als referentie.

**Ontwerpregels:** `app/ontwerp.md` — lees de **laatste secties** (KOERSWIJZIGING eenvoud, stijlvoorbeeld Sven `app/ref/stijlvoorbeeld-sven.png`, vaste maten, afspraken 12-11). Kort: Apple-achtig, rustig, pastelkaarten radius 20–24, groot cijfer + klein label, één donkere hoofdknop, **alleen Inter** (geen serif), telefoon zonder scroll en ~5 elementen, web binnen 900 px, details achter een tik/zijpaneel, ≤ 2 gevulde knoppen, titel op y 138, Direct gevaar 48 px omlijnd met "houd 2 s", "Standaard" grijs, één woord "Vastleggen", chip "Voorbeeldinhoud · fictief", geen Noardling-logo in de app. Tweede fictief bedrijf overal "Bouwbedrijf Voorbeeld B.V. (fictief)", concept v0.1. AI-provider: Claude via Anthropic = opslag VS, geen EU-optie (EU via Vertex/Bedrock); DPIA in voorbeeld afgerond (28-04-2026); instelling "AI pas actief na DPIA" standaard aan.

---

## 5. Werkwijze: gauntlet-loop

Sven wil de onderdelen laten "grinden" tot ze **blind winnen** van een echte referentie:
- **Lat:** SafetyCulture/iAuditor (Mitti): voorbeeldrapport-PDF `https://wp-website.safetyculture.com/wp-content/uploads/sites/3/2023/11/Office-Safety-Checklist-Sample-PDF-Report.pdf`, help.mitti.com-artikelen (o.a. /000009, /000082, /003414, /004268, /000087, /000044, /004066, /000061, /001388, /001614, /003943, /005753). Voor rust: Apple-apps + Apple HIG (.md-versies werken: `developer.apple.com/design/human-interface-guidelines/buttons.md` enz.) + Svens stijlvoorbeeld. Beschrijving in `wpi/run/bar/lat.md`. safetyculture.com zelf is vanuit de cloudomgeving vaak geblokkeerd; schermafbeeldingen van SafetyCulture zijn nooit gezien — critici moeten dat eerlijk melden.
- **Meetbare helft:** elke minimumeis VCA 7.1/7.2; alle 21 TRA's; cijfers kloppen met de data.
- **Per onderdeel:** een bouwer en een aparte, harde criticus met verse context. Criticus rendert zelf, vergelijkt blind (A/B), oordeelt **eerst op rust en eenvoud**, dan per gebruiker/lezer, controleert feiten met code, noemt het ENE grootste gat + max. 5 kleinere, eindigt met "A WINT" of "A WINT NIET". Bouwer beoordeelt nooit zijn eigen werk. Exit = winnen of Sven stopt.
- Gebruikers/lezers in de critic-prompts: coördinator op locatie (handschoenen, haast, lawaai) en VGM-coördinator (herleidbaarheid, niets verzonnen) voor de telefoon; VGM-coördinator van een ánder bedrijf zonder programmeerkennis en VGM-manager/koper (VCA, AVG, vier ogen) voor web; Montage Coördinator/Hoofd S&M en VCA-auditor voor rapport; directie/Hoofd S&M en VCA-auditor voor voorstel en dashboard.
- Let op usage: Sven liep eerder tegen de usage-limiet aan. Werk in rondes; geef tussentijds een korte stand.

---

## 6. Stand per onderdeel en wat er nog moet

**Rapport — gewonnen.** Alleen onderhoud: als data verandert, opnieuw bouwen en checks groen houden.

**Voorstel** — herbeoordelen. Laatst verwerkt: eenheid "regel", kosten p. 3 (64 uur inrichting waarvan 28 vóór de proef; proef +7–10 uur), auditrisico tienwerkdagenregel op p. 3 (variant 48–72), AF2, fotoverwijzingen bijlage D, besluit 17, samenvatting blok 2. Licentiebesluit (bijlage I, bronnen geciteerd): gedeeld Claude-account is **niet toegestaan** (Anthropic Consumer Terms; Team-seat per persoon); opties Claude Team ($20–25/seat/mnd), Copilot ($21/user/mnd); advies proef met 3 Team-seats. Open invulplekken (oranje): status van de WPI-bevinding bij de heraudit en de termijn van de CI (VCA 2026/6.1 §7.6: max. 3 maanden — nog niet geverifieerd in de checklist), einddatum proef.

**Dashboard** — herbeoordelen (lat: SafetyCulture Analytics). Programma moet 15 van 32 tonen, consistent met de app.

**Web** — herbeoordelen. Laatst verwerkt: "Waarnemingen 190 · TRA 87 · onderwerpen 98", "Getoetst 15 taken · 11 taakstappen", W09b trends met noemer, W16 momentopname vanaf v1.0, programma 15/32.

**Telefoon** — wint niet. Laatste criticus: verliest op rust (P04 met "Gezien · in orde"-knoppen + toast over de kop, P07d, P04-detail, P07 te vol) en bij de coördinator (~118 tikken voor DAM-C2, acties 7–8 tikken elk); wint nipt bij VGM-coördinator. Overige punten: snelle [C] legt geen maatregel vast; geen route voor waarnemingen buiten de TRA; datumsprong P01 → P01s; drie manieren om een Voorstel te bevestigen; "stap" dubbelzinnig (P07 "stap 2" vs taakstap); Collectief/Individueel ontbreekt in P04-detail; online/offline wisselt in één doorloop; verouderde notes P02/P05; chip "fictief" 12 px.

---

## 7. Beslissingen van Sven (12-11-2026, 15:18) — verwerken

1. **Snelle positieve bevinding:** één tik "Gezien · in orde", daarna een bevestiging van **3 seconden** (aftellend, met ongedaan maken) die de inspecteur met **nog een tik** kan versnellen. Vervangt de huidige toast over de kop in P04. Eén manier van bevestigen in de hele app. (Nog navragen: legt deze tik ook vast welke maatregel gezien is, of alleen het oordeel C op de regel?)
2. **Acties:** actiehouder, termijn en toetser worden **automatisch ingevuld** volgens de vaste regels, zonder aparte bevestiging (doel ≈ 4 tikken per actie). Wel zichtbaar met label "Standaard" en aanpasbaar via een tik. P07d wordt daardoor een samenvatting in plaats van een invulscherm.
3. **Heraudit:** de hercertificering is **behaald**; er is **geen termijn** (geen openstaande bevinding over WPI's). Oranje invulplekken p. 2–3 van het voorstel vervangen: geen CI-termijn, het voorstel is een verbetering, geen correctie. Herformuleer de urgentie daarop.
4. **Account:** Noardling heeft een **Claude Team-account**. Licentieparagraaf/bijlage I aanpassen: geen keuze meer tussen opties maar "gebruik bestaande Team-seats (per persoon, niet delen)"; kostenregel alleen extra seats voor inspecteurs die er nog geen hebben.

Nog open:
5. **Toetsniveau (besluit 23):** taakstappen terug in de TRA's (niet-gegeneraliseerde versies) of taak als niveau accepteren?
6. **Tienwerkdagenregel (besluit 8)** houden of "elke maand waarin gewerkt wordt"?
7. Rol van de trendactie "taakstappen in de TRA's" (TREND-2026-7 in dashboard, fictief).
8. Einddatum proef (invulplek voorstel).

---

## 8. Aanbevolen volgende stappen in Claude Code

1. Pak het pakket uit (zie §9), zet Muli in `~/.fonts`, installeer `python-docx`, `openpyxl`, `playwright` + chromium, LibreOffice, poppler (pdftoppm/pdftotext).
2. Lees `wpi/run/koers2.md`, de laatste secties van `app/ontwerp.md`, dan deze handoff.
3. Verwerk de beslissingen uit §7 (1–2 in `telefoon.py` / `telefoon_p06_p10.py`: P04, P04-detail, P07–P07e; 3–4 in `wpi/build/deel_v4.py` + `kosten.py`, daarna voorstel opnieuw bouwen). Stel de nog open vragen uit §7 alleen als ze een keuze blokkeren.
4. Laat herbeoordelen: telefoon, web, voorstel, dashboard (criticus-prompts volgens §5). Itereer per onderdeel tot "A WINT".
5. Werk de overzichtspagina bij en lever Sven de PDF's.
6. Pas het projectdocument `claude/WPI nieuwe methode - opzet en besluiten.md` in het claude.ai-project "VGM-Projectplan" bij met koers 2 (het staat nog op de oude methode), en werk de skill **wpi-begeleider** bij (hangt nog aan het oude oordeelmodel, afsluitvraag en 14 klassen/oude actieregels).

---

## 9. Inhoud van het pakket (`wpi-handoff.zip`)

```
HANDOFF.md
wpi/run/            brief.md, koers2.md, rapport_ronde*.md, voorstel_ronde*.md, dashboard_ronde*.md, bar/lat.md
wpi/run/data/       voorbeelddata.json (11.1) + vorige versies, kennisbank.json (+v1, controle), vca_7_letterlijk.md, procedure_oud.md
wpi/run/build/      build_rapport.py (+ hulpbestanden)
wpi/run/out/        Voorbeeldrapport .docx/.pdf, Voorstel .docx/.pdf
wpi/run/out/dashboard/  index.v11b.html, app.v11b.js, data11/, test/ (build11.py, check11.py, light/dark.html, edits*)
wpi/build/          voorstel-bron (deel_v4.py, kop_v4.py, samen.py, run_v4.sh, kosten.py, sjabloon*.docx, beeld/, toc*.json, _tpl/)
wpi/kb/             TRA-*.md + WPI-kennisbank-index.md
wpi/scripts/        extractie- en datascripts
app/                brief.md, ontwerp.md, schermen.md, ref/ (stijlvoorbeeld, wpi-begeleider.md)
app/v2/             screens/ (phone, web), notes/, shots/, src/, brief_v2.md
app/tools/          cijfers.py, cijfers.json, overzicht2.py, overzicht_status2.html, lib.py
tools/              render.py, measure.py e.d. (telefoon-render)
uploads/            de 21 bron-TRA's (.xltx) + stijlvoorbeeld
```
Paden in scripts verwijzen naar `/home/claude/...` en `/mnt/user-data/uploads/`. Zet het pakket op dezelfde plekken of pas de paden aan (zoek op `/home/claude/` en `/mnt/user-data/uploads`).
