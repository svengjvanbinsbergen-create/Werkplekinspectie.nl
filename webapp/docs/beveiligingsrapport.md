# Beveiligingsrapport Werkplekinspectie

*Voor: Sven (beheer app) · Noardling B.V. · stand 13 november 2026 (fase 3, beveiligingsronde)*

Dit rapport loopt jouw beveiligingslijst punt voor punt langs. Per punt staat erbij wat de **status** is, wat we **vonden**, wat we **gedaan** hebben en waar het **bewijs** staat (een test, een opdracht of een bestand met regelnummer). Je hoeft geen ontwikkelaar te zijn om het te lezen: de technische verwijzingen staan steeds onderaan een punt.

**Wat de statussen betekenen**

| Status | Betekenis |
|---|---|
| **Geregeld** | Werkt nu al, en is getest. |
| **Geregeld na Supabase-koppeling** | Zit in de app en in het databaseontwerp en is lokaal getest, maar werkt pas echt zodra het Supabase-project bestaat en is ingesteld (zie "Wat moet Sven nog doen"). |
| **Niet van toepassing** | Past niet bij hoe deze app werkt. De reden staat erbij, en wat we in plaats daarvan doen. |
| **Open** | Nog niet (helemaal) geregeld. Staat ook bij "Wat moet Sven nog doen" of bij de restrisico's. |

**Hoe de app in elkaar zit (in het kort).** De app is een website die op de telefoon of computer draait en offline kan werken. Er is geen eigen server met code: de website zelf is alleen "statische" bestanden (HTML, CSS, JavaScript). Alle gegevens komen straks uit **Supabase** (een database-dienst in de EU). De beveiliging van de gegevens zit daarom vooral **in de database zelf**: Row Level Security (RLS), controles en limieten in PostgreSQL. Wat de app in de browser controleert, is alleen gemak voor de gebruiker; de database beslist.

Zolang er geen Supabase-project is ingevuld in `js/config.js`, draait de app in **voorbeeldmodus** (fictieve accounts en voorbeelddata, alleen op het eigen toestel, met een rustig "Demo"-label bovenin). Met een ingevuld project draait hij in **productie**: dan is alles van de voorbeeldmodus dicht.

---

## Samenvatting

| # | Onderwerp | Status | In één zin |
|---|---|---|---|
| 1 | Goede authenticatie | Geregeld na Supabase-koppeling | Inloggen met e-mail en wachtwoord via Supabase Auth, MFA voor het hoofd, geen voorbeeld-login in productie. |
| 2 | API-sleutels verbergen | Geregeld | In de app staat alleen de publieke anon-sleutel; geheime sleutels nergens, en een controle bewaakt dat. |
| 3 | Database beveiligen | Geregeld na Supabase-koppeling | RLS op elke tabel, rechten per rol, privé-fotomap; 483 databasetests slagen. |
| 4 | HTTPS afdwingen | Geregeld na Supabase-koppeling | Doorsturen naar https plus HSTS in alle drie de hostingconfiguraties. |
| 5 | Wachtwoorden hashen | Geregeld (door Supabase) | Supabase Auth bewaart wachtwoorden met bcrypt; de app bewaart nooit een wachtwoord. |
| 6 | Formulieren server-side valideren | Geregeld na Supabase-koppeling | Elk formulier heeft regels in de database; in deze ronde gaten gedicht (datums, vreemde tekens, fotopaden). |
| 7 | XSS tegenhouden | Geregeld | Escaping + strikte CSP zonder inline scripts; 10 aanvalsteksten in elk veld doen niets. |
| 8 | Verdachte activiteit loggen en volgen | Geregeld na Supabase-koppeling (alarmering: Open) | Auditlog en beveiligingsmeldingen in de database; maandelijkse controle beschreven. Automatische alarmering is er nog niet. |
| 9 | Beheerroutes afschermen | Geregeld na Supabase-koppeling | Beheer alleen voor het hoofd, op de server met MFA (aal2) zodra MFA verplicht staat. |
| 10 | Geparametriseerde queries | Geregeld | Geen zelfgebouwde SQL; PostgREST en de databasefuncties gebruiken parameters. |
| 11 | Omgevingsvariabelen periodiek controleren | Geregeld | `tools/periodieke_check.sh` + maandchecklist. |
| 12 | Rate limiting | Geregeld na Supabase-koppeling | Limieten van Supabase Auth + quota in de database (schrijven, meldingen, uploads) + wachttijd na foute logins. |
| 13 | CORS beperken | Niet van toepassing (deels) | Supabase REST heeft geen origin-lijst; RLS is de grens. De CSP beperkt wél waar de app heen mag praten. |
| 14 | Security headers | Geregeld | CSP, HSTS, X-Frame-Options, nosniff, Referrer- en Permissions-Policy in alle configuraties. |
| 15 | Veilige sessiecookies | Niet van toepassing | Er zijn geen cookies; tokens in geheugen/sessionStorage. Afweging en maatregelen staan erbij. |
| 16 | CSRF-bescherming | Niet van toepassing | Het token gaat in een header die een andere site niet kan meesturen. |
| 17 | Herstellinks laten verlopen | Geregeld na Supabase-koppeling | Instelling ≤ 1 uur (advies 15 min); de app verwerkt de link en wist hem uit de adresbalk. |
| 18 | Uploads beperken (type en grootte) | Geregeld (app) / na koppeling (server) | App: alleen foto's, max 20 MB in, max 5 MB uit; server: 5 MB, jpeg/png/webp, max 120 per uur. |
| 19 | Debugstand uit in productie | Geregeld | `debug: false`; in productie geen voorbeeld-omwegen en geen debuguitvoer (getest). |
| 20 | Kwetsbare afhankelijkheden bijwerken | Geregeld | De app heeft geen npm-pakketten; versies van de rest staan in de periodieke controle. |
| 21 | Ongebruikte pakketten verwijderen | Geregeld (3 oude scripts: Open) | Geen pakketten in de app; drie oude hulpscripts in `tools/` nog opruimen. |
| 22 | Blootgestelde bestanden controleren | Geregeld | Allowlist-publicatie: alleen de app gaat online; test controleert de configuraties. |
| 23 | Git-geschiedenis scannen op geheimen | Geregeld | Volledige scan: 0 echte geheimen. |
| 24 | Gelekte sleutels intrekken en vervangen | Geregeld (procedure) | Stappenplan in `beveiliging-periodiek.md` §4; er is niets gelekt. |
| 25 | Periodieke grondige review | Geregeld (afspraak) | Maand-, kwartaal- en jaarritme beschreven. |
| 26 | Beschermingen testen en rapporteren | Geregeld | `tests/security.js`, `xss.js`, `exposed.js`, databasetests en dit rapport. |

