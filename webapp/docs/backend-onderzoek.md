# Backend-onderzoek (DeepSeek-harnas, door Claude beoordeeld)

===== supabase-auth =====
## Auth-opzet
- **Supabase Auth** (email/wachtwoord of magic link). Rol komt **niet** in de JWT, maar in een `profiles`-tabel — zo kun je rollen wijzigen zonder re-login.
- **Trigger** op `auth.users` maakt automatisch een `profiles`-rij aan met default rol `inspecteur`.
- Rol wijzigen doe je door een `hoofd` (admin) die `profiles.role` updatet.

## Profiles-tabel + enum
```sql
create type user_role as enum ('inspecteur', 'coordinator', 'hoofd');

create table profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  email text,
  role  user_role not null default 'inspecteur'
);

-- trigger: profiel aanmaken bij signup
create function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into profiles (id, email) values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

alter table profiles enable row level security;

create policy "eigen profiel lezen" on profiles
for select using (auth.uid() = id);
```

## RLS op `inspections`
Één policy die zowel inspecteur (eigen) als coordinator/hoofd (alles) afdekt:

```sql
alter table inspections enable row level security;

create policy "inspecties op rol" on inspections
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and (
        p.role in ('coordinator', 'hoofd')
        or (p.role = 'inspecteur' and inspections.inspector_id = auth.uid())
      )
  )
);
```

**Praktisch:** schrijf-acties (insert/update) geef je aparte policies met dezelfde `exists(...)`-check, en laat rolwijzigingen alleen toe als `p.role = 'hoofd'`.

===== avg-eu =====
## Praktische AVG-checklist: werkplekinspectie-app met medewerkersnamen in Supabase

**Uitgangspunt:** de werkgever is meestal **verwerkingsverantwoordelijke**; Supabase is **verwerker**. Als je de app als leverancier voor meerdere werkgevers aanbiedt, ben je zelf mogelijk verwerker en moet je een DPA met de werkgever én met Supabase regelen.

### 1. Doel en grondslag
- [ ] Leg vast **waarom** je namen vastlegt: alleen voor opvolging/afhandeling van werkplekinspecties, veiligheid of kwaliteit.
- [ ] Gebruik namen **niet** voor performancemanagement/HR-doeleinden zonder aparte grondslag en transparantie.
- [ ] Leg de grondslag vast in je **verwerkingsregister** (vaak gerechtvaardigd belang of wettelijke verplichting; beoordeel per situatie).
- [ ] Doe een korte **DPIA-screening**. Bij systematische controle/monitoring van medewerkers kan een DPIA nodig zijn.

### 2. Dataminimalisatie: welke persoonsgegevens echt nodig?
- [ ] **Wel nodig:** naam of personeelsnummer, afdeling/functie indien relevant, datum/tijd, locatie, inspecteur, bevindingen, maatregelen, status.
- [ ] **Liever niet:** BSN, privécontactgegevens, geboortedatum, gezondheid, religie, vakbond, etniciteit, foto’s zonder noodzaak.
- [ ] **Vermijd vrije tekst** voor gevoelige informatie; gebruik vaste categorieën/keuzelijsten.
- [ ] Gebruik waar mogelijk **personeelsnummer/ID** in plaats van naam; koppel naam alleen via een aparte, streng beveiligde tabel als dat echt nodig is.
- [ ] Leg vast welke velden verplicht zijn en waarom.

### 3. EU-regio en data-residency in Supabase
- [ ] Maak het Supabase-project aan in een **EU-regio** (bijv. Frankfurt/Paris).
- [ ] Controleer of **backups, logs en storage** in dezelfde EU-regio blijven.
- [ ] Controleer de **subprocessorenlijst** van Supabase en of support-toegang vanuit niet-EU mogelijk is.
- [ ] Regel zo nodig **SCC’s** en leg vast dat er geen ongeoorloofde doorgifte buiten de EER plaatsvindt.
- [ ] Let op: “EU-regio” is niet automatisch “alleen EU”; controleer support, subprocessors en back-ups.

