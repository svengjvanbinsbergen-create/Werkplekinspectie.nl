-- =====================================================================
-- Werkplekinspectie — migratie 0008: rollen van het echte team, beheer, MFA en bewaartermijn
-- (november 2026, besluit van de producteigenaar)
--
-- Het team: twee hoofden ("Hoofd Service & Montage" en "Manager Projects", gelijke rechten), twee
-- coördinatoren, één QHSE-manager en één beheerder (applicatiebeheer). De inspecteurs zijn de hoofden en de
-- coördinatoren. Wat deze migratie vastlegt (de app spiegelt het in js/kern.js, RECHTEN):
--   1. ROL "beheerder" (nieuw): ziet alles en beheert (team en rollen, instellingen, monteurs, auditlog), maar
--      inspecteert niet, wordt niet ingepland, is nooit actiehouder en nooit toetser.
--   2. QHSE-MANAGER: ziet alles en beheert (zoals de beheerder); is NOOIT actiehouder, MAG toetser zijn
--      (eerder: ook nooit toetser); inspecteert niet.
--   3. ROL "inspecteur": blijft in de enum (compatibiliteit met bestaande rijen), maar niemand krijgt hem nog:
--      een nieuw profiel heeft GEEN rol (NULL = nog geen toegang) tot een beheerder (hoofd, QHSE-manager of
--      beheerder) een rol kiest, en via de app/API kan niemand de rol "inspecteur" toekennen.
--   4. BEHEER (is_beheer_admin): hoofd, QHSE-manager en beheerder, altijd met MFA (aal2) zodra
--      instellingen.mfa_verplicht_hoofd = true. Die instelling geldt nu voor ALLE beheerrollen; de naam blijft
--      voor compatibiliteit. Ook "alles lezen" (mag_alles_lezen) vraagt voor deze drie rollen dan aal2.
--      Niemand wijzigt zijn EIGEN rol of activering (geen zelfpromotie; een andere beheerder doet dat).
--      De laatste-hoofd-bescherming (minstens één actief hoofd) blijft, ook bij gelijktijdige wijzigingen.
--   5. MONTEURS: de lijst beheren de hoofden en de coördinatoren (is_staf) en de beheerrollen.
--   6. PLANNEN EN INSPECTEREN: alleen wie inspecteert (hoofd, coördinator, en de oude rol inspecteur) maakt
--      inspecties en planning en kan als inspecteur worden ingepland.
--   7. DASHBOARD: dashboard_cijfers voor iedereen die alles mag lezen (ook QHSE-manager en beheerder);
--      doel_conform zonder rij = standaard 85; JSON null = bewust geen doel. De app stuurt "geen doel" als
--      {"waarde": null}; PostgREST maakt daar SQL NULL van, en de trigger instellingen_doel_null zet dat om in
--      JSON null (waarde is NOT NULL). Andere sleutels blijven NULL weigeren.
--   8. VERLOOP: wat de client in actie_log schrijft, mag nooit lijken op een regel van de server (Status: …,
--      Aangemaakt met status …, Actiehouder, toetser of plandatum gewijzigd). Drie lagen (zie sectie 8):
--      verloop_tekens_ok = tekst_tekens_ok (0007) plus: ZWJ alleen tussen twee emoji; VS1–VS14 (U+FE00–FE0D) en de
--      Mongoolse variatiekiezers U+180B–180F nooit; VS15/VS16 (U+FE0E/FE0F) alleen direct na een emoji-teken (of
--      VS16 in een toetsdop 1️⃣); geen braillespatie U+2800; minstens één zichtbaar teken. Daarna vergelijkt de
--      trigger het SKELET van de tekst (NFKD, kleine letters, Cyrillische/Griekse/… lookalikes → Latijn, alleen
--      a–z: ∶ U+2236, ꞉ U+A789, spaties en leestekens tellen niet) met het begin van de serverregels. De app
--      (js/sync.js) volgt dezelfde regels en toont regels met bron 'server' herkenbaar ("automatisch").
--   9. BEWAARTERMIJN 7 jaar: public.bewaartermijn_opschonen() verwijdert inspecties, afgesloten acties
--      (Afgerond/Vervallen) en planning die ouder zijn dan 7 jaar, met hun verloop en auditregels (ook het verloop
--      van acties die al eerder zijn verwijderd), en zet de foto's die nergens meer gebruikt worden
--      klaar om via de Storage-API te verwijderen (public.bewaartermijn_fotos). Alleen voor de eigenaar
--      (postgres: SQL Editor of pg_cron), nooit vanuit de app. Zie README §4.
--  10. LAATSTE HOOFD OOK BIJ VERWIJDEREN: een BEFORE DELETE-trigger op profiles (profiles_laatste_hoofd) weigert
--      het verwijderen van het laatste actieve hoofd, ook door service_role of door het account in het
--      Supabase-dashboard te wissen (ON DELETE CASCADE vanuit auth.users). Zelfde slot als bij degraderen.
-- Vergelijkingen met rolwaarden gaan als tekst (role::text = 'beheerder'): een nieuwe enumwaarde mag in
-- dezelfde transactie nog niet als enum-constante worden gebruikt (SQL Editor draait alles in één transactie).
-- Idempotent: opnieuw draaien mag. Tests: supabase/tests/rls_test.sql, sectie 26.
-- =====================================================================

