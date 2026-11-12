-- Werkplekinspectie — Supabase schema (v0.1)
-- Datamodel voor de WPI-methode (momentopname, oordeel C/A/V). RLS aan.
-- AVG: we slaan de INSPECTEUR (app-gebruiker) op, maar bewust GEEN namen van
-- geïnspecteerde medewerkers in vrije tekst (dataminimalisatie; de methode
-- toetst het werk, niet de persoon). Zie webapp/docs/backend-onderzoek.md.

-- ---------- rollen & profielen ----------
create type public.user_role as enum ('inspecteur', 'coordinator', 'hoofd');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'inspecteur',
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiel: eigen of coordinator/hoofd"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

-- helper: is de huidige gebruiker coordinator of hoofd?
create function public.is_staff() returns boolean
  language sql security definer stable as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('coordinator','hoofd'));
$$;

-- profiel automatisch aanmaken bij nieuwe auth-gebruiker
create function public.handle_new_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row
  execute function public.handle_new_user();

-- ---------- referentie: kennisbank (producten, TRA-regels) ----------
create table public.producten (
  code text primary key,           -- bv. 'DAM'
  naam text not null               -- bv. 'Damwand'
);

create table public.regels (
  id text primary key,             -- bv. 'DAM-2.01'
  product_code text not null references public.producten(code) on delete cascade,
  fase text, taak text, taakstap text,
  risico text, maatregelen text, klasse text
);
-- referentiedata: voor iedereen leesbaar, alleen beheer schrijft
alter table public.producten enable row level security;
alter table public.regels enable row level security;
create policy "producten leesbaar" on public.producten for select using (auth.uid() is not null);
create policy "regels leesbaar"    on public.regels   for select using (auth.uid() is not null);

-- ---------- projecten (werkplekken) ----------
create table public.projecten (
  code text primary key,           -- bv. 'P26-168'
  product_code text references public.producten(code),
  locatie text, opdrachtgever text,
  start date, eind date,
  hijsen boolean default false, besloten_ruimte boolean default false, open_water boolean default false
);
alter table public.projecten enable row level security;
create policy "projecten leesbaar" on public.projecten for select using (auth.uid() is not null);

-- ---------- inspecties ----------
create type public.ingang_type as enum ('ingepland', 'spontaan');
create type public.wpi_status  as enum ('concept', 'vastgelegd');

create table public.inspecties (
  id uuid primary key default gen_random_uuid(),
  project_code text references public.projecten(code),
  product_code text references public.producten(code),
  inspecteur_id uuid not null references public.profiles(id) default auth.uid(),
  datum date not null default current_date,
  ingang public.ingang_type not null default 'ingepland',
  taak text,
  status public.wpi_status not null default 'concept',
  created_at timestamptz not null default now()
);
alter table public.inspecties enable row level security;

create policy "inspectie lezen: eigen of staf"
  on public.inspecties for select using (inspecteur_id = auth.uid() or public.is_staff());
create policy "inspectie toevoegen: eigen"
  on public.inspecties for insert with check (inspecteur_id = auth.uid());
create policy "inspectie wijzigen: eigen (concept) of staf"
  on public.inspecties for update
  using (inspecteur_id = auth.uid() or public.is_staff());

-- ---------- waarnemingen (oordeel per regel) ----------
create type public.oordeel_type as enum ('C', 'A', 'V', 'NVT');

create table public.waarnemingen (
  id uuid primary key default gen_random_uuid(),
  inspectie_id uuid not null references public.inspecties(id) on delete cascade,
  regel_id text references public.regels(id),
  klasse text,
  oordeel public.oordeel_type not null,
  waarneming text,                 -- eigen waarneming van de inspecteur
  created_at timestamptz not null default now()
);
alter table public.waarnemingen enable row level security;
create policy "waarneming via eigen/staf inspectie"
  on public.waarnemingen for all
  using (exists (select 1 from public.inspecties i where i.id = inspectie_id
    and (i.inspecteur_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.inspecties i where i.id = inspectie_id
    and (i.inspecteur_id = auth.uid() or public.is_staff())));

-- ---------- acties ----------
create type public.prio_type   as enum ('direct', 'kort', 'planmatig');
create type public.actie_status as enum ('open', 'afgerond');

create table public.acties (
  id uuid primary key default gen_random_uuid(),
  inspectie_id uuid not null references public.inspecties(id) on delete cascade,
  waarneming_id uuid references public.waarnemingen(id) on delete set null,
  omschrijving text,
  oordeel public.oordeel_type,     -- oordeel actie = oordeel regel
  actiehouder text,                -- standaard Hoofd S&M (actieregel)
  toetser text,                    -- toetser != actiehouder
  termijn date,
  prioriteit public.prio_type default 'kort',
  status public.actie_status not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.acties enable row level security;
create policy "actie via eigen/staf inspectie"
  on public.acties for all
  using (exists (select 1 from public.inspecties i where i.id = inspectie_id
    and (i.inspecteur_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.inspecties i where i.id = inspectie_id
    and (i.inspecteur_id = auth.uid() or public.is_staff())));

-- Rolwijzigingen alleen via admin/SQL, nooit via client (voorkomt escalatie).
-- Bewaartermijn/verwijdering: via scheduled job (zie AVG-checklist), niet hier.
