-- =====================================================================
-- Werkplekinspectie (Noardling B.V.) — volledig Supabase-schema (v1)
-- GEGENEREERD door supabase/bouw-schema.sh uit supabase/migrations/.
-- Niet met de hand wijzigen: pas de migratie aan en bouw opnieuw.
-- Toepassen: zie supabase/README.md. Idempotent (opnieuw draaien mag).
-- =====================================================================

-- >>>>> 0001_tabellen.sql
-- =====================================================================
-- Werkplekinspectie (Noardling B.V.) — migratie 0001: typen en tabellen
-- Datacontract v1. Idempotent: kan veilig opnieuw worden gedraaid.
-- AVG: alleen app-gebruikers (inspecteur, coordinator, hoofd, qhse) en
-- monteursnamen; geen beoordeling van personen (de methode toetst het werk).
-- =====================================================================

-- gen_random_uuid() is ingebouwd vanaf PostgreSQL 13; geen extensie nodig.

-- ---------- Bescherming tegen het oude v0.1-schema ----------
-- v0.1 had andere enums/kolommen (uuid-id's, actie_status open/afgerond).
-- Dat schema is nooit in productie gebruikt; reset het project eerst.
do $$
begin
  if exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
             where n.nspname = 'public' and t.typname = 'actie_status')
     and not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                     join pg_namespace n on n.oid = t.typnamespace
                     where n.nspname = 'public' and t.typname = 'actie_status'
                       and e.enumlabel = 'Voorstel') then
    raise exception 'Oud v0.1-schema gevonden (actie_status zonder ''Voorstel''). Reset de database eerst (zie supabase/README.md).';
  end if;
end $$;

-- ---------- Enums ----------
do $$ begin
  create type public.user_role as enum ('inspecteur', 'coordinator', 'hoofd', 'qhse');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.actie_status as enum
    ('Voorstel', 'Open', 'In uitvoering', 'Klaar voor toetsing', 'Afgerond', 'Vervallen');
exception when duplicate_object then null; end $$;

