# Kwaliteitsrapport Werkplekinspectie

Peildatum 13 november 2026 (derde versie, 05:30) · QA-ronde vóór de volgende fase (Supabase live) · opgesteld door de QA-ontwikkelaar.

Dit rapport bundelt vijf controles: toegankelijkheid (axe-core), XSS, publiek bereikbare bestanden, geheimen in de git-geschiedenis en (nieuw) de methoderegels als harde testpoort. Bij elke bevinding staat een concreet herstelvoorstel. Geen van de herstelpunten raakt de methoderegels: het oordeel C/A/V/NVT blijft altijd bij de inspecteur, AI-voorstellen blijven "Voorstel", toetser ≠ actiehouder.

**Stand na de beveiligingsronde (13 november 2026, middag).** Het volledige verslag staat in `beveiligingsrapport.md`. Wat dat aan dit rapport verandert:
- **#5 Invoervalidatie: opgelost.** De database controleert nu ook de fotovelden in een inspectierecord: alleen een pad in de eigen map van de inspecteur (`supabase/migrations/0007_invoer_aanvulling.sql`, `record_fotos_ok`). Daarnaast nieuw: datumgrenzen voor planning en plandatum, geen besturings- of bidi-tekens in vrije tekst, en een uploadquotum voor Storage. De databasetests staan op 529 van 529 (na de aanvalstest: ook tekens, de foto van een actie, snelheid bij 1000 × 1000 en gelijktijdige verzoeken; na de tweede aanvalsronde ook tekens buiten de BMP, `extraFotos`, bewijs niet opnieuw te uploaden en de grootte/rekentijd van een record; zie beveiligingsrapport A1–A22).
- **#7 Publicatie: opgelost.** Netlify, Vercel en Cloudflare Pages publiceren nu alleen `dist/`, gebouwd met een allowlist. `beveiliging.html`, `onderzoek.html` en de andere interne pagina's, de configbestanden, `docs/`, `tests/`, `supabase/`, `tools/`, `*.md`, `*.sql`, `*.py`, `*.sh`, `.env` en `.git` komen daar nooit in. `tests/exposed.js --config` voert de build echt uit (met lokaasbestanden) en controleert ook dat de CSP in alle vier de bronnen gelijk is. De tabel in §3 hieronder beschrijft de oude toestand.
- **#8 CSP: opgelost** (CSP-fase): `script-src 'self'`, `script-src-attr 'none'` en het exacte project-adres in plaats van `*.supabase.co`. Nog open: `style-src 'unsafe-inline'`.
- **Nieuwe testpoort `tests/security.js`** (in `run-all.js`). Die controleert:
  - dat de CSP echt wordt afgedwongen (geïnjecteerde handlers en scripts worden geblokkeerd);
  - dat er na het doorlopen van alle schermen geen inline handlers in de DOM staan;
  - dat de productiemodus geen voorbeeld-login of voorbeelddata heeft;
  - de uploadkeuring (type en grootte);
  - de invoergrenzen gelijk aan de server;
  - een XSS-payload in elk tekstveld.
- **Nieuw: `tools/periodieke_check.sh`** voor de maandelijkse controle, met de checklist in `beveiliging-periodiek.md`.

**Wat is er veranderd sinds de tweede versie (03:45).** Reviewers vonden vijf gaten in de controles zelf; alle vijf zijn gedicht en met sabotage in kopieën aangetoond:
- **De a11y-poort was niet zonder marge voor de eigen controle `klik-zonder-toetsenbord`.** De nulmeting telde per selector, niet per element, en de eigen controle maakt geen unieke selectors (klasse + de eerste 28 tekens van de `onclick`). Rijen met dezelfde selector telden als één: van de 167 klikbare elementen zag de poort er maar 104. Drie extra klikbare rijen in de productkiezer bleven zo onopgemerkt. De vorige versie van dit rapport beweerde ten onrechte "één nieuw element is genoeg" en "167 elementen". Nu telt de poort elk element (formaat 3, met een interne controle dat de nulmeting evenveel elementen telt als er gevonden zijn), en ook **minder** elementen dan de nulmeting maakt de poort rood (zie §2).
- **De scenariotests controleerden de methoderegels niet.** Ze schreven de uitkomst alleen naar het log; run-all gaf PASS zolang er geen pageerror was. Een reviewer liet "Akkoord na toetsing" de status `Open` geven en haalde het QHSE-filter weg: 5 PASS. Nieuw is `tests/methode.js` met harde asserties op alle methoderegels; `e2e`, `meld`, `plan`, `mont` en `kw` controleren nu ook hun kernuitkomst (zie §5 en §6).
- **De secret-scanner kon de geschiedenis laten verbergen:** door `git replace` (een commit met een token vervangen door een schone), door `git config log.showRoot false` (de diff van de eerste commit verdwijnt) en hij scande de auteur- en committernaam en -e-mail niet. Alle drie hersteld, plus de verwante gaten grafts, `log.abbrevCommit`, `mailmap.file`, `diff.noprefix` en extra commit-kopregels (zie §4).
- Twee onjuistheden in dit rapport: de verdeling van de binaire objecten telde op tot 224 (het aantal "Binary files"-regels), niet tot de 221 unieke objecten; en de lijst `<option value="${u.id}">` zonder `esc()` miste `planning.js` (programmavoorstel). Beide verbeterd.

**Wat is er veranderd sinds de eerste versie (02:29).** De twee XSS-lekken die toen bovenaan stonden (X1 monteursnaam, X2 modal "Er loopt nog een inspectie") zijn om 02:50 door een andere ontwikkelaar in `js/inspectie.js` opgelost. `xss.js` slaagt nu. De a11y-poort liet bij een bestaande regel × scherm tot 2 nieuwe critical/serious-elementen door; die werkt nu zonder marge. De secret-scanner sloeg tag-objecten, binaire bestanden, `.git/config` en een aantal schrijfwijzen over; die worden nu ook gescand. Alle getallen hieronder komen uit runs van na deze wijzigingen.

## In één oogopslag

| # | Prioriteit | Onderwerp | Bevinding | Herstel (kort) |
|---|---|---|---|---|
| 1 | **Hoog** | Toegankelijkheid | Formuliervelden zonder gekoppeld label (actiehouder, toetser, plandatum, product, inspecteur, filters) | `<label for>` in de `veld()`-helpers |
| 2 | **Hoog** | Toegankelijkheid | 167 klikbare `div`/`tr`/`g` zonder toetsenbordbediening, o.a. de voorbeeld-login (nu alle 167 in de poort, was 104) | `<button>` of event-delegatie met `role="button"` + `tabindex` |
| 3 | Middel (in zonmodus: **Hoog**) | Toegankelijkheid | Kleurcontrast `--soft`, tabbalk en `--warm-ink` onder 4,5:1 (699 elementen). Ook in **zonmodus**: inactieve tabs `#B2A797` op wit = 2,36:1 | drie kleurtokens iets donkerder + `body.zon .tabbar a` |
| 4 | Middel | XSS (preventief) | Geen lek meer gevonden (10 payloads × 27 bronnen, ook inlogscherm). Wel: `esc()` escapet `'` nog steeds niet, en 3 handlers zetten `esc(x)` met kennisbankdata tussen enkele aanhalingstekens (plus 2 met een intern gegenereerd id). Nu alleen met vaste data, dus niet uitbuitbaar; bij de eerstvolgende handler met gebruikerstekst wel | `esc()` ook `'` + die 3 plekken naar `esc(JSON.stringify(x))` |
| 5 | Middel | Invoervalidatie | `handtekening` en `waarnemingen[].foto`: de weergave is veilig (`esc()` + `WPI.fotoSrc()`), maar de database controleert deze velden nog niet | validatie ook in de database-trigger |
| 6 | Middel | Toegankelijkheid | Modal zonder dialoogsemantiek, focus, Escape; "×" zonder naam | `openModal`/`closeModal` in `kern.js` aanpassen |
| 7 | Middel | Publicatie | Losse pagina's (`beveiliging.html`, `onderzoek.html`, …) en configbestanden zijn na deploy bereikbaar | allowlist-publicatie of extra 404-regels |
| 8 | Laag | CSP | `script-src 'unsafe-inline'` en `*.supabase.co` | na punt 2 inline handlers weg; exact projectadres |
| 9 | Laag | Methoderegels (app) | `maakActie` (nieuwe actie, `acties.js`) controleert niet dat de actiehouder geen QHSE-manager is; `stelIn` doet dat wel. In de keuzelijst staat de QHSE-manager niet, dus alleen bereikbaar met aangepaste HTML | dezelfde regel als in `stelIn` toevoegen, plus de databasecontrole (§5) |
| 10 | Info | Geheimen | 0 echte geheimen: 42 commits, 126 reflog-regels, 221 binaire objecten uitgelezen (220 uit de geschiedenis, 1 in de werkmap) | `secret_scan.sh --streng` in CI/pre-commit (§4) |