-- ---------- 1. enum: rol beheerder ----------
alter type public.user_role add value if not exists 'beheerder';

-- ---------- 3. nieuw profiel = nog geen rol ----------
alter table public.profiles alter column role drop default;
alter table public.profiles alter column role drop not null;

-- ---------- rolhelpers ----------
-- hoofd, QHSE-manager of beheerder (zonder MFA-eis; zie is_beheer_admin)
create or replace function public.is_beheer_rol()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.mijn_rol()::text in ('hoofd', 'qhse', 'beheerder'), false)
$$;

-- beheerroutes (profielen/rollen, instellingen, monteurs, auditlog): beheerrol + MFA indien verplicht
create or replace function public.is_beheer_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_beheer_rol() and public.mfa_ok()
$$;

-- leesrecht op alles: coördinator; hoofd, QHSE-manager en beheerder met MFA indien verplicht
create or replace function public.mag_alles_lezen()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case public.mijn_rol()::text
           when 'coordinator' then true
           when 'hoofd' then public.mfa_ok()
           when 'qhse' then public.mfa_ok()
           when 'beheerder' then public.mfa_ok()
           else false end
$$;

-- wie inspecteert (en dus inspecties en planning maakt): hoofd, coördinator en de oude rol inspecteur
create or replace function public.mag_inspecteren()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.mijn_rol()::text in ('hoofd', 'coordinator', 'inspecteur'), false)
$$;

-- kan deze persoon als inspecteur worden ingepland? (actief en een inspecterende rol)
create or replace function public.is_inspecterend(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p
                 where p.id = p_id and p.actief and p.role::text in ('hoofd', 'coordinator', 'inspecteur'))
$$;

-- ---------- profielen: rollen, activering en de laatste hoofd ----------
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
  if auth.uid() is not null and not public.is_beheer_admin()
     and (new.role, new.actief, new.full_name, new.functie)
         is distinct from (old.role, old.actief, old.full_name, old.functie) then
    raise exception 'Alleen een hoofd, de QHSE-manager of de beheerder (met tweestapsverificatie als die verplicht is) mag namen, functies, rollen en activering wijzigen'
      using errcode = '42501';
  end if;
  -- de oude rol "inspecteur" wordt niet meer toegekend (blijft alleen voor bestaande rijen)
  if auth.uid() is not null and new.role::text = 'inspecteur' and new.role is distinct from old.role then
    raise exception 'De rol inspecteur wordt niet meer toegekend; kies hoofd, coördinator, QHSE-manager of beheerder'
      using errcode = '23514';
  end if;
  -- QHSE-manager en beheerder zijn nooit actiehouder; de beheerder is ook nooit toetser. Wie dat nu is bij een
  -- lopende actie, krijgt die rol pas als die acties aan een ander zijn toegewezen. (acties_controle_personen
  -- leest de rol met FOR SHARE: een gelijktijdige toewijzing wacht op deze wijziging, of omgekeerd.)
  if new.role::text in ('qhse', 'beheerder') and new.role is distinct from old.role
     and exists (select 1 from public.acties a
                 where a.houder = new.id
                   and a.status in ('Voorstel', 'Open', 'In uitvoering', 'Klaar voor toetsing')) then
    raise exception 'Deze persoon is actiehouder van lopende acties; wijs die eerst aan een ander toe (de QHSE-manager en de beheerder zijn nooit actiehouder)'
      using errcode = '23514';
  end if;
  -- alleen een hoofd of coördinator staat als inspecteur in de planning (planning_inspecteur_rol): wie een rol
  -- krijgt die niet inspecteert (QHSE-manager, beheerder, of geen rol), heeft geen openstaande planning meer
  if new.role is distinct from old.role
     and coalesce(new.role::text, '') not in ('hoofd', 'coordinator', 'inspecteur')
     and exists (select 1 from public.planning p where p.inspecteur = new.id and p.status = 'gepland') then
    raise exception 'Deze persoon staat nog als inspecteur in de planning; plan die inspecties eerst op een ander in (alleen een hoofd of coördinator inspecteert)'
      using errcode = '23514';
  end if;
  if new.role::text = 'beheerder' and new.role is distinct from old.role
     and exists (select 1 from public.acties a
                 where a.toetser = new.id
                   and a.status in ('Voorstel', 'Open', 'In uitvoering', 'Klaar voor toetsing')) then
    raise exception 'Deze persoon is toetser van lopende acties; wijs die eerst aan een ander toe (de beheerder is nooit toetser)'
      using errcode = '23514';
  end if;
  if old.role::text = 'hoofd' and old.actief and (new.role is distinct from old.role or not new.actief) then
    -- Eén tegelijk: zonder dit slot kunnen twee hoofden elkaar tegelijk degraderen
    -- en blijft er geen hoofd over. Na het slot ziet de controle hieronder (READ
    -- COMMITTED, nieuwe snapshot) de wijziging van de ander.
    perform pg_advisory_xact_lock(hashtextextended('wpi_laatste_hoofd', 0));
    if not exists (select 1 from public.profiles p
                   where p.role::text = 'hoofd' and p.actief and p.id <> old.id) then
      raise exception 'Er moet altijd minstens één actief hoofd zijn' using errcode = '23514';
    end if;
  end if;
  -- geen zelfpromotie of zelf-deactivering: een andere beheerder wijzigt jouw rol en activering
  if auth.uid() is not null and new.id = auth.uid()
     and (new.role, new.actief) is distinct from (old.role, old.actief) then
    raise exception 'Je eigen rol of activering wijzig je niet zelf; dat doet een ander hoofd, de QHSE-manager of de beheerder'
      using errcode = '42501';
  end if;
  return new;