**Testuitslag van deze ronde:** alle app-tests PASS (`tests/run-all.js`, 14 tests, 0 FAIL), databasetests 483 van 483 geslaagd, `exposed.js --config --strict` zonder fouten, `periodieke_check.sh` 0 FOUT.

---

## Wat moet Sven nog doen

Dit kan alleen jij (of iemand met toegang tot de accounts). Zonder deze stappen is "Geregeld na Supabase-koppeling" nog niet echt geregeld.

1. **Supabase-project in de EU aanmaken** (regio Frankfurt of een andere EU-regio) en de migraties toepassen volgens `supabase/README.md` §1. Draai daarna de handmatige controles uit README §7 één keer tegen het echte project (HTTP-statuscodes, uploadlimieten), want die konden we alleen lokaal testen.
2. **Sleutels goed neerzetten.**
   - In `webapp/js/config.js`: alleen de project-URL en de **anon/publishable** sleutel. Die is bedoeld om publiek te zijn.
   - De **service_role/secret** sleutel, het databasewachtwoord en het SMTP-wachtwoord gaan in een **wachtwoordkluis**, nooit in de code, git of een build-variabele van de website.
   - Vervang `project-ref` door de echte project-ref in de CSP op vier plekken: `index.html`, `_headers`, `netlify.toml` en `vercel.json` (zoek op "project-ref").
3. **Auth-instellingen in Supabase** (README §2): aanmelden door vreemden **uit** (alleen uitnodigingen), wachtwoord minimaal **12 tekens**, **Prevent use of leaked passwords aan** (vraagt het Pro-abonnement), herstellink maximaal **3600 s** (liever 900 s), refresh-token-rotatie aan, juiste Site URL en Redirect URLs (geen `localhost`).
4. **Eigen SMTP instellen** (EU-maildienst met SPF/DKIM) voor uitnodigingen en herstelmails. De standaardmailer van Supabase is alleen voor testen en heeft een zeer lage limiet.
5. **MFA voor het hoofd aanzetten.** Björn koppelt een authenticator-app bij de eerste login; zet daarna als hoofd de instelling `mfa_verplicht_hoofd` op `true` (README §2). Pas dan zijn de beheerrechten op de server alleen nog bruikbaar met MFA.
6. **Hosting kiezen en publiceren uit `dist/`** (Netlify, Vercel of Cloudflare Pages; de build staat al in de configuratie). Zet bij Netlify "Force HTTPS" aan, bij Cloudflare "Always Use HTTPS". Draai na de eerste deploy: `node webapp/tests/exposed.js --alles https://<adres> --strict`.
7. **GitHub**: zet *secret scanning* en *push protection* aan op de repository, en overweeg een pre-commit-hook met `tools/secret_scan.sh --streng`.
8. **Ritme vastleggen**: maandelijks `tools/periodieke_check.sh --url https://<adres>` en de handmatige punten uit `beveiliging-periodiek.md` §1; elk kwartaal §2. Zet het in de agenda met een vaste eigenaar.
9. **Optioneel**: Google Fonts zelf hosten (dan gaat het IP-adres van gebruikers niet naar Google; AVG) en de drie oude scripts in `tools/` opruimen (`align10.py`, `p07.py`, `p08.py`).

---

## Per punt

### 1. Goede authenticatie
**Status:** Geregeld na Supabase-koppeling

**Bevinding.** In de voorbeeldmodus logt iemand in door een fictief account aan te tikken. Dat mag nooit in productie bestaan: ook niet via een adres als `#/beheer`, en ook niet door in de browserconsole `App.login(...)` te typen.

