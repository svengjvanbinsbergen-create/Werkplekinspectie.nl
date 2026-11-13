# Beveiliging: periodieke controle

Korte checklist voor Werkplekinspectie (Noardling B.V.). Wie wat doet staat erbij. Alles wat met één opdracht kan, zit in `tools/periodieke_check.sh`. Het volledige beeld per onderwerp staat in `beveiligingsrapport.md`.

**Rollen**
- **Beheerder app**: Sven (of de ontwikkelaar die hij aanwijst). Draait de controles en past de instellingen aan.
- **Hoofd Service & Montage**: Björn Sloos. Kijkt mee naar gebruikers en rollen, en beslist bij een incident.
- **QHSE**: leest het verslag. Bij een mogelijk datalek beoordeelt QHSE samen met het hoofd of het gemeld moet worden.

---

## 1. Elke maand (± 30 minuten, beheerder)

1. **Automatische controle** draaien vanuit de map van de repository:
   ```bash
   tools/periodieke_check.sh --url https://<productie-adres>
   ```
   Verwacht: `0 FOUT`. "LET OP"-regels lees je wel, maar ze zijn niet altijd een probleem: geheim-achtige variabelen in je eigen shell, Google Fonts als externe bron en de opruimkandidaten in `tools/`. De controle doet het volgende:
   - geheimen zoeken in de hele git-geschiedenis, tags, reflog, binaire bestanden en de werkmap;
   - controleren dat in `js/config.js` alleen de publieke (anon/publishable) sleutel staat en dat `debug` uit staat;
   - zoeken naar debug-uitvoer, inline scripts en inline handlers;
   - de CSP vergelijken in alle vier de bronnen;
   - de publicatie controleren: wat er echt online komt, en de headers van de live site.
2. **Supabase-dashboard** (vul je bevindingen in het verslag in):
   - *Advisors › Security Advisor*: geen rode meldingen (bijvoorbeeld een tabel zonder RLS).
   - *Authentication › Users*: staat er iemand op actief die uit dienst is? Zet die op non-actief. Bestaan er onbekende accounts?
   - *Logs › Auth*: veel mislukte logins vanaf één IP-adres of op één account?
3. **Beveiligingsmeldingen en auditlog** (SQL Editor, alleen lezen):
   ```sql
   -- wat is er gemeld in de afgelopen maand?
   select soort, count(*) as aantal, max(t) as laatst
     from public.security_events where t > now() - interval '31 days'
    group by soort order by aantal desc;
   -- rolwijzigingen en geraakte limieten (horen zeldzaam te zijn)
   select t, wie, soort, details from public.security_events
    where soort in ('rol_gewijzigd', 'rate_limit_bereikt', 'mfa_mislukt', 'uitnodiging_bestaand_account')
      and t > now() - interval '31 days' order by t desc;
   -- verwijderingen (mag alleen het hoofd; bijvoorbeeld een AVG-verzoek)
   select t, wie, tabel, record_id from public.audit_log
    where actie = 'DELETE' and t > now() - interval '31 days' order by t desc;
   -- staat RLS op elke tabel aan? Verwacht: 0 rijen
   select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
   ```
   Let vooral op: veel `login_herhaald_mislukt` of `mfa_mislukt` voor één persoon, een `rol_gewijzigd` die niemand kan verklaren, en verwijderingen die niet door het hoofd zijn gedaan.
   Let op: `login_herhaald_mislukt` komt alleen binnen als er daarna op **hetzelfde toestel** wél iemand inlogt (de app bewaart de melding tot dan). Iemand die vanaf zijn eigen apparaat wachtwoorden raadt, zie je **alleen** in *Logs › Auth* (stap 2), niet in deze tabel.
   En: deze logboeken zijn alleen-toevoegen voor de app en voor gewone databasegebruikers, **niet** voor de eigenaar. Wie het databasewachtwoord of de SQL Editor van Supabase heeft, kan in onderhoudsstand regels verwijderen of de bewaking uitzetten. Houd die toegang dus klein (alleen Sven en het hoofd), en bewaar bij de maandcontrole een export van de uitkomst van deze drie zoekopdrachten buiten Supabase (bijv. in het beheerlogboek), zodat een latere wijziging opvalt.
4. **Verslag**: één regel in het beheerlogboek, met datum, uitkomst (`0 FOUT` / bevindingen) en eventuele acties.

## 2. Elk kwartaal (± 2 uur, beheerder en hoofd samen)

1. Alles van de maandcontrole, nu met de databasetests op een **lokale** testdatabase (nooit op productie):
   ```bash
   tools/periodieke_check.sh --db
   ```
   Zonder `PGHOST`/`PGUSER` draait de controle de databasetests op een kopie als OS-gebruiker `postgres` (vraagt `sudo`); verwacht `483 van 483 databasecontroles geslaagd`. Met een eigen test-server: `PGHOST=… PGPORT=… PGUSER=… tools/periodieke_check.sh --db`.
2. **Alle app-tests**: `node webapp/tests/run-all.js --extra -j 3` (alles PASS, ook `security.js` en `xss.js`).
3. **Gebruikers en rollen** met het hoofd doorlopen: wie is hoofd of coördinator, wie is inspecteur? Klopt dat nog? Heeft het hoofd nog tweestapsverificatie (MFA) aan?
4. **Supabase-instellingen** naast `supabase/README.md` §2 leggen: sign-ups uit, wachtwoord minimaal 12 tekens, *leaked password protection* aan, herstel-link maximaal 1 uur geldig, sessies met een tijdslimiet, redirect-URL's precies goed en eigen SMTP.
5. **Backup-hersteltest** (README §4): zet een backup terug in een testproject en open een paar foto's.
6. **Updates**: Supabase meldt Postgres-upgrades in het dashboard (*Settings › Infrastructure*); plan die in. De app zelf heeft geen npm-pakketten. Werk Playwright en Python bij als je ze lokaal gebruikt (alleen voor tests en tools, ze gaan niet online).
7. **Opruimen**: haal oude scripts in `tools/` weg die de controle als "waar niets naar verwijst" noemt, en verwijder testaccounts.