end $$;

-- ook verwijderen laat minstens één actief hoofd over: service_role, of het account wissen in het Supabase-dashboard
-- (profiles.id → auth.users ON DELETE CASCADE), zou anders het laatste hoofd weghalen. Zelfde slot als hierboven,
-- dus ook bij gelijktijdig verwijderen en degraderen. De app zelf kan geen profielen verwijderen (geen DELETE-recht).
create or replace function public.profiles_laatste_hoofd()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role::text = 'hoofd' and old.actief then
    perform pg_advisory_xact_lock(hashtextextended('wpi_laatste_hoofd', 0));
    if not exists (select 1 from public.profiles p
                   where p.role::text = 'hoofd' and p.actief and p.id <> old.id) then
      raise exception 'Er moet altijd minstens één actief hoofd zijn; maak eerst iemand anders hoofd voordat je dit account verwijdert'
        using errcode = '23514';
    end if;
  end if;
  return old;
end $$;
drop trigger if exists profiles_laatste_hoofd on public.profiles;
create trigger profiles_laatste_hoofd before delete on public.profiles
  for each row execute function public.profiles_laatste_hoofd();

-- ---------- acties: actiehouder en toetser ----------
-- houder: bestaand, actief, met een rol, en nooit QHSE-manager of beheerder. toetser: bestaand, actief, met een
-- rol, en nooit beheerder (de QHSE-manager mag toetsen). toetser ≠ houder. De rol wordt met FOR SHARE gelezen.
create or replace function public.acties_controle_personen(
  p_houder uuid, p_toetser uuid, p_houder_nieuw boolean, p_toetser_nieuw boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_rol text;
begin
  if p_houder is not null and p_houder_nieuw then
    select p.role::text into v_rol from public.profiles p where p.id = p_houder and p.actief for share;
    if not found then
      raise exception 'Actiehouder onbekend of niet actief' using errcode = '23503';
    end if;
    if v_rol is null then
      raise exception 'Deze persoon heeft nog geen rol en kan geen actiehouder zijn' using errcode = '23514';
    end if;
    if v_rol = 'qhse' then
      raise exception 'De QHSE-manager kan geen actiehouder zijn' using errcode = '23514';
    end if;
    if v_rol = 'beheerder' then
      raise exception 'De beheerder kan geen actiehouder zijn' using errcode = '23514';
    end if;
  end if;
  if p_toetser is not null and p_toetser_nieuw then
    v_rol := null;
    select p.role::text into v_rol from public.profiles p where p.id = p_toetser and p.actief for share;
    if not found then
      raise exception 'Toetser onbekend of niet actief' using errcode = '23503';
    end if;
    if v_rol is null then
      raise exception 'Deze persoon heeft nog geen rol en kan geen toetser zijn' using errcode = '23514';
    end if;
    if v_rol = 'beheerder' then
      raise exception 'De beheerder kan geen toetser zijn' using errcode = '23514';
    end if;
  end if;
  if p_houder is not null and p_houder = p_toetser then
    raise exception 'De toetser mag niet de actiehouder zijn' using errcode = '23514';
  end if;
end $$;

-- Bij elke statuswijziging: de houder is NU geen QHSE-manager of beheerder en de toetser geen beheerder (ook
-- als ze al eerder waren gekozen). Samen met profiles_bewaak kan dat dus nooit. (Naam blijft voor compatibiliteit.)
create or replace function public.acties_geen_qhse(p_houder uuid, p_toetser uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = p_houder and p.role::text = 'qhse' for share) then
    raise exception 'De QHSE-manager kan geen actiehouder zijn' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles p where p.id = p_houder and p.role::text = 'beheerder' for share) then
    raise exception 'De beheerder kan geen actiehouder zijn' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles p where p.id = p_toetser and p.role::text = 'beheerder' for share) then
    raise exception 'De beheerder kan geen toetser zijn' using errcode = '23514';
  end if;