Alle scenariotests slagen, ook de nieuwe methodetest `methode.js` (40 controles), net als de rooktests, de toegankelijkheidspoort en `xss.js` (zie §6).

---

## 1. XSS (tests/xss.js)

### Methode

- 10 payloads: `<img src=x onerror=…>`, `"><svg onload=…>`, `x' onmouseover='…`, `x" onmouseover="…`, `');…;//`, `");…;//`, `javascript:…`, `</textarea><script>…</script>`, `<details open ontoggle=…>` en `<iframe srcdoc=…>`. Elke payload zet `window.__xss = <veldnummer>`, zodat elke treffer naar het veld wijst.
- 20 invoervelden in de voorbeeldmodus, alle gevuld bij elke payload: planning (`pl-project`, `pl-loc`, `pl-toel`, plus een tweede planning in het verleden), inspectie (`f-taak`, `f-zie`, `f-actie`, `nieuwe-monteur`, `f-gesprek`, `f-positief`), acties (`na-tekst`, `na-aanl`, `ai-tekst`, `ai-reden` bij vervallen en bij niet akkoord), zoekvelden (`zq`, `zoek`) en beheer (`bh-nieuw`, `bh-hernoem`).
- Daarnaast 5 velden zonder invoerveld die wél via de REST-API in een record kunnen komen: `handtekening`, `waarnemingen[].foto` (ook als `acties.foto`), de tekstvelden van het record, de actie-log en `monteurs`. De test schrijft die rechtstreeks in IndexedDB, net zoals `sync.js` ze na een pull wegschrijft.
- En 2 velden uit Supabase-profielen: `profiles.full_name` en `profiles.functie`. `auth.js` zet die ongefilterd in `WPI.USERS`. De test vult `USERS` op dezelfde manier, voor alle vier de accounts (ook het Hoofd S&M). Totaal: 27 bronnen, bij alle 10 payloads alle 27 gevuld.
- Na elke weergave controleert de test of `window.__xss` gezet is. Daarnaast zoekt hij naar geïnjecteerde handlers (`onerror`, `onload`, `onmouseover`, `ontoggle`, …), naar JS-uitbraak uit bestaande `onclick`-handlers (code buiten een stringliteral), en naar `javascript:`-links, `<script>`, `<iframe>`, `<object>`, `<embed>` en `<img src=x>`. Geïnjecteerde handlers worden ook echt afgevuurd, als bewijs dat ze uitvoerbaar zijn.
- Getoonde schermen: planning, plan-modal (nieuw en wijzigen), Vandaag (gepland, lopende inspectie, acties), alle inspectiestappen, controle-modal, "Er loopt nog een inspectie", "Vastgelegd", de acties-lijsten (in te stellen, gepland, alle, te laat, plus de alertbalk), actie-modals (voorstel, open, actiehouder, verloop na vervallen of niet akkoord), meldingen, zoeken, product kiezen, inspecties (ook met monteur-filter), rapport en beheer. Op de computer (1440): Vandaag, planning, inspecties, dashboard, kwartaal, de acties-tabel, rapport en meldingen.
- Daarna twee keer de volledige ronde opnieuw: eerst **na herladen** (alles uit IndexedDB/localStorage) en daarna **met de Supabase-profielnamen**. Elke ronde begint nu met het **inlogscherm** (uitloggen, dan de accountlijst met naam en functie uit `USERS`). Daarna: Vandaag, planning, plan-modal, inspecties, acties (in te stellen, alle, te laat), vier actie-modals, nieuwe actie, meldingen, account, zoeken, élk opgeslagen rapport, op 1440 ook Vandaag, planning, inspecties, dashboard, kwartaal, acties-tabel en rapport, en als hoofd Beheer en de monteurslijst in een nieuwe inspectie. Elk onderdeel draait apart: als één stap mislukt, gaat de rest door en telt de mislukte stap als fout.
- Apart van XSS meldt de test **invoervalidatie**: gebruikersinvoer die ongevalideerd in een `<img src>` terechtkomt. Dat is geen scriptuitvoering, dus het telt niet als XSS-fout; `XSS_SRC_STRIKT=1` maakt er een fout van.

**Gat gedicht: het inlogscherm.** In de vorige versie werd het inlogscherm na het injecteren van de profielgegevens nooit meer getoond. Een reviewer haalde in een kopie van de app `esc()` weg bij `u.functie` in `view_login` (`kern.js`), en `xss.js` vond niets. Nu wel: dezelfde sabotage in een eigen kopie (`/tmp/claude-0/tests/sab-xss`, payloads 1 en 4) geeft vier treffers op `login (Supabase-profielen)` (uitgevoerd bij tonen, `<img src=x>`, handler `onerror`) en exitcode 1. De andere drie sabotages van de reviewer (`esc()` weg bij `r.titel` in de inspectielijst, bij `r.gesprek` in het rapport en bij de `title` met `full_name` in de bovenbalk) werden al gevonden.

### Resultaat

Volledige run op de echte app, 13 november (10 payloads × 27 bronnen, alle 27 gevuld bij elke payload): **geen enkele payload uitgevoerd of als HTML/handler ingevoegd**, ook niet na herladen, niet via profielnamen en niet op het inlogscherm. Het blok "Invoervalidatie" is leeg. `xss.js` eindigt met `errs []` en exitcode 0.

De twee lekken uit de eerste versie zijn opgelost (`js/inspectie.js`, 13 november 02:50, door een andere ontwikkelaar):
- **X1 (was Hoog) · monteursnaam → `togMonteur`.** Het attribuut stond tussen enkele aanhalingstekens (`onclick='App.togMonteur(${esc(JSON.stringify(n))})'`), en `esc()` escapet `'` niet. Nu staat het tussen dubbele aanhalingstekens (`onclick="…"`), en `"` wordt wél geëscapet.
- **X2 (was Hoog) · project/locatie → modal "Er loopt nog een inspectie".** De knop zet geen planningstekst meer in het attribuut: de keuze wacht in `App._nieuweStart`.
- **X3 (was Hoog) · `src` van foto's en handtekening.** Was al opgelost in de weergave (`esc(WPI.fotoSrc(…))`). De server-validatie staat nog open (herstel 2).

### Wat nog openstaat (preventief, Middel)

De oorzaak van X1 bestaat nog: `esc()` in `js/kern.js` escapet `&`, `<`, `>` en `"`, maar niet `'`. Elke handler waarin iemand straks gebruikerstekst tussen enkele aanhalingstekens zet, is direct weer een lek. Er staan er nu vijf, die op dit moment geen gebruikerstekst krijgen (`grep -nE "'\$\{esc\(" webapp/js/*.js`):
- `dashboard.js:60` en `:177`: `App.setFilter('klasse','${esc(k).replace(/'/g, "\\'")}')`. De klasse komt uit de kennisbank (`data/`).
- `vandaag.js:99`: `App.startInspectie('${code}','spontaan','${esc(kb[code].naam)}')`. Ook uit de kennisbank.
- `sync.js:987` en `:988`: `App.syncConflictToepassen('${esc(c.cid)}')` en `App.syncConflictWeg(…)`. De `cid` maakt de app zelf (base36-tijd + willekeurig), dus alleen `[0-9a-z]`; wel hetzelfde patroon.

Zodra de kennisbank met Supabase uit de database komt en een beheerder die kan wijzigen, worden dit echte lekken.

### Herstel (volgende fase)