**Fix.**
- Productie gebruikt **Supabase Auth**: e-mail en wachtwoord, sessie met een kortlevend toegangstoken (1 uur) en een vernieuwbaar refresh-token met rotatie.
- **MFA (TOTP)** voor het hoofd; de serverrechten van het hoofd vragen dan niveau `aal2`.
- In productie is alles van de voorbeeldmodus dicht: geen accountkiezer, geen fictieve accounts, `App.login` doet niets, een in de pagina geïnjecteerde inlogknop doet niets, elke route toont alleen het inlogscherm, geen voorbeelddata of -cijfers. Alleen het echte inlogproces (wachtwoord → profiel en rol van de server → zo nodig MFA) logt in.
- "Overal uitloggen" (bijv. bij een verloren telefoon) en automatisch uitloggen als in een ander tabblad iemand anders inlogt.

**Bewijs.** `js/auth.js:527-576` (productie tegenover voorbeeldmodus) · `tests/security.js` blok 3 (20 controles "productie: …", o.a. "App.login("u-bjorn") vanuit de console doet niets", "#/beheer toont alleen het inlogscherm") · `tests/sync.js` (inloggen, MFA, vernieuwen, uitloggen tegen de nep-Supabase `tools/mock_supabase.py`) · `supabase/README.md` §2.

### 2. API-sleutels verbergen
**Status:** Geregeld

**Bevinding.** Een website kan geen geheim bewaren: alles wat in de browser staat, kan iedereen lezen. De anon/publishable sleutel van Supabase is daarom **bedoeld** om publiek te zijn; hij geeft zonder ingelogde gebruiker en RLS geen toegang. De echte geheimen (service_role/secret, JWT-secret, databasewachtwoord, SMTP) mogen nooit in de app.

**Fix.** `js/config.js` bevat alleen URL + publieke sleutel (nu leeg) en waarschuwt in de tekst. `tools/periodieke_check.sh` decodeert elke sleutel in `webapp/` en faalt bij alles wat geen anon/publishable sleutel is. `supabase/tests/sleutelcheck.sh` doet hetzelfde vóór een deploy.

**Bewijs.** `js/config.js:10-35` · `tools/periodieke_check.sh` (blok 2 "Client-configuratie en sleutels") · `supabase/tests/sleutelcheck.sh` · uitslag: 0 FOUT.

### 3. Database beveiligen
**Status:** Geregeld na Supabase-koppeling

**Bevinding.** Zonder RLS kan iedereen met de publieke sleutel alles lezen. Ook de rolverdeling (hoofd, coördinator, inspecteur) en de methoderegels (toetser ≠ actiehouder, QHSE-manager nooit actiehouder, oordeel alleen C/A/V/NVT, "Afgerond" alleen na toetsing) moeten in de database vastliggen, niet alleen in de app.

**Fix.** RLS staat op **elke** tabel; rechten per rol; inspecteurs zien alleen hun eigen inspecties; beheer alleen voor het hoofd; de fotomap is privé en per gebruiker; logboeken zijn alleen-toevoegen (ook voor de eigenaar); functies draaien met een vaste `search_path`; nieuwe functies krijgen standaard geen rechten voor anonieme gebruikers.

**Bewijs.** `supabase/migrations/0003_rls_rechten.sql`, `0005_storage.sql`, `0006_rpc.sql:171` · databasetests `sh supabase/tests/run.sh`: **483 van 483 geslaagd** (eerste test: "RLS staat aan op ELKE tabel in public"), plus de racetests "laatste hoofd" en "QHSE-rol".

### 4. HTTPS afdwingen
**Status:** Geregeld na Supabase-koppeling (zodra er gehost wordt)

**Bevinding.** Op http kan iemand op hetzelfde wifi-netwerk meelezen of de app aanpassen.

**Fix.** Doorsturen van http naar https (Netlify-regels; Vercel doet het altijd; Cloudflare via "Always Use HTTPS") en **HSTS** van 2 jaar, zodat de browser het daarna nooit meer via http probeert. Supabase zelf werkt alleen via https, en de CSP staat alleen `https://<project>.supabase.co` toe.

**Bewijs.** `_headers` (Strict-Transport-Security), `netlify.toml` (`[[redirects]]` http → https), `vercel.json` (header) · `node tests/exposed.js --config --strict`: headers in orde.

### 5. Wachtwoorden hashen
**Status:** Geregeld (door Supabase Auth)

**Bevinding.** De app bouwt zelf geen wachtwoordopslag, en dat is goed zo.

**Fix.** Supabase Auth (GoTrue) bewaart wachtwoorden als **bcrypt**-hash. De app stuurt het wachtwoord alleen bij het inloggen via https naar Supabase en bewaart het nergens (niet in localStorage, niet in IndexedDB). Aanvullend: minimaal 12 tekens en toetsing tegen gelekte wachtwoorden (HaveIBeenPwned) in de Supabase-instellingen.

**Bewijs.** `supabase/README.md` §2 · `js/auth.js:233` (nieuw wachtwoord minstens 12 tekens) · `tests/sync.js` ("wachtwoord nergens in localStorage/sessionStorage/IndexedDB", nieuw in deze ronde).

### 6. Formulieren server-side valideren
**Status:** Geregeld na Supabase-koppeling