end $$;

-- ---------- planning: alleen een inspecterende rol als inspecteur ----------
-- Bij een echt nieuwe rij (AFTER INSERT, dus niet bij een upsert die een UPDATE wordt) en bij een andere
-- inspecteur (BEFORE UPDATE OF inspecteur). Beheer via SQL (service_role/postgres) is vrij. Het profiel wordt met
-- FOR SHARE gelezen: een gelijktijdige rolwijziging (profiles_bewaak weigert die zolang er planning openstaat)
-- wacht hierop, of omgekeerd ziet deze controle de nieuwe rol.
create or replace function public.planning_inspecteur_rol()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and (tg_op = 'INSERT' or new.inspecteur is distinct from old.inspecteur)
     and not exists (select 1 from public.profiles p
                     where p.id = new.inspecteur and p.actief
                       and p.role::text in ('hoofd', 'coordinator', 'inspecteur')
                     for share) then
    raise exception 'Alleen een hoofd of coördinator kan als inspecteur worden ingepland (de QHSE-manager en de beheerder inspecteren niet)'
      using errcode = '23514';
  end if;
  return case when tg_op = 'UPDATE' then new else null end;
end $$;

drop trigger if exists planning_inspecteur_rol_nieuw on public.planning;
create trigger planning_inspecteur_rol_nieuw after insert on public.planning
  for each row execute function public.planning_inspecteur_rol();
drop trigger if exists planning_inspecteur_rol on public.planning;
create trigger planning_inspecteur_rol before update of inspecteur on public.planning
  for each row execute function public.planning_inspecteur_rol();

