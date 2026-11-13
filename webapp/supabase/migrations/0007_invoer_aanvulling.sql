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
--   2. VRIJE TEKST. Besturingstekens (C0 behalve tab en regeleinde, DEL en C1 U+0080–009F, o.a. U+009B CSI:
--      een ANSI-escape in terminal- en CSV-exports), bidi-overrides/-isolates en -markeringen (U+202A–202E,
--      U+2066–2069, U+200E/200F, U+061C: tekst die in een rapport of export omgekeerd wordt getoond, "Trojan
--      Source"), onzichtbare tekens (alle "format"-tekens, Unicode-categorie Cf, behalve U+200D: o.a.
--      U+200B/200C, U+2060–206F, U+FEFF, U+180E, het zachte afbreekstreepje U+00AD, U+FFF9–FFFB en de
--      Unicode-"tag"-tekens U+E0000–E007F waarmee onzichtbare ASCII-tekst kan worden meegesmokkeld), de
--      onzichtbare opvullers U+034F, U+115F/1160, U+17B4/17B5, U+3164, U+FFA0, U+1D173–1D17A, de
--      variatiekiezers U+E0100–E01EF en de regel-/alinea-scheiders U+2028/2029 worden geweigerd in alle
--      tekstkolommen die de app schrijft, en in ELKE tekstwaarde (en sleutel) van inspecties.record. Bewust
--      toegestaan: U+200D (zero-width joiner; zit in emoji als 👷‍♀️ die een telefoontoetsenbord invoegt) en
--      U+FE00–FE0F (emoji-variatiekiezers). Prijs: de vlaggen van Engeland/Schotland/Wales (tag-tekens) kunnen niet. De app haalt dezelfde tekens vóór het versturen
--      weg (js/sync.js, schoonTekst), zodat een geplakte tekst niet blijvend wordt geweigerd. Namen hadden
--      dit al (naam_tekens_ok, strenger) en het verloop ook (actie_log_stempel).
--   3. FOTOPADEN IN DE MOMENTOPNAME. In inspecties.record (waarneming.foto, extraFotos[] (een tekst of
--      {foto}), handtekening, fotos) mag alleen null, "" of een pad in de EIGEN map van de inspecteur staan
--      (<inspecteur_id>/<naam>.jpg|jpeg|png|webp). Zo hangt niemand andermans foto als "bewijs" in zijn
--      inspectie ("alleen wat de inspecteur zag telt"); data-URL's weigerde inspecties_valideer al.
--   4. UPLOADQUOTUM. De Storage-bucket "fotos" begrensde grootte (5 MB) en type, niet het aantal: één
--      account kon onbeperkt uploaden (kosten/opslag vol). Nu max 120 foto's per uur en 600 per 24 uur
--      per gebruiker (een inspectie met veel waarnemingen haalt hooguit enkele tientallen), geteld in
--      public.foto_uploads met een lock per gebruiker (snel, en niet te omzeilen met parallelle uploads).
--      En: een foto die al als bewijs gebruikt wordt (in een actie of in een eigen inspectie), kan ook NIET
--      opnieuw worden geüpload (eerst koppelen en later iets anders uploaden, of na verwijderen door het hoofd
--      een andere foto onder dezelfde naam zetten). De app uploadt altijd vóór het koppelen.
--   5. VORM VAN HET RECORD (rekentijd). Vóór de diepe controles (2 en 3) eerst goedkope grenzen: hooguit
--      256 KB, hooguit 20.000 komma's (bovengrens voor het aantal elementen) en minder dan 32 niveaus diep.
--      Eerder kon een record van < 1 MB met 250.000 lege lijsten 5–11 s rekentijd kosten en liep elke poging
--      tegen de time-out (zonder dat er iets werd geteld). Nu kost een geweigerde poging enkele milliseconden.
-- Constraints zijn NOT VALID: bestaande rijen worden niet opnieuw gekeurd, nieuwe en gewijzigde wel.
-- Idempotent: opnieuw draaien mag. Tests: supabase/tests/rls_test.sql, secties 24 en 25.
-- =====================================================================

-- ---------- 2. vrije tekst ----------
-- Dezelfde tekenklasse staat in record_tekens_ok hieronder en in js/sync.js (ONZICHTBAAR); de tests
-- (rls_test.sql 25a) vergelijken de functies voor ELK codepunt U+0001–U+10FFFF.
create or replace function public.tekst_tekens_ok(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or p !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u115F\u1160\u17B4\u17B5\u180E\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFFF9-\uFFFB\U000110BD\U000110CD\U00013430-\U0001343F\U0001BCA0-\U0001BCA3\U0001D173-\U0001D17A\U000E0000-\U000E007F\U000E0100-\U000E01EF]'
$$;

