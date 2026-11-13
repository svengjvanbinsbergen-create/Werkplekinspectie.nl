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