**Bevinding.** We hebben de formulieren van de app (planning, actie, inspectie, beheer, inloggen) naast de databaseregels gelegd. Gaten die we vonden:
- datums zonder grens (jaar 0001 of 9999 kon, wat sorteren en "te laat" breekt);
- vrije tekst mocht onzichtbare stuurtekens en "omkeer"-tekens bevatten (tekst die in een rapport anders wordt getoond dan hij is, "Trojan Source");
- in een inspectie kon een fotopad van **iemand anders** staan, zodat je andermans foto als eigen bewijs kon tonen (strijdig met "alleen wat de inspecteur ziet telt").

**Fix.** Migratie `0007_invoer_aanvulling.sql`: datums altijd tussen 2000 en 2100, vanuit de app tussen 2 jaar terug en 5 jaar vooruit; stuurtekens en omkeertekens geweigerd in alle tekstkolommen; fotopaden in een inspectie alleen in de eigen map. De oudere regels (oordeel alleen C/A/V/NVT, toetser ≠ actiehouder, QHSE nooit actiehouder, maximale lengtes, statusovergangen) staan in `0002_functies_validatie.sql`. De app neemt dezelfde lengtegrenzen over (`maxlength`) en geeft datumvelden een min/max, zodat de gebruiker de fout al ziet vóór het versturen.

**Bewijs.** `supabase/migrations/0007_invoer_aanvulling.sql:1-25` · `supabase/tests/rls_test.sql` sectie 22 (o.a. "datum: ook beheer via SQL kan geen jaar 9999 opslaan", "fotos: alle plekken en vormen gecontroleerd") · `tests/security.js` blok 4 ("Invoergrenzen").

### 7. XSS tegenhouden
**Status:** Geregeld

**Bevinding.** XSS (iemand stopt code in een tekstveld die bij een ander wordt uitgevoerd) was het grootste risico uit het vooronderzoek: de oude app had overal `onclick="…"` in de HTML, waardoor de CSP inline scripts moest toestaan.

**Fix.** Twee lagen:
1. Alle tekst van gebruikers en van de server wordt **geëscaped** voordat hij in de pagina komt (`WPI.esc`).
2. **Strikte CSP**: alleen scripts van de eigen site, **geen** inline scripts, **geen** `onclick`-achtige attributen (`script-src-attr 'none'`), geen `eval`. De app gebruikt nu één centrale klikverwerking (`data-action`), die alleen echte app-functies aanroept. Zelfs als ergens een escape vergeten wordt, voert de browser een ingespoten script niet uit.

**Bewijs.** `js/kern.js:35-50` en `:372-412` (event-delegatie, alleen eigen App-functies) · CSP in `index.html:13`, `_headers`, `netlify.toml`, `vercel.json` (gelijk; `exposed.js` controleert dat) · `tests/security.js` blok 1, 2 en 5: een ingespoten `onerror` en een ingespoten `<script>` worden door de browser geblokkeerd; in **elk** tekstveld van planning, nieuwe actie, actie instellen, zoeken, beheer en inspectie wordt een aanvalstekst ingevuld en opgeslagen, en daarna voert niets uit en staat er geen enkel `on…`-attribuut in de pagina · `tests/xss.js` (uitgebreid: 10 aanvalsteksten × 27 bronnen, ook via de server).

**Restpunt (laag).** De stijlregel van de CSP staat nog `'unsafe-inline'` toe voor `style="…"`-attributen. Daarmee kun je geen script uitvoeren, alleen opmaak veranderen. Opruimen kan later (stijlen naar `styles.css`).

### 8. Verdachte activiteit loggen en volgen
**Status:** Geregeld na Supabase-koppeling · automatische alarmering: **Open**

**Bevinding.** Zonder logboek merk je misbruik van een geldig account (bijv. een gestolen wachtwoord) niet op.

**Fix.**
- **Auditlog** in de database: elke wijziging en verwijdering, met wie en wanneer (alleen de gewijzigde velden). Alleen-toevoegen: niemand kan het achteraf aanpassen.
- **Beveiligingsmeldingen** (`security_events`): o.a. herhaald mislukte logins (app meldt na elke 5 mislukte pogingen), mislukte MFA, rolwijzigingen, geraakte limieten.
- Supabase houdt zelf Auth- en API-logs bij.
- De maandelijkse controle (`beveiliging-periodiek.md` §1) bevat kant-en-klare zoekopdrachten.

**Wat open staat.** Er gaat nog geen automatische mail of melding uit bij iets verdachts; iemand moet maandelijks kijken. Bij ~5 gebruikers is dat te doen. Wil je alarmering, dan kan later een kleine Supabase Edge Function of een geplande query een mail sturen.

**Bewijs.** `supabase/migrations/0004_audit.sql`, `0001_tabellen.sql:321-332` (security_events) · `js/auth.js:168-198` (meldingen vanuit de app) · `docs/beveiliging-periodiek.md` §1.3.

### 9. Beheerroutes afschermen
**Status:** Geregeld na Supabase-koppeling

**Bevinding.** Het beheerscherm (monteurs, doel % conform, gebruikers en rollen) mag alleen het hoofd gebruiken. Een verborgen knop is geen beveiliging.

**Fix.** Op de **server** controleert elke beheerregel `is_hoofd_admin()`: de gebruiker is hoofd **én** heeft (als MFA verplicht staat) een sessie met MFA (`aal2`). Met alleen een wachtwoord heeft het hoofd dan de rechten van een inspecteur. In de app is het beheerscherm alleen zichtbaar voor het hoofd, en in productie geeft `#/beheer` zonder login alleen het inlogscherm. Beheerpagina's als dashboard en rapportage tonen in productie geen voorbeeldcijfers.