-- ---------- 8. verloop: strengere tekenregel en geen nagemaakte serverregels ----------
-- Het verloop toont iedereen "wie · wat". Wat de client schrijft (bron 'client') mag niet lijken op een regel van
-- de server (bron 'server': "Status: … → …", "Aangemaakt met status …", "Actiehouder, toetser of plandatum
-- gewijzigd"). De app toont serverregels daarnaast zichtbaar anders (js/sync.js leest bron), maar de database
-- weigert nagemaakte regels zelf, in drie lagen:
--   a. verloop_tekens_ok: de tekenregel van alle vrije tekst (tekst_tekens_ok, 0007) plus, alleen voor het verloop:
--      - U+200D (zero-width joiner) alleen tussen twee emoji (zwj_alleen_emoji);
--      - variatiekiezers: U+FE00–FE0D (VS1–VS14) en de Mongoolse U+180B–180F nooit; VS15/VS16 (U+FE0E/FE0F) alleen
--        direct na een emoji-teken (❤️, 👷‍♀️), of VS16 in een toetsdop-emoji (1️⃣ = 1 VS16 U+20E3);
--      - U+2800 (braillespatie, ziet eruit als een spatie) nooit;
--      - minstens één zichtbaar teken (alleen spaties, U+00A0, U+3000, ZWJ of variatiekiezers = leeg).
--   b. verloop_skelet: het "skelet" van de tekst: NFKD (fullwidth, wiskundige en omcirkelde letters → gewone
--      letters; accenten los), kleine letters, bekende lookalikes (Cyrillisch, Grieks, Cherokee, Lisu, kleine
--      hoofdletters, 0/1/3/4/5/7/$/@/|) naar de Latijnse letter, en daarna ALLES weg wat geen a–z is (spaties,
--      leestekens, ∶ U+2236, ꞉ U+A789, accenten, onbekende tekens). "Status:", "Ѕtatus :", "S t a t u s ∶" en
--      "- Status" hebben allemaal het skelet "status…".
--   c. actie_log_stempel: een clientregel waarvan het skelet begint met "status", "aangemaaktmetstatus" of
--      "actiehoudertoetserofplandatumgewijzigd" wordt geweigerd. De app begint haar eigen regels altijd met een
--      vast woord ("Ingesteld", "Klaar voor toetsing gemeld", "Niet akkoord na toetsing", …), dus dit raakt
--      geen gewone regels; js/sync.js (logTekst) zet er in het uiterste geval "Toelichting: " voor.
-- js/sync.js (schoonLog, zichtbaar, skelet) volgt precies deze regels; supabase/tests/tekens_check.sh vergelijkt
-- elk Unicode-codepunt en de randgevallen.
create or replace function public.zwj_alleen_emoji(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or strpos(p, U&'\200D') = 0
      or regexp_replace(p,
           '[©®‼⁉™ℹ↔-↪⌚-⏿Ⓜ▪-◾☀-➿⤴⤵⬅-⭕〰〽㊗㊙\U0001F000-\U0001FAFF]️?‍(?=[©®‼⁉™ℹ↔-↪⌚-⏿Ⓜ▪-◾☀-➿⤴⤵⬅-⭕〰〽㊗㊙\U0001F000-\U0001FAFF])',
           '', 'g') !~ '‍'
$$;

create or replace function public.verloop_tekens_ok(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or (
    public.tekst_tekens_ok(p) and public.zwj_alleen_emoji(p)
    -- VS1–VS14, Mongoolse variatiekiezers, braillespatie: nooit
    and p !~ '[᠋-᠏⠀︀-︍]'
    -- VS15/VS16 alleen direct na een emoji-teken, of VS16 in een toetsdop (cijfer/#/* VS16 U+20E3)
    and regexp_replace(p,
          '[©®‼⁉™ℹ↔-↪⌚-⏿Ⓜ▪-◾☀-➿⤴⤵⬅-⭕〰〽㊗㊙\U0001F000-\U0001FAFF][︎️]|[#*0-9]️(?=⃣)',
          '', 'g') !~ '[︎️]'
    -- minstens één zichtbaar teken
    and p ~ '[^\u0009-\u000D \u0085   -     　⠀‍᠋-᠏︀-️]')
$$;

-- skelet voor de vergelijking met de serverregels (zie b. hierboven); de lookalikes staan als paren (van → naar)
create or replace function public.verloop_skelet(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(translate(lower(normalize(p, NFKD)),
    '@431|05$7'
    || U&'\0430\0410\03B1\0391\0251\1D00\A4EE\13AA\AB7A'            -- a
    || U&'\0441\0421\03F2\03F9\1D04\A4DA\13DF\ABAF'                 -- c
    || U&'\0501\A4D3\13A0\AB70\1D05'                                -- d
    || U&'\0435\0415\03B5\0395\04BD\1D07\A4F0\13AC\AB7C'            -- e
    || U&'\A4DD'                                                    -- f
    || U&'\0261\0581\0262\A4D6\13C0\AB90'                           -- g
    || U&'\04BB\04BA\043D\041D\03B7\0397\029C\A4E7\13BB\AB8B'       -- h
    || U&'\0456\0406\03B9\0399\0131\026A\A4F2\13A5\AB75'            -- i
    || U&'\0458\0408\03F3\A4D9\13AB\AB7B'                           -- j
    || U&'\043A\041A\03BA\039A\1D0B\A4D7\13E6\ABB6'                 -- k
    || U&'\04CF\04C0\029F\A4E1\13DE\ABAE'                           -- l
    || U&'\043C\041C\03BC\039C\1D0D\A4DF\13B7\AB87'                 -- m
    || U&'\0578\03BD\039D\0274\A4E0'                                -- n
    || U&'\043E\041E\03BF\039F\0585\1D0F\A4F3\13BE\AB8E'            -- o
    || U&'\0440\0420\03C1\03A1\1D18\A4D1\13E2\ABB2'                 -- p
    || U&'\0280\A4E3\13D2\ABA2'                                     -- r
    || U&'\0455\0405\A731\A4E2\13DA\AB9A'                           -- s
    || U&'\0442\0422\03C4\03A4\1D1B\A4D4\13A2\AB72'                 -- t
    || U&'\03C5\03A5\057D\1D1C\A4F4\028B\0443\0423\AB4E\028A'           -- u
    || U&'\051D\051C\1D21\A4EA\13B3\AB83'                           -- w
    || U&'\1D22\A4DC\03B6\0396\13C3\AB93',                          -- z
    'aaeiiosst' || 'aaaaaaaaa' || 'cccccccc' || 'ddddd' || 'eeeeeeeee' || 'f' || 'gggggg' || 'hhhhhhhhhh'
    || 'iiiiiiiii' || 'jjjjjj' || 'kkkkkkkk' || 'llllll' || 'mmmmmmmm' || 'nnnnn' || 'ooooooooo' || 'pppppppp'
    || 'rrrr' || 'ssssss' || 'tttttttt' || 'uuuuuuuuuu' || 'wwwwww' || 'zzzzzz'), '[^a-z]', '', 'g')
$$;

create or replace function public.verloop_lijkt_serverregel(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select coalesce(public.verloop_skelet(p) ~ '^(status|aangemaaktmetstatus|actiehoudertoetserofplandatumgewijzigd)', false)
$$;

create or replace function public.actie_log_stempel()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- id altijd uit de reeks: een zelfgekozen id zou het volgende id van een ander
  -- "claimen" en diens opslaan (ook de statusregels van de server) laten mislukken.
  new.id := nextval('public.actie_log_id_seq'::regclass);
  new.t := now();
  if auth.uid() is not null then
    new.wie := auth.uid();
  end if;
  if current_user in ('authenticated', 'anon') then
    new.bron := 'client';
    -- a. tekenregel van het verloop (verloop_tekens_ok): precies wat js/sync.js (schoonLog/zichtbaar) vóór het
    --    versturen weghaalt of overslaat
    if not public.verloop_tekens_ok(new.wat) then
      raise exception 'Het verloop mag geen onzichtbare of besturingstekens bevatten (en niet leeg zijn)' using errcode = '22023';
    end if;
    -- b/c. geen regel die op een serverregel lijkt (skelet: lookalikes, spaties en leestekens tellen niet)
    if public.verloop_lijkt_serverregel(new.wat) then
      raise exception 'Statusregels schrijft alleen de server; voeg een toelichting toe' using errcode = '42501';
    end if;
    if new.t_client is not null
       and (new.t_client > now() + interval '5 minutes' or new.t_client < now() - interval '30 days') then
      new.t_client := null;
    end if;
  end if;
  return new;
end $$;
-- en als CHECK (NOT VALID: bestaande regels blijven, nieuwe worden gekeurd; ook voor beheer via SQL)
alter table public.actie_log drop constraint if exists actie_log_wat_tekens;
alter table public.actie_log add constraint actie_log_wat_tekens
  check (public.verloop_tekens_ok(wat)) not valid;

-- ---------- 7. dashboard voor iedereen die alles mag lezen; doel standaard 85 ----------
create or replace function public.dashboard_cijfers(p_van date default null, p_tot date default null)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_uit jsonb;
begin
  if not public.mag_alles_lezen() then
    raise exception 'Het dashboard is alleen voor de coördinatoren, de hoofden, de QHSE-manager en de beheerder (met tweestapsverificatie als die verplicht is)'
      using errcode = '42501';
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
    -- geen rij = standaard 85 (zoals de app); een rij met JSON null = bewust geen doel (de app stuurt null; zie
    -- instellingen_doel_null)
    'doel_conform', coalesce((select s.waarde from public.instellingen s where s.sleutel = 'doel_conform'), '85'::jsonb),
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

-- ---------- RLS: policies die een rol noemen ----------
-- profielen: leden zien actieve en uitgenodigde collega's; de beheerrollen alles; ieder actief profiel zijn
-- eigen rij (ook nog zonder rol: dan kan de app "nog geen rol" zeggen in plaats van "niet actief").
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using ((public.is_lid() and (actief or uitgenodigd or id = (select auth.uid()) or public.is_beheer_admin()))
         or (id = (select auth.uid()) and actief));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_beheer_admin())
  with check (public.is_beheer_admin());

-- monteurs: hoofden en coördinatoren (is_staf) en de beheerrollen
drop policy if exists monteurs_insert on public.monteurs;
create policy monteurs_insert on public.monteurs for insert to authenticated
  with check (public.is_staf() or public.is_beheer_admin());
drop policy if exists monteurs_update on public.monteurs;
create policy monteurs_update on public.monteurs for update to authenticated
  using (public.is_staf() or public.is_beheer_admin()) with check (public.is_staf() or public.is_beheer_admin());
drop policy if exists monteurs_delete on public.monteurs;
create policy monteurs_delete on public.monteurs for delete to authenticated
  using (public.is_staf() or public.is_beheer_admin());

-- instellingen: de beheerrollen
drop policy if exists instellingen_insert on public.instellingen;
create policy instellingen_insert on public.instellingen for insert to authenticated
  with check (public.is_beheer_admin());
drop policy if exists instellingen_update on public.instellingen;
create policy instellingen_update on public.instellingen for update to authenticated
  using (public.is_beheer_admin()) with check (public.is_beheer_admin());
drop policy if exists instellingen_delete on public.instellingen;
create policy instellingen_delete on public.instellingen for delete to authenticated
  using (public.is_beheer_admin());

-- "geen doel": de app stuurt {"sleutel":"doel_conform","waarde":null}. PostgREST (json_populate_recordset)
-- maakt van een JSON null in de body SQL NULL, en waarde is NOT NULL. Deze BEFORE-trigger (vóór de NOT NULL-
-- controle; ook de EXCLUDED-rij van een upsert loopt erdoor) maakt er JSON null van, alleen voor doel_conform.
create or replace function public.instellingen_doel_null()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.waarde is null and new.sleutel = 'doel_conform' then
    new.waarde := 'null'::jsonb;
  end if;
  return new;
end $$;
drop trigger if exists instellingen_doel_null on public.instellingen;
create trigger instellingen_doel_null before insert or update on public.instellingen
  for each row execute function public.instellingen_doel_null();

-- inspecties maken: alleen wie inspecteert
drop policy if exists inspecties_insert on public.inspecties;
create policy inspecties_insert on public.inspecties for insert to authenticated
  with check (public.is_lid() and public.mag_inspecteren() and inspecteur_id = (select auth.uid()));

-- planning maken, wijzigen en weghalen: alleen wie inspecteert (QHSE-manager en beheerder lezen alleen)
drop policy if exists planning_insert on public.planning;
create policy planning_insert on public.planning for insert to authenticated
  with check (public.is_lid() and public.mag_inspecteren());
drop policy if exists planning_update on public.planning;
create policy planning_update on public.planning for update to authenticated
  using (public.is_lid() and public.mag_inspecteren()
         and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid()) or public.is_staf()))
  with check (public.is_lid() and public.mag_inspecteren());
drop policy if exists planning_delete on public.planning;
create policy planning_delete on public.planning for delete to authenticated
  using (public.is_lid() and public.mag_inspecteren()
         and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid()) or public.is_staf()));

-- auditlog en beveiligingsgebeurtenissen: de beheerrollen lezen
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_beheer_admin());
drop policy if exists security_events_select on public.security_events;
create policy security_events_select on public.security_events for select to authenticated
  using (public.is_beheer_admin());