## 3. Elk jaar, en bij vertrek van een beheerder

- Sleutels roteren volgens §4 (stap 2 tot en met 5), ook zonder lek.
- Een grondige beveiligingsreview laten doen, bij voorkeur door iemand die niet aan de app heeft gebouwd. Gebruik `beveiligingsrapport.md` als startpunt.

---

## 4. Een gelekte of verdachte sleutel intrekken en vervangen (Supabase), stap voor stap

**Eerst intrekken, dan pas opruimen.** Een sleutel die in git, een chat, een mail of een screenshot heeft gestaan, geldt als gelekt, ook als je hem daarna weghaalt. Forks, kopieën en back-ups houden hem.

**Welke sleutel?**
| Sleutel | Waar | Ernst bij lek |
|---|---|---|
| *anon / publishable key* | `webapp/js/config.js` (publiek bedoeld) | laag: RLS beschermt de data. Alleen vervangen als er misbruik is (bijvoorbeeld spam). |
| *service_role / secret key* | alleen op een server of in de wachtwoordkluis, **nooit** in de app | **kritiek**: omzeilt alle RLS. Direct intrekken. |
| JWT-signing key / JWT-secret | Supabase (*Settings › JWT Keys*) | **kritiek**: daarmee kan iemand zelf tokens maken. |
| databasewachtwoord | wachtwoordkluis | **kritiek** |
| SMTP-wachtwoord / API-sleutel van de mailer | Supabase *Auth › SMTP* | hoog: phishing uit naam van Noardling |

**Stappen** (beheerder; het hoofd wordt direct gebeld bij "kritiek"):
1. **Vastleggen**: wat lekte er, waar, sinds wanneer en wie heeft het gezien? Zet het in het incidentlogboek.
2. **Nieuwe sleutel maken, dan de oude intrekken.**
   - *secret/service_role*: Supabase › *Settings › API Keys* › **Create new secret key**. Zet de nieuwe in de server-omgeving die hem gebruikt (nooit in `webapp/`). Kies daarna bij de oude sleutel **Revoke/Delete**. Gebruik je nog de oude "legacy" JWT-sleutels, schakel dan over op de nieuwe API-sleutels en zet de legacy-sleutels uit.
   - *publishable/anon*: maak een nieuwe publishable key aan. Zet hem in `webapp/js/config.js`, deploy (de service worker haalt de nieuwe versie op) en trek daarna de oude in.
   - *JWT-signing key*: *Settings › JWT Keys* › maak een nieuwe standby-sleutel en **Rotate** die naar actief. Trek daarna de oude in. Tokens die met de oude sleutel zijn ondertekend werken dan niet meer; iedereen logt opnieuw in.
   - *databasewachtwoord*: *Settings › Database* › **Reset database password**. Werk de wachtwoordkluis bij.
   - *SMTP*: maak bij de maildienst een nieuw wachtwoord of een nieuwe API-sleutel, zet die in *Auth › SMTP* en trek de oude in bij de maildienst.
3. **Sessies intrekken**: na een kritiek lek iedereen laten uitloggen. Dat gebeurt vanzelf bij een JWT-rotatie; kies daarnaast in de app **Overal uitloggen**, of gebruik bij *Authentication › Users* "Sign out user" per gebruiker. Laat het hoofd zijn MFA controleren.
4. **Nagaan wat er gebeurd is**: lees `audit_log` en `security_events` over de periode van het lek (zie de SQL in §1.3) en bekijk de API-logs (*Logs › API*): verzoeken met de service-rol vanaf onbekende IP-adressen?
5. **Opruimen**: haal de sleutel uit de code. Stond hij in git, schoon dan de geschiedenis met `git filter-repo`, inclusief tags, stashes en reflog (`git reflog expire --expire=now --all && git gc --prune=now`). Laat iedereen opnieuw clonen. Draai daarna `tools/periodieke_check.sh`; verwacht 0 FOUT.
6. **Melden**: kunnen persoonsgegevens geraakt zijn (namen, inspecties, foto's), dan beoordelen het hoofd en QHSE binnen 72 uur of het een datalek is voor de Autoriteit Persoonsgegevens (AVG art. 33). Leg de afweging vast, ook als je niet meldt.
7. **Leren**: hoe kon de sleutel lekken? Pas de werkwijze aan, bijvoorbeeld met een pre-commit-hook met `tools/secret_scan.sh --streng` en GitHub secret scanning met push protection.

## 5. Snelle verwijzingen

| Wat | Opdracht / plek |
|---|---|
| Alles in één keer | `tools/periodieke_check.sh [--url https://…] [--db] [--snel]` |
| Alleen geheimen | `tools/secret_scan.sh --onbereikbaar --streng` |
| Alleen publicatie en headers | `node webapp/tests/exposed.js --config --strict` · live: `--alles https://… --strict` |
| App-beveiliging in de browser | `node webapp/tests/run-all.js security` (start zelf een tijdelijke server; verwacht `1 PASS · 0 FAIL`) |
| Alle tests | `node webapp/tests/run-all.js -j 3` (met `--extra` ook `xss.js`) |
| Databaseregels | `tools/periodieke_check.sh --snel --db` (lokale PostgreSQL 16; draait `supabase/tests/run.sh` als gebruiker postgres) |
| Supabase-instellingen | `webapp/supabase/README.md` §2 en §3 |