1. **`esc()` ook `'` laten escapen, en de drie plekken hierboven in dezelfde wijziging aanpassen:**
   ```js
   const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
   ```
   Let op: in een handler decodeert de HTML-parser `&#39;` weer naar `'`. Op de drie plekken waar `esc(x)` nu binnen een JS-string tussen enkele aanhalingstekens staat, zou die `'` de string afsluiten. Vervang ze daarom door `${esc(JSON.stringify(x))}` zonder eigen quotes, in een attribuut met dubbele aanhalingstekens (zoals nu bij `togMonteur`). Draai daarna `node webapp/tests/run-all.js --extra`.
2. **Foto-bronnen ook op de server valideren (rest van X3):** voeg in de database (`0002_functies_validatie.sql`, trigger op `inspecties`) toe dat `record->>'handtekening'` en elke `waarnemingen[*].foto` null zijn of het fotopad-patroon volgen, zoals al bij `acties.foto_pad`. Laat `sync.js` → `padenNaarFotos` bij een ongeldige waarde `null` opslaan.
3. **Structureel (ook nodig voor CSP en toegankelijkheid):** vervang de inline `onclick="App.x('…')"` door event-delegatie (`data-actie="togMonteur" data-arg="…"` en één listener op `#app`/`#ov`). Daarna kan `'unsafe-inline'` uit `script-src`, zodat zelfs een gemist escape-punt geen script meer uitvoert. Overweeg daarna `require-trusted-types-for 'script'`.
4. **Kleine robuustheid:** zet `esc()` ook om `u.id` in `<option value="${u.id}">`: vier plekken, `planning.js:38` (plan-modal), `planning.js:243` (inspecteurkeuze in het programmavoorstel), `acties.js:86` en `:113`. De database dwingt een uuid af, maar de weergave hoort daar niet op te leunen. `vsPick(onclick, titel, sub, waarom)` (`inspectie.js`) verwacht al ge-escapete `titel` en `waarom`: documenteer dat, of escape binnen de functie. Pas `exportCSV` aan zodra die gebruikersdata exporteert: zet `'` vóór waarden die met `= + - @` beginnen (CSV-formule-injectie).

Niet gedekt: de loginvelden van de echte modus (`l-mail`, `l-ww`, `v-mail`, `n-ww`, `n-ww2`, `m-code`; die test `sync.js` functioneel), getalvelden (`pl-mont`, `bh-doel-in`) en datumvelden. Profiel-`id` en `role` zijn niet met payloads getest: de database dwingt daar een uuid en een vaste rollenlijst af.

---

## 2. Toegankelijkheid (tests/a11y.js)

Gescand met axe-core 4.14.0 (WCAG 2.0/2.1/2.2 A+AA en best practice) op 30 schermen × 2 breedtes (390 en 1440): login, Vandaag, planning, plan-modal, inspecties, acties, actie-modal (voorstel en open), nieuwe actie, meldingen, zoeken, account, weergave, product kiezen, dashboard, kwartaal, alle inspectiestappen (taak, zie, koppel, oordeel, actie, meer, algemeen, monteurs, klaar, controle), rapport, beheer, en Vandaag en "zie" in zon- en veldmodus. Daarnaast eigen controles: klikbare elementen zonder toetsenbordbediening, en modals (rol, focus, Escape, sluitknop).

Resultaat (13 november 05:05, met vaste browserdatum, zie hieronder): 13 regels geschonden (8 van axe, 5 eigen controles), waarvan 6 critical/serious, samen 1718 elementen. De aantallen elementen hieronder komen uit de nulmeting van 05:05 (de vorige van 03:45 telde elementen met dezelfde selector als één, zie "Derde herziening"). Sinds 03:45 hebben andere ontwikkelaars een deel opgelost: `color-contrast` 714 → 699 (o.a. de meldingen en de stappenbalk in de actie-modal) en `region` 656 → 618 (het beheerscherm staat nu in een landmark). Bij herhaling zijn ze exact gelijk (zie "Stabiliteit"); ze veranderen alleen als de app verandert. Andere ontwikkelaars passen de app nog aan, dus kleine verschillen met eerdere versies van dit rapport zijn echte wijzigingen (bijv. `color-contrast` 712 → 714 en `region` 650 → 656 door de nieuwe actie-modal, `sluitknop-zonder-naam` 20 → 16 omdat die modal nu een benoemde sluitknop heeft).

### Regressiepoort (twee keer herzien)

**Wat er mis was.** De eerste poort vergeleek per regel × scherm alleen het **aantal** elementen, met een marge van max(2, 10%) om ruis door datums in de voorbeelddata op te vangen. Een reviewer voegde in een kopie van de app twee velden zonder label (`#sab1`, `#sab2`) aan de plan-modal toe: critical `label` op `plan-modal` ging van 1 naar 3 elementen, en de poort bleef groen. Op elk scherm dat een regel al had, kwamen zo tot 2 nieuwe critical/serious-elementen ongezien door (`label`, `select-name`, `color-contrast`, `klik-zonder-toetsenbord`, …).

**Derde herziening (05:05): wat er na de tweede nog mis was.**
- *Elementen met dezelfde selector telden als één.* axe-core geeft elk element een unieke selector, maar de eigen controle `klik-zonder-toetsenbord` niet: die gebruikt de klasse plus de eerste 28 tekens van de `onclick` (bijv. `div.row.prodrij[onclick^="App.closeModal();App.startIn"]` voor alle 21 rijen van de productkiezer). De nulmeting hield per regel de selectors bij als een verzameling per scherm en telde daarna per vorm het aantal *selectors*. Zo zag de poort van de 167 klikbare elementen er maar 104. Een reviewer voegde drie klikbare rijen zonder toetsenbordbediening toe (167 → 173 elementen, +6 serious): geen klik-regressie. De poort werd alleen rood door een toevallige moderate `region`-melding voor de nieuwe tekst.
- *"Verdwenen" was een stille marge.* Minder elementen dan de nulmeting werd alleen gemeld. Bij de run van de reviewer waren al 7 vormen verdwenen (bijv. `color-contrast` op `ins-actie@390`, `li:nth-child(n) > .n`, 2 → 0). Daardoor konden evenveel elementen ongemerkt terugkomen; dit rapport noemde dat niet.

**Hoe het nu werkt.**
- De nulmeting (`tests/a11y-baseline.json`, formaat 3) bewaart per regel × scherm de **selectors**, genormaliseerd tot een "vorm" (`:nth-child(3)` → `:nth-child(n)`, lange getallen zoals `ACT-1731…` → `#`), met per vorm het aantal **elementen**: elk element telt, ook als meerdere elementen dezelfde selector hebben (21 rijen in de productkiezer = 21). Een interne controle laat de run falen als de nulmeting niet precies evenveel elementen telt als er gevonden zijn. Nu: 336 combinaties regel × scherm, 1306 vormen, 1718 elementen (waarvan alle 167 van `klik-zonder-toetsenbord`). Een nulmeting in het oude formaat wordt geweigerd.
- Regressie (exitcode 1) is: een nieuwe combinatie regel × scherm, een **nieuwe vorm** (bijv. `#sab1`), of **meer elementen** van een bestaande vorm (bijv. een extra klikbare rij of een extra `select:nth-child(n)` zonder naam). Eén nieuw element is genoeg. De uitvoer noemt regel, ernst, scherm en selector.
- **Ook andersom rood:** minder elementen van een vorm dan de nulmeting ("verdwenen") laat de poort ook falen, met de melding "nulmeting te ruim … aanscherpen met `A11Y_BASELINE=bijwerken`". Zo heeft de poort in geen enkele richting marge: na elke verbetering wordt de nulmeting strakker (een ratel). Wie dat tijdelijk niet wil (bijv. tijdens parallel werk aan meerdere schermen), zet bewust `A11Y_VERDWENEN=toestaan`; de uitvoer meldt dan dat de poort op dat moment marge heeft.
- Dat kan zonder vals alarm omdat de meting nu **deterministisch** is: de browserklok start op een vaste datum (`A11Y_DATUM`, standaard vrijdag 13-11-2026 10:00 Amsterdam; daarna loopt de klok gewoon door), tijdzone en locale zijn vast (`Europe/Amsterdam`, `nl-NL`), en vóór elke scan wacht de test tot eindige CSS-animaties en -overgangen klaar zijn. De voorbeelddata hangen van "vandaag" af (`WPI.plusDagen`); met een vaste datum zijn agenda, te-laat-acties en kwartaal elke dag gelijk. Een nulmeting met een andere klok wordt geweigerd.
- Elke stap heeft een time-out (30 s opzetten, 60 s axe): één vastgelopen scherm wordt een fout, de run hangt niet.
- Bijwerken (`A11Y_BASELINE=bijwerken`) weigert als de scan zelf fouten had. Commit `tests/a11y-baseline.json` mee.