**Bewijs.** `supabase/migrations/0002_functies_validatie.sql:34-73` (`mfa_ok`, `is_hoofd_admin`) · `0003_rls_rechten.sql:87-116` · databasetests ("hoofd zonder MFA") · `tests/security.js` ("#/beheer toont alleen het inlogscherm") · `tests/beheer.js`.

### 10. Geparametriseerde queries
**Status:** Geregeld

**Bevinding.** SQL-injectie ontstaat als je SQL-tekst aan elkaar plakt met invoer van gebruikers.

**Fix.** De app schrijft geen SQL. Hij praat met de REST-API van Supabase (PostgREST), die elke waarde als parameter doorgeeft; de waarden in de URL worden met `encodeURIComponent` gecodeerd. In de databasefuncties staat geen dynamische SQL (`EXECUTE` met tekst). De databasetests slaan bekende injectieteksten op en controleren dat ze **letterlijk** als tekst worden bewaard.

**Bewijs.** `js/sync.js:614-662`, `:849` · `grep -n "execute " supabase/migrations/*.sql` vindt geen dynamische SQL · `supabase/tests/rls_test.sql` ("SQL-injectiestrings letterlijk opgeslagen").

### 11. Omgevingsvariabelen periodiek controleren
**Status:** Geregeld

**Fix.** `tools/periodieke_check.sh` controleert: geheime sleutels in de hele git-geschiedenis en de werkmap, de sleutel in `config.js` (moet anon/publishable zijn), `debug` uit, geheim-achtige variabelen in de eigen shell (alleen ter controle), CSP in alle vier de bronnen, en wat er online komt. De app zelf leest geen omgevingsvariabelen; de echte geheimen staan alleen in Supabase en de wachtwoordkluis.

**Bewijs.** `tools/periodieke_check.sh` · uitslag deze ronde: **0 FOUT** (de "LET OP"-regels: geheim-achtige variabelen in de shell van de testomgeving, Google Fonts, drie oude scripts, `style-src 'unsafe-inline'`, live site nog niet gecontroleerd) · `docs/beveiliging-periodiek.md` §1.

### 12. Rate limiting
**Status:** Geregeld na Supabase-koppeling

**Fix.** Op vier niveaus:
1. **Supabase Auth** (instelling): o.a. ±30 inlogpogingen per 5 minuten per IP, ±2 mails per uur.
2. **Database-quota** per gebruiker: gezamenlijk schrijfquotum 25 MiB per 24 uur, max 30 wijzigingen per record, > 300 per uur geweigerd; beveiligingsmeldingen begrensd per minuut en per dag; uploads max **120 foto's per uur en 600 per 24 uur** (nieuw in deze ronde).
3. **Storage**: max 5 MB per foto.
4. **App**: na 3 foute logins een oplopende wachttijd (30 s tot max 15 min); herstelmail niet vaker dan eens per minuut; bij "429" van de server een duidelijke melding.

**Bewijs.** `supabase/README.md` §2 · `0004_audit.sql:20-43`, `0006_rpc.sql:40-55`, `0007_invoer_aanvulling.sql:131-145` · `js/auth.js:180-198`, `:446`, `:459-464` · databasetests ("quotum: …", "rate limit").

### 13. CORS beperken
**Status:** Niet van toepassing (deels)

**Uitleg.** CORS bepaalt welke **andere websites** in de browser jouw API mogen aanroepen. De app heeft geen eigen API: hij praat rechtstreeks met Supabase. De REST- en Storage-API van Supabase kennen geen eigen lijst van toegestane websites; daar is **RLS de grens**, niet CORS. Een andere website kan met de publieke sleutel niets zien zonder geldige login van een gebruiker, en die login (het token) kan hij niet stelen of meesturen (zie punt 16).

**Wat we wel doen.** De CSP (`connect-src`) beperkt waar **onze** app heen mag praten: alleen de eigen site en het **eigen** Supabase-project (bewust geen `*.supabase.co`). Komen er later Edge Functions, dan zet je daar `Access-Control-Allow-Origin` op precies de app-URL, nooit `*` (README §2).

**Bewijs.** CSP `connect-src 'self' https://project-ref.supabase.co` in alle vier de bronnen · `exposed.js` ("CSP gelijk in alle vier de bronnen") · `supabase/README.md` §2 "CORS".

### 14. Security headers
**Status:** Geregeld

**Fix.** In `_headers` (Netlify/Cloudflare), `netlify.toml` en `vercel.json`, gelijk: Content-Security-Policy (strikt voor scripts), Strict-Transport-Security, X-Content-Type-Options `nosniff`, X-Frame-Options `DENY` + `frame-ancestors 'none'` (tegen clickjacking), Referrer-Policy, Permissions-Policy (alleen camera, microfoon en locatie voor de eigen site), Cross-Origin-Opener-Policy en -Resource-Policy. De app-schil krijgt `Cache-Control: no-cache`, zodat een beveiligingsupdate meteen aankomt.

**Bewijs.** `_headers:48-57` · `vercel.json` · `netlify.toml` · `node tests/exposed.js --config --strict` · na deploy: `node tests/exposed.js --alles https://<adres> --strict`.