-- ---------- Hulpfuncties voor namen en paden (immutable, geen rechten nodig) ----------
-- Naamsleutel: dezelfde regel als sleutel() in js/beheer.js. Daar:
--   onzichtbare tekens weg → toLocaleLowerCase("nl") → ø/æ/œ/ß/đ/ð/ł/ı/þ/ħ uitschrijven
--   → NFD → accenten (U+0300–U+036F) weg → ALLES wat geen letter of cijfer is weg
--   (/[^\p{L}\p{N}]+/gu).
-- Dus "Henk Voorbeeld" = "henk  voorbeeld" = "Hénk-Voorbeeld" = "HenkVoorbeeld" =
-- "Henk Voorbeeld." = "henkvoorbeeld", en "Æsa Test" = "aesatest".
-- Kleine letters en "letter of cijfer" gaan via de ICU-collatie "und-x-icu" (Unicode,
-- onafhankelijk van de locale van de database; bij "C" zou lower() alleen ASCII verlagen
-- en [[:alnum:]] alleen ASCII kennen). ICU's [[:alnum:]] = letters (L) + decimale cijfers
-- (Nd); JavaScript's \p{N} telt ook Nl/No mee (², ½, Ⅻ, ①, …): die staan hieronder
-- letterlijk in de tekenklasse (gegenereerd uit de Unicode-tabellen van Node). Getoetst
-- door tests/naamsleutel_check.sh: voor ALLE codepunten gelijk aan sleutel() uit beheer.js.
create or replace function public.naam_sleutel(p_naam text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(
      normalize(
        replace(replace(replace(replace(
          translate(
            lower(regexp_replace(p_naam,
                    '[\u0001-\u001F\u007F-\u009F\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]',
                    '', 'g') collate "und-x-icu"),
            'øđðłıħ', 'oddlih'),
          'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss'), 'þ', 'th'),
        NFD),
      '[\u0300-\u036F]', '', 'g') collate "und-x-icu",
    '[^[:alnum:]\u00B2-\u00B3\u00B9\u00BC-\u00BE\u09F4-\u09F9\u0B72-\u0B77\u0BF0-\u0BF2\u0C78-\u0C7E\u0D58-\u0D5E\u0D70-\u0D78\u0F2A-\u0F33\u1369-\u137C\u16EE-\u16F0\u17F0-\u17F9\u19DA\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA6E6-\uA6EF\uA830-\uA835\U00010107-\U00010133\U00010140-\U00010178\U0001018A-\U0001018B\U000102E1-\U000102FB\U00010320-\U00010323\U00010341\U0001034A\U000103D1-\U000103D5\U00010858-\U0001085F\U00010879-\U0001087F\U000108A7-\U000108AF\U000108FB-\U000108FF\U00010916-\U0001091B\U000109BC-\U000109BD\U000109C0-\U000109CF\U000109D2-\U000109FF\U00010A40-\U00010A48\U00010A7D-\U00010A7E\U00010A9D-\U00010A9F\U00010AEB-\U00010AEF\U00010B58-\U00010B5F\U00010B78-\U00010B7F\U00010BA9-\U00010BAF\U00010CFA-\U00010CFF\U00010E60-\U00010E7E\U00010F1D-\U00010F26\U00010F51-\U00010F54\U00010FC5-\U00010FCB\U00011052-\U00011065\U000111E1-\U000111F4\U0001173A-\U0001173B\U000118EA-\U000118F2\U00011C5A-\U00011C6C\U00011FC0-\U00011FD4\U00012400-\U0001246E\U00016B5B-\U00016B61\U00016E80-\U00016E96\U00016FF4-\U00016FF6\U0001D2C0-\U0001D2D3\U0001D2E0-\U0001D2F3\U0001D360-\U0001D378\U0001E8C7-\U0001E8CF\U0001EC71-\U0001ECAB\U0001ECAD-\U0001ECAF\U0001ECB1-\U0001ECB4\U0001ED01-\U0001ED2D\U0001ED2F-\U0001ED3D\U0001F100-\U0001F10C]+', '', 'g')
$$;

-- Naam opschonen zoals schoon() in js/beheer.js: NFC, witruimte (spaties zoals JavaScript
-- \s; tab/regeleinde haalt de app weg en weigert de server) samenvoegen tot één spatie en aan de randen weg, losse leestekens aan het eind weg
-- ("Henk Voorbeeld." → "Henk Voorbeeld"). Onzichtbare tekens haalt de app weg; de
-- server weigert ze (naam_tekens_ok).
create or replace function public.naam_schoon(p_naam text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(regexp_replace(regexp_replace(
           normalize(p_naam, NFC),
           '[\u0020\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+', ' ', 'g'),
           '^ | $', '', 'g'),
         '[ .,;:\u00B7]+$', '')
$$;

-- Tekens die nooit in een naam horen: besturingstekens en onzichtbare opmaak- of
-- richtingtekens (lookalike-dubbelen als "Henk\u200B Voorbeeld" of "\u202EHenk"); dezelfde
-- set die beheer.js (ONZ) weghaalt.
create or replace function public.naam_tekens_ok(p_naam text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p_naam !~ '[[:cntrl:]\u007F-\u009F\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]'
$$;

-- Eigenaar (uid-map) van een fotopad in bucket "fotos", met of zonder "fotos/" ervoor
create or replace function public.foto_eigenaar(p_pad text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select split_part(regexp_replace(p_pad, '^fotos/', ''), '/', 1)
$$;

-- ---------- Profielen (1-op-1 met auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  functie     text,
  role        public.user_role not null default 'inspecteur',
  -- standaard NIET actief: alleen uitgenodigde accounts worden automatisch actief
  -- (handle_new_user); een losse aanmelding heeft zo nooit toegang
  actief      boolean not null default false,
  -- ooit via een uitnodiging binnengekomen (alleen de server zet dit). Alleen zulke
  -- profielen (en actieve) zien de leden in de kiezer; een losse aanmelding niet.
  uitgenodigd boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_naam_lengte    check (char_length(btrim(full_name)) between 1 and 120),
  constraint profiles_naam_tekens    check (public.naam_tekens_ok(full_name)),
  constraint profiles_functie_lengte check (functie is null or char_length(functie) <= 120)
);
-- namen uniek (zonder hoofdletters/accenten/spaties): geen twee "Björn Sloos" in de kiezer
create unique index if not exists profiles_naam_uniek on public.profiles (public.naam_sleutel(full_name));

-- ---------- Monteurs (alleen naam; nooit een score per persoon) ----------
create table if not exists public.monteurs (
  id          uuid primary key default gen_random_uuid(),
  naam        text not null unique,
  actief      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint monteurs_naam_lengte  check (char_length(naam) between 1 and 120),
  constraint monteurs_naam_getrimd check (naam = btrim(naam)),
  constraint monteurs_naam_tekens  check (public.naam_tekens_ok(naam))
);
-- uniek zoals beheer.js vergelijkt: zonder hoofdletters, accenten, spaties en leestekens
create unique index if not exists monteurs_naam_uniek on public.monteurs (public.naam_sleutel(naam));
-- naam_sleutel kan bij een update van het schema zijn gewijzigd: indexen opnieuw opbouwen
-- (botsen twee bestaande namen onder de nieuwe sleutel, dan stopt dit met een duidelijke fout)
reindex index public.profiles_naam_uniek;
reindex index public.monteurs_naam_uniek;

-- ---------- Inspecties (de momentopname zelf) ----------
-- record = volledige client-record (waarnemingen, gesprek, positief, keuzes,
-- monteurs). Foto's staan NIET in record maar in Storage (alleen het pad).
create table if not exists public.inspecties (
  id            text primary key,
  inspecteur_id uuid not null default auth.uid() references public.profiles (id),
  titel         text not null,
  code          text,
  project       text,
  opgeslagen    timestamptz not null default now(),
  record        jsonb not null default '{}'::jsonb,
  plan_id       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint inspecties_id_vorm      check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  -- voorbeelddata (WPI-demo…, *-demo*) hoort nooit op de server
  constraint inspecties_geen_demo    check (id !~* '(^|-)demo'),
  constraint inspecties_titel_lengte check (char_length(titel) between 1 and 200),
  constraint inspecties_code_lengte  check (code is null or char_length(code) <= 20),
  constraint inspecties_proj_lengte  check (project is null or char_length(project) <= 120),
  constraint inspecties_plan_vorm    check (plan_id is null or plan_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  constraint inspecties_record_obj   check (jsonb_typeof(record) = 'object'),
  -- max 1 MB: foto's horen in Storage, niet als base64 in de JSON
  constraint inspecties_record_grootte check (octet_length(record::text) <= 1048576)
);
create index if not exists inspecties_inspecteur_idx on public.inspecties (inspecteur_id);
create index if not exists inspecties_opgeslagen_idx on public.inspecties (opgeslagen);
create index if not exists inspecties_nieuw_idx on public.inspecties (inspecteur_id, created_at);

-- ---------- Planning ----------
create table if not exists public.planning (
  id            text primary key,
  datum         date not null,
  code          text not null,
  project       text,
  locatie       text,
  monteurs      integer,
  inspecteur    uuid not null references public.profiles (id),
  toelichting   text,
  status        text not null default 'gepland',
  inspectie_id  text,
  gemaakt_door  uuid default auth.uid() references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint planning_id_vorm        check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  constraint planning_geen_demo      check (id !~* '(^|-)demo'),
  constraint planning_status_geldig  check (status in ('gepland', 'uitgevoerd')),
  -- uitgevoerd = er IS een inspectie (zoals de app: status en inspectie_id samen)
  constraint planning_uitgevoerd_inspectie check (status <> 'uitgevoerd' or inspectie_id is not null),
  constraint planning_code_lengte    check (char_length(code) between 1 and 20),
  constraint planning_proj_lengte    check (project is null or char_length(project) <= 120),
  constraint planning_locatie_lengte check (locatie is null or char_length(locatie) <= 200),
  constraint planning_toel_lengte    check (toelichting is null or char_length(toelichting) <= 2000),
  constraint planning_monteurs_bereik check (monteurs is null or monteurs between 0 and 50),
  constraint planning_insp_vorm      check (inspectie_id is null or inspectie_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$')
);
create index if not exists planning_inspecteur_idx on public.planning (inspecteur);
create index if not exists planning_datum_idx on public.planning (datum);
create index if not exists planning_nieuw_idx on public.planning (gemaakt_door, created_at);

-- ---------- Acties ----------
create table if not exists public.acties (
  id              text primary key,
  inspectie_id    text references public.inspecties (id) on delete set null,
  tekst           text not null,
  oordeel         text,
  ref             text,
  waarneming      text,
  prio            text,
  status          public.actie_status not null default 'Voorstel',
  houder          uuid references public.profiles (id),
  toetser         uuid references public.profiles (id),
  plandatum       date,
  handmatig       boolean not null default false,
  foto_pad        text,
  nafoto_pad      text,
  -- door de server bijgehouden (niet in het minimale contract):
  aangemaakt_door uuid default auth.uid() references public.profiles (id),
  -- afgerond_op: moment van akkoord. De client mag het (offline) tijdstip meesturen;
  -- de server accepteert het alleen tussen klaar_op en nu, anders geldt nu.
  afgerond_op     timestamptz,
  afgerond_server timestamptz,              -- wanneer de server het akkoord ontving
  klaar_op        timestamptz,              -- wanneer de server "Klaar voor toetsing" ontving
  nafoto_door     uuid,                     -- wie de na-foto toevoegde (eigenaar van het pad)
  ingesteld_door  uuid,                     -- wie het voorstel instelde (Voorstel → Open)
  vervallen_door  uuid,                     -- wie het voorstel liet vervallen (Voorstel → Vervallen)
  -- iedereen die houder was of een uitvoeringsstap zette; zij mogen nooit toetsen
  uitvoerders     uuid[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint acties_id_vorm         check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  constraint acties_geen_demo       check (id !~* '(^|-)demo'),
  -- een voorstel mag (nog) zonder tekst: de inspecteur kan "toch vastleggen" met een open
  -- punt. Wie instelt vult de tekst in; vanaf Open is hij verplicht.
  constraint acties_tekst_lengte    check (char_length(tekst) <= 2000 and (
    status not in ('Open', 'In uitvoering', 'Klaar voor toetsing') or char_length(btrim(tekst)) >= 1)),
  constraint acties_waarn_lengte    check (waarneming is null or char_length(waarneming) <= 2000),
  constraint acties_ref_lengte      check (ref is null or char_length(ref) <= 60),
  -- het oordeel komt altijd van de inspecteur (C/A/V/NVT); '–' = handmatige actie
  constraint acties_oordeel_geldig  check (oordeel is null or oordeel in ('C', 'A', 'V', 'NVT', '–')),
  constraint acties_prio_geldig     check (prio is null or prio in ('direct', 'kort', 'planmatig')),
  -- toetser is nooit de actiehouder
  constraint acties_toetser_niet_houder check (houder is null or toetser is null or houder <> toetser),
  -- ingestelde acties hebben altijd houder, toetser en plandatum
  constraint acties_ingesteld_compleet check (
    status not in ('Open', 'In uitvoering', 'Klaar voor toetsing')
    or (houder is not null and toetser is not null and plandatum is not null)),
  -- afronden kan alleen met een toetser
  constraint acties_afgerond_toetser check (status <> 'Afgerond' or toetser is not null),
  -- foto's: pad binnen bucket "fotos" = <uid uploader>/<naam>.<jpg|jpeg|png|webp>;
  -- dat de uid van de schrijver is, controleert acties_valideer
  constraint acties_foto_pad_vorm check (foto_pad is null or (
    foto_pad ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and foto_pad not like '%..%')),
  constraint acties_nafoto_pad_vorm check (nafoto_pad is null or (
    nafoto_pad ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and nafoto_pad not like '%..%'))
);
create index if not exists acties_inspectie_idx on public.acties (inspectie_id);
create index if not exists acties_houder_idx on public.acties (houder);
create index if not exists acties_toetser_idx on public.acties (toetser);
create index if not exists acties_status_idx on public.acties (status);
create index if not exists acties_aanmaker_idx on public.acties (aangemaakt_door, created_at);

-- ---------- Actielog (append-only verloop per actie) ----------
-- Geen FK naar acties: het verloop blijft bestaan, ook als een actie (AVG-
-- bewaartermijn) wordt verwijderd.
create table if not exists public.actie_log (
  id        bigserial primary key,
  actie_id  text not null,
  t         timestamptz not null default now(),
  wie       uuid default auth.uid(),
  wat       text not null,
  -- 'server' = statusregel van de database (trigger); 'client' = toelichting uit de app.
  -- De server zet dit zelf: een client kan nooit een 'server'-regel schrijven.
  bron      text not null default 'client',
  t_client  timestamptz,                    -- moment volgens het toestel (offline), begrensd
  constraint actie_log_wat_lengte check (char_length(wat) between 1 and 2000),
  constraint actie_log_bron_geldig check (bron in ('server', 'client'))
);
create index if not exists actie_log_actie_idx on public.actie_log (actie_id, t);
create index if not exists actie_log_wie_idx on public.actie_log (wie, t);

-- ---------- Instellingen (bijv. doel_conform) ----------
create table if not exists public.instellingen (
  sleutel     text primary key,
  waarde      jsonb not null,
  updated_at  timestamptz not null default now(),
  constraint instellingen_sleutel_vorm check (sleutel ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint instellingen_waarde_grootte check (octet_length(waarde::text) <= 65536),
  -- alleen bekende sleutels met een geldige waarde:
  --   doel_conform        geheel getal 1..100 (rij weg of JSON null = geen doel)
  --   mfa_verplicht_hoofd true/false
  constraint instellingen_waarde_geldig check (case sleutel
    when 'doel_conform' then case
      when jsonb_typeof(waarde) = 'null' then true
      when jsonb_typeof(waarde) = 'number' and waarde::text ~ '^[0-9]{1,3}$' then (waarde::text)::int between 1 and 100
      else false end
    when 'mfa_verplicht_hoofd' then jsonb_typeof(waarde) = 'boolean'
    else false end)
);

-- ---------- Auditlog (append-only, gevuld door triggers) ----------
create table if not exists public.audit_log (
  id         bigserial primary key,
  t          timestamptz not null default now(),
  wie        uuid,
  tabel      text not null,
  record_id  text,
  actie      text not null,
  -- INSERT: de hele nieuwe rij; DELETE: de hele oude rij; UPDATE: alleen de gewijzigde
  -- kolommen (oud en nieuw), plus id. Zo is elke versie te herleiden zonder dat elke
  -- kleine wijziging een volledige kopie (tot 1 MB) oplevert.
  oud        jsonb,
  nieuw      jsonb,
  grootte    integer not null default 0,   -- bytes van oud + nieuw (voor het schrijfquotum)
  constraint audit_log_actie_geldig check (actie in ('INSERT', 'UPDATE', 'DELETE'))
);
create index if not exists audit_log_t_idx on public.audit_log (t);
create index if not exists audit_log_record_idx on public.audit_log (tabel, record_id);

-- ---------- Beveiligingsgebeurtenissen (append-only) ----------
create table if not exists public.security_events (
  id       bigserial primary key,
  t        timestamptz not null default now(),
  wie      uuid,
  soort    text not null,
  details  jsonb not null default '{}'::jsonb,
  constraint security_events_soort_vorm check (soort ~ '^[a-z][a-z0-9_]{2,47}$'),
  constraint security_events_details_obj check (jsonb_typeof(details) = 'object'),
  constraint security_events_details_grootte check (octet_length(details::text) <= 4096)
);
create index if not exists security_events_wie_t_idx on public.security_events (wie, t);
create index if not exists security_events_t_idx on public.security_events (t);

-- ---------- Bijwerken van een eerdere v1-installatie (idempotent) ----------
-- create table if not exists voegt geen kolommen of nieuwe CHECKs toe aan een
-- bestaande tabel; dat gebeurt hier. Op een lege database doet dit niets nieuws.
alter table public.profiles alter column actief set default false;
alter table public.profiles add column if not exists uitgenodigd boolean not null default false;
alter table public.audit_log add column if not exists grootte integer not null default 0;
-- schrijfquotum per gebruiker (audit_quotum): snel tellen en optellen per gebruiker
create index if not exists audit_log_wie_t_idx on public.audit_log (wie, t) include (grootte, actie);
alter table public.acties add column if not exists afgerond_server timestamptz;
alter table public.acties add column if not exists klaar_op timestamptz;
alter table public.acties add column if not exists nafoto_door uuid;
alter table public.acties add column if not exists ingesteld_door uuid;
alter table public.acties add column if not exists vervallen_door uuid;
alter table public.acties add column if not exists uitvoerders uuid[] not null default '{}';
alter table public.actie_log add column if not exists bron text not null default 'client';
alter table public.actie_log add column if not exists t_client timestamptz;
do $$
begin
  -- vaste DDL, geen dynamische SQL
  if not exists (select 1 from pg_constraint where conrelid = 'public.inspecties'::regclass and conname = 'inspecties_geen_demo') then
    alter table public.inspecties add constraint inspecties_geen_demo check (id !~* '(^|-)demo');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.planning'::regclass and conname = 'planning_geen_demo') then
    alter table public.planning add constraint planning_geen_demo check (id !~* '(^|-)demo');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.acties'::regclass and conname = 'acties_geen_demo') then
    alter table public.acties add constraint acties_geen_demo check (id !~* '(^|-)demo');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.planning'::regclass and conname = 'planning_uitgevoerd_inspectie') then
    -- NOT VALID + los valideren: een oude rij zonder inspectie blokkeert de migratie niet
    -- (nieuwe en gewijzigde rijen moeten wel voldoen); zie README §1.5 om ze op te sporen.
    alter table public.planning add constraint planning_uitgevoerd_inspectie
      check (status <> 'uitgevoerd' or inspectie_id is not null) not valid;
    begin
      alter table public.planning validate constraint planning_uitgevoerd_inspectie;
    exception when check_violation then
      raise warning 'planning: er zijn uitgevoerde planningen zonder inspectie (zie README §1.5)';
    end;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.actie_log'::regclass and conname = 'actie_log_bron_geldig') then
    alter table public.actie_log add constraint actie_log_bron_geldig check (bron in ('server', 'client'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.instellingen'::regclass and conname = 'instellingen_waarde_geldig') then
    alter table public.instellingen add constraint instellingen_waarde_geldig check (case sleutel
      when 'doel_conform' then case
        when jsonb_typeof(waarde) = 'null' then true
        when jsonb_typeof(waarde) = 'number' and waarde::text ~ '^[0-9]{1,3}$' then (waarde::text)::int between 1 and 100
        else false end
      when 'mfa_verplicht_hoofd' then jsonb_typeof(waarde) = 'boolean'
      else false end);
  end if;
end $$;
alter table public.acties drop constraint if exists acties_tekst_lengte;
alter table public.acties add constraint acties_tekst_lengte check (char_length(tekst) <= 2000 and (
  status not in ('Open', 'In uitvoering', 'Klaar voor toetsing') or char_length(btrim(tekst)) >= 1));
alter table public.monteurs drop constraint if exists monteurs_naam_tekens;
alter table public.monteurs add constraint monteurs_naam_tekens check (public.naam_tekens_ok(naam));
alter table public.profiles drop constraint if exists profiles_naam_tekens;
alter table public.profiles add constraint profiles_naam_tekens check (public.naam_tekens_ok(full_name));
alter table public.acties drop constraint if exists acties_foto_pad_vorm;
alter table public.acties add constraint acties_foto_pad_vorm check (foto_pad is null or (
  foto_pad ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
  and foto_pad not like '%..%'));
alter table public.acties drop constraint if exists acties_nafoto_pad_vorm;
alter table public.acties add constraint acties_nafoto_pad_vorm check (nafoto_pad is null or (
  nafoto_pad ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
  and nafoto_pad not like '%..%'));
-- profielen die al via een uitnodiging zijn binnengekomen (eerdere v1-installatie)
update public.profiles p set uitgenodigd = true
  from auth.users u
 where u.id = p.id and u.invited_at is not null and not p.uitgenodigd;

-- >>>>> 0002_functies_validatie.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0002: rolhelpers en server-side validatie
-- Alle SECURITY DEFINER-functies hebben search_path = '' en gebruiken
-- volledig gekwalificeerde namen. Geen dynamische SQL.
-- =====================================================================

-- ---------- Rolhelpers (gebruikt in RLS-policies) ----------
-- Inactieve profielen hebben geen rol => geen toegang (direct intrekken).
create or replace function public.mijn_rol()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.actief
$$;

create or replace function public.is_lid()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.mijn_rol() is not null
$$;

create or replace function public.is_hoofd()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.mijn_rol() = 'hoofd', false)
$$;

-- MFA: zodra instelling mfa_verplicht_hoofd = true, vereist ALLES wat het hoofd extra
-- mag (staf-rechten én beheerroutes) een sessie op niveau aal2. Met alleen een
-- wachtwoord (aal1) heeft het hoofd dan de rechten van een inspecteur: een gestolen
-- wachtwoord geeft geen inzage in alle inspecties en geen staf-schrijfrechten.
create or replace function public.mfa_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select i.waarde = 'true'::jsonb from public.instellingen i
                   where i.sleutel = 'mfa_verplicht_hoofd'), false) = false
         or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- coordinator of hoofd (hoofd: met MFA als die verplicht is): ziet alles en mag
-- plannen/instellen/toewijzen
create or replace function public.is_staf()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.mijn_rol()
           when 'coordinator' then true
           when 'hoofd' then public.mfa_ok()
           else false end
$$;

-- leesrecht op alles: staf + QHSE-manager (rapportage/VCA-audit)
create or replace function public.mag_alles_lezen()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.mijn_rol()
           when 'coordinator' then true
           when 'qhse' then true
           when 'hoofd' then public.mfa_ok()
           else false end
$$;

-- "beheerroutes": instellingen, monteurs, rollen, auditlog
create or replace function public.is_hoofd_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_hoofd() and public.mfa_ok()
$$;

create or replace function public.is_eigen_inspectie(p_inspectie_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_inspectie_id is not null and exists (
    select 1 from public.inspecties i
    where i.id = p_inspectie_id and i.inspecteur_id = auth.uid())
$$;

-- vandaag volgens de Nederlandse kalender (de server draait in UTC)
create or replace function public.vandaag()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'Europe/Amsterdam')::date
$$;

-- Mag de huidige gebruiker deze actie zien? Eén bron voor de RLS-policy op acties
-- en voor de foto-toegang (foto_via_actie).
--   staf/QHSE: alles; verder: houder, toetser, aanmaker, wie instelde, wie liet vervallen,
--   inspecteur van de bron-inspectie,
--   ÉN voor iedereen: alle voorstellen ("iedereen mag instellen") en alle acties die
--   over de plandatum zijn ("te laat: hele team").
-- (De oude versie met 7 parameters verwijdert 0003, nadat de policies zijn vervangen.)
create or replace function public.actie_zichtbaar(
  p_houder uuid, p_toetser uuid, p_aangemaakt_door uuid, p_ingesteld_door uuid,
  p_vervallen_door uuid, p_inspectie_id text, p_status public.actie_status, p_plandatum date)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_lid() and (
       public.mag_alles_lezen()
    or p_houder = auth.uid() or p_toetser = auth.uid() or p_aangemaakt_door = auth.uid()
    or p_ingesteld_door = auth.uid() or p_vervallen_door = auth.uid()
    or public.is_eigen_inspectie(p_inspectie_id)
    or p_status = 'Voorstel'
    or (p_status in ('Open', 'In uitvoering') and p_plandatum < public.vandaag()))
$$;

-- Hoort de huidige gebruiker bij deze actie (meer dan alleen "mag hem zien")?
-- staf/QHSE, houder, toetser, aanmaker, wie instelde of liet vervallen, inspecteur van
-- de bron-inspectie. Alleen zij voegen regels toe aan het verloop (actie_log): een
-- willekeurig teamlid kan zo geen regels in het verloop van elk voorstel of elke te late
-- actie zetten. Wie een voorstel instelt of laat vervallen, is daarna betrokken.
create or replace function public.actie_betrokken(p_actie_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_lid() and exists (
    select 1 from public.acties a
    where a.id = p_actie_id
      and (public.mag_alles_lezen()
           or a.houder = auth.uid() or a.toetser = auth.uid() or a.aangemaakt_door = auth.uid()
           or a.ingesteld_door = auth.uid() or a.vervallen_door = auth.uid()
           or public.is_eigen_inspectie(a.inspectie_id)))
$$;

-- Mag de huidige gebruiker deze foto (pad binnen bucket "fotos") zien via een actie?
-- Alleen als het object ECHT bij die actie hoort: de foto is geüpload door de aanmaker
-- van de actie (of de inspecteur van de bron-inspectie), de na-foto door wie hem
-- toevoegde. Een zelfgekozen pad naar andermans foto geeft dus geen toegang.
create or replace function public.foto_via_actie(p_naam text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.acties a
    left join public.inspecties i on i.id = a.inspectie_id
    where ((regexp_replace(a.foto_pad, '^fotos/', '') = p_naam
            and public.foto_eigenaar(p_naam) in (a.aangemaakt_door::text, i.inspecteur_id::text))
        or (regexp_replace(a.nafoto_pad, '^fotos/', '') = p_naam
            and public.foto_eigenaar(p_naam) = a.nafoto_door::text))
      and public.actie_zichtbaar(a.houder, a.toetser, a.aangemaakt_door, a.ingesteld_door,
                                 a.vervallen_door, a.inspectie_id, a.status, a.plandatum))
$$;

-- Wordt dit object gebruikt als bewijs (in een actie of in een inspectierecord)?
-- Zo ja, dan mag alleen het hoofd het verwijderen. Voor paden buiten de eigen map
-- antwoordt de functie altijd true (geeft dus niets prijs over andermans foto's).
-- Alleen de EIGEN inspecties tellen: een foto in een inspectierecord is altijd van de
-- inspecteur zelf. Zo kan een ander het verwijderen niet blokkeren door jouw pad in
-- zijn eigen record te zetten. (In acties kan alleen de uploader een pad koppelen.)
create or replace function public.foto_in_gebruik(p_naam text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.foto_eigenaar(p_naam) is distinct from auth.uid()::text
      or exists (select 1 from public.acties a
                 where regexp_replace(a.foto_pad, '^fotos/', '') = p_naam
                    or regexp_replace(a.nafoto_pad, '^fotos/', '') = p_naam)
      or exists (select 1 from public.inspecties i
                 where i.inspecteur_id = auth.uid()
                   and strpos(i.record::text, p_naam) > 0)
$$;

-- Id's die de app maakt bevatten het moment in ms (WPI-<ms>, ACT-<ms>-<n>, PL-<ms>).
-- Een nieuw id mag niet meer dan 5 minuten in de toekomst liggen: zo kan niemand de
-- id's van collega's (die volgen uit de klok) vooraf "claimen" en daarmee hun
-- synchronisatie blokkeren of hun rij overnemen. Samen met de limiet op nieuwe rijen
-- per uur (zie de *_controle_nieuw-triggers) is raden praktisch kansloos.
-- Id's zonder tijdstempel (bv. een willekeurig id) zijn toegestaan.
create or replace function public.id_tijd_ok(p_id text)
returns boolean
language sql stable set search_path = ''
as $$
  select case
    when p_id ~ '^[A-Za-z]{1,8}-[0-9]{13}($|-)'
      then substring(p_id from '^[A-Za-z]{1,8}-([0-9]{13})')::bigint
           <= (extract(epoch from now()) * 1000)::bigint + 300000
    else true end
$$;

-- ---------- updated_at ----------
create or replace function public.zet_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists zet_updated_at on public.profiles;
create trigger zet_updated_at before insert or update on public.profiles
  for each row execute function public.zet_updated_at();
drop trigger if exists zet_updated_at on public.monteurs;
create trigger zet_updated_at before insert or update on public.monteurs
  for each row execute function public.zet_updated_at();
drop trigger if exists zet_updated_at on public.inspecties;
create trigger zet_updated_at before insert or update on public.inspecties
  for each row execute function public.zet_updated_at();
drop trigger if exists zet_updated_at on public.planning;
create trigger zet_updated_at before insert or update on public.planning
  for each row execute function public.zet_updated_at();
drop trigger if exists zet_updated_at on public.acties;
create trigger zet_updated_at before insert or update on public.acties
  for each row execute function public.zet_updated_at();
drop trigger if exists zet_updated_at on public.instellingen;
create trigger zet_updated_at before insert or update on public.instellingen
  for each row execute function public.zet_updated_at();

-- ---------- Monteursnamen netjes opslaan (zoals schoon() in beheer.js) ----------
-- NFC, spaties samengevoegd, losse leestekens aan het eind weg ("Henk Voorbeeld." →
-- "Henk Voorbeeld"). Dubbelen (zelfde naam_sleutel) weigert de unieke index.
create or replace function public.monteurs_normaliseer()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.naam := public.naam_schoon(new.naam);
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists monteurs_normaliseer on public.monteurs;
create trigger monteurs_normaliseer before insert or update on public.monteurs
  for each row execute function public.monteurs_normaliseer();

-- ---------- Nieuw auth-account => profiel (rol ALTIJD inspecteur) ----------
-- De rol komt nooit uit user_metadata (die kan de gebruiker zelf zetten).
-- Actief alleen als het account is UITGENODIGD (auth.users.invited_at, dat zet
-- alleen Supabase Auth). Een losse aanmelding (ook als signups per ongeluk aan
-- staan) krijgt een inactief profiel met een NEUTRALE naam ("Niet-uitgenodigd account
-- 1a2b3c4d"): de naam uit de aanmelding telt niet, zodat niemand vooraf de naam van een
-- collega kan bezetten (de echte collega zou dan "Naam (2)" worden). Zo'n profiel ziet
-- niets en is voor de leden onzichtbaar (profiles_select), tot het hoofd het activeert.
-- Bestaat een naam al, dan krijgt het nieuwe profiel een volgnummer: namen in de kiezer
-- zijn altijd uniek.

-- Beginnaam van een uitgenodigd account: full_name uit de uitnodiging, anders het deel
-- vóór de @; zonder onzichtbare/besturingstekens; uniek gemaakt met een volgnummer.
create or replace function public.profiel_beginnaam(p_meta jsonb, p_email text, p_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_basis text;
  v_naam  text;
  v_n     integer := 1;
begin
  v_basis := left(btrim(regexp_replace(regexp_replace(coalesce(
               nullif(btrim(p_meta ->> 'full_name'), ''),
               nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
               'Nieuwe gebruiker'),
               '[[:cntrl:]\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]', '', 'g'),
               '\s+', ' ', 'g')), 110);
  if v_basis = '' then
    v_basis := 'Nieuwe gebruiker';
  end if;
  v_naam := v_basis;
  while exists (select 1 from public.profiles p
                where public.naam_sleutel(p.full_name) = public.naam_sleutel(v_naam)
                  and p.id is distinct from p_id) loop
    v_n := v_n + 1;
    v_naam := v_basis || ' (' || v_n || ')';
  end loop;
  return v_naam;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_naam text;
begin
  if new.invited_at is not null then
    v_naam := public.profiel_beginnaam(new.raw_user_meta_data, new.email, new.id);
  else
    -- losse aanmelding (of "Add user"): neutrale naam, nooit uit de metadata
    v_naam := public.profiel_beginnaam(
                jsonb_build_object('full_name', 'Niet-uitgenodigd account ' || left(new.id::text, 8)), null, new.id);
  end if;
  insert into public.profiles (id, full_name, actief, uitgenodigd)
  values (new.id, v_naam, new.invited_at is not null, new.invited_at is not null)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Supabase Auth ("Invite user" / admin invite) maakt eerst de gebruiker aan en zet daarna
-- in DEZELFDE transactie invited_at (GoTrue: invite-handler in één db.Transaction; het
-- profiel krijgt dan created_at = now() = begin van die transactie). Alleen dan: profiel
-- activeren en de naam uit de uitnodiging zetten. Geen tijdvenster: een account dat ook maar
-- één transactie eerder bestond, telt als "al bestaand". Wordt een account uitgenodigd dat al eerder bestond (bv. iemand
-- registreerde zich vooraf met het adres van een collega, of het hoofd deed eerst "Add
-- user"), dan wordt het NIET automatisch actief: dat is precies de vooraf-registreren-
-- aanval (het wachtwoord is dan van wie zich aanmeldde). Er komt een security_event; het
-- hoofd beoordeelt en activeert zo nodig zelf.
create or replace function public.handle_user_invited()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.invited_at is null and new.invited_at is not null then
    if exists (select 1 from public.profiles p
               where p.id = new.id and not p.uitgenodigd and not p.actief
                 and p.created_at = now()) then
      update public.profiles p
         set actief = true, uitgenodigd = true,
             full_name = public.profiel_beginnaam(new.raw_user_meta_data, new.email, new.id)
       where p.id = new.id;
    elsif exists (select 1 from public.profiles p where p.id = new.id and not p.uitgenodigd) then
      insert into public.security_events (wie, soort, details)
      values (null, 'uitnodiging_bestaand_account',
              jsonb_build_object('profiel', new.id,
                                 'melding', 'Uitnodiging voor een account dat al bestond: niet automatisch geactiveerd'));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited
  after update of invited_at on auth.users
  for each row execute function public.handle_user_invited();

-- ---------- Profielen: naam, functie, rol en activering alleen door het hoofd ----------
create or replace function public.profiles_bewaak()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'Het id van een profiel kan niet worden gewijzigd' using errcode = '42501';
  end if;
  new.created_at := old.created_at;
  if auth.uid() is not null then
    new.uitgenodigd := old.uitgenodigd;   -- alleen de server (uitnodiging) zet dit
  end if;
  new.full_name := regexp_replace(btrim(new.full_name), '\s+', ' ', 'g');
  if auth.uid() is not null and not public.is_hoofd_admin()
     and (new.role, new.actief, new.full_name, new.functie)
         is distinct from (old.role, old.actief, old.full_name, old.functie) then
    raise exception 'Alleen het hoofd mag namen, functies, rollen en activering wijzigen' using errcode = '42501';
  end if;
  -- De QHSE-manager is nooit actiehouder of toetser (methode). Wie dat nu is bij een
  -- lopende actie, wordt pas QHSE-manager als die acties aan een ander zijn toegewezen.
  -- (acties_controle_personen leest de rol met FOR SHARE: een gelijktijdige toewijzing
  -- wacht op deze wijziging, of deze wijziging wacht op de toewijzing.)
  if new.role = 'qhse' and old.role <> 'qhse'
     and exists (select 1 from public.acties a
                 where (a.houder = new.id or a.toetser = new.id)
                   and a.status in ('Voorstel', 'Open', 'In uitvoering', 'Klaar voor toetsing')) then
    raise exception 'Deze persoon is actiehouder of toetser van lopende acties; wijs die eerst aan een ander toe (de QHSE-manager is nooit actiehouder of toetser)'
      using errcode = '23514';
  end if;
  if old.role = 'hoofd' and old.actief and (new.role <> 'hoofd' or not new.actief) then
    -- Eén tegelijk: zonder dit slot kunnen twee hoofden elkaar tegelijk degraderen
    -- en blijft er geen hoofd over. Na het slot ziet de controle hieronder (READ
    -- COMMITTED, nieuwe snapshot) de wijziging van de ander.
    perform pg_advisory_xact_lock(hashtextextended('wpi_laatste_hoofd', 0));
    if not exists (select 1 from public.profiles p
                   where p.role = 'hoofd' and p.actief and p.id <> old.id) then
      raise exception 'Er moet altijd minstens één actief hoofd zijn' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_bewaak on public.profiles;
create trigger profiles_bewaak before update on public.profiles
  for each row execute function public.profiles_bewaak();

-- ---------- Inspecties ----------
-- De oordelen van een momentopname: per waarneming (in volgorde) id en oordeel.
-- (Hulpfunctie voor rapportage; de bevriezing hieronder vergelijkt het hele record.)
create or replace function public.inspectie_oordelen(p_record jsonb)
returns jsonb
language sql immutable parallel safe set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.e -> 'id', 'oordeel', w.e -> 'oordeel') order by w.n), '[]'::jsonb)
  from jsonb_array_elements(
         case when jsonb_typeof(p_record -> 'waarnemingen') = 'array'
              then p_record -> 'waarnemingen' else '[]'::jsonb end) with ordinality as w (e, n)
$$;

create or replace function public.inspecties_valideer()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_w jsonb;
begin
  -- Bij een upsert (INSERT ... ON CONFLICT DO UPDATE) draait deze trigger ook
  -- voor de voorgestelde rij; de UPDATE-tak houdt daarna de serverwaarden vast.
  -- Controles die alleen voor echt nieuwe rijen gelden: inspecties_controle_nieuw.
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.id <> old.id then
      raise exception 'Het id van een inspectie kan niet worden gewijzigd' using errcode = '42501';
    end if;
    if new.inspecteur_id <> old.inspecteur_id and auth.uid() is not null then
      raise exception 'De inspecteur van een inspectie kan niet worden gewijzigd' using errcode = '42501';
    end if;
    new.created_at := old.created_at;
    if auth.uid() is not null then
      -- De momentopname ligt vast. Het moment van vastleggen (bepaalt kwartaal en
      -- dashboard) blijft staan, en de INHOUD wijzigt niemand achteraf, ook de inspecteur
      -- zelf niet: het hele record (waarnemingen met tekst, foto en oordeel, gesprek,
      -- positief, keuzes, monteurs, handtekening) en titel, code en project. "Alleen wat
      -- de inspecteur zag telt" — en dat is wat hij op dat moment vastlegde. De app wijzigt
      -- een vastgelegde inspectie nooit; een herhaalde upload van dezelfde inhoud (na een
      -- netwerkfout) is geen wijziging en lukt gewoon. Alleen plan_id (koppeling met de
      -- planning) mag nog veranderen. Een correctie doet het hoofd bewust via SQL
      -- (service_role/postgres); die staat dan in audit_log.
      new.opgeslagen := old.opgeslagen;
      if (new.record, new.titel, new.code, new.project)
         is distinct from (old.record, old.titel, old.code, old.project) then
        raise exception 'De momentopname ligt vast: de inhoud van een vastgelegde inspectie kan niet meer worden gewijzigd'
          using errcode = '42501';
      end if;
    end if;
  end if;

  -- methode: het oordeel is altijd C/A/V/NVT (of nog leeg) en komt van de inspecteur
  v_w := new.record -> 'waarnemingen';
  if v_w is not null and jsonb_typeof(v_w) <> 'array' then
    raise exception 'record.waarnemingen moet een lijst zijn' using errcode = '22023';
  end if;
  if v_w is not null and exists (
       select 1 from jsonb_array_elements(v_w) w
       where jsonb_typeof(w) <> 'object'
          or (w ->> 'oordeel' is not null and w ->> 'oordeel' not in ('C', 'A', 'V', 'NVT'))) then
    raise exception 'Ongeldig oordeel in waarnemingen: alleen C, A, V of NVT' using errcode = '22023';
  end if;
  -- foto's horen in Storage; nooit als data-URL in het record (ook niet DATA:IMAGE/…)
  if new.record::text ~* 'data:\s*image/' then
    raise exception 'Foto''s niet in het record opslaan maar in Storage (alleen het pad)' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists inspecties_valideer on public.inspecties;
create trigger inspecties_valideer before insert or update on public.inspecties
  for each row execute function public.inspecties_valideer();

-- AFTER INSERT vuurt alleen voor rijen die echt nieuw zijn (niet bij upsert-update).
-- * opgeslagen (moment van vastleggen, bepaalt kwartaal/dashboard = VCA-bewijs) moet
--   plausibel zijn: niet meer dan 30 dagen terug (offline) en niet in de toekomst.
-- * id niet in de toekomst (zie id_tijd_ok) en max 30 nieuwe inspecties per uur.
create or replace function public.inspecties_controle_nieuw()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return null;   -- service_role / beheer via SQL (bv. een bewuste import door het hoofd)
  end if;
  if new.opgeslagen > now() + interval '5 minutes' or new.opgeslagen < now() - interval '30 days' then
    raise exception 'Het moment van vastleggen (opgeslagen) moet tussen 30 dagen geleden en nu liggen (staat de klok van het toestel goed?)'
      using errcode = '22023';
  end if;
  if not public.id_tijd_ok(new.id) then
    raise exception 'Ongeldig id: het tijdstip in het id ligt in de toekomst (staat de klok van het toestel goed?)'
        using errcode = '22023';
  end if;
  if (select count(*) from public.inspecties i
       where i.inspecteur_id = v_uid and i.created_at > now() - interval '1 hour') > 30 then
    raise exception 'Te veel nieuwe inspecties in het afgelopen uur; probeer het later opnieuw'
      using errcode = '54000';
  end if;
  return null;
end $$;

drop trigger if exists inspecties_controle_nieuw on public.inspecties;
create trigger inspecties_controle_nieuw after insert on public.inspecties
  for each row execute function public.inspecties_controle_nieuw();

-- ---------- Planning ----------
-- Iedereen mag inplannen, ook voor een ander (zoals planning.js).
--   maker (gemaakt_door)      : alles, zolang het gepland is
--   toegewezen inspecteur     : verzetten (datum, locatie, …), als uitgevoerd markeren en
--                               uit de planning halen (zoals planning.js), maar NIET aan
--                               een ander toewijzen (servereis, wijkt af van planning.js:
--                               de planning zou daarna voor hem onzichtbaar worden en de
--                               maker/staf verliest het overzicht; zie README §5)
--   coördinator/hoofd         : alles
-- Een weigering op een rij die je kunt zien geeft een FOUT (geen stille "0 rijen").
-- "Uitgevoerd" betekent: er IS een inspectie (CHECK planning_uitgevoerd_inspectie). Wie
-- geen staf is, zet uitgevoerd alleen met zijn EIGEN inspectie, en alleen als hij ook de
-- ingeplande inspecteur is (zoals de app: na het vastleggen van de inspectie). Zo kan
-- niemand de herinnering "Inspectie niet uitgevoerd" wegklikken zonder inspectie.
create or replace function public.planning_uitgevoerd_ok(p_inspectie_id text, p_inspecteur uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_inspectie_id is not null and exists (
    select 1 from public.inspecties i
    where i.id = p_inspectie_id and i.inspecteur_id = p_inspecteur and i.inspecteur_id = auth.uid())
$$;

create or replace function public.planning_valideer()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_staf boolean := public.is_staf();
begin
  if tg_op = 'INSERT' then
    -- alleen serverwaarden zetten; controles op echte nieuwe rijen in planning_controle_nieuw
    -- (een upsert die een UPDATE wordt, mag niet op de voorgestelde rij stuklopen)
    new.created_at := now();
    if v_uid is not null then
      new.gemaakt_door := v_uid;
    end if;
    return new;
  end if;

  if new.id <> old.id then
    raise exception 'Het id van een planning kan niet worden gewijzigd' using errcode = '42501';
  end if;
  new.created_at := old.created_at;
  if v_uid is not null then
    new.gemaakt_door := old.gemaakt_door;   -- stilzwijgend vasthouden (upsert stuurt het mee)
  end if;
  if v_uid is not null and not v_staf then
    if old.status = 'uitgevoerd'
       and (new.status, new.datum, new.code, new.project, new.locatie, new.monteurs, new.inspecteur,
            new.toelichting, new.inspectie_id)
           is distinct from
           (old.status, old.datum, old.code, old.project, old.locatie, old.monteurs, old.inspecteur,
            old.toelichting, old.inspectie_id) then
      raise exception 'Een uitgevoerde inspectie ligt vast in de planning' using errcode = '42501';
    end if;
    if new.inspecteur is distinct from old.inspecteur and old.gemaakt_door is distinct from v_uid then
      raise exception 'Alleen wie de planning maakte (of een coördinator/hoofd) mag de inspecteur wijzigen'
        using errcode = '42501';
    end if;
    if new.inspectie_id is distinct from old.inspectie_id and new.inspectie_id is not null
       and not public.is_eigen_inspectie(new.inspectie_id) then
      raise exception 'Koppel alleen je eigen inspectie aan een planning' using errcode = '42501';
    end if;
    if new.status = 'uitgevoerd'
       and (old.status, old.inspectie_id, old.inspecteur) is distinct from ('uitgevoerd', new.inspectie_id, new.inspecteur)
       and not public.planning_uitgevoerd_ok(new.inspectie_id, new.inspecteur) then
      raise exception 'Als uitgevoerd markeren kan alleen de ingeplande inspecteur, met zijn eigen vastgelegde inspectie'
        using errcode = '42501';
    end if;
  end if;

  if new.inspecteur is distinct from old.inspecteur then
    if not exists (select 1 from public.profiles p where p.id = new.inspecteur and p.actief) then
      raise exception 'Inspecteur onbekend of niet actief' using errcode = '23503';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists planning_valideer on public.planning;
create trigger planning_valideer before insert or update on public.planning
  for each row execute function public.planning_valideer();

-- AFTER INSERT vuurt alleen voor rijen die echt nieuw zijn (niet bij upsert-update)
create or replace function public.planning_controle_nieuw()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.inspecteur and p.actief) then
    raise exception 'Inspecteur onbekend of niet actief' using errcode = '23503';
  end if;
  if auth.uid() is not null and not public.is_staf() and new.inspectie_id is not null
     and not public.is_eigen_inspectie(new.inspectie_id) then
    raise exception 'Koppel alleen je eigen inspectie aan een planning' using errcode = '42501';
  end if;
  if auth.uid() is not null and not public.is_staf() and new.status = 'uitgevoerd'
     and not public.planning_uitgevoerd_ok(new.inspectie_id, new.inspecteur) then
    raise exception 'Als uitgevoerd markeren kan alleen de ingeplande inspecteur, met zijn eigen vastgelegde inspectie'
      using errcode = '42501';
  end if;
  if auth.uid() is not null then
    if not public.id_tijd_ok(new.id) then
      raise exception 'Ongeldig id: het tijdstip in het id ligt in de toekomst (staat de klok van het toestel goed?)'
        using errcode = '22023';
    end if;
    if (select count(*) from public.planning p
         where p.gemaakt_door = auth.uid() and p.created_at > now() - interval '1 hour') > 100 then
      raise exception 'Te veel nieuwe planningen in het afgelopen uur; probeer het later opnieuw'
        using errcode = '54000';
    end if;
  end if;
  return null;
end $$;

drop trigger if exists planning_controle_nieuw on public.planning;
create trigger planning_controle_nieuw after insert on public.planning
  for each row execute function public.planning_controle_nieuw();

-- Verwijderen ("Uit de planning halen", zoals planning.js): staf, of de maker of de
-- toegewezen inspecteur zolang het nog gepland is. Een uitgevoerde planning is bewijs en
-- haalt alleen staf weg. Anders een duidelijke fout. (Rijen die je niet kunt zien, raakt
-- een DELETE niet: dat blijft "0 rijen", zoals altijd bij RLS.)
create or replace function public.planning_verwijder()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_staf()
     or ((old.gemaakt_door = auth.uid() or old.inspecteur = auth.uid()) and old.status = 'gepland') then
    return old;
  end if;
  raise exception 'Een uitgevoerde planning haalt alleen een coördinator of het hoofd weg'
    using errcode = '42501';
end $$;

drop trigger if exists planning_verwijder on public.planning;
create trigger planning_verwijder before delete on public.planning
  for each row execute function public.planning_verwijder();

-- ---------- Acties: actiehouder en toetser controleren ----------
-- houder en toetser: bestaand, actief en nooit de QHSE-manager (QHSE blijft
-- onafhankelijk, zoals in de app); toetser ≠ houder. Actief-zijn wordt gecontroleerd bij
-- nieuwe of gewijzigde personen. De rol wordt met FOR SHARE gelezen: een gelijktijdige
-- rolwijziging naar QHSE (profiles_bewaak) wacht hierop, of deze controle wacht daarop en
-- ziet dan de nieuwe rol.
create or replace function public.acties_controle_personen(
  p_houder uuid, p_toetser uuid, p_houder_nieuw boolean, p_toetser_nieuw boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_rol public.user_role;
begin
  if p_houder is not null and p_houder_nieuw then
    select p.role into v_rol from public.profiles p where p.id = p_houder and p.actief for share;
    if v_rol is null then
      raise exception 'Actiehouder onbekend of niet actief' using errcode = '23503';
    end if;
    if v_rol = 'qhse' then
      raise exception 'De QHSE-manager kan geen actiehouder zijn' using errcode = '23514';
    end if;
  end if;
  if p_toetser is not null and p_toetser_nieuw then
    v_rol := null;
    select p.role into v_rol from public.profiles p where p.id = p_toetser and p.actief for share;
    if v_rol is null then
      raise exception 'Toetser onbekend of niet actief' using errcode = '23503';
    end if;
    if v_rol = 'qhse' then
      raise exception 'De QHSE-manager kan geen toetser zijn' using errcode = '23514';
    end if;
  end if;
  if p_houder is not null and p_houder = p_toetser then
    raise exception 'De toetser mag niet de actiehouder zijn' using errcode = '23514';
  end if;
end $$;

-- Bij elke statuswijziging: houder en toetser hebben NU niet de rol QHSE (ook als ze al
-- eerder waren gekozen). Samen met de weigering in profiles_bewaak kan een QHSE-manager
-- nooit uitvoeren of toetsen. (Actief-zijn telt hier niet: een vertrokken houder blokkeert
-- het toetsen van zijn afgemelde werk niet.)
create or replace function public.acties_geen_qhse(p_houder uuid, p_toetser uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = p_houder and p.role = 'qhse' for share) then
    raise exception 'De QHSE-manager kan geen actiehouder zijn' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles p where p.id = p_toetser and p.role = 'qhse' for share) then
    raise exception 'De QHSE-manager kan geen toetser zijn' using errcode = '23514';
  end if;
end $$;

-- ---------- Acties: statusmodel, functiescheiding en methode ----------
-- Hoofdlijn: Voorstel → Open → In uitvoering → Klaar voor toetsing → Afgerond
--   Klaar voor toetsing → In uitvoering  (niet akkoord, alleen toetser)
--   Voorstel → Vervallen
-- Samengestelde overgangen (offline-first: de app stuurt per actie alleen de LAATSTE
-- stand, ook als er op het toestel meerdere stappen tussen zaten) worden geaccepteerd
-- als wie ze stuurt ELKE tussenstap zelf had mogen zetten, en worden als losse stappen
-- gelogd ("(impliciet)"):
--   Open → Klaar voor toetsing, Voorstel → In uitvoering, Voorstel → Klaar voor toetsing
--   (instellen mag iedereen; de uitvoeringsstap alleen de houder of staf, nooit de toetser).
--   Een NIEUWE actie mag (bij de eerste upload) ook al In uitvoering, Klaar voor toetsing
--   of Vervallen zijn, onder dezelfde voorwaarden. Afgerond nooit samengesteld: toetsen
--   doet een ander dan de uitvoerder (behalve "ter plaatse gecorrigeerd").
-- Functiescheiding (toetser ≠ actiehouder), ook voor coördinator en hoofd:
--   * uitvoerders = iedereen die ooit houder was of een uitvoeringsstap zette;
--     de toetser mag daar nooit in staan (dus ook niet later toetser worden);
--   * de toetser zet zelf geen uitvoeringsstap en voegt geen na-foto toe;
--   * vanaf "Klaar voor toetsing" liggen houder en toetser vast;
--   * alleen de toetser toetst (akkoord of niet akkoord).
-- Methode ("alleen wat de inspecteur ziet telt"):
--   * oordeel wijzigt niemand ('–' en leeg zijn hetzelfde: "geen oordeel");
--   * een actie uit een inspectie is een kopie van één waarneming uit de bevroren
--     momentopname (acties_controle_nieuw); waarneming, referentie en dringendheid liggen
--     daarna vast, ook voor de inspecteur zelf;
--   * bij een handmatige actie wijzigt alleen de waarnemer (wie hem aanmaakte; ook staf
--     niet) waarneming, referentie, dringendheid, foto en 'handmatig'. Zonder aanmaker
--     (service_role/postgres) is er geen waarnemer;
--   * een voorstel van een ander pas je alleen aan BIJ het instellen (tekst, houder,
--     toetser, plandatum); tussendoor sleutelen aan andermans voorstel kan niet. Bij
--     laten vervallen blijft de inhoud zoals hij was.
create or replace function public.acties_valideer()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_systeem   boolean := auth.uid() is null;   -- service_role / beheer via SQL
  v_staf      boolean := public.is_staf();
  v_claim     timestamptz;
  v_waarnemer boolean;
  v_eigenaar  boolean;
  v_houder    uuid;     -- houder/toetser die gelden voor de uitvoeringsstap
  v_toetser   uuid;
begin
  if tg_op = 'INSERT' then
    -- Upsert (PostgREST merge-duplicates) op een BESTAANDE actie: de voorgestelde rij
    -- niet aanpassen (die wordt EXCLUDED); de UPDATE-tak hieronder toetst alles.
    if exists (select 1 from public.acties a where a.id = new.id) then
      return new;
    end if;
    -- Echt nieuwe actie. Eerst de koppeling met de inspectie (vóór de FK-controle,
    -- zodat de foutmelding niet verraadt of een inspectie-id bestaat).
    if not v_systeem and new.inspectie_id is not null
       and not public.is_eigen_inspectie(new.inspectie_id) then
      raise exception 'Een actie uit een inspectie kan alleen de inspecteur van die inspectie aanmaken'
        using errcode = '42501';
    end if;
    new.created_at := now();
    if not v_systeem then
      new.aangemaakt_door := v_uid;
    end if;
    -- handmatige actie (geen inspectie): "geen oordeel" is altijd '–' (leeg wordt '–')
    if new.inspectie_id is null and new.oordeel is null then
      new.oordeel := '–';
    end if;
    -- een houder telt pas als uitvoerder zodra de actie is ingesteld (Open of verder)
    new.uitvoerders := case when new.houder is not null and new.status in ('Open', 'In uitvoering', 'Klaar voor toetsing')
                            then array[new.houder] else '{}'::uuid[] end;
    if new.status in ('In uitvoering', 'Klaar voor toetsing') and not v_systeem
       and not (v_uid = any(new.uitvoerders)) then
      new.uitvoerders := new.uitvoerders || v_uid;   -- wie de uitvoeringsstap zette
    end if;
    new.klaar_op := case when new.status = 'Klaar voor toetsing' then now() end;
    new.ingesteld_door := case when new.status in ('Open', 'In uitvoering', 'Klaar voor toetsing') and not v_systeem
                               then v_uid end;
    new.vervallen_door := case when new.status = 'Vervallen' and not v_systeem then v_uid end;
    new.nafoto_door := case when new.nafoto_pad is not null then v_uid end;
    if new.status = 'Afgerond' then   -- alleen "ter plaatse gecorrigeerd" (zie acties_controle_nieuw)
      new.afgerond_server := now();
      new.afgerond_op := case when new.afgerond_op between now() - interval '30 days' and now()
                              then new.afgerond_op else now() end;
    else
      new.afgerond_server := null;
      new.afgerond_op := null;
    end if;
    return new;
  end if;

  -- ======================= UPDATE =======================
  if new.id <> old.id then
    raise exception 'Het id van een actie kan niet worden gewijzigd' using errcode = '42501';
  end if;
  -- koppeling aan de inspectie ligt vast (alleen leeg bij verwijderen van de inspectie).
  -- Was hij leeg, dan blijft hij stil leeg, wat het toestel ook stuurt (een verouderde
  -- koppeling na het verwijderen van de inspectie). Altijd hetzelfde antwoord, of het
  -- gestuurde id nu bestaat of niet: zo verraadt dit pad niet welke inspecties er zijn.
  if new.inspectie_id is distinct from old.inspectie_id and not v_systeem then
    if old.inspectie_id is null then
      new.inspectie_id := null;
    elsif not (new.inspectie_id is null
               and not exists (select 1 from public.inspecties i where i.id = old.inspectie_id)) then
      -- (leeg maken mag alleen als de inspectie zelf is verwijderd: ON DELETE SET NULL)
      raise exception 'De koppeling met de inspectie kan niet worden gewijzigd' using errcode = '42501';
    end if;
  end if;
  -- serverwaarden vasthouden
  v_claim := new.afgerond_op;
  new.aangemaakt_door := old.aangemaakt_door;
  new.created_at      := old.created_at;
  new.afgerond_op     := old.afgerond_op;
  new.afgerond_server := old.afgerond_server;
  new.klaar_op        := old.klaar_op;
  new.nafoto_door     := old.nafoto_door;
  new.ingesteld_door  := old.ingesteld_door;
  new.vervallen_door  := old.vervallen_door;
  new.uitvoerders     := old.uitvoerders;
  -- Een voorstel heeft nog geen uitvoerders: wie in een voorstel als houder werd gekozen
  -- en weer weggehaald, mag later gewoon toetser worden. Bij het instellen begint de
  -- lijst met de dan gekozen houder.
  if old.status = 'Voorstel' then
    new.uitvoerders := '{}'::uuid[];
  end if;
  -- "Geen oordeel" heeft twee schrijfwijzen: '–' (handmatige actie) en leeg. De app zet
  -- '–' bij het downloaden om naar leeg en stuurt dat terug; dat is geen wijziging.
  if coalesce(new.oordeel, '–') = coalesce(old.oordeel, '–') then
    new.oordeel := old.oordeel;
  end if;

  if old.status in ('Afgerond', 'Vervallen') then
    if (new.status, new.tekst, new.houder, new.toetser, new.plandatum, new.oordeel, new.ref,
        new.waarneming, new.prio, new.handmatig, new.foto_pad, new.nafoto_pad)
       is distinct from
       (old.status, old.tekst, old.houder, old.toetser, old.plandatum, old.oordeel, old.ref,
        old.waarneming, old.prio, old.handmatig, old.foto_pad, old.nafoto_pad) then
      raise exception 'Een afgeronde of vervallen actie ligt vast en kan niet meer worden gewijzigd'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status <> old.status and (old.status::text, new.status::text) not in (
       ('Voorstel', 'Open'), ('Voorstel', 'Vervallen'),
       ('Voorstel', 'In uitvoering'), ('Voorstel', 'Klaar voor toetsing'),   -- samengesteld
       ('Open', 'In uitvoering'), ('Open', 'Klaar voor toetsing'),           -- idem
       ('In uitvoering', 'Klaar voor toetsing'),
       ('Klaar voor toetsing', 'Afgerond'), ('Klaar voor toetsing', 'In uitvoering')) then
    raise exception 'Ongeldige statusovergang: % → %', old.status, new.status using errcode = '23514';
  end if;

  if not v_systeem then
    -- coalesce: aangemaakt_door is leeg bij rijen van service_role/postgres (correctie of
    -- import); NULL mag hier nooit "geen bezwaar" betekenen
    v_waarnemer := coalesce(old.aangemaakt_door = v_uid, false) or public.is_eigen_inspectie(old.inspectie_id);
    v_eigenaar  := v_waarnemer or coalesce(v_staf, false);
    -- het oordeel van de inspecteur wordt nooit achteraf aangepast
    if new.oordeel is distinct from old.oordeel then
      raise exception 'Het oordeel komt van de inspecteur en kan niet worden gewijzigd' using errcode = '42501';
    end if;
    -- Uit een inspectie (of ooit uit een inspectie: oordeel C/A/V/NVT): waarneming,
    -- referentie en dringendheid zijn een kopie van de vastgelegde momentopname en liggen
    -- vast, ook voor de inspecteur zelf (zoals de inspectie zelf, zie inspecties_valideer).
    if (old.inspectie_id is not null or old.oordeel in ('C', 'A', 'V', 'NVT'))
       and (new.waarneming, new.ref, new.prio) is distinct from (old.waarneming, old.ref, old.prio) then
      raise exception 'Waarneming, referentie en dringendheid komen uit de vastgelegde inspectie en liggen vast'
        using errcode = '42501';
    end if;
    -- waarneming, referentie, dringendheid, foto en 'handmatig': alleen de waarnemer zelf
    -- (ook bij een handmatig voorstel zonder inspectie; ook staf niet)
    if not v_waarnemer
       and (new.waarneming, new.ref, new.prio, new.foto_pad, new.handmatig)
           is distinct from (old.waarneming, old.ref, old.prio, old.foto_pad, old.handmatig) then
      raise exception 'Waarneming, referentie, dringendheid en foto komen van de waarnemer (wie de actie aanmaakte of de inspecteur) en kan alleen die wijzigen'
        using errcode = '42501';
    end if;
    -- een voorstel van een ander: alleen aanpassen bij het instellen; bij laten vervallen
    -- blijft de inhoud staan (een verouderde kopie op het toestel wint dan niet)
    if old.status = 'Voorstel' and not v_eigenaar then
      if new.status = 'Vervallen' then
        new.tekst := old.tekst; new.houder := old.houder; new.toetser := old.toetser;
        new.plandatum := old.plandatum;
      elsif new.status = 'Voorstel'
            and (new.tekst, new.houder, new.toetser, new.plandatum)
                is distinct from (old.tekst, old.houder, old.toetser, old.plandatum) then
        raise exception 'Een voorstel van een ander pas je alleen aan bij het instellen (of je laat het vervallen)'
          using errcode = '42501';
      end if;
    end if;
    -- een foto koppelen kan alleen met een eigen upload
    if new.foto_pad is distinct from old.foto_pad and new.foto_pad is not null
       and public.foto_eigenaar(new.foto_pad) is distinct from v_uid::text then
      raise exception 'Koppel alleen een foto die je zelf hebt geüpload' using errcode = '42501';
    end if;
    -- na het instellen wijzigt alleen staf de inhoud
    if old.status in ('Open', 'In uitvoering', 'Klaar voor toetsing') and not v_staf
       and (new.tekst, new.houder, new.toetser, new.plandatum, new.ref, new.waarneming,
            new.prio, new.handmatig, new.foto_pad)
           is distinct from
           (old.tekst, old.houder, old.toetser, old.plandatum, old.ref, old.waarneming,
            old.prio, old.handmatig, old.foto_pad) then
      raise exception 'Na het instellen kan alleen een coördinator of het hoofd de actie inhoudelijk wijzigen'
        using errcode = '42501';
    end if;
    -- vanaf "Klaar voor toetsing" liggen houder en toetser vast (ook voor staf); bij een
    -- samengestelde overgang vanuit Voorstel worden ze in dezelfde stap gekozen
    if (new.houder, new.toetser) is distinct from (old.houder, old.toetser)
       and (old.status = 'Klaar voor toetsing'
            or (new.status in ('Klaar voor toetsing', 'Afgerond') and old.status <> 'Voorstel')) then
      raise exception 'Actiehouder en toetser liggen vast zodra de actie klaar voor toetsing is'
        using errcode = '42501';
    end if;
    -- houder/toetser die gelden voor de uitvoering: bij instellen in dezelfde stap de nieuwe
    if old.status = 'Voorstel' then
      v_houder := new.houder; v_toetser := new.toetser;
    else
      v_houder := old.houder; v_toetser := old.toetser;
    end if;
    -- na-foto: door de houder (of staf namens hem), tijdens de uitvoering, eigen upload
    if new.nafoto_pad is distinct from old.nafoto_pad then
      if not (old.status in ('Open', 'In uitvoering')
              or (old.status = 'Voorstel' and new.status in ('In uitvoering', 'Klaar voor toetsing'))) then
        raise exception 'De na-foto hoort bij de uitvoering (status Open of In uitvoering)' using errcode = '42501';
      end if;
      if v_uid is not distinct from v_toetser then
        raise exception 'De toetser voegt geen na-foto toe' using errcode = '42501';
      end if;
      if v_uid is distinct from v_houder and not v_staf then
        raise exception 'Alleen de actiehouder voegt de na-foto toe' using errcode = '42501';
      end if;
      if new.nafoto_pad is not null and public.foto_eigenaar(new.nafoto_pad) is distinct from v_uid::text then
        raise exception 'Koppel alleen een na-foto die je zelf hebt geüpload' using errcode = '42501';
      end if;
      new.nafoto_door := case when new.nafoto_pad is not null then v_uid end;
      if not (v_uid = any(new.uitvoerders)) then
        new.uitvoerders := new.uitvoerders || v_uid;
      end if;
    end if;
  end if;

  if new.status <> old.status then
    if not v_systeem then
      if old.status = 'Klaar voor toetsing' then
        -- akkoord (Afgerond) of niet akkoord (terug naar In uitvoering): alleen de toetser,
        -- en nooit iemand die zelf aan de uitvoering werkte
        if v_uid is distinct from old.toetser then
          raise exception 'Alleen de toetser van deze actie mag toetsen en afronden' using errcode = '42501';
        end if;
        if v_uid = any(old.uitvoerders) then
          raise exception 'Je hebt zelf aan deze actie gewerkt en mag hem niet toetsen' using errcode = '42501';
        end if;
      elsif new.status in ('In uitvoering', 'Klaar voor toetsing') then
        -- (ook als laatste stap van een samengestelde overgang vanuit Voorstel/Open)
        if v_uid is not distinct from v_toetser then
          raise exception 'De toetser voert de actie niet zelf uit; dat doet de actiehouder' using errcode = '42501';
        end if;
        if not v_staf and v_uid is distinct from v_houder then
          raise exception 'Alleen de actiehouder (of een coördinator/hoofd) mag de uitvoering bijwerken'
            using errcode = '42501';
        end if;
        if not (v_uid = any(new.uitvoerders)) then
          new.uitvoerders := new.uitvoerders || v_uid;
        end if;
      end if;
      -- Voorstel → Open (instellen) en Voorstel → Vervallen: iedereen (bedrijfsbesluit)
    end if;
    if old.status = 'Voorstel' and new.status in ('Open', 'In uitvoering', 'Klaar voor toetsing')
       and not v_systeem then
      new.ingesteld_door := v_uid;
    end if;
    -- wie een voorstel liet vervallen blijft het zien (en kan de reden in het verloop zetten)
    if old.status = 'Voorstel' and new.status = 'Vervallen' and not v_systeem then
      new.vervallen_door := v_uid;
    end if;
    if new.status = 'Afgerond' and char_length(btrim(new.tekst)) = 0 then
      raise exception 'Een actie zonder tekst kan niet worden afgerond' using errcode = '23514';
    end if;
    if new.status = 'Klaar voor toetsing' then
      new.klaar_op := now();
    end if;
    if new.status = 'Afgerond' then
      -- offline akkoord telt op het tijdstip van het toestel, maar nooit vóórdat de
      -- server "Klaar voor toetsing" had en nooit in de toekomst of > 30 dagen terug
      new.afgerond_server := now();
      new.afgerond_op := case
        when v_claim is distinct from old.afgerond_op
             and v_claim between greatest(old.klaar_op, now() - interval '30 days') and now()
        then v_claim else now() end;
    end if;
  end if;

  -- elke (nieuwe) houder van een INGESTELDE actie telt als uitvoerder
  if new.status not in ('Voorstel', 'Vervallen') and new.houder is not null
     and not (new.houder = any(new.uitvoerders)) then
    new.uitvoerders := new.uitvoerders || new.houder;
  end if;
  -- de toetser heeft nooit aan de uitvoering gewerkt (ook niet als eerdere houder)
  if new.toetser is not null and new.toetser = any(new.uitvoerders) then
    raise exception 'De toetser mag niet de actiehouder zijn en niet zelf aan de uitvoering hebben gewerkt'
      using errcode = '23514';
  end if;

  perform public.acties_controle_personen(new.houder, new.toetser,
    new.houder is distinct from old.houder, new.toetser is distinct from old.toetser);
  if new.status <> old.status then
    perform public.acties_geen_qhse(new.houder, new.toetser);
  end if;
  return new;
end $$;

drop trigger if exists acties_valideer on public.acties;
create trigger acties_valideer before insert or update on public.acties
  for each row execute function public.acties_valideer();

-- Witruimte aan de randen weg zoals String.prototype.trim() in JavaScript (de app maakt
-- de waarneming van een actie met (w.tekst || "").trim()).
create or replace function public.tekst_trim(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select btrim(p, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;

-- Nieuwe actie: beginstatus, methode en foto's.
-- AFTER INSERT vuurt alleen voor rijen die echt nieuw zijn (niet bij upsert-update).
-- Een actie uit een inspectie is een kopie van één waarneming uit de VASTGELEGDE
-- momentopname (inspecties.record, bevroren). De app legt dat vast als
-- record.waarnemingen[n].actie.actie_id = id van de actie. De server eist dat verband en
-- vergelijkt de kopie: oordeel (A of V, van de inspecteur), waarneming (tekst, getrimd),
-- dringendheid (actie.prio), en "Afgerond" alleen bij actie.terPlaatse = 'gecorrigeerd'.
-- (De referentie, bv. "DAM-2.07", haalt de app uit de catalogus en staat niet in het
-- record; die controleert de server niet, maar ook hij ligt na het aanmaken vast.)
create or replace function public.acties_controle_nieuw()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_systeem boolean := auth.uid() is null;
  v_w       jsonb;
  v_n       integer;
begin
  if not v_systeem and new.inspectie_id is not null
     and not public.is_eigen_inspectie(new.inspectie_id) then
    raise exception 'Een actie uit een inspectie kan alleen de inspecteur van die inspectie aanmaken'
      using errcode = '42501';
  end if;
  if not v_systeem and new.inspectie_id is not null then
    select count(*), min(w.e::text)::jsonb into v_n, v_w
      from public.inspecties i,
           jsonb_array_elements(case when jsonb_typeof(i.record -> 'waarnemingen') = 'array'
                                     then i.record -> 'waarnemingen' else '[]'::jsonb end) w (e)
     where i.id = new.inspectie_id
       and jsonb_typeof(w.e) = 'object' and w.e -> 'actie' ->> 'actie_id' = new.id;
    if v_n <> 1 then
      raise exception 'Een actie uit een inspectie hoort bij precies één waarneming in die vastgelegde inspectie (waarnemingen[].actie.actie_id)'
        using errcode = '23514';
    end if;
    if v_w ->> 'oordeel' is null or v_w ->> 'oordeel' not in ('A', 'V')
       or new.oordeel is distinct from v_w ->> 'oordeel' then
      raise exception 'Het oordeel van de actie is het oordeel van de waarneming in de inspectie (A of V)'
        using errcode = '23514';
    end if;
    if coalesce(new.waarneming, '') <> public.tekst_trim(coalesce(v_w ->> 'tekst', '')) then
      raise exception 'De waarneming van de actie moet gelijk zijn aan de waarneming in de vastgelegde inspectie'
        using errcode = '23514';
    end if;
    if new.prio is distinct from nullif(v_w -> 'actie' ->> 'prio', '') then
      raise exception 'De dringendheid van de actie moet gelijk zijn aan die in de vastgelegde inspectie'
        using errcode = '23514';
    end if;
    if new.status = 'Afgerond' and (v_w -> 'actie' ->> 'terPlaatse') is distinct from 'gecorrigeerd' then
      raise exception 'Direct afgerond kan alleen als de waarneming in de inspectie "ter plaatse gecorrigeerd" is'
        using errcode = '42501';
    end if;
  end if;
  -- een oordeel (C/A/V/NVT) bestaat alleen bij een waarneming uit een inspectie
  if new.inspectie_id is null and new.oordeel is not null and new.oordeel <> '–' then
    raise exception 'Een oordeel (C/A/V/NVT) hoort bij een waarneming uit een inspectie; een handmatige actie heeft oordeel –'
      using errcode = '23514';
  end if;
  if new.status = 'Afgerond' then
    -- alleen "ter plaatse gecorrigeerd": de inspecteur zag het herstel zelf en is de toetser
    if new.inspectie_id is null or new.houder is not null
       or (not v_systeem and new.toetser is distinct from v_uid) then
      raise exception 'Direct afgerond kan alleen bij ter plaatse gecorrigeerd: vanuit je eigen inspectie, zonder actiehouder, met jezelf als toetser'
        using errcode = '42501';
    end if;
  end if;
  if not v_systeem then
    -- offline al verder gezet (eerste upload): de uitvoeringsstap mag alleen de houder of
    -- staf zetten, nooit de toetser (zelfde regels als bij een wijziging)
    if new.status in ('In uitvoering', 'Klaar voor toetsing') then
      if v_uid is not distinct from new.toetser then
        raise exception 'De toetser voert de actie niet zelf uit; dat doet de actiehouder' using errcode = '42501';
      end if;
      if v_uid is distinct from new.houder and not public.is_staf() then
        raise exception 'Alleen de actiehouder (of een coördinator/hoofd) mag de uitvoering bijwerken'
          using errcode = '42501';
      end if;
    end if;
    if new.foto_pad is not null and public.foto_eigenaar(new.foto_pad) is distinct from v_uid::text then
      raise exception 'Koppel alleen een foto die je zelf hebt geüpload' using errcode = '42501';
    end if;
    if new.nafoto_pad is not null then
      if new.status not in ('In uitvoering', 'Klaar voor toetsing') then
        raise exception 'De na-foto voegt de actiehouder toe tijdens de uitvoering, niet bij het aanmaken'
          using errcode = '42501';
      end if;
      if public.foto_eigenaar(new.nafoto_pad) is distinct from v_uid::text then
        raise exception 'Koppel alleen een na-foto die je zelf hebt geüpload' using errcode = '42501';
      end if;
    end if;
    if not public.id_tijd_ok(new.id) then
      raise exception 'Ongeldig id: het tijdstip in het id ligt in de toekomst (staat de klok van het toestel goed?)'
        using errcode = '22023';
    end if;
    if (select count(*) from public.acties a
         where a.aangemaakt_door = v_uid and a.created_at > now() - interval '1 hour') > 300 then
      raise exception 'Te veel nieuwe acties in het afgelopen uur; probeer het later opnieuw'
        using errcode = '54000';
    end if;
  end if;
  -- de toetser heeft nooit aan de uitvoering gewerkt
  if new.toetser is not null and new.toetser = any(new.uitvoerders) then
    raise exception 'De toetser mag niet de actiehouder zijn en niet zelf aan de uitvoering hebben gewerkt'
      using errcode = '23514';
  end if;
  perform public.acties_controle_personen(new.houder, new.toetser, true, true);
  return null;
end $$;

drop trigger if exists acties_controle_nieuw on public.acties;
create trigger acties_controle_nieuw after insert on public.acties
  for each row execute function public.acties_controle_nieuw();

-- ---------- Elke statuswijziging => actie_log (bron 'server') ----------
-- Een samengestelde overgang wordt als losse stappen gelogd; de tussenstappen krijgen
-- "(impliciet)". Wijzigingen van houder/toetser/plandatum worden gelogd zodra de actie is
-- ingesteld (in een voorstel zijn het nog kladkeuzes; het instellen zelf staat er al als
-- statusregel). Zo kan niemand het officiële verloop van een voorstel volschrijven.
create or replace function public.acties_log_keten(p_id text, p_van text, p_naar text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_keten constant text[] := array['Voorstel', 'Open', 'In uitvoering', 'Klaar voor toetsing'];
  v_van   integer := array_position(v_keten, p_van);
  v_naar  integer := array_position(v_keten, p_naar);
  i       integer;
begin
  if v_van is null or v_naar is null or v_naar <= v_van then
    insert into public.actie_log (actie_id, wie, wat, bron)
    values (p_id, auth.uid(), format('Status: %s → %s', p_van, p_naar), 'server');
    return;
  end if;
  for i in v_van .. v_naar - 1 loop
    insert into public.actie_log (actie_id, wie, wat, bron)
    values (p_id, auth.uid(),
            format('Status: %s → %s', v_keten[i], v_keten[i + 1])
              || case when i + 1 < v_naar then ' (impliciet)' else '' end,
            'server');
  end loop;
end $$;

create or replace function public.acties_log_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_start text;
begin
  if tg_op = 'INSERT' then
    -- Offline aangemaakt én al verder gezet: beginstand plus de stappen. Een actie uit een
    -- inspectie begint altijd als Voorstel (ook als hij bij de eerste upload al Open is);
    -- een handmatige actie begint als Open (instellen gebeurt bij het aanmaken). Afgerond
    -- bij het aanmaken is alleen "ter plaatse gecorrigeerd" en blijft één regel.
    v_start := case
      when new.status = 'Vervallen' then 'Voorstel'
      when new.status in ('Open', 'In uitvoering', 'Klaar voor toetsing') and new.inspectie_id is not null then 'Voorstel'
      when new.status in ('In uitvoering', 'Klaar voor toetsing') then 'Open'
      else new.status::text end;
    insert into public.actie_log (actie_id, wie, wat, bron)
    values (new.id, auth.uid(), format('Aangemaakt met status %s', v_start), 'server');
    if v_start <> new.status::text then
      perform public.acties_log_keten(new.id, v_start, new.status::text);
    end if;
    return new;
  end if;
  if new.status is distinct from old.status then
    perform public.acties_log_keten(new.id, old.status::text, new.status::text);
  end if;
  if old.status <> 'Voorstel'
     and (new.houder, new.toetser, new.plandatum) is distinct from (old.houder, old.toetser, old.plandatum) then
    insert into public.actie_log (actie_id, wie, wat, bron)
    values (new.id, auth.uid(), 'Actiehouder, toetser of plandatum gewijzigd', 'server');
  end if;
  return new;
end $$;

drop trigger if exists acties_log_status on public.acties;
create trigger acties_log_status after insert or update on public.acties
  for each row execute function public.acties_log_status();

-- ---------- actie_log: tijd, auteur en bron altijd door de server ----------
-- Een regel van een client (rol authenticated/anon) is ALTIJD bron 'client' en mag
-- niet op een statusregel van de server lijken. t is de servertijd; t_client is het
-- (offline) moment van het toestel, alleen bewaard als het plausibel is.
-- Bewust geen SECURITY DEFINER: current_user is hier de rol die de regel schrijft
-- (authenticated bij de app; de eigenaar bij de statustrigger hierboven).
-- De vergelijking gebeurt na NFKC-normalisatie (dus "：" = ":") en zonder onzichtbare
-- opmaaktekens; een regel mét zulke tekens wordt sowieso geweigerd. Let op: de echte
-- grens is de kolom bron; de app toont bron = 'server' als het officiële verloop.
create or replace function public.actie_log_stempel()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- id altijd uit de reeks: een zelfgekozen id zou het volgende id van een ander
  -- "claimen" en diens opslaan (ook de statusregels van de server) laten mislukken.
  -- (Daarnaast mag de app de kolom id niet eens meesturen: kolomrecht in 0003.)
  new.id := nextval('public.actie_log_id_seq'::regclass);
  new.t := now();
  if auth.uid() is not null then
    new.wie := auth.uid();
  end if;
  if current_user in ('authenticated', 'anon') then
    new.bron := 'client';
    if new.wat ~ '[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]'
       or new.wat ~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]' then
      raise exception 'Het verloop mag geen onzichtbare of besturingstekens bevatten' using errcode = '22023';
    end if;
    if normalize(new.wat, NFKC) ~* '^[[:space:][:punct:]]*(status[[:space:]]*:|aangemaakt[[:space:]]+met[[:space:]]+status|actiehouder,[[:space:]]*toetser[[:space:]]+of[[:space:]]+plandatum[[:space:]]+gewijzigd)' then
      raise exception 'Statusregels schrijft alleen de server; voeg een toelichting toe' using errcode = '42501';
    end if;
    if new.t_client is not null
       and (new.t_client > now() + interval '5 minutes' or new.t_client < now() - interval '30 days') then
      new.t_client := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists actie_log_stempel on public.actie_log;
create trigger actie_log_stempel before insert on public.actie_log
  for each row execute function public.actie_log_stempel();

-- ---------- Schrijfquotum over ALLE append-only tabellen ----------
-- audit_log, actie_log en security_events zijn append-only en alleen in onderhoudsmodus op
-- te schonen. Daarom telt één dagquotum per gebruiker over alle drie samen (bytes in de
-- afgelopen 24 uur): 25 MiB (zie audit_quotum, actie_log_limiet, report_security_event).
-- Daarnaast heeft elke tabel eigen, veel lagere grenzen.
create or replace function public.schrijf_bytes_24u(p_uid uuid)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce((select sum(l.grootte) from public.audit_log l
                    where l.wie = p_uid and l.t > now() - interval '24 hours'), 0)
       + coalesce((select sum(octet_length(s.soort) + octet_length(s.details::text)) from public.security_events s
                    where s.wie = p_uid and s.t > now() - interval '24 hours'), 0)
       + coalesce((select sum(octet_length(l.wat)) from public.actie_log l
                    where l.wie = p_uid and l.t > now() - interval '24 hours'), 0)
$$;

-- Volumegrens voor regels van de app (bron 'client'), per gebruiker:
--   max 30 per actie per uur, 60 per uur, 300 per 24 uur en 1 MiB per 24 uur,
--   en het gezamenlijke dagquotum van 25 MiB (schrijf_bytes_24u).
-- Een regel is max 2000 tekens (≤ 8 KB). Zo voegt één account hier hooguit ~1 MiB per dag
-- toe. AFTER: ziet ook alle rijen van één grote INSERT, die dan in zijn geheel faalt.
create or replace function public.actie_log_limiet()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.bron = 'client' and new.wie is not null then
    -- één tegelijk per gebruiker: gelijktijdige verzoeken omzeilen de grens niet
    perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || new.wie::text, 0));
    if (select count(*) from public.actie_log l
         where l.wie = new.wie and l.bron = 'client' and l.t > now() - interval '1 hour') > 60
       or (select count(*) from public.actie_log l
            where l.wie = new.wie and l.actie_id = new.actie_id and l.bron = 'client'
              and l.t > now() - interval '1 hour') > 30 then
      raise exception 'Te veel regels in het verloop in het afgelopen uur; probeer het later opnieuw'
        using errcode = '54000';
    end if;
    if (select count(*) from public.actie_log l
         where l.wie = new.wie and l.bron = 'client' and l.t > now() - interval '24 hours') > 300
       or (select sum(octet_length(l.wat)) from public.actie_log l
            where l.wie = new.wie and l.bron = 'client' and l.t > now() - interval '24 hours') > 1048576
       or public.schrijf_bytes_24u(new.wie) > 25 * 1024 * 1024 then
      raise exception 'Schrijfquotum voor vandaag bereikt (verloop); probeer het morgen opnieuw of vraag het hoofd'
        using errcode = '54000';
    end if;
  end if;
  return null;
end $$;

drop trigger if exists actie_log_limiet on public.actie_log;
create trigger actie_log_limiet after insert on public.actie_log
  for each row execute function public.actie_log_limiet();

-- >>>>> 0003_rls_rechten.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0003: rechten (GRANT) en Row Level Security
-- Uitgangspunt: alles dicht, dan per rol precies openzetten.
--   anon          : niets (geen enkele tabel of functie)
--   authenticated : rijen via RLS; inactieve profielen zien niets
--   service_role  : alleen server-side (dashboard/Edge Function), nooit in de app
-- =====================================================================

-- ---------- Basisrechten: Supabase geeft standaard ALL aan anon/authenticated ----------
-- Voortaan ook voor NIEUWE tabellen en reeksen (een latere migratie): die zijn niet meer
-- vanzelf bereikbaar met de anon-sleutel; elke nieuwe tabel krijgt bewust GRANTs en RLS.
-- (Geldt voor objecten die de rol maakt die dit draait: postgres, zoals de migraties.)
alter default privileges in schema public revoke all on tables from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated, public;
revoke all on table public.profiles, public.monteurs, public.planning, public.inspecties,
  public.acties, public.actie_log, public.instellingen, public.audit_log, public.security_events
  from anon, authenticated, public;
-- TRUNCATE omzeilt RLS: nooit voor clients
revoke truncate, references, trigger on table public.profiles, public.monteurs, public.planning,
  public.inspecties, public.acties, public.actie_log, public.instellingen, public.audit_log,
  public.security_events from service_role;
-- logtabellen: ook service_role mag niet wijzigen/verwijderen of direct invoegen
revoke insert, update, delete on table public.audit_log, public.security_events from service_role;
revoke update, delete on table public.actie_log from service_role;

grant select on table public.profiles to authenticated;
grant update (full_name, functie, role, actief) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.monteurs     to authenticated;
grant select, insert, update, delete on table public.planning     to authenticated;
grant select, insert, update, delete on table public.inspecties   to authenticated;
grant select, insert, update, delete on table public.acties       to authenticated;
grant select, insert, update, delete on table public.instellingen to authenticated;
grant select                         on table public.actie_log    to authenticated;
-- invoegen alleen met deze kolommen: id, t en bron zet de server (een zelfgekozen id
-- kan het volgende id van een ander claimen en zijn opslaan laten mislukken)
grant insert (actie_id, wie, wat, t_client) on table public.actie_log to authenticated;
grant usage on sequence public.actie_log_id_seq to authenticated;
grant select on table public.audit_log       to authenticated;   -- RLS: alleen hoofd
grant select on table public.security_events to authenticated;   -- RLS: alleen hoofd

revoke all on sequence public.audit_log_id_seq, public.security_events_id_seq from anon, authenticated, public;
revoke all on sequence public.actie_log_id_seq from anon, public;

-- ---------- Functies: standaard niemand, daarna gericht toestaan ----------
revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.zet_updated_at(), public.handle_new_user(), public.profiles_bewaak(),
  public.inspecties_valideer(), public.planning_valideer(), public.planning_controle_nieuw(),
  public.acties_valideer(), public.acties_controle_nieuw(),
  public.acties_controle_personen(uuid, uuid, boolean, boolean),
  public.acties_log_status(), public.actie_log_stempel(), public.actie_log_limiet(),
  public.handle_user_invited(), public.planning_verwijder(), public.monteurs_normaliseer(),
  public.inspecties_controle_nieuw(), public.profiel_beginnaam(jsonb, text, uuid),
  public.acties_log_keten(text, text, text), public.acties_geen_qhse(uuid, uuid),
  public.schrijf_bytes_24u(uuid), public.planning_uitgevoerd_ok(text, uuid)
  from authenticated;
-- helpers die in policies worden gebruikt (lopen als de aanroeper)
grant execute on function
  public.mijn_rol(), public.is_lid(), public.is_staf(), public.mag_alles_lezen(),
  public.is_hoofd(), public.mfa_ok(), public.is_hoofd_admin(),
  public.is_eigen_inspectie(text), public.foto_via_actie(text), public.foto_in_gebruik(text),
  public.actie_zichtbaar(uuid, uuid, uuid, uuid, uuid, text, public.actie_status, date),
  public.actie_betrokken(text),
  public.vandaag(), public.naam_sleutel(text), public.naam_schoon(text), public.naam_tekens_ok(text),
  public.foto_eigenaar(text), public.tekst_trim(text),
  public.id_tijd_ok(text), public.inspectie_oordelen(jsonb)
  to authenticated;

-- ---------- RLS aan op ALLE tabellen ----------
alter table public.profiles        enable row level security;
alter table public.monteurs        enable row level security;
alter table public.planning        enable row level security;
alter table public.inspecties      enable row level security;
alter table public.acties          enable row level security;
alter table public.actie_log       enable row level security;
alter table public.instellingen    enable row level security;
alter table public.audit_log       enable row level security;
alter table public.security_events enable row level security;

-- ---------- profiles ----------
-- Leden zien namen/functies van collega's (nodig voor actiehouder/toetser kiezen en om
-- namen in het verloop te tonen): actieve profielen en profielen die ooit via een
-- uitnodiging binnenkwamen (ook oud-collega's, voor de historie). Een losse aanmelding
-- die nooit is uitgenodigd of geactiveerd, zien alleen het hoofd (beheer) en de persoon zelf.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_lid() and (actief or uitgenodigd or id = (select auth.uid()) or public.is_hoofd_admin()));
-- Naam, functie, rol en activering wijzigt alleen het hoofd (beheerroute). Zo kan
-- niemand zich in de houder/toetser-kiezer als een ander voordoen. Namen zijn uniek.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_hoofd_admin())
  with check (public.is_hoofd_admin());
-- Geen insert/delete-policy: profielen ontstaan via uitnodiging (trigger op auth.users).

-- ---------- monteurs (beheerroute: alleen hoofd schrijft) ----------
drop policy if exists monteurs_select on public.monteurs;
create policy monteurs_select on public.monteurs for select to authenticated
  using (public.is_lid());
drop policy if exists monteurs_insert on public.monteurs;
create policy monteurs_insert on public.monteurs for insert to authenticated
  with check (public.is_hoofd_admin());
drop policy if exists monteurs_update on public.monteurs;
create policy monteurs_update on public.monteurs for update to authenticated
  using (public.is_hoofd_admin()) with check (public.is_hoofd_admin());
drop policy if exists monteurs_delete on public.monteurs;
create policy monteurs_delete on public.monteurs for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- instellingen (beheerroute: alleen hoofd schrijft) ----------
drop policy if exists instellingen_select on public.instellingen;
create policy instellingen_select on public.instellingen for select to authenticated
  using (public.is_lid());
drop policy if exists instellingen_insert on public.instellingen;
create policy instellingen_insert on public.instellingen for insert to authenticated
  with check (public.is_hoofd_admin());
drop policy if exists instellingen_update on public.instellingen;
create policy instellingen_update on public.instellingen for update to authenticated
  using (public.is_hoofd_admin()) with check (public.is_hoofd_admin());
drop policy if exists instellingen_delete on public.instellingen;
create policy instellingen_delete on public.instellingen for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- inspecties ----------
-- Lezen: eigen; staf en QHSE alles. Schrijven: alleen de eigen inspectie
-- (niemand wijzigt de waarneming of het oordeel van een andere inspecteur).
drop policy if exists inspecties_select on public.inspecties;
create policy inspecties_select on public.inspecties for select to authenticated
  using (public.is_lid() and (inspecteur_id = (select auth.uid()) or public.mag_alles_lezen()));
drop policy if exists inspecties_insert on public.inspecties;
create policy inspecties_insert on public.inspecties for insert to authenticated
  with check (public.is_lid() and inspecteur_id = (select auth.uid()));
drop policy if exists inspecties_update on public.inspecties;
create policy inspecties_update on public.inspecties for update to authenticated
  using (public.is_lid() and inspecteur_id = (select auth.uid()))
  with check (public.is_lid() and inspecteur_id = (select auth.uid()));
drop policy if exists inspecties_delete on public.inspecties;
create policy inspecties_delete on public.inspecties for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- planning ----------
-- Zien: toegewezen of zelf gemaakt; staf/QHSE alles. Inplannen: iedereen, ook voor een
-- ander (zoals de app). Wie wat mag wijzigen/verwijderen bewaken planning_valideer en
-- planning_verwijder, met een duidelijke fout bij een rij die je kunt zien. Een rij die je
-- niet kunt zien raakt een UPDATE/DELETE niet ("0 rijen", zoals altijd bij RLS).
drop policy if exists planning_select on public.planning;
create policy planning_select on public.planning for select to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.mag_alles_lezen()));
drop policy if exists planning_insert on public.planning;
create policy planning_insert on public.planning for insert to authenticated
  with check (public.is_lid());
drop policy if exists planning_update on public.planning;
create policy planning_update on public.planning for update to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.is_staf()))
  with check (public.is_lid());
drop policy if exists planning_delete on public.planning;
create policy planning_delete on public.planning for delete to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.is_staf()));

-- ---------- acties ----------
-- Zien (actie_zichtbaar): houder, toetser, aanmaker, wie instelde of liet vervallen,
-- inspecteur van de bron-inspectie,
-- staf/QHSE alles, en voor iedereen: alle voorstellen ("iedereen mag instellen") en
-- alle acties over de plandatum ("te laat: hele team").
-- Aanmaken: iedereen die is ingelogd; een actie aan een inspectie koppelen alleen de
-- eigen inspecteur (acties_valideer/acties_controle_nieuw; ook bij upsert correct).
-- Wijzigen: wie bij de actie hoort (ook wie instelde of liet vervallen, zodat een
-- herhaalde upload van dezelfde rij na een netwerkfout niet stukloopt), staf, en
-- iedereen bij een voorstel (instellen/laten vervallen); wat precies mag, bewaakt
-- acties_valideer (na het instellen alleen staf inhoudelijk; Vervallen ligt vast).
drop policy if exists acties_select on public.acties;
create policy acties_select on public.acties for select to authenticated
  using (public.actie_zichtbaar(houder, toetser, aangemaakt_door, ingesteld_door, vervallen_door,
                                inspectie_id, status, plandatum));
drop policy if exists acties_insert on public.acties;
create policy acties_insert on public.acties for insert to authenticated
  with check (public.is_lid());
drop policy if exists acties_update on public.acties;
create policy acties_update on public.acties for update to authenticated
  using (public.is_lid() and (
    public.is_staf()
    or houder = (select auth.uid()) or toetser = (select auth.uid())
    or aangemaakt_door = (select auth.uid())
    or ingesteld_door = (select auth.uid()) or vervallen_door = (select auth.uid())
    or public.is_eigen_inspectie(inspectie_id)
    or status = 'Voorstel'))
  with check (public.is_lid());
drop policy if exists acties_delete on public.acties;
create policy acties_delete on public.acties for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- actie_log (append-only) ----------
-- Lezen: bij acties die je mag zien (subquery valt onder RLS van acties), en alleen
-- regels vanaf het aanmaken van DIE actie. Het verloop blijft na het verwijderen van
-- een actie bewaard; wie later een actie met hetzelfde id aanmaakt, ziet het oude
-- verloop (met namen en opmerkingen) dus niet.
-- Aanvullen: alleen wie bij de actie betrokken is (actie_betrokken), niet elk teamlid
-- dat een voorstel of een te late actie kan zien.
drop policy if exists actie_log_select on public.actie_log;
create policy actie_log_select on public.actie_log for select to authenticated
  using (public.is_lid() and exists (select 1 from public.acties a
                                     where a.id = actie_log.actie_id and actie_log.t >= a.created_at));
drop policy if exists actie_log_insert on public.actie_log;
create policy actie_log_insert on public.actie_log for insert to authenticated
  with check (public.is_lid() and wie = (select auth.uid())
              and public.actie_betrokken(actie_id));
-- bewust geen update/delete-policy

-- ---------- audit_log en security_events: alleen hoofd leest ----------
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_hoofd_admin());
drop policy if exists security_events_select on public.security_events;
create policy security_events_select on public.security_events for select to authenticated
  using (public.is_hoofd_admin());
-- bewust geen insert/update/delete-policy: invoegen alleen via SECURITY DEFINER

-- ---------- Opruimen na een update van het schema ----------
-- Oude versie van actie_zichtbaar (zonder vervallen_door); de policies hierboven en
-- foto_via_actie gebruiken de nieuwe. Op een verse database bestaat hij niet.
drop function if exists public.actie_zichtbaar(uuid, uuid, uuid, uuid, text, public.actie_status, date);

-- >>>>> 0004_audit.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0004: audittrail en append-only logs
-- audit_log: oud/nieuw (jsonb) bij elke wijziging in de kerntabellen; bij een
-- UPDATE alleen de gewijzigde kolommen. Schrijfquotum per gebruiker (audit_quotum).
-- audit_log, actie_log en security_events zijn append-only: UPDATE, DELETE
-- en TRUNCATE worden door triggers geweigerd, ook voor service_role.
-- =====================================================================

-- Schrijfquotum per gebruiker (via de auditlog, dus over alle geauditte tabellen samen).
-- De auditlog is append-only en alleen in onderhoudsmodus op te schonen; zonder grens kan
-- één account hem met grote of eindeloos herhaalde wijzigingen laten vollopen tot de
-- database vol is (project read-only). Grenzen (ruim boven normaal gebruik):
--   * max 300 wijzigingen/verwijderingen per gebruiker per uur (nieuwe rijen hebben al
--     eigen limieten: 30 inspecties, 300 acties, 100 planningen per uur);
--   * max 30 wijzigingen per gebruiker aan hetzelfde record per uur;
--   * max 25 MiB per gebruiker per 24 uur, samen met wat hij in actie_log en
--     security_events schreef (schrijf_bytes_24u, 0002): alle append-only tabellen.
-- Overschrijding: fout 54000 ("probeer het later opnieuw"); de app ziet dat als tijdelijk.
-- service_role/postgres (auth.uid() leeg) vallen erbuiten (bewust beheer, bewaartermijn).
create or replace function public.audit_quotum(p_uid uuid, p_tabel text, p_id text, p_actie text, p_grootte integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_uid is null then
    return;
  end if;
  -- één tegelijk per gebruiker: gelijktijdige verzoeken omzeilen de grens niet
  perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || p_uid::text, 0));
  if p_actie <> 'INSERT' then
    if (select count(*) from public.audit_log l
         where l.wie = p_uid and l.actie <> 'INSERT' and l.t > now() - interval '1 hour') >= 300 then
      raise exception 'Te veel wijzigingen in het afgelopen uur; probeer het later opnieuw' using errcode = '54000';
    end if;
    if (select count(*) from public.audit_log l
         where l.tabel = p_tabel and l.record_id = p_id and l.wie = p_uid and l.actie = 'UPDATE'
           and l.t > now() - interval '1 hour') >= 30 then
      raise exception 'Te veel wijzigingen aan hetzelfde record in het afgelopen uur; probeer het later opnieuw'
        using errcode = '54000';
    end if;
  end if;
  if public.schrijf_bytes_24u(p_uid) + p_grootte > 25 * 1024 * 1024 then
    raise exception 'Schrijfquotum voor vandaag bereikt (te veel of te grote wijzigingen); probeer het morgen opnieuw of vraag het hoofd'
      using errcode = '54000';
  end if;
end $$;

-- INSERT: hele nieuwe rij; DELETE: hele oude rij; UPDATE: alleen de gewijzigde kolommen
-- (oud en nieuw) plus id/sleutel. Elke versie blijft zo te herleiden, zonder dat elke
-- kleine wijziging een volledige kopie van een (tot 1 MB groot) record kost.
create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_oud     jsonb;
  v_nieuw   jsonb;
  v_rij_oud jsonb;
  v_rij     jsonb;
  v_id      text;
  v_grootte integer;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_rij_oud := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_rij := to_jsonb(new); end if;
  v_id := coalesce(v_rij ->> 'id', v_rij_oud ->> 'id', v_rij ->> 'sleutel', v_rij_oud ->> 'sleutel');
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(o.key, o.value), jsonb_object_agg(o.key, n.value)
      into v_oud, v_nieuw
      from jsonb_each(v_rij_oud) o
      join jsonb_each(v_rij) n on n.key = o.key
     where o.value is distinct from n.value and o.key <> 'updated_at';
    -- niets veranderd (bijv. identieke upsert bij synchroniseren): niet loggen
    if v_oud is null then
      return null;
    end if;
    -- herkenbaar houden: id (of sleutel) altijd mee
    if v_rij ? 'id' then
      v_oud := v_oud || jsonb_build_object('id', v_rij_oud -> 'id');
      v_nieuw := v_nieuw || jsonb_build_object('id', v_rij -> 'id');
    elsif v_rij ? 'sleutel' then
      v_oud := v_oud || jsonb_build_object('sleutel', v_rij_oud -> 'sleutel');
      v_nieuw := v_nieuw || jsonb_build_object('sleutel', v_rij -> 'sleutel');
    end if;
  elsif tg_op = 'INSERT' then
    v_nieuw := v_rij;
  else
    v_oud := v_rij_oud;
  end if;
  v_grootte := coalesce(pg_column_size(v_oud), 0) + coalesce(pg_column_size(v_nieuw), 0);
  perform public.audit_quotum(auth.uid(), tg_table_name, v_id, tg_op, v_grootte);
  insert into public.audit_log (wie, tabel, record_id, actie, oud, nieuw, grootte)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_oud, v_nieuw, v_grootte);
  return null;