**Bewijs derde herziening (05:10, sabotage in kopieën van de huidige app, nulmeting van 05:05):**
- Ongewijzigd: exitcode 0, "nieuw: geen · nieuwe of extra elementen: geen · verdwenen: geen".
- Drie extra klikbare rijen in de productkiezer (dezelfde sabotage als de reviewer): exitcode 1 met `[serious] klik-zonder-toetsenbord|product-kiezen-modal@390: meer elementen (21→24)` en hetzelfde op `@1440` (plus de moderate `region`-meldingen voor de nieuwe tekst).
- Productrijen wél toetsenbordbedienbaar gemaakt (`role="button" tabindex="0"`), een verbetering: exitcode 1 met "nulmeting te ruim: 44 vorm(en) …" (klik 21 → 0 per breedte; door de nieuwe rol veranderen ook de `region`-selectors). Na `A11Y_BASELINE=bijwerken` is de poort weer groen, op het nieuwe, strengere niveau.
- Bij het maken van de nieuwe nulmeting is eerst nagegaan dat er niets ongemerkt in kwam: vergeleken met de nulmeting van 03:45 is er geen enkele nieuwe vorm; alleen de 6 vormen van `klik-zonder-toetsenbord` met gelijke selectors tellen nu hoger (samen +63 elementen, 104 → 167), en 35 vormen zijn verdwenen door verbeteringen van anderen.

**Bewijs (sabotage, los van de wijzigingen van anderen).** Twee kopieën van de app van hetzelfde moment: een ongewijzigde (`/tmp/claude-0/tests/pristine`) en een kopie met sabotage (`/tmp/claude-0/tests/sab-a11y`). In de sabotagekopie zijn in de plan-modal toegevoegd: de twee velden van de reviewer (`#sab1`, `#sab2`), één veld zonder id en een grijze tekst (`#cfcfcf`) met te weinig contrast. De nulmeting is gemaakt op de ongewijzigde kopie.
- Sabotagekopie: **exitcode 1**, met precies de ingebrachte fouten: critical `label` op `plan-modal@390` en `@1440` voor `#sab1`, `#sab2` en `div:nth-child(n) > input` (3 per breedte), serious `color-contrast` voor de grijze span (1 per breedte), plus de bijbehorende moderate `region`-meldingen. Niets anders.
- Ongewijzigde kopie, twee keer opnieuw: **exitcode 0**, "nieuw: geen · nieuwe of extra elementen: geen · verdwenen: geen". Die twee runs liepen tegelijk met een volledige `xss.js`-run (CPU onder belasting).

**Waarom de oude nulmeting "verdwenen: color-contrast|ins-koppel@390" meldde.** Dat was geen ruis maar een echte verandering in de app. In de resultaten van vóór 02:19 staan op het koppel-scherm twee kaarten `.pick[onclick="App.kiesRegel('DAM-1.01')"] > .s` met contrast 3,44:1. Een andere ontwikkelaar heeft dat scherm daarna omgebouwd (Voorstel-kaart met `.vpick`, `ins_koppel` in `inspectie.js`), en die kaarten bestaan niet meer. De nulmeting was dus verouderd, niet instabiel. Een losse controle (6 keer alleen het koppel-scherm) gaf 6 keer 0 contrastfouten.

**Stabiliteit.** Op een vaste kopie van de app gaf elke herhaling exact dezelfde meting: tot op de selector, ook onder CPU-belasting (zie hierboven). Op de live werkmap gaf de herhaling direct na de nulmeting (03:31) ook 0 verschillen. De twee runs daarna (03:35 en 03:39) werden rood. Dat kwam niet door ruis maar door echte wijzigingen van andere ontwikkelaars, die op dat moment `js/inspectie.js` en `styles.css` aanpasten (actie-modal opnieuw opgebouwd met `.aw-kop`/`.aw-blok`, actiestap met nieuwe keuzevlakken). De poort meldde die per selector, inclusief één echte nieuwe serious-bevinding (A9 hieronder). Zo hoort de poort te werken. Wie het scherm bewust verandert, legt de nieuwe stand vast met `A11Y_BASELINE=bijwerken`. De nulmeting in de repository is aan het eind van deze ronde opnieuw gemaakt (zie §6).

### Prioriteit 1 (critical/serious, raakt bediening)

**A1 · Velden zonder label (critical: `select-name` 19×, `label` 8×).**
`#ai-houder`, `#ai-toetser`, `#ai-plan`, `#ai-tekst` (actie-modals), `#pl-code`, `#pl-insp`, `#pl-datum` (plan-modal), de twee filters op Inspecties (`.filtersel`) en drie op het Dashboard. De oorzaak is de helper `veld(lab, inner)` in `acties.js` en `planning.js`: die zet `<label class="flab">` neer zonder `for`.
*Herstel:* `veld(lab, inner, id)` → `<label class="flab" for="${id}">`. Geef de filterselects een `aria-label` ("Filter op inspecteur", "Filter op monteur", "Product", "Locatie", "Periode").

**A2 · Klikbaar maar niet met het toetsenbord (167 elementen, 34 schermen; vóór 05:05 zag de poort er maar 104 van, zie "Derde herziening").**
`div.row` (de voorbeeld-login!, zoekresultaten, meldingen, product kiezen, acties in het rapport), de alertbalk `#alert`, `tr` in de acties-tabel, `div.tile` en `g`/`path` in de dashboardgrafieken. Iemand met toetsenbord, schakelaar of spraakbediening kan hier niets mee. Op de loginpagina kan zo iemand niet eens inloggen.
*Herstel:* gebruik een `<button>`. Waar dat niet kan (`tr`, `g`): `role="button" tabindex="0"` plus een keydown-handler voor Enter en Spatie. Combineer dit met de event-delegatie uit XSS-herstel 3: één listener die click en keydown afhandelt.

**A3 · Kleurcontrast (serious, 699 elementen op 53 schermen).**

| Kleur | Waar | Contrast | Voorstel | Nieuw contrast |
|---|---|---|---|---|
| `--soft #8B7F72` op wit | `.s`, `.muted`, `.chip`, labels, kaart-subregels | 3,9:1 | `#73685C` | 5,4:1 |
| `--soft` op crème `#FAF6EF` | `.kicker`, `.hi`, `.brand` | 3,6:1 | `#73685C` | 5,1:1 |
| tabbalk `#B2A797` op wit | inactieve tabs (`.tabbar a`), **ook in zonmodus** | 2,36:1 | `#73685C` (actief blijft accent) | 5,4:1 |
| `--warm-ink #A3610F` op `#FCEBD3` | `.dchip.warm`, badge `b-todo` ("te laat") | 4,2:1 | `#8F540C` | 5,2:1 |

Het blijft dezelfde warme bruingrijze en oranje toon (stijl B). Het oranje blijft alleen voor "te laat".

**Zonmodus (de hoogcontrastmodus voor buiten) haalt het contrast niet overal.** Op `vandaag-zonmodus` (390 en 1440) zijn de inactieve tabs in de tabbalk `#B2A797` op wit: 2,36:1, ruim onder 4,5:1. Oorzaak: `styles.css` regel 264 zet `.tabbar a{color:#B2A797}` als vaste kleur, en er is geen `body.zon`-override (zonmodus maakt alleen `--soft` donker). Juist in fel zonlicht is dit de navigatie.
*Herstel:* `body.zon .tabbar a{color:#141A22}` en voor de actieve tab `body.zon .tabbar a.on{color:var(--accent);box-shadow:inset 0 3px 0 var(--accent)}`, zodat actief niet alleen aan kleur te herkennen is.