### 15. Veilige sessiecookies
**Status:** Niet van toepassing

**Uitleg.** De app gebruikt **geen cookies**. Supabase werkt met tokens die de app zelf in een header meestuurt. Instellingen als `HttpOnly`, `Secure` en `SameSite` gaan alleen over cookies.

**De afweging.** Een HttpOnly-cookie kan door een script niet worden gelezen; een token in de browseropslag wel. Daar staat tegenover dat de app **offline** moet werken op de bouwplaats en geen eigen server heeft die cookies kan zetten. Wat we in plaats daarvan doen:
- het **toegangstoken** (1 uur geldig) staat alleen **in het geheugen** van de pagina, niet in de opslag;
- het **refresh-token** staat standaard in **sessionStorage** (weg als het tabblad sluit); alleen met "Ingelogd blijven" in localStorage;
- **refresh-token-rotatie**: een gestolen, al gebruikt refresh-token wordt herkend en geweigerd;
- de **strikte CSP** maakt het uitlezen via XSS (de enige manier om bij die opslag te komen) zeer moeilijk;
- **Overal uitloggen** trekt alle sessies in (bijv. bij een verloren telefoon).

**Bewijs.** `js/auth.js:14-29` (toelichting), `:61-76` (opslag), `:148` (token in de header) · `tests/sync.js`.

### 16. CSRF-bescherming
**Status:** Niet van toepassing

**Uitleg.** CSRF werkt doordat een browser **cookies automatisch meestuurt** naar een site, ook als een kwaadwillende andere site het verzoek start. Deze app gebruikt geen cookies: het token gaat mee in de header `Authorization: Bearer …`, en die header zet de browser **nooit vanzelf**. Een andere site kent het token niet en kan het dus niet meesturen. Daarnaast: `form-action 'self'` in de CSP en `frame-ancestors 'none'` (de app kan niet in een onzichtbaar frame op een andere site worden geladen).

**Bewijs.** `js/auth.js:148`, `js/sync.js:228` (token alleen in de header) · CSP in `_headers`.

### 17. Herstellinks laten verlopen
**Status:** Geregeld na Supabase-koppeling

**Fix.** De geldigheid van de herstellink is een Supabase-instelling: maximaal 3600 s (advies 900 s), eenmalig te gebruiken. De app verwerkt de link (`#access_token=…&type=recovery`), laat direct een nieuw wachtwoord van minstens 12 tekens kiezen en haalt het token uit de adresbalk. Een herstelmail aanvragen kan niet vaker dan eens per minuut vanuit de app, en de app zegt nooit of een e-mailadres bestaat. Redirect-URL's staan in Supabase op precies de eigen URL (geen open redirect).

**Bewijs.** `supabase/README.md` §2 · `js/auth.js:233`, `:338-346`, `:459-464` · `tests/sync.js` (herstelflow tegen de nep-Supabase).

### 18. Uploads beperken (type en grootte)
**Status:** Geregeld in de app · op de server: Geregeld na Supabase-koppeling

