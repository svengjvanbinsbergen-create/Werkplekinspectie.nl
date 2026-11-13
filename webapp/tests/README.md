# Tests (Playwright, vooraf geïnstalleerd)

Start een server in `webapp/` en draai een test met `BASE`:

    cd webapp && python3 -m http.server 8150 &
    BASE=http://localhost:8150 node tests/e2e.js

- `methode.js` de methoderegels als harde asserties (oordeel alleen door de inspecteur, AI alleen als Voorstel, toetser ≠ actiehouder, QHSE-manager nooit actiehouder, Afgerond alleen na toetsing door de toetser)
- `e2e.js`   volledige keten: inspectie → actievoorstel → instellen → uitvoeren → toetsen → rapport (verwacht `ERRS []`)
- `meld.js`  meldingen, alert, instellen door iedereen
- `plan.js`  inplannen → Vandaag → starten → uitgevoerd
- `mont.js`  monteurs koppelen + filter
- `kw.js`    kwartaalrapportage + PDF, acties-tabel, nieuwe actie
- `stijlB.js`, `dash.js`, `web.js`  schermafbeeldingen telefoon/computer

Alles in één keer (eigen server, PASS/FAIL-tabel, exitcode): `node tests/run-all.js` (zie de kop van `run-all.js`; ook `a11y.js`, `xss.js`, `exposed.js`).

Screenshots worden in de huidige map geschreven; draai vanuit een scratch-map.
Referentie (de lat voor de gauntlet): `docs/ref/mitti/*.png` — officiële Mitti/SafetyCulture app-screenshots (Play Store).
