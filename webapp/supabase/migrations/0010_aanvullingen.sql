-- =====================================================================
-- Werkplekinspectie — migratie 0010: aanvullingen op een vastgelegde inspectie
-- (november 2026, besluit van de producteigenaar: "Na afronden ligt de inspectie vast. Correcties kunnen alleen
-- nog als aanvulling.")
--
-- Een vastgelegde inspectie (public.inspecties) wijzigt niemand meer (inspecties_valideer, 0002). Een correctie
-- — een verkeerd gespelde monteur, een typfout in het gesprek, een nagekomen feit bij een Conform-waarneming —
-- komt daarom NAAST de momentopname, als aanvulling: append-only, met wie en wanneer (servertijd), en altijd
-- zichtbaar in het rapport onder "Aanvullingen na afronden". De oorspronkelijke tekst blijft staan.
--
--   * Toevoegen: de inspecteur van die inspectie, of het hoofd / de QHSE-manager (met MFA als die verplicht is).
--     Niet de beheerder (app-beheer, geen inhoudelijke rol) en niet een collega die alleen meeleest.
--   * Lezen: wie de inspectie mag zien (dezelfde RLS als public.inspecties, via de subquery).
--   * Nooit wijzigen of verwijderen (geen update/delete-policy en geen rechten); alleen mee weg met de inspectie
--     zelf (bewaartermijn, on delete cascade).
--   * Tijd en auteur zet de server; t_client (moment op het toestel, offline) alleen als het plausibel is.
--   * Tekst: 1–2000 tekens, dezelfde tekenregel als het verloop (verloop_tekens_ok, 0008/0009); "over" (welk deel:
--     een waarneming, monteurs, gesprek …) 1–120 tekens (tekst_tekens_ok).
--   * Volume: max 20 per inspectie, 30 per uur en 100 per 24 uur per gebruiker, plus het gezamenlijke dagquotum
--     (schrijf_bytes_24u telt hier niet mee; deze grenzen zijn veel lager).
-- js/sync.js: App.aanvullingToevoegen / App.aanvullingenVan. Idempotent (opnieuw draaien mag).
-- =====================================================================

create table if not exists public.inspectie_aanvullingen (
  id            bigserial primary key,
  inspectie_id  text not null references public.inspecties (id) on delete cascade,
  t             timestamptz not null default now(),
  wie           uuid default auth.uid(),
  over          text not null default 'Algemeen',
  tekst         text not null,
  t_client      timestamptz,
  constraint aanvulling_tekst_lengte check (char_length(tekst) between 1 and 2000),
  constraint aanvulling_over_lengte  check (char_length(over) between 1 and 120),
  constraint aanvulling_tekst_tekens check (public.verloop_tekens_ok(tekst)),
  constraint aanvulling_over_tekens  check (public.tekst_tekens_ok(over))
);
create index if not exists inspectie_aanvullingen_insp_idx on public.inspectie_aanvullingen (inspectie_id, t);
create index if not exists inspectie_aanvullingen_wie_idx on public.inspectie_aanvullingen (wie, t);

-- wie mag een aanvulling toevoegen bij deze inspectie?
create or replace function public.mag_aanvullen(p_inspectie_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_lid() and (
    public.is_eigen_inspectie(p_inspectie_id)
    or (coalesce(public.mijn_rol()::text in ('hoofd', 'qhse'), false) and public.mfa_ok()
        and exists (select 1 from public.inspecties i where i.id = p_inspectie_id)))
$$;

-- tijd, auteur en id altijd door de server (zoals actie_log_stempel)
create or replace function public.aanvulling_stempel()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.id := nextval('public.inspectie_aanvullingen_id_seq'::regclass);
  new.t := now();
  if auth.uid() is not null then
    new.wie := auth.uid();
  end if;
  new.tekst := btrim(new.tekst);
  new.over := btrim(coalesce(nullif(btrim(new.over), ''), 'Algemeen'));
  if new.t_client is not null
     and (new.t_client > now() + interval '5 minutes' or new.t_client < now() - interval '30 days') then
    new.t_client := null;
  end if;
  return new;
end $$;
drop trigger if exists aanvulling_stempel on public.inspectie_aanvullingen;
create trigger aanvulling_stempel before insert on public.inspectie_aanvullingen
  for each row execute function public.aanvulling_stempel();

-- volumegrens per gebruiker en per inspectie (AFTER: ziet ook alle rijen van één grote INSERT)
create or replace function public.aanvulling_limiet()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.wie is not null and auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || new.wie::text, 0));
    if (select count(*) from public.inspectie_aanvullingen a where a.inspectie_id = new.inspectie_id) > 20 then
      raise exception 'Deze inspectie heeft al het maximale aantal aanvullingen (20)' using errcode = '54000';
    end if;
    if (select count(*) from public.inspectie_aanvullingen a
         where a.wie = new.wie and a.t > now() - interval '1 hour') > 30
       or (select count(*) from public.inspectie_aanvullingen a
            where a.wie = new.wie and a.t > now() - interval '24 hours') > 100 then
      raise exception 'Te veel aanvullingen in korte tijd; probeer het later opnieuw' using errcode = '54000';
    end if;
  end if;
  return null;
end $$;
drop trigger if exists aanvulling_limiet on public.inspectie_aanvullingen;
create trigger aanvulling_limiet after insert on public.inspectie_aanvullingen
  for each row execute function public.aanvulling_limiet();

-- ---------- rechten en RLS ----------
alter table public.inspectie_aanvullingen enable row level security;
revoke all on table public.inspectie_aanvullingen from anon, authenticated, public;
revoke truncate, references, trigger on table public.inspectie_aanvullingen from authenticated, service_role;
revoke update, delete on table public.inspectie_aanvullingen from service_role;
grant select on table public.inspectie_aanvullingen to authenticated;
grant insert (inspectie_id, over, tekst, t_client) on table public.inspectie_aanvullingen to authenticated;
revoke all on sequence public.inspectie_aanvullingen_id_seq from anon, public;
grant usage on sequence public.inspectie_aanvullingen_id_seq to authenticated;
revoke all on function public.mag_aanvullen(text) from public, anon;
grant execute on function public.mag_aanvullen(text) to authenticated;

drop policy if exists aanvullingen_select on public.inspectie_aanvullingen;
create policy aanvullingen_select on public.inspectie_aanvullingen for select to authenticated
  using (public.is_lid() and exists (select 1 from public.inspecties i where i.id = inspectie_aanvullingen.inspectie_id));
drop policy if exists aanvullingen_insert on public.inspectie_aanvullingen;
create policy aanvullingen_insert on public.inspectie_aanvullingen for insert to authenticated
  with check (wie = (select auth.uid()) and public.mag_aanvullen(inspectie_id));
-- bewust geen update- en geen delete-policy: een aanvulling is append-only