**A4 · Naam komt niet overeen met de zichtbare tekst (serious, 88× op 58 schermen).**
De bel heeft `aria-label="Meldingen"`, maar laat het getal zien. "Wijzig" heeft `aria-label="Wijzigen"`.
*Herstel:* bel: `aria-label="Meldingen, 3 ongelezen"` (bijwerken in `checkMeldingen`) met het getal `aria-hidden`. "Wijzig": laat het aria-label weg of begin het met de zichtbare tekst ("Wijzig planning DAM 14 nov").

**A5 · Schakelaars zonder naam (serious, Weergave-modal, 2× per breedte).**
`<span class="sw" role="switch">` staat in een `<button>`.
*Herstel:* zet `role="switch" aria-checked` op de `<button>` zelf, en geef de span `aria-hidden="true"`.

**A9 · Tijdelijk, inmiddels opgelost: te kleine tikdoelen in de actiestap (serious, `target-size`, WCAG 2.2, `ins-actie@390`).** Gevonden door de poort in de runs van 03:35 en 03:39, ingebracht door de herbouw van de actiestap. Om 03:45 stond `.kvlak{min-height:60px}` (veldmodus 72 px) in `styles.css`, en de nulmeting van 03:45 heeft geen `target-size` meer. Ter informatie, omdat het laat zien wat de poort vangt: De keuzevlakken voor prioriteit ("Direct", "Planmatig") en "ter plaatse" ("Niets gedaan", "Direct gecorrigeerd") (`.kvlakken > .kvlak`, `App.zetActie(...)`) waren op de telefoon toen maar 23 px hoog. Dat is onder de WCAG-ondergrens van 24 px, en ver onder de 44–48 px die de app elders aanhoudt voor werken met handschoenen (veldmodus).
*Stand nu:* opgelost. Houd bij nieuwe keuzevlakken minimaal 48 px aan (veldmodus groter).

### Prioriteit 2 (moderate)

**A6 · Modal (alle 10 modals).** Geen `role="dialog"`/`aria-modal` (20×), de focus blijft achter de modal (17×), Escape sluit niet (20×), de "×" heeft geen naam (16×; de nieuwe actie-modal heeft er al wel een) en de achtergrond blijft bedienbaar.
*Herstel* in `openModal`/`closeModal` (`kern.js`): `#mod` krijgt `role="dialog" aria-modal="true" aria-labelledby="mod-titel"`. Bij openen: `#app.inert = true`, de laatst gefocuste knop onthouden en het eerste veld of de eerste knop focussen. Escape roept `closeModal()` aan. Bij sluiten: `inert` eraf en de focus terug. De "×" krijgt `aria-label="Sluiten"`.

**A7 · Landmarks (`region` 618×, `landmark-one-main` 40×).**
*Herstel* in `index.html`: `<header class="topbar">`, `<main class="view" id="view">`, `<nav class="tabbar" id="tabbar" aria-label="Hoofdmenu">`. De alertbalk mag `role="alert"` houden.

**A8 · Kopniveaus (`heading-order` 2×).** Dashboard en Kwartaal springen van `h1` naar `h3`.
*Herstel:* gebruik `h2` voor de kaarttitels (CSS ongewijzigd via de klasse).

Positief: zoomen is niet geblokkeerd (geen `maximum-scale`), `target-size` (WCAG 2.2) geeft geen overtredingen, de microfoonknop is ook met het toetsenbord te bedienen en de inspectieschermen in zonmodus halen het contrast (de tabbalk in zonmodus niet, zie A3).

---

## 3. Publiek bereikbare bestanden (tests/exposed.js)

### Lokaal / elke host zonder regels (gemeten op `python3 -m http.server`)

Alles in `webapp/` is bereikbaar. Dat geldt ook voor gevoelige bestanden (30): `supabase/` (alle migraties met RLS-regels en functies, `schema.sql`, `seed.sql`, de RLS-tests en `bouw-schema.sh`) en `tests/`. Verder: `docs/` (onderzoek, `beveiliging-checklist-ruw.md`), maplijsten van `/docs/`, `/tests/`, `/supabase/`, `/js/` en `/data/`, de losse pagina's en de configbestanden. `/.git/` valt buiten de publicatiemap (`webapp/`) en is niet bereikbaar.

### Na deploy (statische controle van `netlify.toml` en `vercel.json`)

| Pad | Vercel | Netlify |
|---|---|---|
| `/docs/*`, `/tests/*`, `/supabase/*`, `*.md` (ook diep) | 404 | verwijderd in build |
| `/beveiliging.html`, `/onderzoek.html`, `/verbeter.html`, `/gauntlet.html`, `/design-vandaag.html` | **bereikbaar** | **bereikbaar** |
| `/netlify.toml`, `/vercel.json`, `/_headers` | **bereikbaar** | **bereikbaar** (Netlify verwerkt `_headers`; controleer na deploy) |

`beveiliging.html` beschrijft de beveiligingsopzet (service_role, wachtwoordbeleid). `onderzoek.html` en `design-vandaag.html` (157 KB) zijn interne werkpagina's. Ze zijn geen geheim, maar horen niet op de productie-URL.

### Herstel

1. **Allowlist in plaats van blocklist:** publiceer alleen wat de app nodig heeft. Gebruik een build-stap die `index.html`, `styles.css`, `css/`, `js/`, `data/`, de iconen, `manifest.json` en `sw.js` naar `dist/` kopieert, en zet de publicatiemap op `dist`. Nieuwe interne bestanden kunnen dan nooit meer per ongeluk online komen.
2. Tot die tijd: zet `beveiliging.html onderzoek.html verbeter.html gauntlet.html design-vandaag.html` in de `rm`-opdracht van `netlify.toml`, voeg in `vercel.json` een 404-route toe voor die pagina's en voor `/(netlify\.toml|vercel\.json|_headers)`, en verplaats ze bij voorkeur naar `docs/`.
3. **Headers na deploy controleren:** `node webapp/tests/exposed.js --alles https://<productie-url> --strict`. Dit controleert de bereikbaarheid en HSTS (≥ 180 dagen), CSP (`unsafe-inline`, wildcard, `frame-ancestors`, `object-src`, `base-uri`), `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, server-versie-informatie, `Cache-Control` op `index.html`/`sw.js` en de http→https-redirect. De functies `probeExposed`, `checkHeaders` en `configCheck` zijn ook als module te gebruiken in een deploy-pipeline. Er staan nog twee open TODO's: `'unsafe-inline'` (zie XSS-herstel 3) en `https://*.supabase.co` (vervangen door het exacte project-adres).

---

## 4. Geheimen in de git-geschiedenis (tools/secret_scan.sh)

### Wat de tweede versie nog miste (hersteld in de derde)

Een reviewer liet zien dat de geschiedenis voor de scanner te verbergen was, zonder iets uit de repository te verwijderen:
- (e) **`git replace`.** Commit B voegt een `ghp_`-token toe, commit C haalt hem weg; `git replace B <schone commit>` laat `git log` de schone commit tonen. De scanner meldde "0 vondsten" en exitcode 0, ook met `--onbereikbaar`.
- (f) **`git config log.showRoot false`.** Dan toont `git log -p` de diff van de eerste commit niet; een token dat in de eerste commit stond, werd niet gevonden.
- (g) **Auteur en committer** (naam en e-mail) werden niet gescand; een token in `GIT_AUTHOR_NAME` werd gemist.

Hersteld: alle git-aanroepen draaien nu met `--no-replace-objects` (ook via `GIT_NO_REPLACE_OBJECTS=1`, zodat ook `git cat-file` voor de binaire objecten en `git fsck` de vervanging negeren) en `GIT_GRAFT_FILE=/dev/null` (een grafts-bestand kan een commit op dezelfde manier overslaan). Config die de uitvoer verandert, wordt per aanroep overschreven: `log.showRoot=true` (plus `--root`), `log.abbrevCommit=false` (anders werden de commitberichten niet meer herkend), `log.mailmap=false`/`--no-mailmap` (een `mailmap.file` buiten de repo kan de auteursnaam herschrijven), `diff.noprefix`/`mnemonicPrefix`/`relative`, `log.showSignature`, `log.decorate` en `i18n.logOutputEncoding`. De log gebruikt nu `--format=raw`: dat toont álle kopregels van een commit (author, committer, encoding, mergetag, gpgsig en zelfgemaakte extra kopregels), en die worden allemaal gescand, met als plek `(auteur)`, `(committer)` of `(commitkop)`. Heeft een repository vervangende objecten, een grafts-bestand of een onvolledige geschiedenis (shallow clone), dan meldt de scanner dat bovenaan met "LET OP".

