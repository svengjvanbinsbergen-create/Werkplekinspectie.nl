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