-- ---------- monteur aanmelden tijdens een inspectie: alleen wie inspecteert ----------
-- Dezelfde regel als de monteurs-policies: wie inspecteert (hoofd, coördinator, oude rol inspecteur), en een
-- beheerrol (het hoofd) alleen met MFA als die verplicht is. De QHSE-manager en de beheerder inspecteren niet en
-- beheren de lijst via de tabel (met MFA); via deze RPC konden ze eerder zonder MFA namen toevoegen en weer
-- actief maken. Verder gelijk aan 0006.
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
  if not public.mag_inspecteren() then
    raise exception 'Alleen wie inspecteert (een hoofd of coördinator) voegt tijdens een inspectie een monteur toe; de lijst beheer je in Beheer'
      using errcode = '42501';
  end if;
  if public.is_beheer_rol() and not public.mfa_ok() then
    raise exception 'Log in met tweestapsverificatie om een monteur toe te voegen' using errcode = '42501';
  end if;
  if char_length(v_naam) not between 1 and 120 then
    raise exception 'Vul een naam in van 1 tot 120 tekens' using errcode = '22023';
  end if;
  if not public.naam_tekens_ok(v_naam) or char_length(public.naam_sleutel(v_naam)) = 0 then
    raise exception 'De naam bevat onzichtbare of ongeldige tekens' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || v_uid::text, 0));
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
revoke execute on function public.monteur_aanmelden(text) from public, anon;
grant execute on function public.monteur_aanmelden(text) to authenticated;