### 4. Verwerkersovereenkomst (DPA)
- [ ] Accepteer/onderteken de **Supabase DPA**.
- [ ] Leg vast welke **subprocessoren** worden gebruikt en hoe wijzigingen worden gemeld.
- [ ] Spreek **datalekmelding**, **auditrechten**, **verwijdering/teruglevering** en **einde overeenkomst** af.
- [ ] Als je leverancier bent: sluit ook een **DPA met de werkgever** en noem Supabase als subprocessor.

### 5. Bewaartermijn
- [ ] Bepaal per gegeven een bewaartermijn, bijvoorbeeld: inspectieverslag **12 maanden na afhandeling**, daarna anonimiseren of verwijderen.
- [ ] Kortere termijn voor foto’s/bijlagen en vrije tekst.
- [ ] Leg de termijn vast in een **bewaarbeleid** en automatiseer verwijdering/anonimisering.
- [ ] Regel ook de bewaartermijn van **backups**; zorg dat verwijderde data niet oneindig in back-ups blijft.

### 6. Toegang en beveiliging
- [ ] Gebruik **role-based access**: inspecteur, leidinggevende, admin; least privilege.
- [ ] Zet **Row Level Security (RLS)** aan in Supabase.
- [ ] Nooit de **service_role key** in de client; alleen server-side.
- [ ] Geen publieke Storage-buckets; gebruik private buckets en tijdelijke signed URLs.
- [ ] Verplicht **MFA** voor beheerders.
- [ ] Log wie inspecties bekijkt/wijzigt; bewaar logs beperkt.
- [ ] Versleuteling in transit en at rest regelen; Supabase doet dit standaard, maar controleer.

### 7. Transparantie en rechten
- [ ] Neem werkplekinspecties en naamvastlegging op in de **privacyverklaring voor medewerkers**.
- [ ] Informeer medewerkers over doel, bewaartermijn, toegang en rechten.
- [ ] Richt een proces in voor **inzage, correctie en verwijdering**.
- [ ] Betrek indien nodig de **ondernemingsraad/werkoverleg**.

### 8. Operationeel
- [ ] Neem de verwerking op in het **verwerkingsregister**.
- [ ] Leg een **datalekprocedure** vast; meld binnen 72 uur bij de AP als er risico is.
- [ ] Maak een **toegangsmatrix** en review deze periodiek.
- [ ] Test jaarlijks of retentie/verwijdering echt werkt.
- [ ] Bij einde contract: data exporteren en daarna laten verwijderen door Supabase.

**Kort gezegd:** EU-regio kiezen, Supabase-DPA + subprocessoren checken, alleen noodzakelijke persoonsgegevens opslaan, korte bewaartermijn automatiseren, RLS/MFA/private storage instellen en medewerkers transparant informeren.

===== offline-sync =====
# Offline-first PWA voor werkplekinspecties

## 1. Service worker
- **App shell cachen** (HTML/JS/CSS/icons) via `Cache API` → app start altijd, ook offline.
- **Strategieën**: *cache-first* voor statische assets, *network-first met cache-fallback* voor API-reads, *background sync* voor writes.
- **Background Sync API** (`sync` event) om de sync-queue te flushen zodra verbinding terug is; fallback: `online`-event + periodieke retry.
- **Update-flow**: `skipWaiting` + `clientsClaim` met versie-banner ("Nieuwe versie beschikbaar – herladen").