end $$;

drop trigger if exists audit on public.inspecties;
create trigger audit after insert or update or delete on public.inspecties
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.acties;
create trigger audit after insert or update or delete on public.acties
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.planning;
create trigger audit after insert or update or delete on public.planning
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.monteurs;
create trigger audit after insert or update or delete on public.monteurs
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.instellingen;
create trigger audit after insert or update or delete on public.instellingen
  for each row execute function public.audit_trigger();
-- rollen/activering zijn beveiligingsrelevant: ook profielen auditen
drop trigger if exists audit on public.profiles;
create trigger audit after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();

-- ---------- Rolwijziging => ook een security_event ----------
create or replace function public.profiles_rol_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.actief is distinct from old.actief then
    insert into public.security_events (wie, soort, details)
    values (auth.uid(), 'rol_gewijzigd',
            jsonb_build_object('profiel', new.id,
                               'rol_oud', old.role, 'rol_nieuw', new.role,
                               'actief_oud', old.actief, 'actief_nieuw', new.actief));
  end if;
  return null;
end $$;

drop trigger if exists profiles_rol_event on public.profiles;
create trigger profiles_rol_event after update on public.profiles
  for each row execute function public.profiles_rol_event();

-- ---------- Append-only bewaking ----------
-- Uitzondering alleen voor bewaartermijn-onderhoud door de eigenaar (postgres)
-- in een sessie met: set local wpi.onderhoud = 'aan';  (zie README)
create or replace function public.weiger_wijziging_log()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'postgres' and current_setting('wpi.onderhoud', true) = 'aan'
     and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'Tabel % is append-only: % is niet toegestaan', tg_table_name, tg_op
    using errcode = '42501';