-- Dezelfde regel voor ELKE tekstwaarde (en sleutel) in een jsonb-record, diep, ook in lijsten. Eén reguliere
-- expressie over record::text (lineair, milliseconden; de vorige versie liep per element door
-- jsonb_path_query en kostte op een record van < 1 MB 5–11 s). In jsonb::text staan de C0-besturingstekens
-- als JSON-escape: \b (U+0008), \f (U+000C) en \u00XX (de rest; tab, regeleinde en CR blijven \t \n \r en
-- mogen). Een escape telt alleen na een ONEVEN aantal backslashes: "C:\\bin" (een getypte backslash + b)
-- is geen backspace. Alle andere geweigerde tekens staan letterlijk in de tekst. Tests: rls_test.sql 24b/25a.
create or replace function public.record_tekens_ok(p jsonb)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or (
    p::text !~ '[\u007F-\u009F\u00AD\u034F\u061C\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u115F\u1160\u17B4\u17B5\u180E\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFFF9-\uFFFB\U000110BD\U000110CD\U00013430-\U0001343F\U0001BCA0-\U0001BCA3\U0001D173-\U0001D17A\U000E0000-\U000E007F\U000E0100-\U000E01EF]'
    and p::text !~ '(^|[^\\])(\\\\)*\\(b|f|u00(0[1-8bBeEfF]|1[0-9a-fA-F]))')
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
-- namen (monteurs, profielen): naam_tekens_ok (0001) blijft; daarnaast ook deze regel, zodat ook de tag-tekens en
-- opvullers hierboven niet in een naam kunnen die iedereen ziet
alter table public.monteurs drop constraint if exists monteurs_naam_tekst_tekens;
alter table public.monteurs add constraint monteurs_naam_tekst_tekens check (public.tekst_tekens_ok(naam)) not valid;
alter table public.profiles drop constraint if exists profiles_naam_tekst_tekens;
alter table public.profiles add constraint profiles_naam_tekst_tekens check (public.tekst_tekens_ok(full_name)) not valid;