Bewijs: de zelftest heeft een tweede wegwerp-repository met precies deze valkuilen (zie "Zelftest"). Eerst controleert de zelftest dat een gewone `git log -p --all` die tokens daar echt níet ziet; daarna moet de scanner ze allemaal vinden. Sabotage van de nieuwe scanner in kopieën: zonder `--no-replace-objects` → "34 git replace: niet gevonden"; zonder `log.showRoot=true`/`--root` → "33 eerste commit met log.showRoot=false: niet gevonden"; zonder de auteur/committer-scan → 36, 37 en 39 niet gevonden; zonder `GIT_GRAFT_FILE=/dev/null` → "35 grafts: niet gevonden". De echte scanner: `fouten []`.

### Wat de eerste versie miste

Een reviewer bouwde een eigen testrepository en vond vier gaten. De scanner vond toen **niet**:
- (a) een token in de tekst van een **annotated tag**. `git log --all` toont alleen de commit waar de tag naar wijst, niet het tag-object zelf. (De eerste versie van dit rapport beweerde ten onrechte dat `--all` tags meeneemt.)
- (b) een token in een **UTF-16-bestand**. Git ziet dat als binair, en `git log -p` toont van binaire bestanden alleen "Binary files … differ". Alle binaire wijzigingen werden zo stil overgeslagen; in deze repository zijn dat 224 "Binary files"-regels (220 unieke objecten), waaronder 9 `.docx`, 21 `.xltx`, 1 `.zip` en 4 `.pdf` (containers met tekst).
- (c) `Authorization: "Bearer <token>"`, een camelCase-naam (`secretKey: "…"`), `const DB_PASS = "…"` en een token in de remote-URL in `.git/config`.
- (d) sleutelbestanden op naam (`.p12`, `.pfx`, `.jks`, `.key`).

Alle vier zijn hersteld. Op de testrepository van de reviewer vindt de scanner nu ook de tag (KRITIEK), het UTF-16-bestand (KRITIEK), het remote-token (KRITIEK), de Bearer-header en vijf camelCase-/snake_case-namen (HOOG: `secretKey`, `DB_PASS`, `supabaseServiceKey`, `apiKey`, `client_secret`): in totaal 5 KRITIEK en 6 HOOG, exitcode 1.

### Wat de scanner nu doorzoekt

- **Geschiedenis:** `git --no-replace-objects log -p --root --format=raw --diff-merges=separate --all --reflog --full-index`, met `GIT_GRAFT_FILE=/dev/null` en de config-overschrijvingen hierboven. `--all` neemt branches, remote-tracking refs, notes (`refs/notes/*`) en `refs/stash` mee; `--reflog` ook oudere stashes en commits die alleen nog in de reflog staan (na `reset`/`rebase`); `--diff-merges=separate` toont de diff van merge-commits tegenover elke ouder, ook als de config `log.diffMerges=first-parent` zegt ("evil merge", werkmap-deel van een stash). Ook commitberichten en alle commit-kopregels (auteur, committer, …) worden gescand.
- **Binaire bestanden:** voor elke "Binary files … differ" haalt de scanner het blob op (`git cat-file`, via `--full-index`) en leest het uit. UTF-16 wordt gedecodeerd. Zip-containers (`.docx`, `.xlsx`, `.xltx`, `.pptx`, `.odt`, `.zip`, `.jar`) worden uitgepakt, ook genest; XML-tekst wordt daarbij ook zonder tags gescand, omdat Word één woord over meerdere "runs" kan verdelen. Gzip en PDF-streams worden uitgepakt. Uit overige binaire bestanden (afbeeldingen, `.pyc`) worden de leesbare tekenreeksen gehaald (ASCII en UTF-16LE, ≥ 8 tekens), zoals `strings` doet. Aan het eind meldt de scanner hoeveel objecten hij heeft uitgelezen en welke **niet** (te groot > 50 MB, versleuteld, onleesbaar), zodat zichtbaar is wat hij wel en niet heeft gezien.
- **Tags en refs:** de tekst van elk tag-object (ook geneste tags), en refs die direct naar een blob of tree wijzen.
- **`.git/config` en eigen `.git/hooks`:** token in een remote-URL, `http.extraheader`.
- **Sleutelbestanden op naam:** `.p12`, `.pfx`, `.jks`, `.keystore`, `.key`, `.ppk`, `.kdbx`, `.p8`, `.ovpn`, `id_rsa`/`id_ed25519`, `.htpasswd`, `.netrc`, `.pgpass`, `.git-credentials`, `credentials(.json)`, service-account-JSON (HOOG), en `.pem`/`.crt`/`.asc`/`.gpg` (MIDDEL, kan publiek zijn). Ook als het bestand binair of leeg is, en ook binnen een zip.
- **Optioneel** (`--onbereikbaar`): losse blobs, tag-objecten en commits die nergens meer aan hangen (`git fsck --unreachable`).
- **Werkmap:** niet-gecommitte wijzigingen, ongevolgde bestanden én door `.gitignore` genegeerde bestanden (zoals `.env`); binaire bestanden ook hier uitgelezen. Een genegeerd bestand in `webapp/` wordt gemarkeerd met "WEL gepubliceerd".
- **Patronen:** OpenRouter (`sk-or-`), Anthropic (`sk-ant-`), OpenAI/DeepSeek (`sk-`), Supabase `sb_secret_`/`sb_publishable_`, JWT's (gedecodeerd op `role`: `service_role` = KRITIEK, `anon` = INFO), AWS (`AKIA…`, secret key), private keys, GitHub-, GitLab-, npm-, Google-, Slack-, SendGrid- en Stripe-tokens, elke URL met `gebruiker:geheim@` (ook https), `Bearer <token>` en `Authorization: Basic/token …`, `.env`-/shell-stijl `DB_PASSWORD=waarde` (HOOG), `sleutel: waarde` in yaml/ini/toml (HOOG). Generiek: `<naam> = "<waarde>"` of `<naam>: '<waarde>'`, waarbij de naam per woorddeel wordt gelezen (camelCase, snake_case, kebab-case). Namen met secret/password/pass/pwd/wachtwoord/credential/apikey/servicekey/accesskey/clientsecret tellen altijd: HOOG als de waarde willekeurig oogt (≥ 16 tekens, letters én cijfers, hoge entropie), anders MIDDEL. Namen met alleen key/token/auth/jwt tellen alleen bij een willekeurig ogende waarde; zo blijven `storageKey: "wpi_concept_v1"`, `{"key":"Strict-Transport-Security"}` en `API_URL = "https://…"` buiten beeld.
- **Oordeel:** alleen de gevonden **waarde** kan het oordeel verlagen (naar LAAG): `<jouw-key>`, `${VAR}`, `$VAR`, `EXAMPLE`, `your-…`, of na het voorvoegsel hooguit twee verschillende tekens (`sk-or-v1-0000…`). Bewust geaccepteerde testwaarden staan op vingerafdruk (sha256, 16 tekens) in `tools/secret_scan.allow`, met reden.
- **Exitcode:** 1 bij KRITIEK/HOOG, met `--streng` ook bij MIDDEL.

**Grenzen (bewust, staan ook in de kop van het script):** een geheim zonder herkenbaar voorvoegsel én zonder geheim-achtige naam ervoor (bijv. een los wachtwoord midden in een zin) wordt niet gevonden. Versleutelde archieven worden niet geopend (wel gemeld). Afbeeldingen worden alleen op leesbare tekenreeksen gescand (metadata), niet met OCR.