end $$;

drop trigger if exists append_only on public.audit_log;
create trigger append_only before update or delete on public.audit_log
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.audit_log;
create trigger append_only_truncate before truncate on public.audit_log
  for each statement execute function public.weiger_wijziging_log();

drop trigger if exists append_only on public.actie_log;
create trigger append_only before update or delete on public.actie_log
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.actie_log;
create trigger append_only_truncate before truncate on public.actie_log
  for each statement execute function public.weiger_wijziging_log();

drop trigger if exists append_only on public.security_events;
create trigger append_only before update or delete on public.security_events
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.security_events;
create trigger append_only_truncate before truncate on public.security_events
  for each statement execute function public.weiger_wijziging_log();

revoke execute on function public.audit_trigger(), public.profiles_rol_event(),
  public.weiger_wijziging_log() from public, anon, authenticated;
revoke execute on function public.audit_quotum(uuid, text, text, text, integer) from public, anon, authenticated;

-- >>>>> 0005_storage.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0005: Storage-bucket "fotos" (privé)
-- Padconventie: <auth.uid()>/<sha256 van de inhoud>.jpg|jpeg|png|webp
--   bv. 3f0c…-…/9b74c9897bac770ffc029102a200c5de….jpg   (zonder "fotos/" ervoor)
-- MIME (image/jpeg, image/png, image/webp) en max 5 MB dwingt de Storage-API
-- af via de bucketconfiguratie; de policies controleren pad en extensie.
-- De bucket is privé (nooit publiek). De app haalt een foto met de sessie op via
-- GET /storage/v1/object/authenticated/fotos/<pad> en toont hem als data-URL.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Uploaden: alleen actieve leden, alleen in de eigen map, één niveau diep, een veilige
-- bestandsnaam (geen "..", geen submappen) en alleen beeldextensies.
drop policy if exists "fotos: uploaden in eigen map" on storage.objects;
create policy "fotos: uploaden in eigen map" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
  );