**Fix.**
- **App**: alleen jpeg, png, webp en heic/heif (telefoonfoto's); max 20 MB bij het kiezen; de app verkleint de foto en stuurt hem als JPEG van max 5 MB. SVG, PDF, onbekende bestanden en lege bestanden worden geweigerd met een Nederlandse melding. Max 6 foto's per waarneming. Een foto wordt alleen getoond als het echt een eigen foto-data-URL is.
- **Server**: de fotomap is **privé**, max 5 MB, alleen `image/jpeg|png|webp`, elke gebruiker alleen in de eigen map, bewijsfoto's niet te overschrijven of te verwijderen, en (nieuw) max 120 uploads per uur / 600 per dag.

**Bewijs.** `js/sync.js:110-145`, `:444` · `js/inspectie.js:174` · `supabase/migrations/0005_storage.sql:11-16`, `0007_invoer_aanvulling.sql:131-145` · `tests/security.js` blok 4 ("SVG, PDF, onbekend, leeg en 21 MB geweigerd; gewone foto wordt verkleinde JPEG").

### 19. Debugstand uit in productie
**Status:** Geregeld

**Fix.** `debug: false` in `config.js`; alleen met `debug: true` schrijft `sync.js` ruwe servermeldingen naar de console. In productie bestaan de voorbeeld-omwegen niet meer (zie punt 1), worden fictieve accounts en voorbeelddata weggehaald en is er geen "Demo"-label. In de voorbeeldmodus staat een rustig, aantikbaar "Demo"-label bovenin dat uitlegt dat alles fictief is en alleen op dit toestel blijft. De periodieke controle zoekt naar `debugger`, `console.log` en `debug: true`.

**Bewijs.** `js/config.js:29-35` · `js/sync.js:96-100` · `js/auth.js:556-576` · `tests/security.js` ("productie: debug staat uit", "productie: geen debuguitvoer in de console", "geen Voorbeeld- of Demo-label") · `periodieke_check.sh` blok 5.

### 20. Kwetsbare afhankelijkheden bijwerken
**Status:** Geregeld

**Bevinding.** De app gebruikt **geen** npm-pakketten of externe scripts: alleen eigen JavaScript. Daarmee valt het grootste risico (kwetsbare of gekaapte pakketten) weg. Wel extern: het lettertype Nunito via Google Fonts (geen script; wel gaat het IP-adres naar Google).

**Fix.** De periodieke controle toont de versies van wat er wél is: PostgreSQL (lokaal 16), Supabase (via het dashboard), Node en Playwright (alleen voor tests), Python-modules van `tools/` (alleen voor ontwikkeling, gaan niet online). Supabase meldt Postgres-updates in het dashboard; die plan je per kwartaal in.

**Bewijs.** `periodieke_check.sh` blok 4 ("de app heeft geen npm-pakketten") · `beveiliging-periodiek.md` §2.6.

### 21. Ongebruikte pakketten verwijderen
**Status:** Geregeld · drie oude scripts: **Open**

**Fix.** Geen pakketten in de app. De controle meldt scripts in `tools/` waar niets naar verwijst: `align10.py`, `p07.py` en `p08.py`. Die gaan nooit online (buiten `webapp/`), maar kunnen weg; beslis dat bij de kwartaalcontrole.

**Bewijs.** `periodieke_check.sh` blok 4.

### 22. Blootgestelde bestanden controleren
**Status:** Geregeld

**Bevinding.** Zonder regels publiceert een host alles in de map: testscripts, databasebestanden, onderzoeksdocumenten, interne pagina's, `.git`.

**Fix.** **Allowlist-publicatie**: bij elke deploy wordt een map `dist/` opnieuw gebouwd met **alleen** wat de app nodig heeft (index.html, styles, js, css, data, iconen, manifest, service worker). Daarna blijven alleen html/css/js/json/png over en alleen `index.html` als pagina. Zo kunnen `docs/`, `tests/`, `supabase/`, `tools/`, `*.md`, `*.sql`, `*.py`, `*.sh`, `.env`, `.git` en interne pagina's (`beveiliging.html`, `onderzoek.html`, …) nooit online komen, ook niet als ze later bijkomen. Als extra vangnet geven die paden een 404 (Netlify, Vercel) of `noindex` + een lege sandbox (Cloudflare).

**Aanbevolen indeling:**
```
repo/
  webapp/        bron: app + docs/ tests/ supabase/ (nooit zelf publiceren)
    dist/        het enige dat online gaat (bij elke deploy opnieuw gebouwd, niet in git)
  tools/ handoff/ wpi/   buiten webapp/, dus nooit in een publicatie
```

**Bewijs.** `netlify.toml:5-14`, `vercel.json` (`buildCommand`, `outputDirectory`, 404-routes), `_headers:25-42` (indeling en Cloudflare-build) · `node tests/exposed.js --config --strict`: voert de build van alle drie de hosts echt uit in een tijdelijke kopie en faalt als er iets anders dan de app in `dist/` komt; controleert ook de 404-regels en dat de CSP overal gelijk is.

**Let op.** `data/` gaat mee online (de kennisbank en de voorbeelddata). Daar staan geen echte persoonsgegevens in, alleen fictieve voorbeelden. Komen er ooit echte gegevens in `data/`, haal die map dan uit de build.

### 23. Git-geschiedenis scannen op geheimen
**Status:** Geregeld

**Fix.** `tools/secret_scan.sh` doorzoekt de hele geschiedenis, tags, reflog, onbereikbare objecten, binaire bestanden (ook in zip/docx/pdf) en de werkmap. Uitslag: **geen echte geheimen**. Gevonden zijn alleen het testwachtwoord en de nep-sleutel van de lokale nep-Supabase (bewust, nergens geldig, op de toestaan-lijst) en twee plaatshouders.

**Bewijs.** `tools/secret_scan.sh --onbereikbaar --streng` (via `periodieke_check.sh` blok 1) · `tools/secret_scan.allow` · `tools/secret_scan_selftest.sh` (de scanner vindt geplante geheimen echt).

### 24. Gelekte sleutels intrekken en vervangen
**Status:** Geregeld (procedure); er is geen lek

**Fix.** Stap-voor-stap-plan per soort sleutel (publishable, secret/service_role, JWT-signing key, databasewachtwoord, SMTP): eerst nieuwe sleutel maken, dan de oude intrekken, sessies intrekken, logboeken nalopen, git-geschiedenis opschonen, binnen 72 uur beoordelen of het een datalek is (AVG art. 33), en leren. Er is in deze ronde **niets** gevonden dat ingetrokken moet worden (zie punt 23).

**Bewijs.** `docs/beveiliging-periodiek.md` §4 · `supabase/README.md` §3.

### 25. Periodieke grondige review
**Status:** Geregeld (afspraak; uitvoeren is aan jou)

**Fix.** Maandelijks (± 30 min): automatische controle + Supabase Security Advisor + gebruikerslijst + logboeken. Per kwartaal (± 2 uur, met het hoofd): alle tests, databasetests, rollen doorlopen, Supabase-instellingen naast de README, backup-hersteltest, updates. Jaarlijks en bij vertrek van een beheerder: sleutels roteren en een review door iemand die niet aan de app bouwde, met dit rapport als startpunt.

**Bewijs.** `docs/beveiliging-periodiek.md` §1-3.

### 26. Beschermingen testen en bevindingen rapporteren
**Status:** Geregeld

**Fix.** Alle maatregelen hebben een test die het echt probeert:
| Test | Wat hij doet |
|---|---|
| `tests/security.js` (nieuw) | CSP aanwezig en afgedwongen; alle schermen doorlopen zonder inline handlers; productie-config zonder voorbeeld-login en zonder omwegen; uploadgrenzen; aanvalstekst in elk tekstveld blijft onschadelijk. Eindigt met `errs []`. |
| `tests/xss.js` | 10 aanvalsteksten × 27 bronnen, ook via de server en na herladen. |
| `tests/exposed.js` | publicatie-allowlist, 404-regels, headers en CSP van alle hosts. |
| `tests/sync.js` | inloggen, MFA, sessie, herstel, wachtrij tegen de nep-Supabase. |
| `supabase/tests/run.sh` | 483 databasecontroles (RLS, methoderegels, quota, aanvallen uit eerdere reviews). |
| `tools/periodieke_check.sh` | geheimen, sleutels, debug, CSP, publicatie, versies. |

Alles draait samen met `node webapp/tests/run-all.js -j 3` (met `--extra` ook `xss.js`).

---

## Aanvalstest

**Wat we zelf als aanvaller hebben geprobeerd in deze ronde** (allemaal tegengehouden):

| Aanval | Uitkomst | Bewijs |
|---|---|---|
| In productie vanuit de console `App.login("u-bjorn")` of `App.login(id, {role:"hoofd"})` | doet niets | `tests/security.js` |
| Een inlogknop (`data-action="login"`) in de pagina injecteren | doet niets | `tests/security.js` |
| Direct naar `#/dashboard`, `#/beheer`, `#/acties`, `#/rapport/…` zonder login | alleen het inlogscherm | `tests/security.js` |
| Oude `wpi_user` in localStorage zetten om "ingelogd" te zijn | genegeerd en opgeruimd | `tests/security.js` |
| Vanuit de console `App.user` zetten en het dashboard openen | geen fictieve cijfers, geen voorbeeldinspecties | `tests/security.js` ("console-omweg") |
| `<img onerror>`, `<svg onload>`, `<script>`, uitbreken uit attributen, in elk tekstveld | niets uitgevoerd, geen handler in de pagina, CSP blokkeert | `tests/security.js`, `tests/xss.js` |
| SVG, PDF, leeg bestand, 21 MB-bestand als foto uploaden | geweigerd met melding | `tests/security.js` |
| Jaar 9999, stuurtekens, andermans fotopad, honderden uploads via de API | geweigerd door de database | databasetests sectie 22 |
| Rol ophogen, id's vooraf claimen, andermans actie wijzigen, logboek vervalsen, hoofd zonder MFA | geweigerd door de database | databasetests sectie 21 en 22 |
| Testmappen, `.git`, `.md`, `.sql` opvragen na deploy | niet in `dist/`, en 404 | `tests/exposed.js --config --strict` |

**Bevindingen van de aparte aanvallers (ronde 3).** Bij het schrijven van deze versie van het rapport waren hun bevindingen nog niet binnen. Ze worden hier aangevuld zodra ze er zijn, per bevinding met ernst, fix en bewijs. Uit de eerdere aanvalsronden (fase 2) is elke gevonden aanval als regressietest in de databasetests opgenomen (sectie 21 en 22 van `supabase/tests/rls_test.sql`) en blijft dus bewaakt.

---

## Restrisico's (eerlijk)

- **Niet tegen een echt Supabase-project getest.** Alles is getest tegen een lokale PostgreSQL met een Supabase-nabootsing en een nep-Supabase voor de app. HTTP-statuscodes en Storage-limieten moet je één keer controleren bij de inrichting (README §7).
- **MFA staat pas verplicht als het hoofd het aanzet** (`mfa_verplicht_hoofd`). Tot dan is een gestolen wachtwoord van het hoofd genoeg voor beheer.
- **Tokens in de browseropslag** in plaats van HttpOnly-cookies (zie punt 15). Bewuste keuze voor offline gebruik; de strikte CSP is hier de belangrijkste bescherming.
- **`style-src 'unsafe-inline'`** in de CSP (geen scriptuitvoering mogelijk; opmaak wel).
- **Geen automatische alarmering** bij verdachte activiteit (punt 8).
- **Google Fonts**: IP-adres van gebruikers gaat naar Google (AVG-afweging; zelf hosten lost het op).
- **Dashboard en kwartaalrapportage** rekenen nog met voorbeelddata; in productie tonen ze daarom een melding in plaats van cijfers, tot ze met de servergegevens werken.
- **Kleinere punten uit de database-README §9**: bestaanstest van id's, voorspelbare id's, de klok van het toestel.

---

## Opnieuw controleren

```bash
# alle app-tests (eindigt met "… PASS · 0 FAIL")
node webapp/tests/run-all.js -j 3
# alleen beveiliging in de browser (eindigt met "errs []")
cd /tmp && BASE=http://localhost:<poort> node <repo>/webapp/tests/security.js
# publicatie en headers
node webapp/tests/exposed.js --config --strict
# databaseregels (lokale PostgreSQL 16)
PGHOST=/var/run/postgresql PGUSER=postgres sh webapp/supabase/tests/run.sh
# alles periodiek (verwacht 0 FOUT)
tools/periodieke_check.sh [--url https://<adres>]
```