**Zelftest:** `tools/secret_scan_selftest.sh` bouwt twee wegwerp-repositories met samen 41 geplante, willekeurig gegenereerde nep-geheimen (32 in de eerste, 9 in de tweede). De oude plekken: werkmap-deel van de bovenste stash, `stash@{1}`, `git stash -u`, evil merge, een `++ `-regel, regel 1, naast spread-syntax, naast `${host}` en HTML, `.env` zonder aanhalingstekens, genegeerd `webapp/.env`, commitbericht, toegevoegd en weer verwijderd, alleen in de reflog, niet gecommit. Nieuw: annotated tag, tag die direct naar een blob wijst, git note, UTF-16-bestand, `.docx` met het token over twee Word-runs verdeeld, `.xlsx`, tekenreeks in een binair bestand, gzip, remote-URL in `.git/config`, `Authorization: "Bearer …"`, `secretKey`, `DB_PASS`, `client_secret`, `cert.p12` en een leeg `server.key`; dit alles met `log.diffMerges=first-parent` in de config. Daarnaast plaatshouders en gewone configwaarden die hooguit LAAG/MIDDEL mogen zijn. De zelftest controleert per geheim ernst, bestand en regelnummer, en de exitcode. Uitkomst: `fouten []`. Ter controle draaide dezelfde zelftest tegen de vorige scanner: 14 van de nieuwe gevallen niet gevonden en `client_secret` alleen als MIDDEL. De tweede repository (derde versie) bevat: een token in de eerste commit met `log.showRoot=false`, een via `git replace` verborgen commit, een via `.git/info/grafts` overgeslagen commit (reflog gewist), tokens in auteursnaam en committer-e-mail, een commitbericht met `log.abbrevCommit=true`, een auteursnaam die `mailmap.file` (buiten de repo) herschrijft, een zelfgemaakte extra commit-kopregel (`git hash-object -t commit --literally`) en `diff.noprefix=true`; plus de controle op de "LET OP"-meldingen voor replace en grafts.

### Resultaat voor deze repository

`tools/secret_scan.sh --onbereikbaar --streng` (derde versie van de scanner, 05:00): 42 commits (0 merges, 0 stashes, 0 tags), 126 regels in `git reflog --all`, geen vervangende objecten, geen grafts, geen shallow clone en geen `log.showRoot`-override. 221 unieke binaire objecten uitgelezen: 220 uit de geschiedenis (104 `.jpg`, 78 `.png`, 21 `.xltx`, 9 `.docx`, 4 `.pdf`, 3 `.pyc`, 1 `.zip`; samen 224 "Binary files"-regels, want enkele `.png`-objecten komen in meer commits voor) en 1 ongevolgd `.pyc` in de werkmap (`tools/__pycache__/`); daarbinnen 31 zip-containers, niets overgeslagen. Ook de auteurs en committers van alle 42 commits zijn nu gescand. Exitcode 0.

| Ernst | Aantal | Details |
|---|---|---|
| KRITIEK / HOOG | **0** | Geen echte sleutels, geen service_role-JWT, geen private keys of sleutelbestanden, ook niet in binaire bestanden, de reflog, commitberichten, auteur/committer, `.git/config` of losse objecten |
| MIDDEL | 0 | – |
| TOEGESTAAN | 3 | `tools/mock_supabase.py` (`WACHTWOORD = "Veilig…"`), `webapp/tests/sync.js` (`const WW = '…'`, hetzelfde testwachtwoord) en `webapp/tests/sync.js` (`mock-anon-key`): fictieve testwaarden voor de lokale mock, nog niet gecommit; op de allowlist met reden. `WW` is nieuw zichtbaar doordat de scanner nu naamdelen leest (`ww` = wachtwoord). |
| LAAG | 2 | Beide in de zelftest zelf, en beide plaatshouders: het officiële AWS-voorbeeld-sleutel-ID (eindigt op `EXAMPLE`) en een remote-URL waarin op de plek van het wachtwoord een shellvariabele staat (`$GH_REMOTE`, geen waarde) |

"service_role" komt alleen als woord voor in documentatie en commentaar; `tools/deepseek_harness.py` leest `OPENROUTER_API_KEY` uit de omgeving (goed). Dit rapport noemt de voorbeeldsleutel bewust niet letterlijk; anders telt de scan hem hier ook mee (de vorige versie van dit rapport veroorzaakte zo zelf een extra LAAG-vondst).

### Herstel en borging

1. Draai `tools/secret_scan.sh --streng` als pre-commit-hook en in CI. Draai `tools/secret_scan_selftest.sh` na elke wijziging aan de scanner. Zet daarnaast GitHub secret scanning en push protection aan; de eigen scanner is een vangnet, geen vervanging.
2. Houd testwachtwoorden zichtbaar fictief (zoals nu), gebruik ze alleen tegen de mock en zet ze met reden in `tools/secret_scan.allow`. Echte Supabase-sleutels horen alleen in de omgeving van de hosting en in Supabase zelf. `js/config.js` mag alleen de anon/publishable key bevatten. Zet een `.gitignore` met `.env*` en `*.p12`/`*.pfx`/`*.key` in de repo, en laat het publiceren (allowlist, zie §3) nooit `.env`-bestanden meenemen.
3. Zet geen token in een git-remote-URL; gebruik een credential-helper of `gh auth`. De scanner kijkt in `.git/config`, maar die wordt niet gepusht: een token daar lekt via kopieën van de map (zip, back-up).
4. Mocht er ooit een echt geheim gecommit worden: eerst **roteren**, daarna de geschiedenis opschonen (`git filter-repo`), ook tags, notes, stashes en reflog (`git stash clear`, `git reflog expire --expire=now --all && git gc --prune=now`). Opschonen alleen is niet genoeg, want forks en clones houden het geheim.

---

## 5. Methoderegels als testpoort (tests/methode.js)

**Wat er mis was.** De scenariotests (`e2e`, `meld`, `plan`, `mont`, `kw`) schreven hun uitkomst alleen naar het log en eindigden met `errs []` zolang er geen pageerror was; `run-all.js` gaf dan PASS. Een reviewer liet in een kopie "Akkoord na toetsing · afronden" de status `Open` zetten en haalde het QHSE-filter uit de actiehouderslijst: `run-all.js e2e meld plan mont kw` gaf 5 PASS, terwijl het log van `e2e` zelf "eind Open | … Getoetst en akkoord · afgerond" toonde. Geen test controleerde dat de QHSE-manager geen actiehouder kan zijn, of dat een actie alleen na toetsing "Afgerond" wordt.

**Wat `methode.js` nu afdwingt** (exitcode 1 en een regel `METHODE: …` per overtreding; 40 controles):
- **M1 · Het oordeel kiest alleen de inspecteur.** De AI-koppeling wordt nagebootst met een "brutale" AI die ook `oordeel: "C"` (en bij de actie `status: "Afgerond"`, `houder: QHSE`) teruggeeft. Gecontroleerd: na de koppeling is er geen oordeel en blijft het scherm op "Waar hoort dit bij?"; op het oordeelscherm staan C, A, V en NVT zonder voorkeuze (`aria-pressed="false"`, geen `on-*`); het opgeslagen oordeel is wat de inspecteur tikte (A), niet wat de AI zei; beide prompts zeggen dat de AI geen oordeel geeft.
- **M2 · AI alleen als Voorstel, pas geldig na bevestiging.** De koppeling staat onder het label "Voorstel" en wordt pas gezet als de inspecteur hem aantikt; de AI-actietekst staat als "Voorstel" in het veld; vóór "Actievoorstel vastleggen" bestaat er geen actie; daarna is het een actie met status `Voorstel`, zonder actiehouder en toetser.
- **M3 · Toetser ≠ actiehouder.** Geweigerd met een foutmelding bij instellen en bij een nieuwe actie (niets bewaard); een beschadigde actie met toetser = actiehouder kan niet worden afgerond.
- **M4 · QHSE-manager nooit actiehouder.** De demo heeft geen QHSE-gebruiker; de test voegt er één toe aan `WPI.USERS`, zoals de Supabase-profielen doen. Hij staat niet in de actiehouderslijst van de actie-modal en van "Nieuwe actie", en een via aangepaste HTML toch gekozen QHSE-actiehouder wordt bij instellen geweigerd (status blijft `Voorstel`).
- **M5 · Afgerond alleen na toetsing door de toetser.** "Klaar voor toetsing" is niet afgerond; de actiehouder en het hoofd (geen toetser) zien geen afrondknop en `App.akkoord()` doet bij hen niets; "niet akkoord" vraagt een reden en zet de actie terug naar "In uitvoering"; alleen "Akkoord na toetsing" door de toetser geeft `Afgerond`, met als laatste logregel de toetsing door de toetser. De methode-uitzondering "Direct gecorrigeerd" ter plaatse wordt ook gecontroleerd: afgerond met de inspecteur als toetser en zonder actiehouder.
- **M6 · Eindcontrole op alle acties in de database:** elke afgeronde actie heeft een toetser, toetser ≠ actiehouder en een toetsingsregel in het log van de toetser; geen actie heeft de QHSE-manager als actiehouder.