-- Bekijken: eigen foto's, staf/QHSE alles, en foto's die echt bij een actie horen
-- die je mag zien (foto van de aanmaker/inspecteur, na-foto van wie hem toevoegde).
drop policy if exists "fotos: bekijken eigen, staf of via actie" on storage.objects;
create policy "fotos: bekijken eigen, staf of via actie" on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and public.is_lid()
    and (split_part(name, '/', 1) = (select auth.uid())::text
         or public.mag_alles_lezen()
         or public.foto_via_actie(name))
  );

-- Overschrijven (upload met x-upsert: true, zoals de app): alleen de uploader, in de eigen
-- map, en alleen zolang de foto nergens als bewijs wordt gebruikt (zelfde regel als
-- verwijderen). Namen zijn inhoud-hashes (<uid>/<sha256>.<ext>), dus een herhaalde upload
-- (antwoord kwijt door netwerkfout) is dezelfde foto en lukt. Een foto in een actie of in
-- een eigen inspectie (bewijs, ook na toetsing) kan zo nooit worden vervangen; zo'n
-- herhaalde upload geeft een RLS-fout (de app hoeft hem dan niet opnieuw te sturen).
-- Storage voert een upsert uit als INSERT … ON CONFLICT DO UPDATE: zonder conflict telt
-- alleen de insert-policy, bij een conflict ook deze update-policy (en select).
drop policy if exists "fotos: bijwerken eigen" on storage.objects;
drop policy if exists "fotos: opnieuw uploaden eigen, ongebruikt" on storage.objects;
create policy "fotos: opnieuw uploaden eigen, ongebruikt" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_lid()
         and split_part(name, '/', 1) = (select auth.uid())::text
         and not public.foto_in_gebruik(name))
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
  );

