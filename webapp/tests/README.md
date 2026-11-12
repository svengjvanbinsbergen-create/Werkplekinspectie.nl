# Tests (Playwright, vooraf geïnstalleerd)

Start een server in `webapp/` en draai een test met `BASE`:

    cd webapp && python3 -m http.server 8150 &
    BASE=http://localhost:8150 node tests/e2e.js

- `e2e.js`   volledige keten: inspectie → actievoorstel → instellen → uitvoeren → toetsen → rapport (verwacht `ERRS []`)
- `meld.js`  meldingen, alert, instellen door iedereen
- `plan.js`  inplannen → Vandaag → starten → uitgevoerd
- `mont.js`  monteurs koppelen + filter
- `kw.js`    kwartaalrapportage + PDF, acties-tabel, nieuwe actie
- `stijlB.js`, `dash.js`, `web.js`  schermafbeeldingen telefoon/computer

Screenshots worden in de huidige map geschreven; draai vanuit een scratch-map.
Referentie (de lat voor de gauntlet): `docs/ref/mitti/*.png` — officiële Mitti/SafetyCulture app-screenshots (Play Store).