## 2. IndexedDB lokale opslag
- **Object stores**:
  - `inspections` (volledige inspectie-records, incl. foto's als Blob)
  - `sync_queue` (pending mutations)
  - `meta` (last-sync-timestamp, user-id, schema-versie)
- **Indexes** op `status`, `updated_at`, `site_id` voor snelle queries.
- **Foto's**: als `Blob` in IndexedDB (niet base64 in localStorage); upload naar Supabase Storage bij sync, sla pad op in record.
- **Wrapper**: Dexie.js of idb — scheelt boilerplate en geeft migraties.

## 3. Sync-queue
- **Elke mutatie** (create/update/delete) → rij in `sync_queue`:
  ```
  { id, entity, entity_id, op, payload, client_ts, retry_count, status }
  ```
- **FIFO-verwerking** met idempotency: client genereert UUID's, dus herhaald pushen is veilig (`upsert` op `id`).
- **Backoff**: exponentiële retry (1s → 2s → 4s … max 5 min), `retry_count` in queue.
- **Batching**: meerdere mutations per request naar een Supabase Edge Function of RPC om round-trips te beperken.
- **UI-indicator**: "X wijzigingen wachten op sync" + handmatige "Nu syncen"-knop.

## 4. Conflictafhandeling

**Standaard: Last-Write-Wins (LWW) op veldniveau**
- Elk record heeft `updated_at` (server) + `client_ts`.
- Bij push: server vergelijkt `updated_at`; nieuwer wint. Eenvoudig, voorspelbaar, prima voor inspecties (meestal één inspecteur per locatie).

**Merge wanneer nodig** (bijv. gedeelde inspecties of checklist-items die onafhankelijk worden ingevuld):
- **Per-veld merge**: alleen velden die lokaal gewijzigd zijn overschrijven; rest blijft.
- **Checklist-items als aparte rijen** met eigen `updated_at` → natuurlijke merge zonder record-level conflict.
- **Tombstones** voor deletes (`deleted_at`) i.p.v. hard delete, zodat offline deletes niet "terugkomen".
- **Conflict-log**: bij echte conflicten (zelfde veld, beide gewijzigd) → bewaar beide versies, toon in UI ter beoordeling.

**Praktisch**: begin met LWW + tombstones; voeg veld-merge toe zodra meerdere inspecteurs dezelfde inspectie kunnen bewerken.

## 5. Supabase-specifiek
- **Auth**: Supabase-sessie cachen; offline blijven bestaande tokens werken tot expiry — refresh bij reconnect vóór sync.
- **RLS** op `user_id`/`org_id`; client stuurt altijd `id` (UUID) mee voor idempotente upserts.
- **Realtime** (optioneel): abonneren op wijzigingen om andere devices bij te werken — niet kritisch voor offline-first.
- **Storage**: signed upload URLs pas aanvragen bij sync, niet bij opname.

## Minimale flow
1. Inspecteur opent app offline → SW serveert shell uit cache.
2. Invullen → schrijven naar `inspections` + `sync_queue` (atomisch in één IndexedDB-transactie).
3. Online → SW `sync`-event → queue FIFO → Supabase upsert (LWW) → queue-rij verwijderen.
4. Conflict → server-versie + lokale versie loggen, UI toont keuze.

===== pdf-export =====
## Client-side vs Server-side PDF-generatie (Supabase)

**Client-side — `jsPDF`** (of `pdf-lib` voor meer controle)
- Draait in de browser, geen serverkosten, werkt offline, snel te itereren.
- **Kies wanneer:** rapporten eenvoudig zijn (tekst, tabellen, logo), data al client-side beschikbaar is, geen gevoelige/verborgen data meegaat, en je geen pixel-perfecte HTML/CSS-layout nodig hebt.

**Server-side — Supabase Edge Function met `pdf-lib`** (Deno)
- Draait op Supabase, data blijft server-side, consistente output, makkelijk te koppelen aan Storage + signed URLs, audit trail.
- **Kies wanneer:** rapporten vertrouwelijk zijn (inspectiedata, klantgegevens), je een vast/gecertificeerd template wilt, je PDF's wilt archiveren in Supabase Storage, of je dezelfde PDF ook per e-mail/API wilt versturen.
- *Let op:* Edge Functions hebben geen headless Chrome. Voor complexe HTML→PDF layouts (bv. met `@react-pdf/renderer` of Puppeteer) roep je vanuit de Edge Function een externe service aan (Browserless, DocRaptor) — dan verlies je wat van het "alles-in-Supabase" voordeel.

**Kort advies:** simpele inspectierapporten → `jsPDF` client-side. Vertrouwelijk/gearchiveerd/consistent → Edge Function + `pdf-lib`.