-- Verwijderen: het hoofd (bewaartermijn / AVG-verzoek), of de uploader zolang de
-- foto nergens als bewijs wordt gebruikt (niet in een actie, niet in een inspectie).
drop policy if exists "fotos: verwijderen eigen of hoofd" on storage.objects;
create policy "fotos: verwijderen eigen of hoofd" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_lid()
         and (public.is_hoofd_admin()
              or (split_part(name, '/', 1) = (select auth.uid())::text
                  and not public.foto_in_gebruik(name))));

-- >>>>> 0006_rpc.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0006: RPC's voor de client
--   POST /rest/v1/rpc/report_security_event  {"p_soort": "...", "p_details": {...}}
--   POST /rest/v1/rpc/dashboard_cijfers      {"p_van": "2026-07-01", "p_tot": "2026-09-30"}
--   POST /rest/v1/rpc/monteur_aanmelden      {"p_naam": "Henk Voorbeeld"}
-- Alleen parameters, geen dynamische SQL.
-- =====================================================================

-- ---------- Beveiligingsgebeurtenis melden (rate-limited) ----------
-- Per gebruiker max 10 meldingen per minuut, 100 per 24 uur en 256 KiB per 24 uur, en
-- het gezamenlijke dagquotum (25 MiB over audit_log, actie_log en security_events samen,
-- schrijf_bytes_24u). Daarboven: false en niets opslaan; dat wordt hooguit één keer per
-- 10 minuten als 'rate_limit_bereikt' vastgelegd. security_events is append-only: zo
-- voegt één account hier hooguit ~0,3 MiB per dag toe.
create or replace function public.report_security_event(p_soort text, p_details jsonb default '{}'::jsonb)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_aantal integer;
  c_max    constant integer := 10;
