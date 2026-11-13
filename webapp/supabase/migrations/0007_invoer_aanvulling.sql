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
