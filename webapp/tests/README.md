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
- `afronden.js` pauzeren (Vandaag: "Gepauzeerd · Hervatten", hervatten herstelt de stand, andere gebruiker ziet hem niet), definitief afronden (bevestiging, voortgang, echte PDF: pdfinfo/pdftotext, `App.rapportAfronden` één keer, daarna bevroren) en "Deel als PDF" (share-stub of download); schermafbeeldingen in `AFRONDEN_SHOTS`
- `beheer.js` rollen en beheer, `sync.js` (met mock-Supabase), `oefen.js`, `security.js`, `koppel.js` (TRA-koppeling zonder AI), `a11y.js` (axe tegen de nulmeting), `functies.js` (de Edge Functions in Node met een nep-Supabase, ook "nieuwe link", de ontvanger vlak voor het mailen, alleen echte PDF's en rapporten boven 3 MB via een uploadsessie; met `WPI_DENO=<pad>` ook deno check/lint), `inactief.js` (uitloggen na 2 uur zonder activiteit, nepklok, ook een klok die is teruggezet, onbruikbare localStorage en twee tabbladen met dezelfde inspectie; start een eigen mock-Supabase op SYNC_PORT+2)

Alles in één keer (eigen server, PASS/FAIL-tabel, exitcode): `node tests/run-all.js` (zie de kop van `run-all.js`; ook `a11y.js`, `xss.js`, `exposed.js`).

Screenshots worden in de huidige map geschreven; draai vanuit een scratch-map.
Referentie (de lat voor de gauntlet): `docs/ref/mitti/*.png` — officiële Mitti/SafetyCulture app-screenshots (Play Store).