begin
  if v_uid is null or not public.is_lid() then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;
  -- soorten die alleen de server zelf schrijft, kan een client niet nabootsen
  if p_soort is null or p_soort !~ '^[a-z][a-z0-9_]{2,47}$'
     or p_soort in ('rate_limit_bereikt', 'rol_gewijzigd', 'uitnodiging_bestaand_account') then
    raise exception 'Ongeldige soort' using errcode = '22023';
  end if;
  if p_details is null then
    p_details := '{}'::jsonb;
  end if;
  if jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 4096 then
    raise exception 'details moet een object van max 4 KB zijn' using errcode = '22023';
  end if;

  -- serialiseer per gebruiker zodat gelijktijdige aanroepen de limiet niet omzeilen
  perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || v_uid::text, 0));
  select count(*) into v_aantal from public.security_events s
   where s.wie = v_uid and s.t > now() - interval '1 minute' and s.soort <> 'rate_limit_bereikt';

  if v_aantal >= c_max
     or (select count(*) from public.security_events s
          where s.wie = v_uid and s.t > now() - interval '24 hours' and s.soort <> 'rate_limit_bereikt') >= 100
     or (select coalesce(sum(octet_length(s.soort) + octet_length(s.details::text)), 0) from public.security_events s
          where s.wie = v_uid and s.t > now() - interval '24 hours')
        + octet_length(p_soort) + octet_length(p_details::text) > 262144
     or public.schrijf_bytes_24u(v_uid) + octet_length(p_details::text) > 25 * 1024 * 1024 then
    if not exists (select 1 from public.security_events s
                   where s.wie = v_uid and s.soort = 'rate_limit_bereikt'
                     and s.t > now() - interval '10 minutes') then
      insert into public.security_events (wie, soort, details)
      values (v_uid, 'rate_limit_bereikt', jsonb_build_object('poging_soort', p_soort));
    end if;
    return false;
  end if;

  insert into public.security_events (wie, soort, details) values (v_uid, p_soort, p_details);
  return true;
