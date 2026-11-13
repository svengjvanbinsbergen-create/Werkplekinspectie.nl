# Supabase-backend voor Werkplekinspectie

Dit is de database- en beveiligingslaag van de Werkplekinspectie-app van Noardling B.V.
Alles wat de app mag en niet mag, wordt hier **in de database** afgedwongen met RLS,
triggers en rechten. De controles in de app zijn alleen gebruiksgemak.

| Bestand | Inhoud |
|---|---|
| `migrations/0001_tabellen.sql` | enums, tabellen, NOT NULL, lengte- en vorm-CHECKs, FK's, indexen, unieke namen |
| `migrations/0002_functies_validatie.sql` | rolhelpers, zichtbaarheid, `updated_at`, nieuw-account-triggers, statusmodel, functiescheiding, planningregels |
| `migrations/0003_rls_rechten.sql` | GRANT/REVOKE en Row Level Security op **elke** tabel |
| `migrations/0004_audit.sql` | auditlog (oud/nieuw als jsonb; bij wijzigen alleen de verschillen), schrijfquotum per gebruiker, append-only bewaking |
| `migrations/0005_storage.sql` | privébucket `fotos` (5 MB, jpeg/png/webp) en Storage-policies |
| `migrations/0006_rpc.sql` | `report_security_event` (rate-limited), `dashboard_cijfers`, `monteur_aanmelden` |
| `migrations/0007_invoer_aanvulling.sql` | beveiligingsronde: datumgrenzen (planning/plandatum), geen besturings- of bidi-tekens in vrije tekst (ook in `inspecties.record`), fotopaden in een inspectierecord alleen uit de eigen map, uploadquotum Storage (120/uur, 600/24 uur per gebruiker; geteld in `public.foto_uploads` met een lock per gebruiker, snel ook bij duizenden foto's), indexen op `acties.foto_pad`/`nafoto_pad`. Na de aanvalstest ook: C1-, zero-width- en richtingstekens geweigerd, en elke tekst in het record met dezelfde regel |
| `migrations/0008_rollen_beheer.sql` | rollen van het echte team: nieuwe rol `beheerder`; QHSE-manager en beheerder zien alles en beheren (team en rollen, instellingen, monteurs, auditlog), inspecteren en plannen niet; QHSE nooit actiehouder (wel toetser), beheerder geen van beide; nieuw profiel = **nog geen rol** (de rol `inspecteur` blijft alleen voor compatibiliteit, niemand krijgt hem nog); niemand wijzigt zijn eigen rol; MFA (aal2) voor alle beheerrollen; monteurslijst door hoofden en coördinatoren, `monteur_aanmelden` alleen voor wie inspecteert (hoofd met MFA); wie geen inspecterende rol krijgt, mag geen open planning meer hebben; dashboard voor iedereen met volledige inzage, doel standaard 85 en "geen doel" als JSON null (ook als PostgREST SQL NULL stuurt); `actie_log.wat` met `tekst_tekens_ok` en de zero-width joiner alleen tussen emoji; bewaartermijn 7 jaar (`bewaartermijn_opschonen()`: alleen afgesloten acties, ook oud verloop van verwijderde acties) |
| `schema.sql` | alle migraties samen (gegenereerd met `sh bouw-schema.sh`) |
| `seed.sql` | rollen voor de vaste gebruikers (op e-mailadres) en de standaardinstellingen (`doel_conform` = 85, `mfa_verplicht_hoofd`); **geen** voorbeelddata |
| `tests/` | lokale Supabase-emulatie, `rls_test.sql` (676 tests), `testdata.sql` (5 fictieve monteurs, alleen lokaal), `race_hoofd.sh`, `race_qhse.sh` (QHSE-manager én beheerder, als actiehouder en in de planning), `race_quotum.sh`, `naamsleutel_check.sh`, `tekens_check.sh`, `sleutelcheck.sh`, `run.sh` |

Wijzig nooit `schema.sql` met de hand: pas de migratie aan en draai `sh supabase/bouw-schema.sh`.

---

## 1. Toepassen in een echt Supabase-project

1. **Project aanmaken in de EU** (bijv. regio *Central EU (Frankfurt)*). Kies een sterk
   databasewachtwoord en bewaar het in de wachtwoordkluis, niet in git.
2. **Instellingen vóór de eerste data** (zie §2 en §3): signups uit, wachtwoordregels,
   JWT-duur, redirect-URL's.
3. **Schema laden** — kies één van twee:
   - *SQL Editor*: plak `schema.sql` en voer uit. Het script is idempotent; opnieuw draaien
     mag, ook over een eerdere v1-versie heen (ontbrekende kolommen en CHECKs worden toegevoegd).
   - *Supabase CLI*: `supabase link --project-ref <ref>` en daarna `supabase db push`
     (de bestanden in `migrations/` volgen het CLI-formaat `<versie>_<naam>.sql`; kopieer
     ze naar `supabase/migrations/` van het CLI-project).
   Het oude v0.1-schema (uuid-id's, `actie_status` open/afgerond) is nooit in productie
   gebruikt. Staat het toch in een testproject, dan stopt `0001` met een duidelijke melding.
   Begin dan met een **nieuw project**, of zet de database van het gekoppelde project terug met
   de CLI: `supabase db reset --linked` (wist **alle** data en draait de migraties opnieuw; het
   dashboard heeft hier geen knop voor).
4. **Gebruikers uitnodigen.** Het profiel ontstaat automatisch **zonder rol** (sinds 0008; zonder rol is er
   nog nergens toegang, de app zegt "Je account heeft nog geen rol") en wordt **actief zodra de uitnodiging is
   verstuurd** (`auth.users.invited_at`; Supabase Auth maakt de gebruiker aan en zet `invited_at` in dezelfde
   transactie). Daarna kiest een hoofd, de QHSE-manager of de beheerder de rol in de app (**Beheer › Team en
   rollen**: hoofd, coördinator, QHSE-manager of beheerder; de oude rol `inspecteur` wordt niet meer toegekend).
   Een rol uit metadata wordt **genegeerd** (die kan de gebruiker zelf zetten). Uitnodigen zelf kan niet vanuit de
   app (daarvoor is de secret/service_role-sleutel nodig): de beheerder doet dat als lid van het Supabase-project.
   Voor de naam zijn er twee werkende routes:
   - **Dashboard** (*Authentication › Users › Invite user*): dat venster vraagt alléén een
     e-mailadres, er is geen veld voor user metadata. Het profiel heet dan eerst naar het deel
     vóór de @ (bv. `bjorn.sloos`). Voor de drie vaste gebruikers zet `seed.sql` (stap 5) de
     volledige naam. Voor latere collega's zet een beheerrol (of SQL als `postgres`) de naam:
     `update public.profiles set full_name = 'Voornaam Achternaam' where id = '<uid>';`
     (Beheer › Team en rollen wijzigt rol en activering, nog niet de naam).
   - **Admin API** (alleen server-side, nooit in de app of in git, met de *secret/service_role*
     key uit de wachtwoordkluis), met de naam als metadata:
     ```sh
     curl -s -X POST "https://<project-ref>.supabase.co/auth/v1/invite" \
       -H "apikey: $SECRET_KEY" -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
       -d '{"email":"naam@bedrijf.nl","data":{"full_name":"Voornaam Achternaam"}}'
     ```
     (of `supabase.auth.admin.inviteUserByEmail(email, { data: { full_name } })` in een
     server-side script). Onzichtbare tekens in de naam worden verwijderd.

   **Eerste wachtwoord.** Een uitgenodigde collega heeft nog geen wachtwoord. De link in de
   uitnodigingsmail komt in de app binnen als `#access_token=…&type=invite`; de huidige app
   (`auth.js` verwerkHash) behandelt alleen `type=recovery` als "nieuw wachtwoord" en toont bij
   een uitnodiging gewoon het inlogscherm. Tot de client dat oplost (§8, punt 1) geldt:
   1. Klik op de link in de uitnodigingsmail (daarmee is het e-mailadres bevestigd; de app
      toont daarna het inlogscherm).
   2. Kies op het inlogscherm **"Wachtwoord vergeten?"**, vul het eigen e-mailadres in en stel
      via de link in die mail een wachtwoord in (minimaal 12 tekens).
   Zet die twee stappen ook in de uitnodigingsmail: *Authentication › Email Templates › Invite
   user*, bv. "Klik op de link hieronder en kies daarna in de app 'Wachtwoord vergeten?' om je
   wachtwoord in te stellen." (Laat `{{ .ConfirmationURL }}` staan.)

   Een account dat níet via een uitnodiging ontstaat (*Add user*, of een aanmelding als
   signups per ongeluk aan staan) krijgt een **inactief** profiel met een **neutrale naam**
   (`Niet-uitgenodigd account 1a2b3c4d`; de naam uit de aanmelding telt niet, zodat niemand
   vooraf de naam van een collega kan bezetten) en is voor de andere leden **onzichtbaar**. Het
   hoofd (of SQL als `postgres`) beoordeelt zo'n account en activeert het bewust, met de juiste naam:
   `update public.profiles set actief = true, full_name = 'Voornaam Achternaam' where id = '<uid>';`
   Controleer na elke uitnodiging in *Table Editor › profiles* dat `actief = true` is.

   **Let op — signups móéten uit staan (§2).** Staan signups aan, dan kan iemand zich alvast
   aanmelden met het e-mailadres van een toekomstige collega en zelf het wachtwoord kiezen.
   Nodigt het hoofd dat adres later uit, dan nodigt Supabase Auth dat bestaande, onbevestigde
   account uit. De database activeert zo'n **al eerder bestaand** account daarom **niet**
   automatisch (alleen een account dat in dezelfde transactie als de uitnodiging ontstond:
   `profiles.created_at = now()`, zonder tijdvenster; ook een aanmelding van een paar seconden
   eerder telt als "al bestaand") en
   schrijft een `security_event` `uitnodiging_bestaand_account`. Blijft een collega na de
   uitnodiging inactief, kijk dan in `security_events`: verwijder dat account in
   *Authentication › Users* en nodig opnieuw uit (of activeer het bewust als je zeker weet dat
   het account van de collega zelf is, bv. na een eerdere *Add user*). Controleer daarnaast vóór elke uitnodiging
   in *Authentication › Users* dat het adres nog niet bestaat.
5. **`seed.sql` invullen en draaien** (SQL Editor). Vervang in blok 1 (beide statements) de
   drie voorbeeldadressen (`…@VUL-IN.invalid`) door de **echte e-mailadressen** van Björn Sloos,
   Winfred Loerts en Douwe de Boer, precies zoals in *Authentication › Users*. Draai het nadat
   de uitnodigingen zijn verstuurd. Het koppelt naam, rol en functie op **e-mailadres van een
   uitgenodigd account**, nooit op naam. De naam wordt alleen gezet zolang het profiel nog de
   beginnaam (deel vóór de @) heeft, de rol alleen zolang het nog geen rol heeft (of de oude
   beginrol `inspecteur`); opnieuw draaien is veilig. Daarnaast: `mfa_verplicht_hoofd = false` en
   `doel_conform = 85` (besluit producteigenaar; een bestaande keuze blijft staan). De overige vaste
   gebruikers (tweede hoofd "Manager Projects", QHSE-manager, beheerder) krijgen hun rol in de app.
   Er komen **geen** monteurs in: voorbeelddata hoort nooit op de server. Het hoofd voert de
   echte namen in via Beheer. Nooit wachtwoorden in SQL.
   *Eerder een oudere `seed.sql` gedraaid?* Die zette vijf fictieve monteurs in het project
   (Henk Voorbeeld, Pieter Proef, Sander Test, Kees Demo, Ruben Fictief). Verwijder ze als
   `postgres` in de SQL Editor (de auditlog houdt het vast):
   ```sql
   delete from public.monteurs
    where naam in ('Henk Voorbeeld', 'Pieter Proef', 'Sander Test', 'Kees Demo', 'Ruben Fictief');
   ```
   *Bijwerken over een eerdere v1-installatie.* Twee regels zijn strenger geworden:
   - Namen vergelijkt de database nu precies zoals `beheer.js` (ook spaties en leestekens tellen
     niet mee). Staan er twee monteurs of profielen die nu dezelfde sleutel hebben (bv. "Henk
     Voorbeeld" en "Henk-Voorbeeld"), dan stopt het laden bij `reindex` met een duidelijke fout.
     Zoek ze vooraf op en voeg ze samen (of hernoem er één):
     `select naam from public.monteurs where public.naam_sleutel(naam) in (select public.naam_sleutel(naam) from public.monteurs group by 1 having count(*) > 1);`
     (dat werkt pas nadat 0001 de nieuwe `naam_sleutel` heeft gemaakt; draai anders de functie
     uit 0001 eerst los).
   - Een planning met `status = 'uitgevoerd'` moet een `inspectie_id` hebben. Oude rijen zonder
     inspectie blokkeren de migratie niet (de CHECK wordt dan `NOT VALID` toegevoegd en er komt
     een `WARNING`); nieuwe en gewijzigde rijen moeten wel voldoen. Opsporen:
     `select id, datum, inspecteur from public.planning where status = 'uitgevoerd' and inspectie_id is null;`
     Zet ze terug op `gepland` of koppel de juiste inspectie, en valideer daarna:
     `alter table public.planning validate constraint planning_uitgevoerd_inspectie;`
   - De database gebruikt de ICU-collatie `und-x-icu` (voor kleine letters en "letter of cijfer"
     in namen). Die heeft Supabase standaard; controleer bij twijfel:
     `select collname from pg_collation where collname = 'und-x-icu';` (verwacht één rij).
6. **App koppelen**: vul `webapp/js/config.js` in met `supabaseUrl`
   (`https://<project-ref>.supabase.co`) en de *anon/publishable* key (*Settings › API Keys*).
   **CSP op vier plekken bijwerken.** In `connect-src` staat de plaatshouder
   `https://project-ref.supabase.co`; vervang die door de exacte project-URL in **alle vier**:
   `webapp/index.html` (meta-tag), `webapp/_headers` (Netlify/Cloudflare Pages),
   `webapp/netlify.toml` en `webapp/vercel.json`. De HTTP-header van de host geldt náást de
   meta-tag: wie alleen de meta-tag aanpast, blijft door de header geblokkeerd en dan
   synchroniseert er niets. Gebruik geen wildcard `*.supabase.co`. `img-src` hoeft de
   project-URL niet te bevatten (en hoort hem niet te bevatten): foto's worden met `fetch`
   opgehaald en als `data:`/`blob:`-URL getoond (§5, *Foto's*).
   Draai daarna de sleutelcontrole uit §3.
7. **Controle**: *Advisors › Security Advisor* moet zonder fouten zijn
   (RLS aan, vaste `search_path`, geen open functies). Draai daarna de API-tests uit §7.
8. **Data API** (*Settings › API / Data API*): exposed schemas alleen `public`;
   *Max rows* 1000. Zet GraphQL (`pg_graphql`) uit als de app het niet gebruikt
   (minder aanvalsoppervlak).

## 2. Auth-instellingen (Dashboard › Authentication)

De namen van menu's kunnen per dashboardversie iets verschillen; de waarden niet.

| Instelling | Waarde | Waarom |
|---|---|---|
| *Allow new users to sign up* | **uit** (alleen uitnodigingen) | geen vreemde accounts met de publieke anon-key. Staat het toch aan, dan zijn nieuwe accounts inactief (zie §1.4) |
| *Confirm email* | aan | |
| Minimale wachtwoordlengte | **12** | geen verplichte periodieke wijziging |
| *Prevent use of leaked passwords* | **aan** (Pro-plan) | toetsing tegen HaveIBeenPwned |
| E-mail-OTP / magic link / herstel-link geldig | **≤ 3600 s** (advies 900 s) | korte geldigheid van links |
| MFA › TOTP | **aan** | verplicht voor het hoofd (zie hieronder) |
| JWT-geldigheid (access token) | **3600 s** | gestolen token verloopt snel; uitloggen geldt pas na expiry |
| *Refresh token rotation* | **aan**, reuse interval 10 s | hergebruik van een oud refresh token wordt gedetecteerd |
| Sessies (Pro): time-box / inactivity timeout | 7 dagen / 8 uur | |
| *Rate limits* | inloggen ±30 per 5 min per IP; e-mail ±2 per uur; OTP-verificaties ±30 per 5 min | brute force en mailspam |
| CAPTCHA (Turnstile/hCaptcha) | optioneel | bij invite-only weinig meerwaarde; MFA is belangrijker |
| *URL Configuration › Site URL* | de productie-URL, bv. `https://app.<domein>.nl` | |
| *Redirect URLs* | exact de eigen URL's, bv. `https://app.<domein>.nl/**`; **geen** `localhost` in productie | voorkomt token-lekken via open redirects |
| *SMTP* | eigen SMTP-dienst (EU) met SPF/DKIM | de standaardmailer is alleen voor testen |

**MFA voor de beheerrollen (hoofden, QHSE-manager, beheerder).** De app vraagt deze drie rollen bij elke login
een TOTP-code (bij de eerste keer eerst koppelen met een QR-code; `supabase.auth.mfa.enroll/challenge/verify`) en
bewaart voor hen nooit een refresh-token. Zet daarna `instellingen.mfa_verplicht_hoofd` op `true` (de naam is
gebleven; sinds 0008 geldt hij voor alle drie de beheerrollen). Vanaf dan hebben zij **alle** extra rechten alleen
nog met een sessie op niveau `aal2`: de beheerroutes (team en rollen, monteurs, instellingen, auditlog,
verwijderen), volledige inzage (alle inspecties en acties, dashboard) en voor de hoofden ook de staf-rechten
(acties inhoudelijk wijzigen, planning van anderen). Met alleen een wachtwoord (`aal1`) zien zij alleen hun eigen
werk; een gestolen wachtwoord geeft dus geen inzage in alles. Weer uitzetten kan alleen met `aal2`.

**CORS.** De REST- en Storage-API van Supabase hebben geen eigen origin-allowlist;
RLS is daar de grens, niet CORS. Gebruik je later Edge Functions, zet daar
`Access-Control-Allow-Origin` op exact de app-URL (nooit `*`).

## 3. Sleutels en sleutelrotatie

- In de app (client) staat **alleen** de project-URL en de *anon/publishable* key.
  Die is publiek; RLS beschermt de data.
- De *service_role/secret* key en het databasewachtwoord komen **nooit** in de app, in
  git of in een CI-variabele die de app bouwt.
- **Controle vóór elke deploy** (vanuit de repo-root): `sh webapp/supabase/tests/sleutelcheck.sh webapp`.
  Geen uitvoer = goed. Het script zoekt echte sleutelwaarden (`sb_secret_…` gevolgd door de
  sleutel) en decodeert elke JWT-sleutel (`eyJ…`) in `webapp/`: alles met een andere rol dan
  `anon` (bv. `service_role`) wordt gemeld. Een simpele `grep` op het woord `service_role` werkt
  niet: dat woord staat terecht in de migraties en in deze README.
- **Periodiek** (maandelijks): `tools/periodieke_check.sh` (geheimenscan over de hele git-geschiedenis,
  sleutel in `config.js` echt anon/publishable, debug uit, CSP, publicatie-allowlist). Stappenplan voor het
  intrekken en vervangen van een gelekte sleutel: `webapp/docs/beveiliging-periodiek.md` §4.
- **Rotatie** (jaarlijks, bij vertrek van een beheerder en direct bij een vermoed lek):
  1. *Settings › API Keys*: maak een nieuwe secret/publishable key aan, zet de nieuwe in
     server-side omgevingen en in `webapp/js/config.js`, en trek daarna de oude in.
  2. *Settings › JWT Keys*: roteer de signing key (nieuwe key eerst als standby, dan
     activeren; oude tokens verlopen binnen de JWT-duur van 1 uur).
  3. Databasewachtwoord wijzigen (*Settings › Database*).
  4. Bij een lek: daarna alle sessies intrekken (gebruikers opnieuw laten inloggen) en de
     auditlog/security_events van de periode nalopen. Meld een datalek binnen 72 uur bij
     de AP als persoonsgegevens geraakt kunnen zijn (AVG art. 33).

## 4. Backups, PITR en bewaartermijn

- **Dagelijkse backups** zitten in het Pro-plan (7 dagen). **PITR** (herstel tot op de
  seconde) is een betaalde add-on; aanbevolen zodra de app echt in gebruik is.
- Daarnaast wekelijks een eigen export buiten Supabase (versleuteld, EU-opslag):
  `supabase db dump --data-only -f backup.sql` en een export van de bucket `fotos`.
- **Hersteltest** elk kwartaal in een apart (test)project: zet een backup terug, draai
  `tests/rls_test.sql`-achtige controles en controleer of foto's te openen zijn.
  Een backup zonder geoefend herstel is geen garantie.
- **Bewaartermijn: 7 jaar** (besluit producteigenaar; migratie 0008). `public.bewaartermijn_opschonen()` verwijdert
  in één transactie wat ouder is dan 7 jaar: inspecties (`opgeslagen`), **afgesloten** acties (status Afgerond of
  Vervallen én laatst gewijzigd, `updated_at`, vóór de grens; een actie die nog loopt wordt dus nooit stil
  weggehaald, hoe oud ook) en planning (`datum`), met hun verloop (`actie_log`) en hun regels in `audit_log` (anders
  bleef de inhoud daar staan), het verloop ouder dan 7 jaar van acties die al eerder zijn verwijderd (dat verloop
  blijft bij het verwijderen bewust staan, zie §5), plus alle auditregels ouder dan 7 jaar en
  beveiligingsgebeurtenissen ouder dan 12 maanden. Foto's van die records die geen overblijvend record nog gebruikt,
  komen in `public.bewaartermijn_fotos` (een rij in `storage.objects` mag je in Supabase niet met SQL weghalen: het
  bestand blijft dan staan). Alleen de eigenaar (`postgres`) mag de functie uitvoeren; de app en `service_role` niet.
  ```sql
  select public.bewaartermijn_opschonen(p_proef => true);   -- eerst tellen (verwijdert niets)
  select public.bewaartermijn_opschonen();                  -- uitvoeren (minstens 7 jaar; p_jaren => 8 mag ook)
  select pad from public.bewaartermijn_fotos;               -- deze foto's daarna via de Storage-API verwijderen
  ```
  Foto's verwijderen (server-side, met de secret key uit de wachtwoordkluis, nooit in de app of in git), daarna de
  lijst leegmaken:
  ```sh
  curl -s -X DELETE "https://<project-ref>.supabase.co/storage/v1/object/fotos" \
    -H "apikey: $SECRET_KEY" -H "Authorization: Bearer $SECRET_KEY" -H "Content-Type: application/json" \
    -d '{"prefixes":["<pad 1>","<pad 2>"]}'
  ```
  ```sql
  delete from public.bewaartermijn_fotos where pad in ('<pad 1>', '<pad 2>');
  ```
  **Planning (maandelijks).** Met pg_cron (*Database › Extensions › pg_cron* aanzetten), als `postgres` in de SQL
  Editor; de taak draait als `postgres`:
  ```sql
  select cron.schedule('wpi-bewaartermijn', '17 3 1 * *', $$select public.bewaartermijn_opschonen()$$);
  -- controleren: select * from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'wpi-bewaartermijn') order by start_time desc limit 5;
  ```
  Zonder pg_cron: elke maand handmatig (zelfde opdrachten; staat op de checklist in `docs/beveiliging-periodiek.md`).
  De foto's blijven een handmatige stap (Storage-API). Getest in `tests/rls_test.sql`, sectie 26f.
- **Logs zijn append-only.** `audit_log`, `actie_log` en `security_events`: UPDATE, DELETE en TRUNCATE worden door
  triggers geweigerd, ook voor `service_role`. Alleen de eigenaar (`postgres`) kan in onderhoudsmodus opschonen
  (`set local wpi.onderhoud = 'aan';` in een transactie); `bewaartermijn_opschonen()` doet dat zelf, alleen binnen
  zijn eigen transactie. Stem de termijnen af met het privacybeleid (AVG) en het VCA-dossier.

## 5. Datacontract voor de client

**Algemeen**

- Auth via `/auth/v1`, data via `/rest/v1/<tabel>` met `apikey` (anon) + `Authorization: Bearer <JWT>`.
- **Upsert**: `POST /rest/v1/<tabel>?on_conflict=id` met `Prefer: resolution=merge-duplicates`.
  Volledig ondersteund: controles op nieuwe rijen draaien pas als de rij echt nieuw is.
  Met `return=representation` moet de teruggegeven rij voor jou zichtbaar zijn; dat is zo
  geregeld (maker, houder, toetser, wie instelde of liet vervallen, …).
- **Volgorde**: een actie met `inspectie_id` vereist dat die inspectie al op de server staat
  (FK). Dus `inspecties` vóór `acties`, en `actie_log` na de actie zelf. `planning` heeft geen
  FK en mag op elk moment (de client stuurt inspecties → acties → planning; dat is goed).
- **Id's.** De database accepteert elk id in de vorm `^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$`, maar
  een nieuw id met een tijdstip (`WPI-<ms>`, `ACT-<ms>-<n>`, `PL-<ms>`) mag **niet meer dan
  5 minuten in de toekomst** liggen. Daarnaast geldt per gebruiker een limiet op echt nieuwe
  rijen: 30 inspecties, 300 acties en 100 planningen per uur (fout 54000 met Nederlandse
  melding). Zo kan niemand de (uit de klok voorspelbare) id's van collega's vooraf claimen.
  Advies voor de client: voeg een willekeurig deel toe (bv. `"ACT-" + Date.now() + "-" + n + "-" + 6 tekens uit crypto.getRandomValues`).
- **Klok van het toestel.** Loopt de klok van een telefoon meer dan 5 minuten **voor**, dan
  weigert de server elk nieuw `WPI-`/`ACT-`/`PL-`-id (tijdstip in de toekomst) en elke nieuwe
  inspectie (`opgeslagen` in de toekomst), met fout 22023 en de melding "…staat de klok van het
  toestel goed?". Dat is een HTTP 400: de app toont "Mislukt — opnieuw" en het blijft mislukken
  tot de klok klopt. Advies aan alle gebruikers: **automatische datum en tijd aan** (Instellingen
  van de telefoon). Een klok die achterloopt is geen probleem (tot 30 dagen voor `opgeslagen`).
- **Bestaat dit id al? (restrisico).** Een upsert op het id van een rij van een ander (die je
  niet mag wijzigen) geeft een RLS-fout in plaats van een gewone insert; daaraan zie je dat het
  id bestaat. Met één globale primaire sleutel is dat niet te vermijden. Je leert er alleen uit
  dat iemand op dat moment (ms) iets aanmaakte, niet wie of wat. De inhoud blijft afgeschermd,
  claimen van toekomstige id's is begrensd (5 minuten + limieten per uur) en met een willekeurig
  deel in het id (§8, punt 8) is raden kansloos.
- **Voorbeelddata nooit versturen.** Id's met `demo` als begin of na een streepje
  (`ACT-demo1`, `PL-demo3`, `WPI-demo…`, hoofdletterongevoelig) weigert de database
  (CHECK `*_geen_demo`). Ook de voorbeeldgebruikers (`u-coord1`, `u-hoofd`, …) bestaan niet
  op de server; `houder`/`toetser`/`inspecteur` zijn altijd echte profiel-uuid's.
- **Door de server gezet, meesturen mag** (wordt overschreven): `updated_at`, `created_at`
  (inspecties, planning, acties, monteurs, instellingen), `planning.gemaakt_door`,
  `acties.aangemaakt_door`, `acties.ingesteld_door`, `acties.vervallen_door`,
  `acties.uitvoerders`, `inspecties.opgeslagen` (bij wijzigen), `acties.klaar_op`,
  `acties.nafoto_door`, `acties.afgerond_server`, `actie_log.wie`.
- **Door de server gezet, NOOIT meesturen** (kolomrecht: meesturen geeft `permission denied`,
  HTTP 403, en blijft mislukken): `actie_log.id`, `actie_log.t`, `actie_log.bron` (bij
  `actie_log` mogen alleen `actie_id`, `wat`, `wie` en `t_client` mee) en bij `profiles` alles
  behalve `full_name`, `functie`, `role` en `actief` (dus nooit `uitgenodigd`, `id`,
  `created_at` of `updated_at` in een PATCH op `profiles`).
- **Foutcodes.** De database geeft een SQLSTATE met een Nederlandse melding; PostgREST zet die
  om in een HTTP-status. De client moet op `body.code` beslissen (dat doet `sync.js`), niet op de
  status alleen:

  | SQLSTATE | betekenis | HTTP (PostgREST) | tijdelijk? |
  |---|---|---|---|
  | `22023`, `22P02`, `23514`, `23502` | ongeldige waarde, CHECK, verplicht veld | 400 | nee |
  | `42501` | geen recht (RLS, trigger, kolomrecht) | 403 (401 zonder JWT) | nee |
  | `23503` | persoon/inspectie onbekend of niet actief (bv. "Actiehouder onbekend of niet actief") | 409 | nee |
  | `23505` | dubbel (id, naam) | 409 | nee |
  | `54000` | limiet of schrijfquotum ("probeer het later opnieuw") | 413 | **ja** |

**Acties — statusmodel** (fouten: zie *Foutcodes* hierboven)

- Nieuw: `Voorstel` of `Open` (handmatig, met houder/toetser/plandatum); `Afgerond` alleen bij
  *ter plaatse gecorrigeerd*: vanuit de eigen inspectie, zonder houder, met de inspecteur
  zelf als toetser.
- **Offline-first: samengestelde overgangen.** De outbox van `sync.js` stuurt per actie alleen
  de laatste stand. De server accepteert daarom ook `Voorstel → In uitvoering`,
  `Voorstel → Klaar voor toetsing` en `Open → Klaar voor toetsing` in één upload, en een
  **nieuwe** actie die bij de eerste upload al `In uitvoering`, `Klaar voor toetsing` of
  `Vervallen` is — mits wie het stuurt **elke tussenstap** zelf had mogen zetten (instellen:
  iedereen; uitvoeringsstap: de houder of staf, nooit de toetser; na-foto: de houder of staf,
  eigen upload). In het verloop staan ze als losse stappen, de tussenstappen met
  "(impliciet)". `Afgerond` is nooit samengesteld (toetsen doet een ander dan de uitvoerder),
  behalve *ter plaatse gecorrigeerd*. De client hoeft hiervoor niets te veranderen.
- Een actie met `inspectie_id` maakt **alleen de inspecteur van die inspectie** aan (ook
  coördinator, hoofd en QHSE niet), en alleen als **kopie van één waarneming uit de vastgelegde
  momentopname**: in `inspecties.record.waarnemingen` staat precies één waarneming met
  `actie.actie_id` = het id van de actie (zo legt `inspectie.js` het al vast). De server
  vergelijkt: `oordeel` = het oordeel van die waarneming (A of V), `waarneming` = de getrimde
  `tekst` van die waarneming, `prio` = `actie.prio`, en `Afgerond` bij het aanmaken alleen als
  `actie.terPlaatse = 'gecorrigeerd'`. Een actie later aan een inspectie toevoegen (die niet in
  het record staat) kan dus niet. `ref` (bv. "DAM-2.07") haalt de app uit de catalogus en staat
  niet in het record; die controleert de server bij het aanmaken niet (restrisico §9), maar hij
  ligt daarna wel vast.
- **Oordeel.** Een actie zonder inspectie heeft oordeel `–`; leeg (`null`) wordt bij het aanmaken
  `–`, en bij wijzigen zijn `null` en `–` hetzelfde (geen wijziging). Zo werkt de heen-en-terug
  van de app: `sync.js` maakt van `–` bij het ophalen `null` en stuurt dat terug; dat wordt niet
  meer als "oordeel gewijzigd" geweigerd. Een echt oordeel (C/A/V/NVT) wijzigt niemand.
- Een `Voorstel` mag **zonder tekst** (de inspecteur kan "toch vastleggen" met een open punt;
  ook *ter plaatse gecorrigeerd* mag zonder tekst). Vanaf `Open` is tekst verplicht (CHECK
  `acties_tekst_lengte`); wie instelt vult hem in.
- `Voorstel → Open` (instellen) en `Voorstel → Vervallen`: **iedereen** (bedrijfsbesluit),
  via upsert of PATCH. De server legt vast wie instelde (`ingesteld_door`) of liet vervallen
  (`vervallen_door`); die persoon blijft de actie zien en kan daarna de toelichting
  ("Ingesteld: …", "Voorstel vervallen: <reden>") in het verloop zetten.
  Iedereen ziet daarom alle voorstellen en mag **bij het instellen** tekst, houder, toetser en
  plandatum kiezen. Tussendoor aan andermans voorstel sleutelen (tekst leegmaken, plandatum
  steeds verzetten) kan niet: dat mogen alleen de **waarnemer** (wie de actie aanmaakte of de
  inspecteur van de bron-inspectie) en staf. Laat een ander het voorstel vervallen, dan blijft de
  inhoud zoals hij was (een verouderde kopie op een toestel overschrijft niets).
- **Waarneming, referentie en dringendheid (`prio`) van een actie uit een inspectie** (of met
  een oordeel C/A/V/NVT) liggen vast vanaf het aanmaken, **ook voor de inspecteur zelf**: ze zijn
  een kopie van de bevroren momentopname. Bij een **handmatige** actie wijzigt **alleen de
  waarnemer** (wie hem aanmaakte) waarneming, referentie, dringendheid, foto en `handmatig`; ook
  staf niet. Een actie die `service_role`/`postgres` aanmaakte (correctie of import,
  `aangemaakt_door` leeg) heeft géén waarnemer: dan wijzigt niemand die velden via de app, en
  tekst/houder/toetser/plandatum alleen bij het instellen. Het oordeel wijzigt niemand. Zo blijft
  "alleen wat de inspecteur zag telt" waar en blijft een bewijsfoto "in gebruik" (niet te verwijderen).
- `Open → In uitvoering → Klaar voor toetsing`: de houder of een coördinator/hoofd, **maar
  nooit de toetser**. `Open → Klaar voor toetsing` mag in één stap en wordt als twee
  stappen gelogd.
- `Klaar voor toetsing → Afgerond` (akkoord) of `→ In uitvoering` (niet akkoord): **alleen
  de toetser**.
- **Functiescheiding, ook voor coördinator/hoofd.** De server houdt `uitvoerders` bij: de houder
  bij het instellen, elke latere houder en iedereen die een uitvoeringsstap zette of een
  na-foto toevoegde. De toetser mag daar nooit in staan: je kunt dus niet eerst houder zijn en
  daarna toetser worden. Een houder die alleen in het **voorstel** even gekozen was, telt niet
  (een voorstel heeft nog geen uitvoerders). Vanaf `Klaar voor toetsing` liggen houder en
  toetser vast.
- De koppeling met de inspectie (`inspectie_id`) ligt vast. Was hij leeg, dan blijft hij
  stil leeg, wat het toestel ook stuurt (zo verraadt de server niet welke inspectie-id's bestaan).
- Houder en toetser: actief, verschillend, en **nooit de QHSE-manager** (ook niet als toetser:
  QHSE blijft onafhankelijk, zoals in de app). Dat geldt ook achteraf: het hoofd kan iemand die
  houder of toetser is van een lopende actie (`Voorstel` t/m `Klaar voor toetsing`) **niet** de
  rol `qhse` geven ("wijs die eerst aan een ander toe"), en bij elke statuswijziging controleert
  de server de huidige rol van houder en toetser opnieuw. Gelijktijdig toewijzen en de rol
  wijzigen kan elkaar niet passeren (rij-slot op het profiel; `tests/race_qhse.sh`).
- `Afgerond` en `Vervallen` liggen vast. Na het instellen wijzigt alleen staf
  tekst/houder/toetser/plandatum.
- **Offline akkoord**: stuur bij `Afgerond` het moment van het toestel mee in `afgerond_op`.
  De server accepteert dat alleen tussen `klaar_op` (wanneer de server "Klaar voor toetsing"
  ontving) en nu, en niet ouder dan 30 dagen; anders geldt de servertijd. `afgerond_server`
  is altijd de ontvangsttijd. Kwartaal- en op-tijd-cijfers gebruiken `afgerond_op`.

**actie_log (verloop)**

- Elke statuswijziging schrijft de server zelf (`bron = 'server'`, bv. `Status: Open → In uitvoering`).
  Het verloop begint altijd bij de echte beginstand: een actie uit een inspectie met
  `Aangemaakt met status Voorstel`, ook als hij bij de eerste upload al `Open` of verder is
  (daarna `Status: Voorstel → Open`, …); een handmatige actie met `Aangemaakt met status Open`;
  *ter plaatse gecorrigeerd* met `Aangemaakt met status Afgerond`.
- De client voegt toelichting toe met `POST /rest/v1/actie_log` (`actie_id`, `wat`, optioneel
  `wie` en `t_client` = moment op het toestel). Alleen die vier kolommen mogen mee (kolomrecht):
  `id`, `t` en `bron` zet de server. Een zelfgekozen `id` kon het volgende id van een ander
  "claimen" en diens opslaan laten mislukken; dat wordt nu geweigerd (`permission denied`) en de
  server neemt het id altijd uit de reeks. Dat mag alleen wie **betrokken** is bij de actie: staf/QHSE,
  houder, toetser, aanmaker, wie instelde of liet vervallen, en de inspecteur van de bron-inspectie
  (niet elk teamlid dat een voorstel of te late actie alleen kan zien). Per gebruiker max 30
  regels per actie per uur, 60 per uur, 300 per 24 uur en 1 MiB per 24 uur (plus het gezamenlijke
  dagquotum, zie *Auditlog en schrijfquotum*); daarboven fout 54000.
- Zulke regels zijn altijd `bron = 'client'`, en mogen nooit lijken op een regel van de server (0008, sectie 8):
  - tekenregel `verloop_tekens_ok` (trigger én CHECK `actie_log_wat_tekens`): alles wat `tekst_tekens_ok` weigert,
    plus: de zero-width joiner (U+200D) alleen tussen twee emoji (👷‍♀️); variatiekiezers U+FE00–FE0D en de Mongoolse
    U+180B–180F nooit; VS15/VS16 (U+FE0E/FE0F) alleen direct na een emoji-teken (❤️) of als VS16 in een toetsdop
    (1️⃣); geen braillespatie U+2800; en minstens één zichtbaar teken (alleen spaties/U+00A0/U+3000 = leeg);
  - `verloop_lijkt_serverregel`: het skelet van de tekst (`verloop_skelet`: NFKD, kleine letters, Cyrillische,
    Griekse, Cherokee-, Lisu- en kleine-hoofdletter-lookalikes en 0/1/3/4/5/7/$/@/| naar de Latijnse letter, daarna
    alleen a–z) mag niet beginnen met `status`, `aangemaaktmetstatus` of `actiehoudertoetserofplandatumgewijzigd`.
    Zo vallen ook `Status∶` (U+2236), `Status꞉` (U+A789), `Ѕtatus:` (Cyrillische S), `S t a t u s:` en `- Status :`
    af. De app begint haar eigen regels altijd met een vast woord ("Ingesteld", "Klaar voor toetsing gemeld", …).
  `js/sync.js` (`schoonLog`, `zichtbaar`, `skelet`, `logTekst`) volgt precies dezelfde regels; `tests/tekens_check.sh`
  vergelijkt ze voor elk codepunt en voor ruim 36 000 randgevallen. Daarnaast leest de app `bron` en toont ze
  serverregels herkenbaar ("automatisch"), zodat een eventueel toch doorgelaten lookalike nooit als serverregel oogt.
  `t_client` wordt bewaard als het tussen 30 dagen geleden en nu (+5 min) ligt, anders leeg.
- Het verloop blijft na het verwijderen van een actie bewaard (AVG-bewaartermijn, audit; na 7 jaar haalt
  `bewaartermijn_opschonen()` het weg, §4), maar
  je ziet alleen regels vanaf het aanmaken van de actie die nu bestaat: wie later een actie met
  hetzelfde id aanmaakt, ziet het oude verloop niet.
- Ophalen: `GET /rest/v1/actie_log?select=actie_id,t,t_client,wie,wat,bron&order=t.asc,id.asc`.
  Toon `t_client ?? t`. De serverregels zijn het auditspoor; de client kan ze verbergen of
  apart tonen om dubbele regels in het verloop te voorkomen.

**Inspecties, planning, profielen, monteurs**

- **Inspecties** wijzigt alleen de eigen inspecteur. Coördinator, hoofd en QHSE lezen alles;
  alleen het hoofd verwijdert. `record.waarnemingen[].oordeel` is C, A, V, NVT of leeg; foto's
  nooit als data-URL in `record` (ook niet `DATA:IMAGE/…`).
- **De momentopname ligt vast.** `opgeslagen` (bepaalt kwartaal en dashboard) moet bij een
  nieuwe inspectie tussen 30 dagen geleden en nu (+5 min) liggen, anders volgt een fout; bij
  latere wijzigingen houdt de server de oorspronkelijke waarde vast. De **hele inhoud** ligt na
  het vastleggen vast, ook voor de eigen inspecteur: `record` (waarnemingen met tekst, foto en
  oordeel, gesprek, positief, keuzes, monteurs, handtekening), `titel`, `code` en `project`.
  Alleen `plan_id` (koppeling met de planning) mag nog veranderen. De app wijzigt een vastgelegde
  inspectie nooit; een herhaalde upload van precies dezelfde inhoud (na een netwerkfout) is geen
  wijziging en lukt. Een correctie of een inspectie die langer dan 30 dagen offline stond, voert
  het hoofd bewust in via SQL/service_role (staat dan in `audit_log`).
- **Planning.** Zoals `planning.js`: iedereen mag inplannen, ook voor een ander, en ziet wat
  hij zelf plande of wat aan hem is toegewezen (staf/QHSE: alles). De **maker** wijzigt alles.
  De **toegewezen inspecteur** mag verzetten (datum, locatie, …), als `uitgevoerd` markeren
  en **uit de planning halen**. **`uitgevoerd` betekent: er is een inspectie.** Voor iedereen
  geldt `status = 'uitgevoerd'` alleen samen met `inspectie_id` (CHECK
  `planning_uitgevoerd_inspectie`, zoals de app het zet na het vastleggen). Wie geen staf is,
  markeert alleen als hij **de ingeplande inspecteur** is en het zijn **eigen, al vastgelegde**
  inspectie is (ook bij een nieuwe planning die meteen `uitgevoerd` is). Zo kan niemand de
  herinnering "Inspectie niet uitgevoerd" wegklikken zonder inspectie. Verwijderen kan door maker en
  toegewezen inspecteur zolang de planning `gepland` is; een uitgevoerde planning ligt vast en
  haalt alleen staf weg. Coördinator/hoofd: alles.
  **Afwijking van `planning.js` (besluit nodig, voorstel: zo laten):** de toegewezen inspecteur
  die de planning níet zelf maakte, mag hem **niet aan een ander toewijzen** (de app laat dat
  nu toe via de keuzelijst *Inspecteur*). Reden: na het omzetten ziet hij de planning niet meer
  (RLS), en de maker/coördinator verliest ongemerkt het overzicht. Tot de app dit volgt (§8,
  punt 5) krijgt zo'n wijziging "Mislukt — opnieuw" en komt de oude toewijzing bij het volgende
  ophalen terug. Laat het hoofd dit besluit bevestigen; wil hij het anders, dan moet ook de
  zichtbaarheid (`planning_select`) mee veranderen.
  Een weigering op een planning die je **kunt zien** is een fout (403) met een Nederlandse
  melding. Een planning die je **niet** kunt zien (niet gemaakt, niet aan jou toegewezen) raakt
  een `DELETE`/`PATCH` niet: dat geeft 204 met 0 rijen, zoals altijd bij RLS.
- **Profielen**: leden zien actieve profielen en profielen die ooit via een uitnodiging
  binnenkwamen (ook oud-collega's, voor namen in de historie); een nooit uitgenodigde aanmelding
  zien alleen de beheerrollen en de persoon zelf. Naam, functie, rol en activering wijzigen alleen de
  beheerrollen: hoofden, QHSE-manager en beheerder (`PATCH /rest/v1/profiles?id=eq.<id>`, alleen die vier
  kolommen; met MFA indien verplicht); nooit je eigen rol of activering, en nooit naar de oude rol
  `inspecteur`. Een actief profiel zonder rol ziet alleen zichzelf. Namen zijn uniek onder
  dezelfde sleutel als de monteurs (zonder hoofdletters, accenten, spaties en leestekens). Er
  moet altijd minstens één actief hoofd zijn (ook bij gelijktijdige wijzigingen, en ook bij verwijderen:
  service_role of het account wissen in het Supabase-dashboard wordt geweigerd voor het laatste actieve hoofd,
  trigger `profiles_laatste_hoofd`; maak eerst iemand anders hoofd). De rol `qhse` of
  `beheerder` kan iemand pas krijgen als hij geen actiehouder van een lopende actie meer is, `beheerder`
  ook pas als hij geen toetser meer is (§5, statusmodel; 0008). Een rol die niet inspecteert (`qhse`,
  `beheerder` of geen rol) kan iemand pas krijgen als hij niet meer als inspecteur in open planning
  (`status = 'gepland'`) staat; plan die eerst op een ander in.
- **Monteurs**: lezen iedereen; de tabel schrijven de hoofden, de coördinatoren en de beheerrollen (Beheer; beheerrollen
  met MFA als die verplicht is). Tijdens een inspectie voegt wie inspecteert (hoofd of coördinator; het hoofd met MFA
  als die verplicht is, net als in de tabel) een naam toe met
  `POST /rest/v1/rpc/monteur_aanmelden {"p_naam":"…"}`. De QHSE-manager en de beheerder inspecteren niet en gebruiken
  deze RPC niet (geweigerd); zij beheren de lijst in Beheer. Bestaat de naam al, dan komt die
  terug in de schrijfwijze van de lijst met `"nieuw": false`. Stond die naam op non-actief,
  dan wordt hij **weer actief** (`"heractiveerd": true`), precies zoals `beheer.js`
  voegMonteurToe; het hoofd ziet dat in de auditlog. De naam wordt opgeschoond met
  `naam_schoon` (= `schoon()` in `beheer.js`: NFC, spaties samengevoegd, losse leestekens aan
  het eind weg, "Henk Voorbeeld." → "Henk Voorbeeld"; ook bij het hoofd in de tabel) en
  vergeleken met `naam_sleutel` (= `sleutel()` in `beheer.js`: hoofdletters, accenten, spaties
  en **alle** leestekens tellen niet; æ→ae, œ→oe, ß→ss, ø→o, đ/ð→d, ł→l, ı→i, þ→th, ħ→h). Dus
  "Henk Voorbeeld", "Henk-Voorbeeld", "HenkVoorbeeld" en "henk voorbeeld." zijn één monteur
  (unieke index `monteurs_naam_uniek`). `tests/naamsleutel_check.sh` vergelijkt beide functies
  met de echte code uit `beheer.js` voor **alle** Unicode-codepunten.
  Namen (monteurs én profielen) met onzichtbare tekens (zero-width, richtingtekens, BOM) of
  besturingstekens worden geweigerd. Max 20 nieuwe namen per gebruiker per dag.
- **Instellingen**: alleen `doel_conform` (geheel getal 1..100; JSON `null` = bewust geen doel; geen rij =
  standaard 85, zoals de app; de app stuurt "geen doel" als `{"sleutel":"doel_conform","waarde":null}`, PostgREST
  maakt daar SQL NULL van en de trigger `instellingen_doel_null` zet dat om in JSON `null`) en `mfa_verplicht_hoofd` (true/false; geldt voor alle beheerrollen). Andere
  sleutels of waarden weigert de database.

**Foto's (Storage, bucket `fotos`)**

- Upload: `POST /storage/v1/object/fotos/<auth.uid()>/<sha256>.jpg|jpeg|png|webp`. Max 5 MB,
  MIME image/jpeg|png|webp, één niveau diep, geen `..`. Beide vormen werken:
  - `x-upsert: false` (aanbevolen): bestaat het object al, dan antwoordt Storage met 409; dat is
    goed (zelfde inhoud, zelfde naam).
  - `x-upsert: true` (wat `sync.js` nu stuurt): Storage voert `INSERT … ON CONFLICT DO UPDATE`
    uit. Een eerste upload gebruikt alleen de insert-policy. Een herhaalde upload van een eigen
    foto die **nog nergens als bewijs** in staat (antwoord kwijt na een netwerkfout) mag via de
    update-policy "fotos: opnieuw uploaden eigen, ongebruikt". Een foto die al in een actie of in
    een eigen inspectierecord staat, kan **niemand** overschrijven (RLS-fout); bewijs blijft zo
    onveranderd. In de praktijk stuurt de app zo'n foto niet opnieuw (hij onthoudt het pad per
    sha256).
- Sla in `foto_pad`/`nafoto_pad` en in `record` alleen het pad op (zonder `fotos/`). Het pad moet
  in je **eigen** map staan (`<jouw uid>/…`); een pad naar andermans foto wordt geweigerd.
  De na-foto voegt de houder (of staf namens hem, nooit de toetser) toe tijdens Open/In uitvoering.
- Zichtbaar voor: de uploader, staf/QHSE, en wie de actie mag zien waar de foto **echt** bij
  hoort (foto van de aanmaker/inspecteur, na-foto van wie hem toevoegde). **Tonen alleen via
  `fetch`**: `GET /storage/v1/object/authenticated/fotos/<pad>` met de JWT (of een korte *signed
  URL*, 60 s, die je ook met `fetch` ophaalt) en het resultaat als `blob:`/`data:`-URL in de
  `<img>` zetten (zoals `sync.js` haalFoto). Een Storage-URL rechtstreeks in `<img src>` blokkeert
  de CSP (`img-src 'self' data: blob:`, §1.6); voeg de project-URL daar niet aan toe.
- Verwijderen: de uploader alleen zolang de foto nergens als bewijs wordt gebruikt (niet in een
  actie, niet in een eigen inspectierecord; een pad in het record van een ander blokkeert niet);
  het hoofd altijd (bewaartermijn/AVG).

**Auditlog en schrijfquotum**

- `audit_log` legt bij INSERT de hele nieuwe rij vast, bij DELETE de hele oude rij en bij
  UPDATE alleen de **gewijzigde kolommen** (oud en nieuw, plus `id`). Elke versie is zo te
  herleiden zonder dat elke kleine wijziging een volledige kopie kost.
- `audit_log`, `actie_log` en `security_events` zijn append-only (alleen in onderhoudsmodus op te
  schonen); zonder grens zou één account ze kunnen laten vollopen tot het project read-only
  wordt. Daarom een **schrijfquotum per gebruiker**:
  - **gezamenlijk**: max **25 MiB per 24 uur** over alle drie samen (auditgegevens + eigen regels
    in het verloop + eigen beveiligingsmeldingen; `schrijf_bytes_24u`);
  - auditlog: max **300 wijzigingen/verwijderingen per uur** en max **30 wijzigingen aan hetzelfde
    record per uur** (nieuwe rijen hebben eigen limieten: 30 inspecties, 300 acties, 100
    planningen per uur);
  - verloop (`actie_log`, regels van de app): 30 per actie per uur, 60 per uur, 300 en 1 MiB per
    24 uur;
  - `security_events` via `report_security_event`: 10 per minuut, 100 en 256 KiB per 24 uur.
  Daarboven: fout 54000 ("probeer het later opnieuw"; `sync.js` behandelt dat als tijdelijk),
  bij `report_security_event` het antwoord `false`. Eén account voegt zo hooguit 25 MiB per dag
  aan onverwijderbare rijen toe. Beheer via SQL als `postgres`/`service_role` valt erbuiten.
- Bewaak daarnaast de databasegrootte (*Reports › Database*); het hoofd ziet in `audit_log`
  per gebruiker (`wie`, `grootte`) wie veel schrijft.

**RPC's**

- `POST /rest/v1/rpc/report_security_event` `{"p_soort":"csp_violation","p_details":{...}}`
  (per gebruiker max 10 per minuut, 100 en 256 KiB per 24 uur, binnen het gezamenlijke
  dagquotum; geeft `false` boven de limiet en slaat dan niets op).
- `POST /rest/v1/rpc/dashboard_cijfers` `{"p_van":"2026-07-01","p_tot":"2026-09-30"}`: iedereen met volledige
  inzage (coördinatoren; hoofden, QHSE-manager en beheerder met MFA indien verplicht; 0008); anderen krijgen 403.
  Conform-% alleen bij ≥ 5 beoordeelde waarnemingen, zonder NVT; `doel_conform` is 85 zonder rij en `null` als er
  bewust geen doel is.
- `POST /rest/v1/rpc/monteur_aanmelden` (zie hierboven).

## 6. Rollen en rechten

Het echte team (besluit producteigenaar, migratie 0008): **twee hoofden** (Hoofd Service & Montage en Manager
Projects, gelijke rechten), **twee coördinatoren**, **één QHSE-manager** en **één beheerder** (applicatiebeheer). De
inspecteurs zijn de hoofden en de coördinatoren. De app spiegelt dit in `js/kern.js` (`RECHTEN`, `mag()`); de
database dwingt het af.

| | coordinator | hoofd | qhse (QHSE-manager) | beheerder |
|---|---|---|---|---|
| inspecties lezen | alle | alle (met MFA indien verplicht) | alle (met MFA indien verplicht) | alle (met MFA indien verplicht) |
| inspecties maken | eigen | eigen | – (inspecteert niet) | – (inspecteert niet) |
| inspecties verwijderen | – | ja | – | – |
| planning lezen | alle | alle | alle | alle |
| planning maken/wijzigen/weghalen | ja (ook voor een ander) | ja | – (leest alleen) | – (leest alleen) |
| als inspecteur ingepland worden | ja | ja | nee | nee |
| acties lezen | alle | alle | alle | alle |
| actie aanmaken, voorstel instellen of laten vervallen | ja | ja | ja ("iedereen in het team") | ja |
| actiehouder | ja | ja | **nooit** | **nooit** |
| toetser | ja | ja | **ja** | **nooit** |
| ingestelde actie inhoudelijk wijzigen (plandatum, houder) | ja | ja | – | – |
| monteurs (tabel) | ja | ja | ja | ja |
| instellingen (o.a. `doel_conform`) | lezen | schrijven* | schrijven* | schrijven* |
| profielen: rol en activering van een ander | – | ja* | ja* | ja* |
| eigen rol of activering | – | – (een ander doet dat) | – | – |
| dashboard_cijfers | ja | ja* | ja* | ja* |
| audit_log, security_events lezen | – | ja* | ja* | ja* |
| bewaartermijn_opschonen | – | – | – | – (alleen eigenaar `postgres` / pg_cron) |

\* met een sessie op niveau `aal2` zodra `instellingen.mfa_verplicht_hoofd = true` (§2).

**Altijd, voor iedereen:** toetser ≠ actiehouder; Afgerond alleen door de toetser na "Klaar voor toetsing"; het
oordeel C/A/V/NVT komt van de inspecteur en wijzigt niemand; minstens één actief hoofd (ook bij gelijktijdige
wijzigingen, `race_hoofd.sh`); wie actiehouder van een lopende actie is, wordt geen QHSE-manager of beheerder, en wie
toetser is geen beheerder (`profiles_bewaak`, met `race_qhse.sh` voor beide rollen).

**Nog geen rol** (`role` is NULL): elk nieuw profiel. Zo'n account heeft nergens toegang behalve het eigen
profiel (zodat de app "nog geen rol" kan zeggen), en kan geen actiehouder, toetser of ingeplande inspecteur zijn.
**Oude rol `inspecteur`:** bestaat nog in de enum en werkt voor bestaande rijen zoals vroeger (eigen inspecties en
planning; geen staf), maar via de app of de API kan niemand hem meer toekennen en de app laat zo'n account niet
binnen. Een profiel met `actief = false` heeft direct nergens meer toegang.

## 7. Testen

**Lokaal (zonder Supabase-account).** Vereist PostgreSQL 16+ (`apt-get install -y postgresql`).
`tests/supabase_emulatie.sql` bootst rollen (`anon`, `authenticated`, `service_role`),
`auth.uid()`/`auth.jwt()`, `auth.users` (met `invited_at`), `storage.buckets/objects` en de
ruime standaardrechten van Supabase na. De tests wisselen per gebruiker van rol en JWT-claims,
precies zoals PostgREST dat per request doet.

```sh
# vanuit webapp/; standaard Debian/Ubuntu-PostgreSQL (peer-authenticatie): als OS-gebruiker postgres, op een kopie
rm -rf /tmp/wpi-db && mkdir /tmp/wpi-db && cp -r supabase js /tmp/wpi-db/ && chmod -R a+rwX /tmp/wpi-db
sudo -u postgres sh /tmp/wpi-db/supabase/tests/run.sh        # als root: runuser -u postgres -- sh …
# of in één keer, vanuit de repo-root: tools/periodieke_check.sh --snel --db
```
(`PGHOST=/var/run/postgresql PGUSER=postgres sh supabase/tests/run.sh` als gewone gebruiker of als root geeft
"Peer authentication failed": peer-authenticatie laat alleen de OS-gebruiker `postgres` als `postgres` binnen.)

`run.sh` controleert dat `schema.sql` gelijk is aan de migraties, laadt het schema twee keer
(idempotent), draait `seed.sql` (met de testadressen ingevuld), `testdata.sql` (5 fictieve
monteurs, alleen lokaal), `rls_test.sql`, laadt `schema.sql` daarna nog eens over de **gevulde**
testdatabase (bijwerken van een bestaande installatie), draait `race_hoofd.sh` (twee hoofden
degraderen elkaar gelijktijdig in twee sessies; en service_role verwijdert een hoofd terwijl dat hoofd het andere degradeert), `race_qhse.sh` (iemand wordt tegelijk
actiehouder en QHSE-manager of beheerder, in beide volgordes) en `race_quotum.sh`, en ten slotte `naamsleutel_check.sh` en
`tekens_check.sh` (tekenregel gelijk aan `js/sync.js`). `naamsleutel_check.sh`
leest `schoon()`/`sleutel()` letterlijk uit `js/beheer.js` (vraagt `node`) en vergelijkt ze met
`naam_schoon`/`naam_sleutel` voor **alle** Unicode-codepunten en een reeks echte namen.

Laatste run (PostgreSQL 16, lokaal, 13 november 2026, na migratie 0008): **676 van 676 geslaagd**, het opnieuw laden over de gevulde
database, alle racetests (laatste hoofd; QHSE-manager én beheerder als actiehouder en als ingeplande inspecteur, beide
volgordes; quotum), de tekenvergelijking met `js/sync.js` (511 codepunten, 0 verschillen; en de verloopregel: elk codepunt los en in tekst, het skelet van elk codepunt en
36 343 randgevallen met ZWJ, variatiekiezers en nagemaakte serverregels, 0 verschillen) en de naamsleutelvergelijking groen (0 verschillen op 138 560
codepunten met een sleutel; codepunten die pas in een nieuwere Unicode-versie dan de ICU van de
database bestaan, tellen niet mee). Gedekt o.a.:
RLS op elke tabel; anon en inactieve/niet-uitgenodigde accounts zien niets; rollen van het echte team (sectie 26, 0008: beheerder,
QHSE-manager, tweede hoofd, nog geen rol, geen rol `inspecteur` meer toekennen, geen zelfpromotie, MFA voor alle beheerrollen,
`monteur_aanmelden` alleen voor wie inspecteert, geen open planning bij een niet-inspecterende rol, "geen doel" via de
PostgREST-route, verloop-tekens met nagemaakte statusregels ("Status<ZWJ>:", "Status<VS16>:", VS1, Mongoolse kiezers, braillespatie, ∶, ꞉, Cyrillische S, alleen onzichtbare tekst), de laatste hoofd ook niet te verwijderen (service_role of het account wissen), bewaartermijn 7 jaar met proefrun,
lopende acties blijven, oud verloop van verwijderde acties gaat weg, gedeelde foto's en rechten); datumgrenzen, geen besturings-/bidi-tekens, fotopaden alleen uit de eigen map en het uploadquotum (sectie 24, 0007); aanvalstest: tekens, foto van een actie uit een inspectie ligt vast, snelheid bij 1000 foto's × 1000 acties (sectie 25); gelijktijdige verzoeken tegen de limieten (`tests/race_quotum.sh`); geen escalatie via
naam of `seed.sql`; inspecteur leest/wijzigt geen inspecties van een ander en schrijft geen
instellingen/monteurs/profielen; geen foto-IDOR via `foto_pad`/`nafoto_pad`; veilige
Storage-namen; bewijsfoto's niet te overschrijven of te verwijderen; functiescheiding
(scenario's A3/A4: staf ruilt houder/toetser, toetser zet zelf de uitvoeringsstappen);
bevindingen alleen aan de eigen inspectie (geen bestaanslek via de FK); `actie_log` niet te
vervalsen; iedereen mag instellen en ziet te late acties; planningregels (§5);
monteurs-RPC; geldige instellingen; voorbeelddata geweigerd; offline `afgerond_op` begrensd;
upserts in de exacte vorm die PostgREST v12 genereert (`json_to_recordset` + `ON CONFLICT` +
`RETURNING`); append-only logs (ook voor `service_role` en de eigenaar); SQL-injectiestrings
letterlijk opgeslagen; rate limit; MFA-plicht; schema opnieuw laden over een gevulde database.
Sectie 21 bevat elke aanval uit de beveiligingsreview
als regressietest: een voorstel blokkeren via `uitvoerders`, id's vooraf claimen, het verloop
van een verwijderde actie lezen, bestaanstest van inspectie-id's, voorstel laten vervallen door
een niet-betrokkene (upsert en PATCH), voorstel zonder tekst, vervalste statusregels (zero-width,
fullwidth), vloed in het verloop, `opgeslagen` in 2019/2099, oordelen achteraf wijzigen, hoofd
zonder MFA, lookalike-namen en de naamsleutel van `beheer.js`, en het blokkeren van foto-verwijderen.
Sectie 22 (tweede review): geen zelfgekozen `actie_log.id` (id-claim die opslaan van anderen
blokkeerde); de hele momentopname vast (ook tekst en foto van een waarneming); auditlog met
alleen verschillen en het schrijfquotum (31e wijziging aan één record, > 300 per uur, > 25 MiB
per dag); geen serverregels voor kladkeuzes in een voorstel en niet sleutelen aan andermans
voorstel; waarneming en foto van een handmatig voorstel alleen door de waarnemer (ook bij
vervallen); neutrale naam en onzichtbaarheid van losse aanmeldingen; vooraf geregistreerd
account niet automatisch actief bij uitnodiging; samengestelde (offline) statusovergangen en
nieuwe rijen die al verder zijn, inclusief de weigeringen; klokmelding.
Sectie 23 (derde review): een voorstel van `service_role`/`postgres` (`aangemaakt_door` leeg)
kan een gewone inspecteur niet herschrijven (NULL-logica); de toetser of houder van een lopende
actie wordt geen QHSE-manager, en een toetser die het buiten de controle om toch werd, rondt niet
af; uitnodiging van een account uit een eerdere transactie activeert niet; planning `uitgevoerd`
alleen met een (eigen) inspectie, ook niet direct bij het aanmaken; oordeel `–`/leeg in de
heen-en-terug van `sync.js` (upsert en PATCH door houder en toetser); acties alleen als kopie
van een waarneming in de bevroren momentopname (oordeel, waarneming, dringendheid, *ter plaatse
gecorrigeerd*) en daarna vast; verloop begint bij `Voorstel`; monteursnamen met spaties en
leestekens ("Henk-Voorbeeld", "Henk Voorbeeld."); dagquotum over `security_events`, `actie_log`
en `audit_log` samen; standaardrechten op later aangemaakte tabellen en reeksen; foto opnieuw
uploaden met `x-upsert: true` (ongebruikt: mag; bewijs of van een ander: geweigerd).
Elke reparatie is ook omgekeerd gecontroleerd: zet je de oude code terug (NULL-logica, het
tijdvenster bij de uitnodiging, de QHSE-hercontrole, de oordeel-gelijkstelling, het rij-slot
`FOR SHARE`), dan faalt de bijbehorende test.

**Wat lokaal niet getest is.** Er draaide geen echte PostgREST-, GoTrue- of Storage-server:
HTTP-statuscodes, de Storage-API (MIME- en groottelimiet, 409 bij een bestaand object, en hoe
storage-api een upload met `x-upsert: true` precies uitvoert; lokaal is alleen de RLS van
`INSERT … ON CONFLICT DO UPDATE` op `storage.objects` getest) en de precieze volgorde waarin
*Invite user* `invited_at` zet, zijn dus nog niet tegen echt Supabase gecontroleerd. Doe dat bij
de eerste inrichting met de checks hieronder. Zet Supabase Auth `invited_at` onverhoopt in een
**andere** transactie dan het aanmaken, dan blijft een uitgenodigd account inactief (de veilige
kant) en activeert het hoofd het; zie dan `security_events`.

**Tegen het echte project (bij inrichting en daarna per kwartaal).** Haal per rol een JWT op
(`POST /auth/v1/token?grant_type=password`) en controleer met curl:

```sh
# inspecteur ziet alleen eigen inspecties
curl -s "$URL/rest/v1/inspecties?select=id,inspecteur_id" -H "apikey: $ANON" -H "Authorization: Bearer $JWT_INSP"
# instellingen wijzigen als inspecteur: verwacht [] (0 rijen)
curl -s -X PATCH "$URL/rest/v1/instellingen?sleutel=eq.doel_conform" -H "apikey: $ANON" \
  -H "Authorization: Bearer $JWT_INSP" -H "Content-Type: application/json" -H "Prefer: return=representation" -d '{"waarde":1}'
# UITGEVOERDE planning die aan deze inspecteur is toegewezen (door een coördinator gemaakt)
# verwijderen als inspecteur: verwacht 403 met Nederlandse melding. Let op: kies precies zo'n
# rij. Een planning die de inspecteur niet maakte en die niet aan hem is toegewezen, ziet hij
# niet; dan geeft DELETE 204 met 0 rijen (RLS), en dat is ook goed.
curl -s -X DELETE "$URL/rest/v1/planning?id=eq.<id>" -H "apikey: $ANON" -H "Authorization: Bearer $JWT_INSP"
# zonder JWT: verwacht 401/permission denied
curl -s "$URL/rest/v1/inspecties" -H "apikey: $ANON"
# publieke URL van een foto: verwacht 400/404 (bucket is privé)
curl -s -o /dev/null -w "%{http_code}\n" "$URL/storage/v1/object/public/fotos/<pad>"
# eerste upload met x-upsert: true (zoals sync.js): verwacht 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/storage/v1/object/fotos/<uid>/<sha>.jpg" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_INSP" -H "Content-Type: image/jpeg" -H "x-upsert: true" --data-binary @foto.jpg
# dezelfde (nog ongebruikte) foto nogmaals met x-upsert: true: verwacht 200
# met x-upsert: false: verwacht 409 (bestaat al)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/storage/v1/object/fotos/<uid>/<sha>.jpg" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_INSP" -H "Content-Type: image/jpeg" -H "x-upsert: false" --data-binary @foto.jpg
# koppel die foto aan een actie (foto_pad) en upload hem nogmaals met x-upsert: true:
# verwacht een weigering (RLS; bewijs wordt nooit overschreven). Ook een gekoppeld pad dat
# (nog of na verwijderen door het hoofd) niet bestaat, is niet te uploaden (0007: insert-policy
# met "not foto_in_gebruik"); de app vangt die weigering op als het object al bestaat.
# 6 MB-bestand of image/gif: verwacht 413/415 of 400 (bucketlimieten)
```

En na een uitnodiging: `select id, full_name, actief from public.profiles;` (verwacht `actief = true`).

Kwartaalchecklist: vertrokken gebruikers op `actief = false`; Security Advisor schoon;
Auth-instellingen uit §2 nog gelijk; `run.sh`, `sleutelcheck.sh` en de curl-checks groen;
`security_events` en de Auth-logs nalopen; hersteltest uit §4.

## 8. Wat de client hiervoor moet doen (afspraken met `webapp/js`)

De database dwingt het onderstaande af; zolang de client het nog niet doet, krijgt de
gebruiker een weigering ("Mislukt — opnieuw") in plaats van een stille fout.

1. ~~`auth.js` verwerkHash: `type=invite` net zo behandelen als `type=recovery`~~ **Gedaan**
   (`auth.js` verwerkLink, november 2026): `type=invite` en `type=recovery` openen het scherm
   "Kies je wachtwoord"/"Nieuw wachtwoord", pas nadat het token bij `GET /auth/v1/user` is
   gecontroleerd; elk ander type wordt genegeerd. De herstelmail uit de app gebruikt PKCE
   (`code_challenge` bij `/recover`, de link bevat `?code=…`, alleen in te wisselen met de
   `code_verifier` in dezelfde browser). Een link wist nooit een bewaarde sessie of lokale gegevens,
   en een link van een ander account dan de bewaarde sessie wordt geweigerd. Zet de app-URL
   precies in *Redirect URLs* (anders stuurt Supabase naar de Site URL zonder `?code=`).
2. `sync.js` uploadFoto (aanbevolen, niet meer verplicht): `x-upsert: "false"` sturen; 409
   blijft "goed". Met `"true"` (nu) werkt een eerste en een herhaalde upload van een nog
   ongebruikte foto ook (§5, *Foto's*); alleen een foto die al als bewijs in een actie of
   inspectie staat, kan niet worden overschreven. Controleer dit bij de inrichting (§7).
3. `sync.js` acties: bij `Afgerond` het lokale akkoordmoment als `afgerond_op` meesturen en
   bij ophalen `afgerond_op` overnemen (kwartaal.js rekent ermee).
4. `sync.js` actie_log: `t_client` meesturen (lokale `l.t`), bij ophalen `t_client,bron`
   selecteren, `t_client ?? t` tonen en de `bron = 'server'`-regels verbergen of apart tonen.
   Nooit `id`, `t` of `bron` meesturen (kolomrecht; geeft `permission denied`).
5. `planning.js`: de keuzelijst *Inspecteur* alleen tonen voor de maker en staf (besluit §5,
   *Planning*). "Uit de planning halen" mag de maker en de toegewezen inspecteur zolang de
   planning gepland is; bij een uitgevoerde planning alleen staf.
6. Houder-knoppen (Start uitvoering, Klaar · na-foto) niet tonen als de gebruiker de toetser
   is (ook niet voor staf); bij Klaar voor toetsing houder/toetser niet meer laten wijzigen.
7. `inspectie.js` voegMonteurToe: naam via `rpc/monteur_aanmelden` aan de server melden.
8. Id's (`inspectie.js`, `acties.js`, `planning.js`): een willekeurig deel toevoegen aan
   `WPI-`/`ACT-`/`PL-<ms>` (zie §5, *Id's*), zodat id's niet uit de klok te voorspellen zijn.
9. `beheer.js`: monteurs en `doel_conform` naar de tabellen `monteurs`/`instellingen`
   schrijven. **Gedaan** (0008): geen doel = `waarde` JSON `null` (geen rij = standaard 85).
10. `sync.js` verloop: het officiële verloop tonen op basis van `bron = 'server'`; clientregels
    alleen als toelichting (een clientregel kan nooit een status bewijzen).
11. `sync.js` foutmelding: bij een permanente weigering de Nederlandse servermelding tonen
    (bv. "…staat de klok van het toestel goed?" bij een klok die voorloopt, §5 *Id's*).
12. Acties: een voorstel van een ander alleen aanpassen bij het instellen; waarneming, foto en
    dringendheid alleen tonen als bewerkbaar voor de waarnemer, en bij een actie uit een
    inspectie voor niemand (§5, statusmodel). De app doet dit nu al niet anders.
13. **Lengtes en getallen zoals de server** (anders blijft een opslag "Mislukt — opnieuw", fout
    400): `maxlength` op de invoervelden en `planning.monteurs` als **geheel getal 0..50** (nu
    geen maximum, en `+value` kan een decimaal zijn: afronden en begrenzen). Grenzen:
    | veld | max |
    |---|---|
    | `acties.tekst`, `acties.waarneming`, `planning.toelichting`, `actie_log.wat` | 2000 tekens |
    | `planning.locatie` | 200 |
    | `inspecties.titel` | 200 |
    | `planning.project`, `inspecties.project`, namen (monteurs, profielen), `profiles.functie` | 120 |
    | `acties.ref` | 60 |
    | `planning.code`, `inspecties.code` | 20 |
    | `inspecties.record` | 1 MB (foto's als pad, niet als data-URL) |
    Let op: de `waarneming` van een actie is de tekst van de waarneming in de inspectie; houd
    die tekst in `inspectie.js` dus ook op max 2000 tekens.
14. `inspectie.js` bewaarInspectie: blijf `w.actie.actie_id`, `w.actie.prio` en
    `w.actie.terPlaatse` in het record zetten en de actie maken met `oordeel = w.oordeel`,
    `waarneming = (w.tekst || "").trim()` en `prio = w.actie.prio` (zoals nu). De server eist dat
    verband (§5, statusmodel). Voeg nooit later een actie aan een vastgelegde inspectie toe.

Niet (meer) nodig: samengestelde statusovergangen (Voorstel → In uitvoering/Klaar voor toetsing,
een nieuwe actie die offline al verder is gezet of verviel) accepteert de server zelf (§5). Het
oordeel van een handmatige actie (`–` wordt bij het ophalen `null` en zo teruggestuurd) zet de
server zelf gelijk (§5, *Oordeel*); de client hoeft niets te doen. Een herhaalde foto-upload met
`x-upsert: true` lukt (punt 2). En inspecties ouder dan 30 dagen bij het overnemen van de
voorbeeldversie filtert `sync.js` overnamePlan al (29 dagen) met een melding.

**Wat de ongewijzigde app op de server laat mislukken** ("Mislukt — opnieuw", blijvend):
- punt 5: de toegewezen inspecteur zet een planning op een andere inspecteur (als hij hem niet
  zelf maakte);
- punt 6: de toetser (ook als hij staf is) drukt op een houder-knop, of iemand wijzigt houder of
  toetser bij *Klaar voor toetsing*;
- punt 12: iemand verzet of wijzigt tussendoor een voorstel van een ander;
- punt 13: een tekst langer dan de servergrens of een aantal monteurs > 50 of met decimalen;
- verder elke weigering die de app al niet aanbiedt (de server is hier de grens).
Zonder punt 1 hebben nieuwe collega's de omweg uit §1.4 nodig. Server en app moeten dus samen
live gaan.

## 9. Restrisico's en open punten

- **Bestaanstest via upsert** op andermans id (§5, *Id's*): onvermijdelijk met globale
  primaire sleutels; alleen het bestaan van een id lekt, geen inhoud. Weg te nemen met een
  willekeurig deel in id's (§8, punt 8).
- **Voorspelbare id's** zolang punt 8 niet in de client zit: claimen is begrensd (max 5
  minuten vooruit, limieten per uur), niet onmogelijk.
- **Signups**: alleen veilig met signups **uit** (§2). Staan ze toch aan, dan zijn losse
  aanmeldingen inactief, naamloos (neutrale naam) en onzichtbaar, en wordt een vooraf
  geregistreerd account bij een uitnodiging niet automatisch actief; het blijft een
  configuratiefout die het hoofd moet herstellen.
- **Klok van het toestel** meer dan 5 minuten voor: nieuwe rijen worden geweigerd (§5).
- **Planning toewijzen** door de toegewezen inspecteur: servereis die afwijkt van de huidige
  app; besluit van het hoofd nodig (§5, *Planning*).
- **Niet tegen echt Supabase getest** (§7): HTTP-statuscodes, Storage-limieten, de upload met
  `x-upsert: true` en de precieze volgorde van *Invite user* controleren bij de eerste inrichting.
- **Referentie van een actie** (`ref`, bv. "DAM-2.07"): de app haalt hem uit de catalogus; hij
  staat niet in het inspectierecord en wordt bij het aanmaken dus niet tegen de momentopname
  gecontroleerd (oordeel, waarneming, dringendheid en *ter plaatse gecorrigeerd* wel). Na het
  aanmaken ligt hij vast. Wil je ook dit dichtzetten, laat `inspectie.js` de `ref` in de
  waarneming van het record opnemen; dan kan de server hem vergelijken.
- **Naamsleutel en Unicode-versie.** `naam_sleutel` gebruikt de ICU van de database; tekens die
  pas in een nieuwere Unicode-versie bestaan dan die ICU kent, beoordeelt de app (browser) soms
  anders. Voor echte namen (Latijns, Grieks, Cyrillisch, Arabisch, …) is het resultaat gelijk
  (getoetst voor alle codepunten). Na een grote PostgreSQL/ICU-update bouwt het schema de unieke
  indexen opnieuw op (`reindex` in 0001).