-- ---------- 3. fotopaden in inspecties.record ----------
-- Zelfde lezing als de app (js/sync.js, schoon(); js/inspectie.js, fotoLijst()): een tekst onder de sleutel
-- foto, nafoto of handtekening, of onder een object/lijst met de sleutel "fotos", en ELKE tekst in een lijst
-- onder "extraFotos" (de app toont ["<pad>"] net zo goed als [{"foto":"<pad>"}]) is een foto. Lijsten erven de
-- sleutel (ook geneste lijsten). Een record van 64 niveaus of dieper wordt geweigerd (niet stil overgeslagen);
-- de vormcontrole (5, hieronder) weigert al vanaf 32 niveaus.
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
      select n.k, a.value, (n.foto or n.k in ('fotos', 'extraFotos'))
        from jsonb_array_elements(case when jsonb_typeof(n.v) = 'array' then n.v else '[]'::jsonb end) a
    ) c (k, v, foto)
    where n.diepte < 64
  )
  select not exists (select 1 from n where n.diepte >= 64)
     and not exists (
    select 1 from n
    where n.foto and jsonb_typeof(n.v) = 'string' and (n.v #>> '{}') <> ''
      and not ((n.v #>> '{}') ~* '^(fotos/)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
               and position('..' in (n.v #>> '{}')) = 0
               and public.foto_eigenaar(n.v #>> '{}') = p_uid::text))
$$;

alter table public.inspecties drop constraint if exists inspecties_fotos_eigen;
alter table public.inspecties add constraint inspecties_fotos_eigen check (
  public.record_fotos_ok(record, inspecteur_id)) not valid;

-- ---------- 5. vorm van het record (goedkoop, vóór de diepe controles) ----------
-- BEFORE-trigger met een naam die vóór inspecties_valideer komt (triggers lopen op naam): wordt dus als
-- eerste uitgevoerd, vóór de trigger en vóór de CHECK-constraints (record_fotos_ok, record_tekens_ok).
-- Alleen bij een nieuw record of een gewijzigd record (een oud, groter record blijft bij andere wijzigingen
-- gewoon bij te werken). Geldt ook voor beheer via SQL.
create or replace function public.inspecties_vorm()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  t text;
begin
  if new.record is null or (tg_op = 'UPDATE' and new.record is not distinct from old.record) then
    return new;
  end if;
  t := new.record::text;
  if octet_length(t) > 262144 then
    raise exception 'Deze inspectie is te groot om op te slaan (meer dan 256 KB tekst)' using errcode = '22023';
  end if;
  if length(t) - length(replace(t, ',', '')) > 20000 then
    raise exception 'Deze inspectie bevat te veel onderdelen om op te slaan' using errcode = '22023';
  end if;
  if jsonb_path_exists(new.record, 'strict $.**{32}') then
    raise exception 'Deze inspectie is te diep genest om op te slaan' using errcode = '22023';
  end if;
  if jsonb_typeof(new.record -> 'waarnemingen') = 'array' and jsonb_array_length(new.record -> 'waarnemingen') > 500 then
    raise exception 'Een inspectie heeft hooguit 500 waarnemingen' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists inspecties_0_vorm on public.inspecties;
create trigger inspecties_0_vorm before insert or update on public.inspecties
  for each row execute function public.inspecties_vorm();

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
-- Geteld in een eigen, kleine registratietabel, NIET door storage.objects te tellen. Eerdere versie (SECURITY
-- INVOKER, count(*) over storage.objects) liet Postgres per object in de bucket eerst de SELECT-policy
-- uitvoeren (foto_via_actie over alle acties), vóór het filter op de eigen map: één upload kostte
-- O(objecten × acties) en liep bij normale hoeveelheden (±140 foto's × 650 acties) op tot ~29 s, ver boven de
-- statement_timeout (8 s) van Supabase voor "authenticated". Nu: één indexzoekopdracht per upload.
-- Elke toegelaten upload zet hier één regel (wie, tijd); een upload die daarna toch mislukt (fout, conflict)
-- wordt met de transactie teruggedraaid, dus ook zijn regel. Alleen de functie hieronder (eigenaar) leest en
-- schrijft de tabel: RLS aan, geen policies, geen rechten voor de API-rollen.
create table if not exists public.foto_uploads (
  id  bigint generated always as identity primary key,
  wie uuid not null references auth.users (id) on delete cascade,
  t   timestamptz not null default now()
);
create index if not exists foto_uploads_wie_t on public.foto_uploads (wie, t);
alter table public.foto_uploads enable row level security;
revoke all on public.foto_uploads from public, anon, authenticated;

-- SECURITY DEFINER + per gebruiker één tegelijk (dezelfde advisory lock als audit_quotum): gelijktijdige
-- uploads kunnen de grens niet samen overschrijden (eerder: 115 + 12 parallel = 127). VOLATILE en plpgsql:
-- elke opdracht hierin ziet ook de regels die eerder in dezelfde INSERT (honderden rijen in één keer) of door
-- een net vastgelegde parallelle transactie zijn geschreven. Max 120 per uur en 600 per 24 uur per gebruiker.
-- Regels ouder dan 24 uur van deze gebruiker worden meteen opgeruimd (de tabel blijft klein).
create or replace function public.foto_uploads_ok()
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_uur integer;
  v_dag integer;
begin
  if v_uid is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || v_uid::text, 0));
  delete from public.foto_uploads f where f.wie = v_uid and f.t < now() - interval '24 hours';
  select count(*) filter (where f.t > now() - interval '1 hour'), count(*)
    into v_uur, v_dag
    from public.foto_uploads f where f.wie = v_uid;
  if v_uur >= 120 or v_dag >= 600 then
    return false;
  end if;
  insert into public.foto_uploads (wie) values (v_uid);
  return true;
end $$;

-- Foto-toegang via een actie en "in gebruik": vergelijken met gewone gelijkheid (pad met of zonder "fotos/"),
-- zodat de indexen hieronder worden gebruikt (eerder regexp_replace(foto_pad, …) = naam: elke keer alle acties).
create index if not exists acties_foto_pad on public.acties (foto_pad) where foto_pad is not null;
create index if not exists acties_nafoto_pad on public.acties (nafoto_pad) where nafoto_pad is not null;

drop policy if exists "fotos: uploaden in eigen map" on storage.objects;
create policy "fotos: uploaden in eigen map" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
    and not public.foto_in_gebruik(name)   -- bewijs (actie of eigen inspectie) nooit (opnieuw) te uploaden
    and public.foto_uploads_ok()
  );

-- ---------- rechten ----------
revoke execute on function public.tekst_tekens_ok(text), public.record_tekens_ok(jsonb),
  public.record_fotos_ok(jsonb, uuid), public.foto_uploads_ok(), public.datum_venster() from public, anon;
revoke execute on function public.datum_venster(), public.inspecties_vorm() from public, anon, authenticated;
-- CHECK-constraints en policies draaien met de rechten van wie schrijft: die moet de helpers mogen aanroepen
grant execute on function public.tekst_tekens_ok(text), public.record_tekens_ok(jsonb),
  public.record_fotos_ok(jsonb, uuid), public.foto_uploads_ok() to authenticated, service_role;