-- ---------- 9. bewaartermijn: 7 jaar ----------
-- Foto's van verwijderde records die nergens anders meer worden gebruikt. Een rij in storage.objects mag je in
-- Supabase niet met SQL weghalen (het bestand blijft dan staan); verwijder deze paden via de Storage-API en haal
-- ze daarna hier weg (README §4). Alleen de eigenaar (postgres) leest en schrijft deze tabel.
create table if not exists public.bewaartermijn_fotos (
  pad   text primary key,
  sinds timestamptz not null default now(),
  constraint bewaartermijn_fotos_pad_vorm check (
    pad ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$')
);
alter table public.bewaartermijn_fotos enable row level security;
revoke all on public.bewaartermijn_fotos from public, anon, authenticated, service_role;

-- Verwijdert wat ouder is dan p_jaren (minstens 7):
--   inspecties   opgeslagen vóór de grens
--   acties       afgesloten (Afgerond of Vervallen) én laatst gewijzigd (updated_at) vóór de grens; een actie die
--                nog loopt (Voorstel, Open, In uitvoering, Klaar voor toetsing) wordt dus nooit stil weggehaald,
--                hoe oud ook (die moet eerst worden afgerond of vervallen verklaard)
--   planning     datum vóór de grens
--   verloop      actie_log van die acties, én verloopregels ouder dan de grens van acties die niet meer bestaan
--                (een hoofd heeft de actie eerder verwijderd; het verloop bleef toen bewust staan); auditlog van die records (anders blijft de inhoud daar 7 jaar langer
--                staan) en alle auditregels ouder dan de grens; security_events ouder dan p_logs_maanden
--   foto's       paden uit die acties en inspecties die geen enkel overblijvend record nog gebruikt →
--                public.bewaartermijn_fotos (daarna via de Storage-API verwijderen)
-- p_proef = true: alleen tellen, niets verwijderen. Uitvoer: jsonb met aantallen en de foto's.
-- Alleen de eigenaar (postgres) mag dit uitvoeren: in de SQL Editor of als pg_cron-taak (README §4). Gebruikt de
-- onderhoudsmodus van de append-only logs (wpi.onderhoud, 0004) alleen binnen deze transactie.
create or replace function public.bewaartermijn_opschonen(p_jaren integer default 7, p_proef boolean default false,
                                                          p_logs_maanden integer default 12)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_grens timestamptz;
  v_ins   text[];
  v_act   text[];
  v_pl    text[];
  v_fotos text[];
  n_log   bigint := 0;
  n_audit bigint := 0;
  n_sec   bigint := 0;
begin
  if auth.uid() is not null then
    raise exception 'Bewaartermijn-onderhoud draait alleen als eigenaar (SQL Editor of pg_cron), niet vanuit de app'
      using errcode = '42501';
  end if;
  if p_jaren is null or p_jaren < 7 then
    raise exception 'De bewaartermijn is minstens 7 jaar' using errcode = '22023';
  end if;
  if p_logs_maanden is null or p_logs_maanden < 12 then
    raise exception 'Beveiligingsgebeurtenissen blijven minstens 12 maanden' using errcode = '22023';
  end if;
  v_grens := now() - make_interval(years => p_jaren);
  select coalesce(array_agg(i.id), '{}') into v_ins from public.inspecties i where i.opgeslagen < v_grens;
  select coalesce(array_agg(a.id), '{}') into v_act from public.acties a
   where a.updated_at < v_grens and a.status::text in ('Afgerond', 'Vervallen');
  select coalesce(array_agg(p.id), '{}') into v_pl from public.planning p
   where p.datum < (v_grens at time zone 'Europe/Amsterdam')::date;
  -- foto's van wat weggaat, behalve als een overblijvend record hetzelfde pad gebruikt (zelfde inhoud = zelfde pad)
  with kand as (
    select regexp_replace(x.pad, '^fotos/', '') as pad from (
      select unnest(array[a.foto_pad, a.nafoto_pad]) as pad from public.acties a where a.id = any(v_act)
      union all
      select m[1] from public.inspecties i,
             regexp_matches(i.record::text,
               '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp))',
               'gi') m
       where i.id = any(v_ins)
    ) x where x.pad is not null
  )
  select coalesce(array_agg(distinct k.pad order by k.pad), '{}') into v_fotos from kand k
   where not exists (select 1 from public.acties a
                     where not (a.id = any(v_act))
                       and (a.foto_pad in (k.pad, 'fotos/' || k.pad) or a.nafoto_pad in (k.pad, 'fotos/' || k.pad)))
     and not exists (select 1 from public.inspecties i
                     where not (i.id = any(v_ins)) and strpos(i.record::text, k.pad) > 0);
  if not p_proef then
    perform set_config('wpi.onderhoud', 'aan', true);
    delete from public.planning p where p.id = any(v_pl);
    delete from public.acties a where a.id = any(v_act);
    delete from public.inspecties i where i.id = any(v_ins);
    delete from public.actie_log l
     where l.actie_id = any(v_act)
        or (l.t < v_grens and not exists (select 1 from public.acties a where a.id = l.actie_id));
    get diagnostics n_log = row_count;
    delete from public.audit_log l
     where l.t < v_grens
        or (l.tabel = 'inspecties' and l.record_id = any(v_ins))
        or (l.tabel = 'acties' and l.record_id = any(v_act))
        or (l.tabel = 'planning' and l.record_id = any(v_pl));
    get diagnostics n_audit = row_count;
    delete from public.security_events s where s.t < now() - make_interval(months => p_logs_maanden);
    get diagnostics n_sec = row_count;
    insert into public.bewaartermijn_fotos (pad) select unnest(v_fotos) on conflict (pad) do nothing;
    perform set_config('wpi.onderhoud', '', true);
  end if;
  return jsonb_build_object('proef', p_proef, 'grens', v_grens,
    'inspecties', cardinality(v_ins), 'acties', cardinality(v_act), 'planning', cardinality(v_pl),
    'actie_log', n_log, 'audit_log', n_audit, 'security_events', n_sec,
    'fotos', to_jsonb(v_fotos));
end $$;

-- ---------- rechten ----------
revoke execute on function public.is_beheer_rol(), public.is_beheer_admin(), public.mag_inspecteren(),
  public.is_inspecterend(uuid) from public, anon;
grant execute on function public.is_beheer_rol(), public.is_beheer_admin(), public.mag_inspecteren(),
  public.is_inspecterend(uuid), public.mag_alles_lezen() to authenticated;
-- tekenregel van het verloop: de CHECK actie_log_wat_tekens draait met de rechten van wie schrijft
revoke execute on function public.zwj_alleen_emoji(text), public.verloop_tekens_ok(text), public.verloop_skelet(text),
  public.verloop_lijkt_serverregel(text) from public, anon;
grant execute on function public.zwj_alleen_emoji(text), public.verloop_tekens_ok(text), public.verloop_skelet(text),
  public.verloop_lijkt_serverregel(text) to authenticated, service_role;
revoke execute on function public.planning_inspecteur_rol(), public.profiles_bewaak(), public.actie_log_stempel(),
  public.profiles_laatste_hoofd(),
  public.instellingen_doel_null(),
  public.acties_controle_personen(uuid, uuid, boolean, boolean), public.acties_geen_qhse(uuid, uuid)
  from public, anon, authenticated;
-- alleen de eigenaar (postgres, ook als pg_cron-taak): nooit de app, nooit service_role
revoke execute on function public.bewaartermijn_opschonen(integer, boolean, integer)
  from public, anon, authenticated, service_role;