end $$;

-- ---------- Dashboard (web, ≥900px; alleen coördinator en hoofd) ----------
-- SECURITY INVOKER: RLS bepaalt daarnaast de reikwijdte. Conform-% alleen over C/A/V
-- (zonder NVT) en pas vanaf 5 beoordeelde waarnemingen (methode, zoals de app).
-- doel_conform: null = geen doel ingesteld.
create or replace function public.dashboard_cijfers(p_van date default null, p_tot date default null)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_uit jsonb;
begin
  if not public.is_staf() then
    raise exception 'Het dashboard is alleen voor de coördinatoren en het hoofd' using errcode = '42501';
  end if;
  with ins as (
    select i.* from public.inspecties i
    where (p_van is null or (i.opgeslagen at time zone 'Europe/Amsterdam')::date >= p_van)
      and (p_tot is null or (i.opgeslagen at time zone 'Europe/Amsterdam')::date <= p_tot)
  ), w as (
    select e ->> 'oordeel' as oordeel
    from ins, jsonb_array_elements(
      case when jsonb_typeof(ins.record -> 'waarnemingen') = 'array'
           then ins.record -> 'waarnemingen' else '[]'::jsonb end) e
  ), tel as (
    select count(*) filter (where oordeel = 'C')   as c,
           count(*) filter (where oordeel = 'A')   as a,
           count(*) filter (where oordeel = 'V')   as v,
           count(*) filter (where oordeel = 'NVT') as nvt
    from w
  ), act as (
    select a.status, a.plandatum from public.acties a
  )
  select jsonb_build_object(
    'van', p_van, 'tot', p_tot,
    'inspecties', (select count(*) from ins),
    'waarnemingen', (select jsonb_build_object('C', c, 'A', a, 'V', v, 'NVT', nvt) from tel),
    'conform_pct', (select case when c + a + v >= 5 then round(100.0 * c / (c + a + v), 1) end from tel),
    'doel_conform', (select nullif(s.waarde, 'null'::jsonb) from public.instellingen s where s.sleutel = 'doel_conform'),
    'acties', jsonb_build_object(
      'per_status', coalesce((select jsonb_object_agg(status, n)
                              from (select status::text as status, count(*) as n from act group by status) x),
                             '{}'::jsonb),
      'te_laat', (select count(*) from act
                  where status in ('Open', 'In uitvoering') and plandatum < public.vandaag()),
      'te_toetsen', (select count(*) from act where status = 'Klaar voor toetsing'),
      'in_te_stellen', (select count(*) from act where status = 'Voorstel'))
  ) into v_uit;
  return v_uit;
end $$;

-- ---------- Monteur aanmelden tijdens een inspectie ----------
-- De inspecteur mag een naam toevoegen die nog niet op de lijst staat (inspectie.js
-- "Andere naam toevoegen"). Opschonen gaat met naam_schoon (= schoon() in beheer.js) en
-- vergelijken met naam_sleutel (= sleutel() in beheer.js: zonder hoofdletters, accenten,
-- spaties en leestekens; "Henk-Voorbeeld" en "Henk Voorbeeld." zijn "Henk Voorbeeld";
-- getoetst voor alle codepunten door tests/naamsleutel_check.sh). Een bestaande naam wordt teruggegeven in de schrijfwijze van de lijst;
-- stond die op non-actief, dan wordt hij weer actief (zoals beheer.js voegMonteurToe:
-- "non-actief → weer actief"; het hoofd ziet dat in de auditlog). Onzichtbare of
-- besturingstekens worden geweigerd. Max 20 nieuwe namen per gebruiker per dag.
-- Alleen de naam; nooit een score per persoon.
create or replace function public.monteur_aanmelden(p_naam text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_naam text := public.naam_schoon(coalesce(p_naam, ''));
  v_rij  public.monteurs%rowtype;
  v_n    integer;
begin
  if v_uid is null or not public.is_lid() then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;
  if char_length(v_naam) not between 1 and 120 then
    raise exception 'Vul een naam in van 1 tot 120 tekens' using errcode = '22023';
  end if;
  if not public.naam_tekens_ok(v_naam) or char_length(public.naam_sleutel(v_naam)) = 0 then
    raise exception 'De naam bevat onzichtbare of ongeldige tekens' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wpi_monteur:' || public.naam_sleutel(v_naam), 0));
  select * into v_rij from public.monteurs m where public.naam_sleutel(m.naam) = public.naam_sleutel(v_naam);
  if found then
    if not v_rij.actief then
      update public.monteurs m set actief = true where m.id = v_rij.id returning * into v_rij;
      return jsonb_build_object('id', v_rij.id, 'naam', v_rij.naam, 'actief', true, 'nieuw', false,
                                'heractiveerd', true);
    end if;
    return jsonb_build_object('id', v_rij.id, 'naam', v_rij.naam, 'actief', v_rij.actief, 'nieuw', false,
                              'heractiveerd', false);
  end if;
  select count(*) into v_n from public.audit_log l
   where l.tabel = 'monteurs' and l.actie = 'INSERT' and l.wie = v_uid and l.t > now() - interval '1 day';
  if v_n >= 20 and not public.is_hoofd_admin() then
    raise exception 'Te veel nieuwe namen vandaag; vraag het hoofd om de lijst aan te vullen' using errcode = '54000';
  end if;
  insert into public.monteurs (naam) values (v_naam) returning * into v_rij;
  return jsonb_build_object('id', v_rij.id, 'naam', v_rij.naam, 'actief', v_rij.actief, 'nieuw', true,
                            'heractiveerd', false);
end $$;

revoke execute on function public.report_security_event(text, jsonb) from public, anon;
revoke execute on function public.dashboard_cijfers(date, date) from public, anon;
revoke execute on function public.monteur_aanmelden(text) from public, anon;
grant execute on function public.report_security_event(text, jsonb) to authenticated;
grant execute on function public.dashboard_cijfers(date, date) to authenticated;   -- weigert zelf niet-staf
grant execute on function public.monteur_aanmelden(text) to authenticated;

-- Nieuwe functies in public krijgen voortaan geen EXECUTE meer voor anon/public
alter default privileges in schema public revoke execute on functions from public, anon;

-- >>>>> 0007_invoer_aanvulling.sql
-- =====================================================================
-- Werkplekinspectie — migratie 0007: aanvullende servervalidatie en uploadquotum
-- (beveiligingsronde, november 2026)
--
-- Gevonden door de formulieren van de app (planning, actie, inspectie, beheer, inloggen) naast de
-- databaseregels te leggen. De client controleert ook, maar alleen de server telt:
--   1. DATUMS. planning.datum en acties.plandatum hadden geen grenzen: jaar 0001 of 9999 kon, wat
--      sorteren, "te laat" en het dashboard breekt. Nu altijd tussen 2000 en 2100 (CHECK), en bij een
--      nieuwe of gewijzigde datum vanuit de app tussen twee jaar terug en vijf jaar vooruit (trigger;
--      een CHECK mag niet van "vandaag" afhangen). Beheer via SQL (service_role/postgres) is vrij.
--   2. VRIJE TEKST. Besturingstekens (behalve tab en regeleinde) en bidi-overrides/-isolates
--      (U+202A–202E, U+2066–2069: tekst die in een rapport of export omgekeerd wordt getoond,
--      "Trojan Source") worden geweigerd in alle tekstkolommen die de app schrijft, en in de tekst van
--      inspecties.record. Namen hadden dit al (naam_tekens_ok) en het verloop ook (actie_log_stempel).
--   3. FOTOPADEN IN DE MOMENTOPNAME. In inspecties.record (waarneming.foto, extraFotos[].foto,
--      handtekening, fotos) mag alleen null, "" of een pad in de EIGEN map van de inspecteur staan
--      (<inspecteur_id>/<naam>.jpg|jpeg|png|webp). Zo hangt niemand andermans foto als "bewijs" in zijn
--      inspectie ("alleen wat de inspecteur zag telt"); data-URL's weigerde inspecties_valideer al.
--   4. UPLOADQUOTUM. De Storage-bucket "fotos" begrensde grootte (5 MB) en type, niet het aantal: één
--      account kon onbeperkt uploaden (kosten/opslag vol). Nu max 120 foto's per uur en 600 per 24 uur
--      per gebruiker (een inspectie met veel waarnemingen haalt hooguit enkele tientallen).
-- Constraints zijn NOT VALID: bestaande rijen worden niet opnieuw gekeurd, nieuwe en gewijzigde wel.
-- Idempotent: opnieuw draaien mag. Tests: supabase/tests/rls_test.sql, sectie 22.
-- =====================================================================

-- ---------- 2. vrije tekst ----------
create or replace function public.tekst_tekens_ok(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or p !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]'
$$;

-- jsonb als tekst: besturingstekens staan daar als \u00XX (behalve DEL), bidi-tekens letterlijk.
-- Een letterlijk getypte "\u0001" (backslash in de tekst) staat er als "\\u0001" en telt niet.
create or replace function public.record_tekens_ok(p jsonb)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or (p::text !~ '[\u007F‪-‮⁦-⁩]'
                       and p::text !~* '(^|[^\\])(\\\\)*\\u00(0[1-8bcef]|1[0-9a-f])')
$$;

alter table public.acties drop constraint if exists acties_tekst_tekens;
alter table public.acties add constraint acties_tekst_tekens check (
  public.tekst_tekens_ok(tekst) and public.tekst_tekens_ok(waarneming) and public.tekst_tekens_ok(ref)) not valid;
alter table public.planning drop constraint if exists planning_tekst_tekens;
alter table public.planning add constraint planning_tekst_tekens check (
  public.tekst_tekens_ok(code) and public.tekst_tekens_ok(project) and public.tekst_tekens_ok(locatie)
  and public.tekst_tekens_ok(toelichting)) not valid;
alter table public.inspecties drop constraint if exists inspecties_tekst_tekens;
alter table public.inspecties add constraint inspecties_tekst_tekens check (
  public.tekst_tekens_ok(titel) and public.tekst_tekens_ok(code) and public.tekst_tekens_ok(project)
  and public.record_tekens_ok(record)) not valid;
alter table public.profiles drop constraint if exists profiles_functie_tekens;
alter table public.profiles add constraint profiles_functie_tekens check (public.tekst_tekens_ok(functie)) not valid;

-- ---------- 3. fotopaden in inspecties.record ----------
-- Zelfde lezing als de app (js/sync.js, schoon()): een tekst onder de sleutel foto, nafoto of
-- handtekening, of onder een object/lijst met de sleutel "fotos", is een foto. Lijsten erven de sleutel
-- (een lijst onder "fotos" telt hier ook als foto's; strenger dan de app, die daar niets mee doet).
create or replace function public.record_fotos_ok(p_record jsonb, p_uid uuid)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  with recursive n (k, v, foto, diepte) as (
    select null::text, p_record, false, 0
    union all
    select c.k, c.v, c.foto, n.diepte + 1
    from n, lateral (
      select e.key, e.value, (e.key in ('foto', 'nafoto', 'handtekening') or n.k = 'fotos')
        from jsonb_each(case when jsonb_typeof(n.v) = 'object' then n.v else '{}'::jsonb end) e
      union all
      select n.k, a.value, (n.foto or n.k = 'fotos')
        from jsonb_array_elements(case when jsonb_typeof(n.v) = 'array' then n.v else '[]'::jsonb end) a
    ) c (k, v, foto)
    where n.diepte < 64
  )
  select not exists (
    select 1 from n
    where n.foto and jsonb_typeof(n.v) = 'string' and (n.v #>> '{}') <> ''
      and not ((n.v #>> '{}') ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
               and position('..' in (n.v #>> '{}')) = 0
               and public.foto_eigenaar(n.v #>> '{}') = p_uid::text))
$$;

alter table public.inspecties drop constraint if exists inspecties_fotos_eigen;
alter table public.inspecties add constraint inspecties_fotos_eigen check (
  public.record_fotos_ok(record, inspecteur_id)) not valid;

-- ---------- 1. datums ----------
alter table public.planning drop constraint if exists planning_datum_bereik;
alter table public.planning add constraint planning_datum_bereik check (datum between date '2000-01-01' and date '2100-12-31') not valid;
alter table public.acties drop constraint if exists acties_plandatum_bereik;
alter table public.acties add constraint acties_plandatum_bereik check (
  plandatum is null or plandatum between date '2000-01-01' and date '2100-12-31') not valid;

create or replace function public.datum_venster()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v     date;
  v_oud date;
begin
  if auth.uid() is null then
    return new;   -- service_role / beheer via SQL
  end if;
  if tg_table_name = 'planning' then
    v := new.datum;     if tg_op = 'UPDATE' then v_oud := old.datum; end if;
  else
    v := new.plandatum; if tg_op = 'UPDATE' then v_oud := old.plandatum; end if;
  end if;
  if v is null or (tg_op = 'UPDATE' and v is not distinct from v_oud) then
    return new;
  end if;
  if v < public.vandaag() - interval '2 years' or v > public.vandaag() + interval '5 years' then
    raise exception 'De datum % ligt niet tussen twee jaar geleden en vijf jaar vooruit; controleer de datum', to_char(v, 'DD-MM-YYYY')
      using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists planning_datum_venster on public.planning;
create trigger planning_datum_venster before insert or update of datum on public.planning
  for each row execute function public.datum_venster();
drop trigger if exists acties_plandatum_venster on public.acties;
create trigger acties_plandatum_venster before insert or update of plandatum on public.acties
  for each row execute function public.datum_venster();

-- ---------- 4. uploadquotum Storage ----------
-- SECURITY INVOKER: telt de eigen foto's die de gebruiker zelf mag zien (policy "bekijken eigen").
-- VOLATILE (niet STABLE): dan ziet de telling ook de rijen die eerder in dezelfde opdracht zijn ingevoegd,
-- zodat één INSERT met honderden rijen het quotum niet omzeilt.
create or replace function public.foto_uploads_ok()
returns boolean
language sql volatile set search_path = ''
as $$
  select (select count(*) from storage.objects o
           where o.bucket_id = 'fotos' and o.name like (select auth.uid())::text || '/%'
             and o.created_at > now() - interval '1 hour') < 120
     and (select count(*) from storage.objects o
           where o.bucket_id = 'fotos' and o.name like (select auth.uid())::text || '/%'
             and o.created_at > now() - interval '24 hours') < 600
$$;

drop policy if exists "fotos: uploaden in eigen map" on storage.objects;
create policy "fotos: uploaden in eigen map" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
    and public.foto_uploads_ok()
  );

-- ---------- rechten ----------
revoke execute on function public.tekst_tekens_ok(text), public.record_tekens_ok(jsonb),
  public.record_fotos_ok(jsonb, uuid), public.foto_uploads_ok(), public.datum_venster() from public, anon;
revoke execute on function public.datum_venster() from authenticated;
-- CHECK-constraints en policies draaien met de rechten van wie schrijft: die moet de helpers mogen aanroepen
grant execute on function public.tekst_tekens_ok(text), public.record_tekens_ok(jsonb),
  public.record_fotos_ok(jsonb, uuid), public.foto_uploads_ok() to authenticated, service_role;