Daarnaast controleren de bestaande scenariotests nu hun kernuitkomst (zonder iets af te zwakken): `e2e` (toetser = actiehouder geweigerd, status `Open` na instellen, reden verplicht bij niet akkoord, eindstatus `Afgerond` met "Getoetst en akkoord"), `meld` (bel weg na "Alles gelezen", inspecteur kan instellen, alertbalk weg tijdens een inspectie), `plan` (leeg formulier geweigerd, inspectie gekoppeld aan de planning, planning daarna `uitgevoerd`), `mont` (drie monteurs gekoppeld, filter vindt de inspectie, monteur in het rapport) en `kw` (handmatige actie `Open` met plandatum).

**Bewijs (sabotage in kopieën van de app, 05:10–05:25):**

| Sabotage in de kopie | `methode.js` | ook gevangen door |
|---|---|---|
| "Akkoord na toetsing" zet `Open` i.p.v. `Afgerond` | FAIL: "akkoord door de toetser → Afgerond (Open)" | `e2e` FAIL |
| QHSE-filter en QHSE-controle weg uit `acties.js` | FAIL: QHSE in de lijst, QHSE-actiehouder niet geweigerd | – |
| controle toetser ≠ actiehouder weg uit `stelIn` | FAIL: "toetser = actiehouder geweigerd" | – (e2e alleen via een time-out) |
| AI-oordeel overnemen (`cur.oordeel = out.oordeel`) | FAIL: oordeel na koppelen `C`, knop C voorgekozen | – |
| AI-koppeling automatisch overnemen (`kiesRegel(ids[0])`) | FAIL: "koppeling NIET automatisch overgenomen: stap oordeel" | – |
| "Klaar voor toetsing, zonder foto" zet direct `Afgerond` | FAIL: "klaar gemeld → … niet afgerond (Afgerond)" | – |

De combinatie van de reviewer (akkoord → `Open` én QHSE-filter weg) geeft nu `run-all.js e2e meld plan mont kw methode`: 4 PASS · **2 FAIL** (`e2e`, `methode`), exitcode 1.

**App-bevinding (Laag, defense-in-depth).** `maakActie` ("Nieuwe actie", `acties.js`) weigert toetser = actiehouder, maar controleert niet dat de actiehouder geen QHSE-manager is; `stelIn` doet dat wel. In de keuzelijst staat de QHSE-manager niet, dus dit is alleen bereikbaar met aangepaste HTML (los getest: een toegevoegde `<option value="u-qhse">` gaf een actie met status `Open` en de QHSE-manager als actiehouder). *Herstel:* in `maakActie` dezelfde regel als in `stelIn` (`if ((USERS.find((u) => u.id === houder) || {}).role === "qhse") return this.fout(…)`), en controleer in de database (trigger op `acties`) dat `houder` nooit een profiel met rol `qhse` is en dat `status = 'Afgerond'` alleen gezet wordt door de toetser. `methode.js` test nu alleen de UI-kant (niet te kiezen); zodra `maakActie` de controle heeft, kan M4 ook daar de weigering eisen.

---

## 6. Regressie: alle tests (tests/run-all.js)

`run-all.js` draait standaard de methodetest (`methode.js`, §5), de scenariotests (e2e, meld, plan, mont, kw, beheer, sync), de rooktests met schermafbeeldingen (dash, stijlB, web; die falen op elke pageerror) en de toegankelijkheidspoort `a11y.js` (zonder marge t.o.v. de nulmeting, in beide richtingen). Met `--extra` komt `xss.js` erbij. Een testbestand dat ontbreekt (verwijderd of hernoemd) is **FAIL**, niet SKIP; testbestanden in `tests/` die run-all niet kent, worden als waarschuwing gemeld. Exitcode 1 bij elke FAIL.

`node webapp/tests/run-all.js --extra` (13 november, gestart 05:12, met de nulmeting van 05:05; eigen statische server op 8424, mock-Supabase op 8426/8427): **13 PASS · 0 FAIL, exitcode 0**.

| Test | Status | Tijd |
|---|---|---|
| methode | PASS (40 controles M1–M6) | 21 s |
| e2e | PASS (nu met asserties op de actieketen) | 16 s |
| meld | PASS | 10 s |
| plan | PASS | 8 s |
| mont | PASS | 7 s |
| kw | PASS | 6 s |
| beheer | PASS | 86 s |
| sync | PASS | 88 s |
| dash | PASS | 4 s |
| stijlB | PASS | 7 s |
| web | PASS | 6 s |
| a11y | PASS (nieuw: geen · extra elementen: geen · verdwenen: geen; poort zonder marge, beide richtingen) | 68 s |
| xss | PASS (10 payloads × 27 bronnen, alle gevuld, `errs []`) | 328 s |

Losse runs in dezelfde ronde: `secret_scan.sh --onbereikbaar --streng` (derde versie) met LAAG 2, TOEGESTAAN 3 en exitcode 0; `secret_scan_selftest.sh` met `fouten []` (41 gevallen in twee repositories).

Controle van de poorten zelf: `run-all.js bestaatniet` geeft FAIL "testbestand ontbreekt" en exitcode 1. Sabotage in kopieën: `a11y.js` geeft exitcode 1 op drie extra klikbare rijen met dezelfde selector én op een verbetering zonder aangescherpte nulmeting (§2), `methode.js` op elk van zes methode-sabotages en de combinatie van de reviewer 2 FAIL in run-all (§5), `xss.js` geeft exitcode 1 als `esc()` op het inlogscherm ontbreekt (§1), en `secret_scan_selftest.sh` faalt op elke weggehaalde bescherming tegen replace, grafts, showRoot en de auteurscan (§4).

**Let op bij het bijwerken van de app:** de a11y-poort heeft geen marge, in beide richtingen. Wie een scherm bewust verandert of verbetert, ziet de verschillen per selector en legt de nieuwe stand vast met `A11Y_BASELINE=bijwerken BASE=… node webapp/tests/a11y.js`, en commit `tests/a11y-baseline.json` mee. Een nieuwe critical/serious-overtreding hoort eerst opgelost te worden, niet in de nulmeting te verdwijnen. Een verbetering maakt de poort ook rood tot de nulmeting is aangescherpt; dat is de bedoeling (ratel). Omdat andere ontwikkelaars de app op dit moment nog aanpassen, kan de poort ook rood worden door hun verbeteringen; kijk dan of er alleen "verdwenen"-regels zijn en scherp de nulmeting aan.

## Opnieuw draaien

```bash
# standaard: methodetest + scenariotests + rooktests + a11y-poort (PASS/FAIL-tabel, exitcode ≠ 0 bij een fout)
node webapp/tests/run-all.js            # --extra = ook xss.js · losse tests: e2e kw … · -j 2 · RUNALL_PORT · SYNC_PORT

cd webapp && python3 -m http.server 8416 &
BASE=http://localhost:8416 node tests/methode.js     # methoderegels M1–M6
BASE=http://localhost:8416 node tests/a11y.js        # A11Y_BASELINE=bijwerken · =uit · A11Y_VERDWENEN=toestaan · A11Y_STRICT=1 · A11Y_DATUM · A11Y_DEBUG=1
BASE=http://localhost:8416 node tests/xss.js         # XSS_PAYLOADS=3,4 · XSS_PAR=4 · XSS_SRC_STRIKT=1
node tests/exposed.js --alles http://localhost:8416  # of een gedeployde https-URL; --strict
tools/secret_scan.sh                                 # --alleen-git · --onbereikbaar · --streng · --repo DIR
tools/secret_scan_selftest.sh                        # zelftest van de scanner (41 geplante nep-geheimen, 2 repositories)
```
