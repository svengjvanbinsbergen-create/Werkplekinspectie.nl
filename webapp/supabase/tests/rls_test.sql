-- =====================================================================
-- Werkplekinspectie — RLS-, validatie- en audittests
-- Draait tegen een LOKALE PostgreSQL met tests/supabase_emulatie.sql +
-- schema.sql (zie tests/run.sh). Per rol worden de JWT-claims gezet en
-- de databaserol gewisseld, precies zoals PostgREST dat per request doet:
--   set local role authenticated; set_config('request.jwt.claims', '{"sub":...}')
-- NIET in productie draaien (maakt testgebruikers aan).
-- =====================================================================
\set ON_ERROR_STOP 1
\pset pager off

-- ---------- testhulpmiddelen (security invoker: draaien als de actieve rol) ----------
drop schema if exists tests cascade;
create schema tests;
create table tests.resultaat (nr serial primary key, naam text not null, ok boolean not null, detail text);
create table tests.gebruiker (code text primary key, id uuid not null);

create function tests.als(p_code text, p_aal text default 'aal1') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select g.id from tests.gebruiker g where g.code = p_code),
                      'role', 'authenticated', 'aal', p_aal)::text, false);
end $$;

-- statement moet slagen
create function tests.lukt(p_naam text, p_sql text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    insert into tests.resultaat (naam, ok, detail) values (p_naam, false, 'onverwachte fout: ' || sqlerrm);
    return;
  end;
  insert into tests.resultaat (naam, ok, detail) values (p_naam, true, null);
end $$;

-- statement moet falen (optioneel met een herkenbare foutmelding)
create function tests.faalt(p_naam text, p_sql text, p_patroon text default null) returns void
language plpgsql as $$
declare v_fout text;
begin
  begin
    execute p_sql;
  exception when others then
    v_fout := sqlerrm;
  end;
  if v_fout is null then
    insert into tests.resultaat (naam, ok, detail) values (p_naam, false, 'GEEN fout, maar die werd verwacht');
  elsif p_patroon is not null and v_fout not ilike p_patroon then
    insert into tests.resultaat (naam, ok, detail) values (p_naam, false, 'andere fout: ' || v_fout);
  else
    insert into tests.resultaat (naam, ok, detail) values (p_naam, true, 'geweigerd: ' || v_fout);
  end if;
end $$;

-- SELECT moet precies n rijen opleveren
create function tests.telt(p_naam text, p_sql text, p_verwacht bigint) returns void
language plpgsql as $$
declare v_n bigint;
begin
  begin
    execute format('select count(*) from (%s) q', p_sql) into v_n;
  exception when others then
    insert into tests.resultaat (naam, ok, detail) values (p_naam, false, 'fout: ' || sqlerrm);
    return;
  end;
  insert into tests.resultaat (naam, ok, detail)
  values (p_naam, v_n = p_verwacht, format('%s rijen (verwacht %s)', v_n, p_verwacht));
end $$;

-- UPDATE/DELETE (of SELECT met een schrijvende WITH) moet precies n rijen raken/geven
create function tests.raakt(p_naam text, p_sql text, p_verwacht bigint) returns void
language plpgsql as $$
declare v_n bigint;
begin
  begin
    execute p_sql;
    get diagnostics v_n = row_count;
  exception when others then
    insert into tests.resultaat (naam, ok, detail) values (p_naam, false, 'fout: ' || sqlerrm);
    return;
  end;
  insert into tests.resultaat (naam, ok, detail)
  values (p_naam, v_n = p_verwacht, format('%s rijen geraakt (verwacht %s)', v_n, p_verwacht));
end $$;

-- losse bewering
create function tests.klopt(p_naam text, p_waar boolean, p_detail text default null) returns void
language plpgsql as $$
begin
  insert into tests.resultaat (naam, ok, detail) values (p_naam, coalesce(p_waar, false), p_detail);
end $$;

-- Records van de testinspecties. Een actie uit een inspectie moet bij een waarneming in het
-- VASTGELEGDE record horen (waarnemingen[].actie.actie_id, zoals inspectie.js het vastlegt),
-- dus staan alle waarnemingen met hun actie-id hier al bij het aanmaken.
create table tests.rec (id text primary key, record jsonb not null);
insert into tests.rec values
  ('WPI-1', '{"waarnemingen":[{"oordeel":"C"},
     {"oordeel":"A","tekst":"Gasmeter hing boven","actie":{"actie_id":"ACT-1","prio":"kort"}},
     {"oordeel":"V","actie":{"actie_id":"ACT-2"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-3"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-g","terPlaatse":"gecorrigeerd"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-g2","terPlaatse":"gecorrigeerd"}}],"gesprek":"ok"}'),
  ('WPI-2', '{"waarnemingen":[{"oordeel":"C"},{"oordeel":"C"},{"oordeel":"C"},{"oordeel":"C"},
     {"oordeel":"A","tekst":" Draaiende as onafgeschermd\n","actie":{"actie_id":"ACT-21"}},
     {"oordeel":"V","tekst":"Bordes zonder leuning","actie":{"actie_id":"ACT-p1","prio":"direct"}}]}'),
  ('WPI-11', '{"waarnemingen":[
     {"oordeel":"A","foto":"a0000000-0000-4000-a000-000000000011/voor.jpg","tekst":"Put stond open zonder afzetting",
      "actie":{"actie_id":"ACT-11","prio":"kort"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-r1"}},
     {"oordeel":"V","actie":{"actie_id":"ACT-r1b"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-r1c","terPlaatse":"gecorrigeerd"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-r2"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-r3"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-c1"}},
     {"oordeel":"V","actie":{"actie_id":"ACT-c2"}},
     {"oordeel":"A","actie":{"actie_id":"ACT-c3"}}]}'),
  ('WPI-m', '{"waarnemingen":[
     {"oordeel":"A","tekst":"Steiger zonder leuning","actie":{"actie_id":"ACT-m1","prio":"direct"}},
     {"oordeel":"V","tekst":"Kabel over looppad","actie":{"actie_id":"ACT-m2","prio":"planmatig"}},
     {"oordeel":"A","tekst":"Afzetting weg","actie":{"actie_id":"ACT-m3","prio":"kort"}},
     {"oordeel":"A","tekst":"Gat niet afgedekt","actie":{"actie_id":"ACT-m4","prio":"kort","terPlaatse":"maatregel"}},
     {"oordeel":"C","tekst":"Netjes","actie":{"actie_id":"ACT-m5"}}]}');
create function tests.rec(p_id text) returns jsonb language sql stable as $$
  select r.record from tests.rec r where r.id = p_id
$$;
grant select on tests.rec to anon, authenticated, service_role;

grant usage on schema tests to anon, authenticated, service_role;
grant select, insert on tests.resultaat to anon, authenticated, service_role;
grant select on tests.gebruiker to anon, authenticated, service_role;
grant usage on sequence tests.resultaat_nr_seq to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------- testgebruikers (via auth.users => trigger maakt profielen) ----------
insert into tests.gebruiker values
  ('H',  'b0000000-0000-4000-a000-000000000001'),  -- Björn Sloos, hoofd
  ('W',  'c0000000-0000-4000-a000-000000000002'),  -- Winfred Loerts, coordinator
  ('D',  'c0000000-0000-4000-a000-000000000003'),  -- Douwe de Boer, coordinator
  ('I1', 'a0000000-0000-4000-a000-000000000011'),  -- inspecteur 1
  ('I2', 'a0000000-0000-4000-a000-000000000012'),  -- inspecteur 2
  ('Q',  'd0000000-0000-4000-a000-000000000021'),  -- QHSE-manager
  ('X',  'e0000000-0000-4000-a000-000000000031'),  -- inactief account
  ('N',  'f0000000-0000-4000-a000-000000000041');  -- nieuw, probeert rol via metadata

-- alle vaste testgebruikers zijn uitgenodigd (invited_at); N meldt zich zelf aan
insert into auth.users (id, email, raw_user_meta_data, invited_at) values
  ('b0000000-0000-4000-a000-000000000001', 'hoofd@test.invalid',  '{"full_name":"Björn Sloos"}', now()),
  ('c0000000-0000-4000-a000-000000000002', 'coord1@test.invalid', '{"full_name":"Winfred Loerts"}', now()),
  ('c0000000-0000-4000-a000-000000000003', 'coord2@test.invalid', '{"full_name":"Douwe de Boer"}', now()),
  ('a0000000-0000-4000-a000-000000000011', 'insp1@test.invalid',  '{"full_name":"Inspecteur Een"}', now()),
  ('a0000000-0000-4000-a000-000000000012', 'insp2@test.invalid',  '{"full_name":"Inspecteur Twee"}', now()),
  ('d0000000-0000-4000-a000-000000000021', 'qhse@test.invalid',   '{"full_name":"QHSE Manager"}', now()),
  ('e0000000-0000-4000-a000-000000000031', 'oud@test.invalid',    '{"full_name":"Oud Account"}', now()),
  ('f0000000-0000-4000-a000-000000000041', 'nieuw@test.invalid',  '{"full_name":"Nieuw","role":"hoofd"}', null);

-- rollen voor de vaste gebruikers via seed.sql (koppelt op e-mailadres van
-- uitgenodigde accounts; run.sh vult de testadressen in via -v seed=…)
\i :seed
create temp table seed_monteurs as select count(*) as n from public.monteurs;
grant select on seed_monteurs to authenticated;
-- fictieve monteurs alleen voor de tests (niet in seed.sql: geen voorbeelddata op de server)
\ir testdata.sql
update public.profiles set role = 'qhse' where id = 'd0000000-0000-4000-a000-000000000021';
update public.profiles set actief = false where id = 'e0000000-0000-4000-a000-000000000031';
-- I1/I2 hebben de OUDE rol inspecteur: de app kent hem niet meer en niemand kan hem nog toekennen (0008), maar
-- de database ondersteunt bestaande rijen nog. Zo blijven de regels voor een lid zonder staf-rechten getoetst.
-- (Een nieuw profiel heeft sinds 0008 geen rol: zonder deze regel hadden I1/I2 geen toegang.)
update public.profiles set role = 'inspecteur' where id in ('a0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000012');

-- psql-macro's: rol wisselen zoals PostgREST
\set ANON 'reset role; select set_config(''request.jwt.claims'', '''', false) is null; set role anon;'
\set H  'reset role; select tests.als(''H'');  set role authenticated;'
\set H2 'reset role; select tests.als(''H'', ''aal2''); set role authenticated;'
\set W  'reset role; select tests.als(''W'');  set role authenticated;'
\set D  'reset role; select tests.als(''D'');  set role authenticated;'
\set I1 'reset role; select tests.als(''I1''); set role authenticated;'
\set I2 'reset role; select tests.als(''I2''); set role authenticated;'
\set Q  'reset role; select tests.als(''Q'');  set role authenticated;'
\set X  'reset role; select tests.als(''X'');  set role authenticated;'
\set N  'reset role; select tests.als(''N'');  set role authenticated;'
\set SR 'reset role; select set_config(''request.jwt.claims'', ''{"role":"service_role"}'', false) is null; set role service_role;'
\set PG 'reset role; select set_config(''request.jwt.claims'', '''', false) is null;'
\o /dev/null

-- =====================================================================
-- 0. Structuur
-- =====================================================================
:PG
select tests.klopt('structuur: RLS staat aan op ELKE tabel in public',
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity));
select tests.klopt('structuur: elke SECURITY DEFINER-functie heeft een vast search_path',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosecdef
                and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')));
select tests.klopt('structuur: anon heeft geen enkel tabelrecht in public',
  not exists (select 1 from information_schema.role_table_grants
              where grantee = 'anon' and table_schema = 'public'));
select tests.klopt('structuur: anon mag geen enkele functie in public uitvoeren',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')));
select tests.klopt('structuur: authenticated heeft geen TRUNCATE op tabellen in public',
  not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r'
                and has_table_privilege('authenticated', c.oid, 'truncate')));
select tests.klopt('seed: Björn is hoofd, Winfred/Douwe coordinator',
  (select count(*) from public.profiles where (full_name, role) in
     (('Björn Sloos', 'hoofd'), ('Winfred Loerts', 'coordinator'), ('Douwe de Boer', 'coordinator'))) = 3);
select tests.klopt('seed: GEEN voorbeeldmonteurs; doel_conform = 85 (besluit producteigenaar, 0008)',
  (select n from seed_monteurs) = 0
  and (select waarde from public.instellingen where sleutel = 'doel_conform') = '85'::jsonb);
select tests.klopt('testdata: 5 fictieve monteurs (alleen lokaal)', (select count(*) from public.monteurs) = 5);
select tests.klopt('auth: rol uit user_metadata wordt genegeerd (nieuw account = nog geen rol)',
  (select role is null from public.profiles where id = 'f0000000-0000-4000-a000-000000000041'));
select tests.klopt('auth: niet-uitgenodigde aanmelding krijgt een INACTIEF profiel',
  (select not actief from public.profiles where id = 'f0000000-0000-4000-a000-000000000041'));
select tests.klopt('auth: uitgenodigde gebruikers zijn actief',
  (select bool_and(actief) from public.profiles where id <> 'f0000000-0000-4000-a000-000000000041'
     and id <> 'e0000000-0000-4000-a000-000000000031'));
select tests.klopt('storage: bucket fotos privé, 5 MB, alleen jpeg/png/webp',
  exists (select 1 from storage.buckets where id = 'fotos' and public = false
            and file_size_limit = 5242880
            and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']));

-- =====================================================================
-- 1. Anoniem (alleen anon-key, geen JWT)
-- =====================================================================
:ANON
select tests.faalt('anon: profielen lezen geweigerd', $q$select * from public.profiles$q$, '%permission denied%');
select tests.faalt('anon: inspecties lezen geweigerd', $q$select * from public.inspecties$q$, '%permission denied%');
select tests.faalt('anon: actie aanmaken geweigerd',
  $q$insert into public.acties (id, tekst) values ('ACT-anon', 'x')$q$, '%permission denied%');
select tests.faalt('anon: report_security_event geweigerd',
  $q$select public.report_security_event('test_event', '{}')$q$, '%permission denied%');
select tests.faalt('anon: dashboard_cijfers geweigerd', $q$select public.dashboard_cijfers()$q$, '%permission denied%');

-- =====================================================================
-- 2. Inspecties
-- =====================================================================
:I1
select tests.lukt('inspecteur: eigen inspectie aanmaken',
  $q$insert into public.inspecties (id, titel, code, project, record)
     values ('WPI-1', 'Damwand · RWZI Test', 'DAM', 'P26-001', tests.rec('WPI-1'))$q$);
select tests.faalt('inspecteur: inspectie op naam van een ander geweigerd',
  $q$insert into public.inspecties (id, titel, inspecteur_id) values ('WPI-x', 'x', 'a0000000-0000-4000-a000-000000000012')$q$,
  '%row-level security%');
select tests.faalt('validatie: oordeel buiten C/A/V/NVT geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-o', 'x', '{"waarnemingen":[{"oordeel":"X"}]}')$q$,
  '%Ongeldig oordeel%');
select tests.faalt('validatie: foto als data-URL in record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-f', 'x', '{"foto":"data:image/jpeg;base64,AAAA"}')$q$,
  '%Storage%');
select tests.faalt('validatie: titel langer dan 200 tekens geweigerd',
  format('insert into public.inspecties (id, titel) values (%L, %L)', 'WPI-l', repeat('x', 201)), '%titel_lengte%');
select tests.faalt('validatie: id met SQL-injectie geweigerd (id-vorm)',
  format('insert into public.inspecties (id, titel) values (%L, %L)', $i$WPI-9'; drop table public.acties; --$i$, 'x'),
  '%id_vorm%');
select tests.lukt('injectie: tekst met SQL wordt letterlijk opgeslagen (geparametriseerd)',
  format('insert into public.inspecties (id, titel, project) values (%L, %L, %L)',
         'WPI-3', $i$Robert'); DROP TABLE public.acties; --$i$, $i$' OR '1'='1$i$));
select tests.klopt('injectie: titel exact letterlijk terug en tabel acties bestaat nog',
  (select titel from public.inspecties where id = 'WPI-3') = $i$Robert'); DROP TABLE public.acties; --$i$
  and (select project from public.inspecties where id = 'WPI-3') = $i$' OR '1'='1$i$
  and to_regclass('public.acties') is not null);
select tests.lukt('inspecteur: dezelfde inspectie nogmaals upserten (herhaling na netwerkfout) lukt',
  $q$insert into public.inspecties (id, titel, code, project, record) values ('WPI-1', 'Damwand · RWZI Test', 'DAM', 'P26-001',
       tests.rec('WPI-1'))
     on conflict (id) do update set titel = excluded.titel, code = excluded.code, project = excluded.project, record = excluded.record$q$);
select tests.faalt('momentopname: gesprek achteraf wijzigen geweigerd (hele record ligt vast)',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-1', 'Damwand · RWZI Test',
       '{"waarnemingen":[{"oordeel":"C"},{"oordeel":"A"},{"oordeel":"V"}],"gesprek":"ok, aangevuld"}')
     on conflict (id) do update set titel = excluded.titel, record = excluded.record$q$, '%momentopname ligt vast%');
select tests.faalt('momentopname: titel achteraf wijzigen geweigerd',
  $q$update public.inspecties set titel = 'Damwand · RWZI Test (bijgewerkt)' where id = 'WPI-1'$q$, '%momentopname ligt vast%');
select tests.lukt('momentopname: koppeling met de planning (plan_id) mag nog',
  $q$update public.inspecties set plan_id = 'PL-1' where id = 'WPI-1'$q$);
select tests.faalt('momentopname: oordelen achteraf wijzigen geweigerd (ook voor de eigen inspecteur)',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-1', 'Damwand · RWZI Test (bijgewerkt)',
       '{"waarnemingen":[{"oordeel":"C"},{"oordeel":"C"},{"oordeel":"V"}],"gesprek":"ok"}')
     on conflict (id) do update set titel = excluded.titel, record = excluded.record$q$, '%momentopname ligt vast%');
select tests.faalt('momentopname: waarneming achteraf weghalen geweigerd',
  $q$update public.inspecties set record = '{"waarnemingen":[{"oordeel":"C"},{"oordeel":"A"}]}' where id = 'WPI-1'$q$,
  '%momentopname ligt vast%');
select tests.lukt('momentopname: opgeslagen achteraf verzetten wordt genegeerd',
  $q$update public.inspecties set opgeslagen = '2019-01-01' where id = 'WPI-1'$q$);
select tests.klopt('momentopname: opgeslagen bleef staan',
  (select opgeslagen > now() - interval '1 hour' from public.inspecties where id = 'WPI-1'));
select tests.faalt('opgeslagen: ver in het verleden (2019) geweigerd',
  $q$insert into public.inspecties (id, titel, opgeslagen) values ('WPI-oud', 'x', '2019-01-01')$q$, '%tussen 30 dagen geleden en nu%');
select tests.faalt('opgeslagen: in de toekomst (2099) geweigerd',
  $q$insert into public.inspecties (id, titel, opgeslagen) values ('WPI-toek', 'x', '2099-01-01')$q$, '%tussen 30 dagen geleden en nu%');
select tests.faalt('id-claim: inspectie-id met tijdstip ver in de toekomst geweigerd',
  format('insert into public.inspecties (id, titel) values (%L, %L)',
         'WPI-' || ((extract(epoch from now()) * 1000)::bigint + 3600000), 'x'), '%in de toekomst%');
select tests.klopt('id-claim: id met tijdstip van nu (+1 min), uit het verleden of zonder tijdstip mag',
  public.id_tijd_ok('WPI-' || ((extract(epoch from now()) * 1000)::bigint + 60000))
  and public.id_tijd_ok('ACT-' || ((extract(epoch from now()) * 1000)::bigint - 86400000) || '-3')
  and public.id_tijd_ok('WPI-1') and public.id_tijd_ok('ACT-p1')
  and not public.id_tijd_ok('ACT-' || ((extract(epoch from now()) * 1000)::bigint + 600000) || '-0')
  and not public.id_tijd_ok('PL-' || ((extract(epoch from now()) * 1000)::bigint + 600000)));

:I2
select tests.lukt('inspecteur 2: eigen inspectie aanmaken',
  $q$insert into public.inspecties (id, titel, code, record) values ('WPI-2', 'Pomp · Gemaal Test', 'POM', tests.rec('WPI-2'))$q$);

:I1
select tests.telt('inspecteur: ziet alleen eigen inspecties', $q$select * from public.inspecties$q$, 2);
select tests.telt('inspecteur: kan inspectie van een ander NIET lezen', $q$select * from public.inspecties where id = 'WPI-2'$q$, 0);
select tests.raakt('inspecteur: kan inspectie van een ander NIET wijzigen', $q$update public.inspecties set titel = 'gehackt' where id = 'WPI-2'$q$, 0);
select tests.faalt('inspecteur: upsert op inspectie van een ander geweigerd',
  $q$insert into public.inspecties (id, titel) values ('WPI-2', 'gehackt') on conflict (id) do update set titel = excluded.titel$q$,
  '%row-level security%');
select tests.raakt('inspecteur: kan eigen inspectie NIET verwijderen (alleen hoofd)', $q$delete from public.inspecties where id = 'WPI-1'$q$, 0);

:W
select tests.telt('coordinator: ziet alle inspecties', $q$select * from public.inspecties$q$, 3);
select tests.raakt('coordinator: wijzigt GEEN waarnemingen van een inspecteur', $q$update public.inspecties set titel = 'x' where id = 'WPI-1'$q$, 0);
:Q
select tests.telt('qhse: leest alle inspecties', $q$select * from public.inspecties$q$, 3);
:X
select tests.telt('inactief account: ziet geen inspecties', $q$select * from public.inspecties$q$, 0);
select tests.telt('inactief account: ziet geen profielen', $q$select * from public.profiles$q$, 0);
select tests.faalt('inactief account: kan niets aanmaken',
  $q$insert into public.inspecties (id, titel) values ('WPI-X', 'x')$q$, '%row-level security%');

-- =====================================================================
-- 3. Beheerroutes: monteurs, instellingen, profielen (alleen hoofd)
-- =====================================================================
:I1
select tests.telt('inspecteur: monteurs lezen mag', $q$select * from public.monteurs$q$, 5);
select tests.faalt('inspecteur: monteur toevoegen geweigerd',
  $q$insert into public.monteurs (naam) values ('Nep Monteur')$q$, '%row-level security%');
select tests.raakt('inspecteur: monteur wijzigen geweigerd (0 rijen)', $q$update public.monteurs set actief = false$q$, 0);
select tests.raakt('inspecteur: instellingen wijzigen geweigerd (0 rijen)',
  $q$update public.instellingen set waarde = '1' where sleutel = 'doel_conform'$q$, 0);
select tests.faalt('inspecteur: instelling toevoegen geweigerd',
  $q$insert into public.instellingen (sleutel, waarde) values ('nieuw', '1')$q$, '%row-level security%');
select tests.raakt('inspecteur: eigen rol naar hoofd zetten geweigerd (0 rijen)',
  $q$update public.profiles set role = 'hoofd' where id = auth.uid()$q$, 0);
select tests.raakt('inspecteur: eigen naam wijzigen geweigerd (alleen hoofd; geen imitatie in de kiezer)',
  $q$update public.profiles set full_name = 'Inspecteur Eén' where id = auth.uid()$q$, 0);
select tests.raakt('escalatie: inspecteur noemt zichzelf "Björn Sloos" (0 rijen, geen recht)',
  $q$update public.profiles set full_name = 'Björn Sloos', functie = 'Hoofd Service & Montage' where id = auth.uid()$q$, 0);
select tests.raakt('inspecteur: profiel van een ander wijzigen geweigerd (0 rijen)',
  $q$update public.profiles set full_name = 'x' where id = 'a0000000-0000-4000-a000-000000000012'$q$, 0);
select tests.faalt('inspecteur: profiel invoegen geweigerd',
  $q$insert into public.profiles (id, full_name) values ('f0000000-0000-4000-a000-000000000041', 'x')$q$, '%permission denied%');
:W
select tests.lukt('coordinator: monteur toevoegen en weer weghalen mag (0008: lijst van hoofden en coördinatoren)',
  $q$insert into public.monteurs (naam) values ('Nep Monteur'); delete from public.monteurs where naam = 'Nep Monteur'$q$);
select tests.raakt('coordinator: rol van een ander wijzigen geweigerd (0 rijen)',
  $q$update public.profiles set role = 'hoofd' where id = 'a0000000-0000-4000-a000-000000000011'$q$, 0);
:H
select tests.lukt('hoofd: monteur toevoegen', $q$insert into public.monteurs (naam) values ('Wim Werkelijk')$q$);
select tests.faalt('validatie: monteursnaam > 120 tekens geweigerd',
  format('insert into public.monteurs (naam) values (%L)', repeat('m', 121)), '%naam_lengte%');
select tests.lukt('hoofd: doel_conform instellen (85)',
  $q$insert into public.instellingen (sleutel, waarde) values ('doel_conform', '85')
     on conflict (sleutel) do update set waarde = excluded.waarde$q$);
select tests.faalt('instellingen: doel_conform als tekst ("abc") geweigerd',
  $q$update public.instellingen set waarde = '"abc"' where sleutel = 'doel_conform'$q$, '%waarde_geldig%');
select tests.faalt('instellingen: doel_conform 0 geweigerd', $q$update public.instellingen set waarde = '0' where sleutel = 'doel_conform'$q$, '%waarde_geldig%');
select tests.faalt('instellingen: doel_conform 101 geweigerd', $q$update public.instellingen set waarde = '101' where sleutel = 'doel_conform'$q$, '%waarde_geldig%');
select tests.faalt('instellingen: doel_conform 85.5 geweigerd', $q$update public.instellingen set waarde = '85.5' where sleutel = 'doel_conform'$q$, '%waarde_geldig%');
select tests.faalt('instellingen: onbekende sleutel geweigerd (ook voor hoofd)',
  $q$insert into public.instellingen (sleutel, waarde) values ('doel_programma', '90')$q$, '%waarde_geldig%');
select tests.faalt('instellingen: mfa_verplicht_hoofd alleen true/false',
  $q$update public.instellingen set waarde = '"ja"' where sleutel = 'mfa_verplicht_hoofd'$q$, '%waarde_geldig%');
select tests.lukt('hoofd: naam van een ander wijzigen mag (beheer)',
  $q$update public.profiles set full_name = 'Inspecteur  Eén' where id = 'a0000000-0000-4000-a000-000000000011'$q$);
select tests.klopt('profiel: naam genormaliseerd (dubbele spatie weg)',
  (select full_name from public.profiles where id = 'a0000000-0000-4000-a000-000000000011') = 'Inspecteur Eén');
select tests.faalt('profiel: dubbele naam geweigerd (ook met andere hoofdletters/accenten)',
  $q$update public.profiles set full_name = 'bjorn  SLOOS' where id = 'a0000000-0000-4000-a000-000000000012'$q$, '%profiles_naam_uniek%');
select tests.lukt('hoofd: rol wijzigen (inspecteur 2 -> coordinator)',
  $q$update public.profiles set role = 'coordinator' where id = 'a0000000-0000-4000-a000-000000000012'$q$);
select tests.faalt('hoofd: de oude rol inspecteur weer toekennen geweigerd (0008: niemand krijgt hem nog)',
  $q$update public.profiles set role = 'inspecteur' where id = 'a0000000-0000-4000-a000-000000000012'$q$, '%inspecteur wordt niet meer toegekend%');
:PG
-- (terug naar de oude rol kan alleen als eigenaar: I2 test verder de regels voor een lid zonder staf-rechten)
update public.profiles set role = 'inspecteur' where id = 'a0000000-0000-4000-a000-000000000012';
:H
select tests.faalt('hoofd: laatste actieve hoofd kan zichzelf niet degraderen',
  $q$update public.profiles set role = 'coordinator' where id = auth.uid()$q$, '%minstens één actief hoofd%');
-- MFA afdwingen voor beheerroutes
select tests.lukt('hoofd: MFA verplicht zetten', $q$update public.instellingen set waarde = 'true' where sleutel = 'mfa_verplicht_hoofd'$q$);
select tests.faalt('hoofd zonder MFA (aal1): monteur toevoegen geweigerd zodra MFA verplicht is',
  $q$insert into public.monteurs (naam) values ('Zonder Mfa')$q$, '%row-level security%');
select tests.telt('hoofd zonder MFA (aal1): auditlog niet leesbaar', $q$select * from public.audit_log$q$, 0);
select tests.telt('hoofd zonder MFA (aal1): leest NIET alle inspecties (alleen rechten van een inspecteur)',
  $q$select * from public.inspecties$q$, 0);
select tests.faalt('hoofd zonder MFA (aal1): dashboard geweigerd',
  $q$select public.dashboard_cijfers()$q$, '%alleen voor de coördinatoren%');
select tests.klopt('hoofd zonder MFA (aal1): is_staf en mag_alles_lezen zijn false',
  not public.is_staf() and not public.mag_alles_lezen());
:H2
select tests.lukt('hoofd met MFA (aal2): monteur toevoegen', $q$insert into public.monteurs (naam) values ('Met Mfa')$q$);
select tests.lukt('hoofd met MFA (aal2): MFA-plicht weer uit (testomgeving)',
  $q$update public.instellingen set waarde = 'false' where sleutel = 'mfa_verplicht_hoofd'$q$);

-- =====================================================================
-- 4. Acties: statusmodel, toetser ≠ houder, QHSE nooit houder
-- =====================================================================
:I1
select tests.lukt('actie: voorstel uit eigen inspectie aanmaken',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, ref, waarneming, prio, status)
     values ('ACT-1', 'WPI-1', 'Gasmeter meenemen naar de put', 'A', 'DAM-2.07', 'Gasmeter hing boven', 'kort', 'Voorstel')$q$);
select tests.lukt('actie: tweede voorstel (wordt vervallen)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-2', 'WPI-1', 'Kabels ophangen', 'V', 'Voorstel')$q$);
select tests.lukt('actie: derde voorstel (Open -> Klaar voor toetsing direct)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-3', 'WPI-1', 'Hekwerk sluiten', 'A', 'Voorstel')$q$);
select tests.faalt('actie: nieuwe actie al "In uitvoering" door een ander dan de houder geweigerd',
  $q$insert into public.acties (id, tekst, status, houder, toetser, plandatum)
     values ('ACT-x', 'x', 'In uitvoering', 'a0000000-0000-4000-a000-000000000012', 'c0000000-0000-4000-a000-000000000002', current_date)$q$,
  '%Alleen de actiehouder%');
select tests.lukt('actie: ter plaatse gecorrigeerd direct Afgerond met inspecteur als toetser',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status, toetser, plandatum)
     values ('ACT-g', 'WPI-1', 'Afzetting direct hersteld', 'A', 'Afgerond', auth.uid(), current_date)$q$);
select tests.faalt('actie: direct Afgerond met een ander als toetser geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status, toetser, plandatum)
     values ('ACT-g2', 'WPI-1', 'x', 'A', 'Afgerond', 'c0000000-0000-4000-a000-000000000002', current_date)$q$,
  '%ter plaatse gecorrigeerd%');
select tests.faalt('actie: koppelen aan inspectie van een ander geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, status) values ('ACT-v', 'WPI-2', 'x', 'Voorstel')$q$,
  '%alleen de inspecteur van die inspectie%');
select tests.faalt('instellen: toetser = actiehouder geweigerd',
  $q$update public.acties set status = 'Open', houder = 'a0000000-0000-4000-a000-000000000012',
       toetser = 'a0000000-0000-4000-a000-000000000012', plandatum = current_date + 14 where id = 'ACT-1'$q$,
  '%toetser%');
select tests.faalt('instellen: QHSE-manager als actiehouder geweigerd',
  $q$update public.acties set status = 'Open', houder = 'd0000000-0000-4000-a000-000000000021',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 14 where id = 'ACT-1'$q$,
  '%QHSE%');
select tests.faalt('instellen: inactief account als actiehouder geweigerd',
  $q$update public.acties set status = 'Open', houder = 'e0000000-0000-4000-a000-000000000031',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 14 where id = 'ACT-1'$q$,
  '%niet actief%');
select tests.faalt('instellen: Open zonder plandatum geweigerd',
  $q$update public.acties set status = 'Open', houder = 'a0000000-0000-4000-a000-000000000012',
       toetser = 'c0000000-0000-4000-a000-000000000003' where id = 'ACT-1'$q$,
  '%ingesteld_compleet%');
select tests.faalt('status: Voorstel -> Afgerond overslaan geweigerd',
  $q$update public.acties set status = 'Afgerond', toetser = 'c0000000-0000-4000-a000-000000000003' where id = 'ACT-1'$q$,
  '%statusovergang%');
select tests.lukt('instellen: iedereen mag instellen (inspecteur zet Voorstel -> Open)',
  $q$update public.acties set status = 'Open', houder = 'a0000000-0000-4000-a000-000000000012',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 14 where id = 'ACT-1'$q$);
select tests.faalt('validatie: oordeel van de inspecteur achteraf wijzigen geweigerd',
  $q$update public.acties set oordeel = 'C' where id = 'ACT-2'$q$, '%oordeel%');
select tests.lukt('status: Voorstel -> Vervallen', $q$update public.acties set status = 'Vervallen' where id = 'ACT-2'$q$);
select tests.lukt('instellen: ACT-3 Voorstel -> Open',
  $q$update public.acties set status = 'Open', houder = 'a0000000-0000-4000-a000-000000000011',
       toetser = 'c0000000-0000-4000-a000-000000000002', plandatum = current_date + 7 where id = 'ACT-3'$q$);
select tests.lukt('status: Open -> Klaar voor toetsing door houder (logt impliciet In uitvoering)',
  $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-3'$q$);
select tests.telt('actie_log: impliciete stap Open -> In uitvoering vastgelegd',
  $q$select * from public.actie_log where actie_id = 'ACT-3' and wat like '%Open → In uitvoering (impliciet)%'$q$, 1);
select tests.faalt('status: Vervallen -> Open geweigerd (vervallen ligt vast)',
  $q$update public.acties set status = 'Open' where id = 'ACT-2'$q$, '%ligt vast%');

:I2
select tests.telt('houder: ziet de actie waarvan hij houder is', $q$select * from public.acties where id = 'ACT-1'$q$, 1);
select tests.telt('inspecteur 2: ziet acties uit inspectie van inspecteur 1 niet (behalve als houder)',
  $q$select * from public.acties where id in ('ACT-2', 'ACT-3', 'ACT-g')$q$, 0);
select tests.faalt('status: Open -> Afgerond overslaan geweigerd',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-1'$q$, '%statusovergang%');
select tests.lukt('houder: Open -> In uitvoering', $q$update public.acties set status = 'In uitvoering' where id = 'ACT-1'$q$);
select tests.faalt('houder (geen staf): toetser vervangen geweigerd',
  $q$update public.acties set toetser = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-1'$q$, '%coördinator of het hoofd%');
select tests.faalt('status: In uitvoering -> Afgerond geweigerd',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-1'$q$, '%statusovergang%');
select tests.lukt('houder: na-foto + In uitvoering -> Klaar voor toetsing',
  $q$update public.acties set status = 'Klaar voor toetsing',
       nafoto_pad = 'a0000000-0000-4000-a000-000000000012/ACT-1-na.jpg' where id = 'ACT-1'$q$);
select tests.faalt('houder: zelf afronden geweigerd (alleen toetser)',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-1'$q$, '%Alleen de toetser%');
:W
select tests.faalt('coordinator (niet de toetser): afronden geweigerd',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-1'$q$, '%Alleen de toetser%');
:D
select tests.lukt('toetser: niet akkoord -> terug naar In uitvoering',
  $q$update public.acties set status = 'In uitvoering' where id = 'ACT-1'$q$);
select tests.lukt('toetser: reden vastleggen in actie_log (append)',
  format('insert into public.actie_log (actie_id, wat) values (%L, %L)', 'ACT-1',
         $i$Niet akkoord: hek staat nog open'); delete from public.actie_log; --$i$));
:I2
select tests.lukt('houder: opnieuw Klaar voor toetsing', $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-1'$q$);
:D
select tests.lukt('toetser: akkoord -> Afgerond via upsert (PostgREST merge-duplicates)',
  $q$insert into public.acties (id, tekst, status, houder, toetser, plandatum)
     values ('ACT-1', 'Gasmeter meenemen naar de put', 'Afgerond', 'a0000000-0000-4000-a000-000000000012',
             'c0000000-0000-4000-a000-000000000003', current_date + 14)
     on conflict (id) do update set status = excluded.status, tekst = excluded.tekst, houder = excluded.houder,
       toetser = excluded.toetser, plandatum = excluded.plandatum$q$);
select tests.klopt('afgerond: afgerond_op is door de server gezet',
  (select afgerond_op is not null from public.acties where id = 'ACT-1'));
:W
select tests.faalt('afgerond: tekst wijzigen geweigerd (ook voor staf)',
  $q$update public.acties set tekst = 'anders' where id = 'ACT-1'$q$, '%ligt vast%');
select tests.faalt('afgerond: heropenen geweigerd', $q$update public.acties set status = 'In uitvoering' where id = 'ACT-1'$q$, '%ligt vast%');
select tests.faalt('coordinator: toetser vervangen bij Klaar voor toetsing geweigerd (ligt vast)',
  $q$update public.acties set toetser = 'c0000000-0000-4000-a000-000000000003' where id = 'ACT-3'$q$, '%liggen vast%');
select tests.telt('actie_log: elke statuswijziging van ACT-1 gelogd (7 statusregels)',
  $q$select * from public.actie_log where actie_id = 'ACT-1' and (wat like 'Status:%' or wat like 'Aangemaakt%')$q$, 7);
select tests.klopt('actie_log: injectietekst letterlijk opgeslagen, log niet geleegd',
  exists (select 1 from public.actie_log where wat = $i$Niet akkoord: hek staat nog open'); delete from public.actie_log; --$i$)
  and (select count(*) from public.actie_log where actie_id = 'ACT-1') >= 8);

:I2
select tests.lukt('iedereen mag acties instellen: inspecteur maakt handmatige actie',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum, aangemaakt_door)
     values ('ACT-h', 'Opstap van de keet herstellen', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000002',
             'b0000000-0000-4000-a000-000000000001', current_date + 3, 'b0000000-0000-4000-a000-000000000001')$q$);
select tests.klopt('handmatige actie: aangemaakt_door is door de server gezet (niet te vervalsen)',
  (select aangemaakt_door from public.acties where id = 'ACT-h') = auth.uid());
select tests.faalt('handmatige actie: QHSE als houder geweigerd',
  $q$insert into public.acties (id, tekst, handmatig, status, houder, toetser, plandatum)
     values ('ACT-hq', 'x', true, 'Open', 'd0000000-0000-4000-a000-000000000021', 'b0000000-0000-4000-a000-000000000001', current_date)$q$,
  '%QHSE%');
select tests.faalt('validatie: actietekst > 2000 tekens geweigerd',
  format('insert into public.acties (id, tekst) values (%L, %L)', 'ACT-lang', repeat('t', 2001)), '%tekst_lengte%');
select tests.faalt('validatie: foto_pad buiten eigen-uid-conventie geweigerd',
  $q$insert into public.acties (id, tekst, foto_pad) values ('ACT-p', 'x', '../../etc/passwd')$q$, '%foto_pad_vorm%');

-- upsert-robuustheid: houder wordt later inactief; toetser rondt toch af via upsert
:W
select tests.lukt('upsert-robuust: coordinator stelt ACT-h4 in voor inspecteur 1',
  $q$insert into public.acties (id, tekst, handmatig, status, houder, toetser, plandatum)
     values ('ACT-h4', 'Ladder vastzetten', true, 'Open', 'a0000000-0000-4000-a000-000000000011',
             'c0000000-0000-4000-a000-000000000003', current_date + 1)$q$);
:I1
select tests.lukt('upsert-robuust: houder meldt Klaar voor toetsing',
  $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-h4'$q$);
:PG
update public.profiles set actief = false where id = 'a0000000-0000-4000-a000-000000000011';
:D
select tests.lukt('upsert-robuust: toetser rondt af via volledige upsert terwijl houder inactief is',
  $q$insert into public.acties (id, tekst, handmatig, status, houder, toetser, plandatum)
     values ('ACT-h4', 'Ladder vastzetten', true, 'Afgerond', 'a0000000-0000-4000-a000-000000000011',
             'c0000000-0000-4000-a000-000000000003', current_date + 1)
     on conflict (id) do update set status = excluded.status, tekst = excluded.tekst, handmatig = excluded.handmatig,
       houder = excluded.houder, toetser = excluded.toetser, plandatum = excluded.plandatum$q$);
select tests.faalt('nieuwe actie met inactieve houder geweigerd',
  $q$insert into public.acties (id, tekst, handmatig, status, houder, toetser, plandatum)
     values ('ACT-h5', 'x', true, 'Open', 'a0000000-0000-4000-a000-000000000011',
             'c0000000-0000-4000-a000-000000000003', current_date)$q$, '%niet actief%');
select tests.faalt('planning voor inactieve inspecteur geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-9', current_date, 'DAM', 'a0000000-0000-4000-a000-000000000011')$q$,
  '%niet actief%');
:PG
update public.profiles set actief = true where id = 'a0000000-0000-4000-a000-000000000011';

-- actie_log append-only
:I1
select tests.lukt('actie_log: notitie toevoegen met vervalste "wie" (server overschrijft)',
  $q$insert into public.actie_log (actie_id, wat, wie) values ('ACT-3', 'Notitie', 'b0000000-0000-4000-a000-000000000001')$q$);
select tests.faalt('actie_log: zelf t meesturen kan niet (kolomrecht)',
  $q$insert into public.actie_log (actie_id, wat, t) values ('ACT-3', 'Notitie', '2000-01-01')$q$, '%permission denied%');
select tests.klopt('actie_log: wie = de echte gebruiker en t = nu',
  (select wie = auth.uid() and t > now() - interval '1 hour' from public.actie_log where actie_id = 'ACT-3' and wat = 'Notitie'));
select tests.faalt('actie_log: notitie bij onzichtbare actie geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-h', 'x')$q$, '%row-level security%');
select tests.faalt('actie_log: UPDATE geweigerd', $q$update public.actie_log set wat = 'x'$q$, '%permission denied%');
select tests.faalt('actie_log: DELETE geweigerd', $q$delete from public.actie_log$q$, '%permission denied%');
select tests.faalt('acties: TRUNCATE geweigerd (omzeilt anders RLS)', $q$truncate public.acties cascade$q$, '%permission denied%');

-- =====================================================================
-- 5. Planning
-- =====================================================================
:W
select tests.lukt('coordinator: planning voor inspecteur 1 (gemaakt_door vervalst)',
  $q$insert into public.planning (id, datum, code, project, locatie, monteurs, inspecteur, gemaakt_door)
     values ('PL-1', current_date + 1, 'DAM', 'P26-168', 'RWZI Voorbeeldstad', 2,
             'a0000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000011')$q$);
select tests.klopt('planning: gemaakt_door door de server gezet',
  (select gemaakt_door from public.planning where id = 'PL-1') = auth.uid());
:I1
select tests.telt('inspecteur: ziet planning die aan hem is toegewezen', $q$select * from public.planning$q$, 1);
select tests.lukt('inspecteur: toegewezen planning als uitgevoerd markeren (upsert)',
  $q$insert into public.planning (id, datum, code, project, locatie, monteurs, inspecteur, status, inspectie_id, gemaakt_door)
     select id, datum, code, project, locatie, monteurs, inspecteur, 'uitgevoerd', 'WPI-1', gemaakt_door from public.planning where id = 'PL-1'
     on conflict (id) do update set status = excluded.status, inspectie_id = excluded.inspectie_id,
       gemaakt_door = excluded.gemaakt_door$q$);
select tests.faalt('inspecteur: uitgevoerde planning wijzigen geweigerd (ligt vast)',
  $q$update public.planning set datum = current_date + 30 where id = 'PL-1'$q$, '%ligt vast%');
select tests.faalt('inspecteur: UITGEVOERDE planning van coordinator verwijderen geeft een FOUT (geen stille 0 rijen)',
  $q$delete from public.planning where id = 'PL-1'$q$, '%uitgevoerde planning%');
select tests.lukt('inspecteur: zichzelf inplannen', $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-3', current_date + 2, 'ROO', auth.uid())$q$);
select tests.raakt('inspecteur: eigen geplande planning verwijderen', $q$delete from public.planning where id = 'PL-3'$q$, 1);
select tests.faalt('validatie: planningstatus buiten gepland/uitgevoerd geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur, status) values ('PL-4', current_date, 'ROO', auth.uid(), 'geannuleerd')$q$,
  '%status_geldig%');
:I2
select tests.telt('inspecteur 2: ziet planning van inspecteur 1 niet', $q$select * from public.planning where inspecteur <> auth.uid()$q$, 0);

-- =====================================================================
-- 6. Storage (bucket fotos)
-- =====================================================================
:I1
select tests.lukt('storage: upload in eigen map',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/WPI-1-0.jpg', auth.uid())$q$);
select tests.faalt('storage: upload in map van een ander geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000012/x.jpg')$q$, '%row-level security%');
select tests.faalt('storage: upload met .svg geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000011/x.svg')$q$, '%row-level security%');
select tests.faalt('storage: upload met .html geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000011/x.html')$q$, '%row-level security%');
select tests.faalt('storage: upload in de root van de bucket geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'x.jpg')$q$, '%row-level security%');
:I2
select tests.lukt('storage: inspecteur 2 uploadt een (nog niet gekoppelde) foto in eigen map',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000012/ACT-1-na2.jpg')$q$);
select tests.faalt('storage: de na-foto van ACT-1 is al als bewijs gekoppeld: (opnieuw) uploaden geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000012/ACT-1-na.jpg')$q$, '%row-level security%');
:PG
-- de app uploadt altijd vóór het koppelen; in deze test werd ACT-1 eerder gekoppeld, dus het object hier neerzetten
insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/ACT-1-na.jpg', 'a0000000-0000-4000-a000-000000000012');
:I2
select tests.telt('storage: inspecteur 2 ziet foto van inspecteur 1 niet', $q$select * from storage.objects where name like 'a0000000-0000-4000-a000-000000000011/%'$q$, 0);
select tests.raakt('storage: inspecteur 2 kan foto van inspecteur 1 niet verwijderen',
  $q$delete from storage.objects where name like 'a0000000-0000-4000-a000-000000000011/%'$q$, 0);
:D
select tests.telt('storage: toetser (coordinator) ziet de na-foto', $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/ACT-1-na.jpg'$q$, 1);
:I1
select tests.telt('storage: inspecteur 1 ziet na-foto van houder bij actie uit zijn inspectie',
  $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/ACT-1-na.jpg'$q$, 1);

-- =====================================================================
-- 7. Auditlog en security_events (append-only, alleen hoofd leest)
-- =====================================================================
:I1
select tests.telt('auditlog: inspecteur leest niets', $q$select * from public.audit_log$q$, 0);
select tests.faalt('auditlog: inspecteur kan niet direct invoegen',
  $q$insert into public.audit_log (tabel, actie) values ('x', 'INSERT')$q$, '%permission denied%');
select tests.lukt('security_event: melden via RPC', $q$select public.report_security_event('csp_violation', '{"directive":"script-src"}')$q$);
select tests.faalt('security_event: soort met injectie geweigerd',
  $q$select public.report_security_event($i$x'); delete from public.security_events; --$i$, '{}')$q$, '%Ongeldige soort%');
select tests.faalt('security_event: direct invoegen geweigerd',
  $q$insert into public.security_events (soort) values ('nep_event')$q$, '%permission denied%');
select tests.telt('security_event: inspecteur leest niets', $q$select * from public.security_events$q$, 0);
-- rate limit: 10 per minuut
create temp table rl (ok boolean);
select tests.lukt('security_event: 14 meldingen achter elkaar',
  $q$insert into rl select public.report_security_event('xss_poging', jsonb_build_object('n', g)) from generate_series(1, 14) g$q$);
select tests.klopt('security_event: rate limit laat er max 10 per minuut door (1 + 9 ok, 5 geweigerd)',
  (select count(*) filter (where ok) = 9 and count(*) filter (where not ok) = 5 from rl),
  (select format('%s ok, %s geweigerd', count(*) filter (where ok), count(*) filter (where not ok)) from rl));
:H
select tests.telt('auditlog: hoofd leest de auditlog', $q$select * from public.audit_log where tabel = 'acties' and record_id = 'ACT-1' and actie = 'UPDATE'$q$, 6);
select tests.klopt('auditlog: oud en nieuw als jsonb vastgelegd',
  (select bool_and(oud ->> 'status' is not null and nieuw ->> 'status' is not null)
   from public.audit_log where tabel = 'acties' and record_id = 'ACT-1' and actie = 'UPDATE'));
select tests.klopt('auditlog: wie = auth.uid() van de wijziger',
  exists (select 1 from public.audit_log where tabel = 'instellingen' and wie = auth.uid()));
select tests.telt('security_events: hoofd ziet 10 meldingen + 1 rate-limitmarkering van inspecteur 1',
  $q$select * from public.security_events where wie = 'a0000000-0000-4000-a000-000000000011'$q$, 11);
-- 3x seed (Björn/Winfred/Douwe) + QHSE + inactief + 2x oude rol inspecteur (I1/I2) + 2x hoofd + 2x upsert-robuustheidstest = 11
select tests.telt('security_events: elke rol-/activeringswijziging automatisch gelogd',
  $q$select * from public.security_events where soort = 'rol_gewijzigd'$q$, 11);
select tests.faalt('auditlog: hoofd kan niet UPDATEn', $q$update public.audit_log set tabel = 'x'$q$, '%permission denied%');
select tests.faalt('auditlog: hoofd kan niet DELETEn', $q$delete from public.audit_log$q$, '%permission denied%');
select tests.faalt('security_events: hoofd kan niet DELETEn', $q$delete from public.security_events$q$, '%permission denied%');
select tests.faalt('auditlog: TRUNCATE geweigerd', $q$truncate public.audit_log$q$, '%permission denied%');
select tests.lukt('hoofd: inspectie verwijderen (bewaartermijn)', $q$delete from public.inspecties where id = 'WPI-3'$q$);
select tests.telt('auditlog: verwijdering met oude waarde vastgelegd',
  $q$select * from public.audit_log where tabel = 'inspecties' and record_id = 'WPI-3' and actie = 'DELETE' and oud is not null$q$, 1);

:SR
select tests.faalt('service_role: auditlog UPDATE geweigerd', $q$update public.audit_log set tabel = 'x'$q$, '%permission denied%');
select tests.faalt('service_role: actie_log DELETE geweigerd', $q$delete from public.actie_log$q$, '%permission denied%');
select tests.faalt('service_role: security_events direct invoegen geweigerd',
  $q$insert into public.security_events (soort) values ('nep_event')$q$, '%permission denied%');
:PG
select tests.faalt('eigenaar (postgres): auditlog UPDATE geweigerd door trigger', $q$update public.audit_log set tabel = 'x'$q$, '%append-only%');
select tests.faalt('eigenaar (postgres): actie_log DELETE zonder onderhoudsmodus geweigerd', $q$delete from public.actie_log$q$, '%append-only%');
select tests.faalt('eigenaar (postgres): TRUNCATE security_events geweigerd', $q$truncate public.security_events$q$, '%append-only%');

-- =====================================================================
-- 8. Dashboard-RPC
-- =====================================================================
:W
select tests.klopt('dashboard: coordinator telt alle inspecties en waarnemingen',
  (select (d ->> 'inspecties')::int = 2 and (d -> 'waarnemingen' ->> 'C')::int = 5
          and (d -> 'waarnemingen' ->> 'A')::int = 5 and (d -> 'waarnemingen' ->> 'V')::int = 2
          and (d ->> 'conform_pct')::numeric = 41.7 and d ->> 'doel_conform' = '85'
   from (select public.dashboard_cijfers() d) x),
  (select public.dashboard_cijfers()::text));
:I2
select tests.faalt('dashboard: inspecteur geweigerd (dashboard alleen staf, web)', $q$select public.dashboard_cijfers()$q$, '%alleen voor de coördinatoren%');
:Q
select tests.klopt('dashboard: QHSE-manager ziet het dashboard (0008: volledige inzage)',
  (select (d ->> 'inspecties')::int = 2 and d ->> 'doel_conform' = '85' from (select public.dashboard_cijfers() d) x));
:X
select tests.faalt('dashboard: inactief account geweigerd', $q$select public.dashboard_cijfers()$q$, '%alleen voor de coördinatoren%');

-- =====================================================================
-- 9. Verwijderen door het hoofd met gekoppelde (afgeronde) acties
-- =====================================================================
:H
select tests.lukt('hoofd: inspectie met afgeronde acties verwijderen', $q$delete from public.inspecties where id = 'WPI-1'$q$);
select tests.klopt('verwijderen: acties blijven bestaan, koppeling leeg, status ongewijzigd',
  (select count(*) = 4 and bool_and(inspectie_id is null) from public.acties where id in ('ACT-1', 'ACT-2', 'ACT-3', 'ACT-g'))
  and (select status from public.acties where id = 'ACT-1') = 'Afgerond');


-- =====================================================================
-- 10. Escalatie via naam/seed en losse aanmeldingen
-- =====================================================================
:PG
-- iemand meldt zich zelf aan met de naam van het hoofd én het voorbeeldadres uit seed.sql
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-a000-000000000042', 'bjorn.sloos@VUL-IN.invalid', '{"full_name":"Björn Sloos"}');
select tests.klopt('escalatie: aanmelding als "Björn Sloos" krijgt een NEUTRALE naam (bezet geen naam), geen rol en is INACTIEF',
  (select full_name like 'Niet-uitgenodigd account f0000000%' and role is null and not actief and not uitgenodigd
   from public.profiles where id = 'f0000000-0000-4000-a000-000000000042'),
  (select full_name from public.profiles where id = 'f0000000-0000-4000-a000-000000000042'));
-- seed.sql opnieuw draaien: zowel het origineel (voorbeeldadressen) als de ingevulde versie
\ir ../seed.sql
\i :seed
select tests.klopt('escalatie: seed.sql opnieuw draaien maakt niemand anders hoofd (koppelt op e-mail + uitnodiging)',
  (select count(*) from public.profiles where role = 'hoofd') = 1
  and (select role is null from public.profiles where id = 'f0000000-0000-4000-a000-000000000042')
  and (select role from public.profiles where id = 'a0000000-0000-4000-a000-000000000011') = 'inspecteur');
-- uitnodiging zoals Supabase Auth het doet: eerst de gebruiker, daarna invited_at, in
-- DEZELFDE transactie (GoTrue invite-handler)
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-a000-000000000043', 'later@test.invalid', '{"full_name":"Later Uitgenodigd"}');
select tests.klopt('auth: zonder uitnodiging inactief', (select not actief from public.profiles where id = 'f0000000-0000-4000-a000-000000000043'));
update auth.users set invited_at = now() where id = 'f0000000-0000-4000-a000-000000000043';
commit;
select tests.klopt('auth: invited_at gezet (Invite user) => profiel actief',
  (select actief from public.profiles where id = 'f0000000-0000-4000-a000-000000000043'));
:N
select tests.telt('inactieve aanmelding: ziet geen profielen', $q$select * from public.profiles$q$, 0);
select tests.telt('inactieve aanmelding: ziet geen monteurs', $q$select * from public.monteurs$q$, 0);
select tests.telt('inactieve aanmelding: ziet geen instellingen', $q$select * from public.instellingen$q$, 0);
select tests.faalt('inactieve aanmelding: actie aanmaken geweigerd',
  $q$insert into public.acties (id, tekst) values ('ACT-n1', 'x')$q$, '%row-level security%');
select tests.faalt('inactieve aanmelding: foto uploaden geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'f0000000-0000-4000-a000-000000000041/x.jpg')$q$, '%row-level security%');

-- =====================================================================
-- 11. Foto's: geen toegang via een zelfgekozen pad (IDOR), veilige namen
-- =====================================================================
:I2
select tests.lukt('foto: inspecteur 2 uploadt een eigen foto',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/geheim.jpg', auth.uid())$q$);
:I1
select tests.telt('foto: inspecteur 1 ziet die foto niet', $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/geheim.jpg'$q$, 0);
select tests.faalt('IDOR: actie aanmaken met het pad van andermans foto geweigerd',
  $q$insert into public.acties (id, tekst, oordeel, foto_pad) values ('ACT-x1', 'x', '–', 'a0000000-0000-4000-a000-000000000012/geheim.jpg')$q$, '%zelf hebt geüpload%');
select tests.telt('IDOR: en de foto blijft onzichtbaar', $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/geheim.jpg'$q$, 0);
select tests.lukt('foto: eigen inspectie en eigen foto',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/voor.jpg', auth.uid());
     insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/na.jpg', auth.uid());
     insert into public.inspecties (id, titel, code, record) values ('WPI-11', 'Rioolpers · Test', 'ROO', tests.rec('WPI-11'))$q$);
select tests.lukt('foto: voorstel uit eigen inspectie met eigen foto',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, ref, waarneming, prio, foto_pad, status)
     values ('ACT-11', 'WPI-11', 'Afzetting plaatsen', 'A', 'ROO-1.01', 'Put stond open zonder afzetting', 'kort', 'a0000000-0000-4000-a000-000000000011/voor.jpg', 'Voorstel')$q$);
select tests.faalt('IDOR: foto_pad later vervangen door andermans foto geweigerd',
  $q$update public.acties set foto_pad = 'a0000000-0000-4000-a000-000000000012/geheim.jpg' where id = 'ACT-11'$q$, '%foto%');
select tests.faalt('storage: pad met .. geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000011/../a0000000-0000-4000-a000-000000000012/y.jpg')$q$, '%row-level security%');
select tests.faalt('storage: submap geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000011/sub/y.jpg')$q$, '%row-level security%');
select tests.faalt('storage: naam die met een punt begint geweigerd',
  $q$insert into storage.objects (bucket_id, name) values ('fotos', 'a0000000-0000-4000-a000-000000000011/.htaccess.jpg')$q$, '%row-level security%');
:W
select tests.lukt('na-foto: coordinator stelt handmatige actie in voor inspecteur 1',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-12', 'Ladder vastzetten', '–', true, 'Open', 'a0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000003', current_date + 5)$q$);
:I1
select tests.faalt('IDOR: houder koppelt andermans foto als na-foto geweigerd',
  $q$update public.acties set nafoto_pad = 'a0000000-0000-4000-a000-000000000012/geheim.jpg' where id = 'ACT-12'$q$, '%zelf hebt geüpload%');
select tests.lukt('na-foto: houder koppelt eigen na-foto en meldt klaar',
  $q$update public.acties set nafoto_pad = 'a0000000-0000-4000-a000-000000000011/na.jpg', status = 'Klaar voor toetsing' where id = 'ACT-12'$q$);
select tests.faalt('na-foto: vervangen tijdens toetsing geweigerd',
  $q$update public.acties set nafoto_pad = 'a0000000-0000-4000-a000-000000000011/voor.jpg' where id = 'ACT-12'$q$, '%hoort bij de uitvoering%');
:D
select tests.telt('na-foto: toetser ziet de na-foto', $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/na.jpg'$q$, 1);
select tests.lukt('na-foto: toetser rondt af', $q$update public.acties set status = 'Afgerond' where id = 'ACT-12'$q$);
:I1
select tests.raakt('bewijs: foto overschrijven kan niet (geen UPDATE-policy; 0 rijen)',
  $q$update storage.objects set metadata = '{"x":1}' where name = 'a0000000-0000-4000-a000-000000000011/na.jpg'$q$, 0);
select tests.raakt('bewijs: na-foto van een afgeronde actie verwijderen kan niet (0 rijen)',
  $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/na.jpg'$q$, 0);
select tests.raakt('bewijs: foto uit een inspectierecord verwijderen kan niet (0 rijen)',
  $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/voor.jpg'$q$, 0);
select tests.lukt('storage: losse (ongebruikte) eigen foto uploaden',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/los.jpg', auth.uid())$q$);
select tests.raakt('storage: ongebruikte eigen foto verwijderen mag', $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/los.jpg'$q$, 1);
:I2
select tests.telt('foto: iedereen ziet de foto van een voorstel (iedereen mag instellen)',
  $q$select * from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/voor.jpg'$q$, 1);
:H
select tests.raakt('bewijs: hoofd mag verwijderen (bewaartermijn/AVG)', $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/na.jpg'$q$, 1);

-- =====================================================================
-- 12. Functiescheiding: toetser ≠ actiehouder, ook voor coördinator/hoofd
-- =====================================================================
:W
-- A3: coordinator is houder, meldt klaar en ruilt daarna houder/toetser
select tests.lukt('A3: coordinator maakt actie met zichzelf als houder',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-a3', 'Hekwerk sluiten', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000011', current_date + 5)$q$);
select tests.lukt('A3: houder meldt klaar voor toetsing', $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-a3'$q$);
select tests.faalt('A3: houder en toetser ruilen bij Klaar voor toetsing geweigerd',
  $q$update public.acties set houder = 'a0000000-0000-4000-a000-000000000012', toetser = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-a3'$q$, '%liggen vast%');
select tests.faalt('A3: zelf afronden geweigerd', $q$update public.acties set status = 'Afgerond' where id = 'ACT-a3'$q$, '%Alleen de toetser%');
select tests.lukt('A3b: nieuwe actie, coordinator houder', $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-a3b', 'Kabels ophangen', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000011', current_date + 5)$q$);
select tests.faalt('A3b: eerder houder -> zichzelf toetser maken geweigerd (ook vóór Klaar)',
  $q$update public.acties set houder = 'a0000000-0000-4000-a000-000000000012', toetser = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-a3b'$q$, '%niet zelf aan de uitvoering%');
select tests.lukt('A3b: houder wisselen mag (staf, tijdens uitvoering)', $q$update public.acties set houder = 'a0000000-0000-4000-a000-000000000012' where id = 'ACT-a3b'$q$);
select tests.faalt('A3b: oud-houder (coordinator) daarna als toetser geweigerd',
  $q$update public.acties set toetser = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-a3b'$q$, '%niet zelf aan de uitvoering%');
select tests.lukt('QHSE-manager als toetser mag (besluit producteigenaar, 0008; nooit actiehouder)',
  $q$update public.acties set toetser = 'd0000000-0000-4000-a000-000000000021' where id = 'ACT-a3b';
     update public.acties set toetser = 'a0000000-0000-4000-a000-000000000011' where id = 'ACT-a3b'$q$);
-- A4: toetser zet zelf de uitvoeringsstappen
select tests.lukt('A4: actie met houder inspecteur 2 en toetser Douwe',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-a4', 'Opstap herstellen', '–', true, 'Open', 'a0000000-0000-4000-a000-000000000012', 'c0000000-0000-4000-a000-000000000003', current_date + 5)$q$);
:D
select tests.faalt('A4: toetser zet Open -> Klaar voor toetsing zelf: geweigerd',
  $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-a4'$q$, '%toetser voert de actie niet zelf uit%');
select tests.faalt('A4: toetser zet Open -> In uitvoering zelf: geweigerd',
  $q$update public.acties set status = 'In uitvoering' where id = 'ACT-a4'$q$, '%toetser voert de actie niet zelf uit%');
select tests.lukt('A4: toetser uploadt eigen foto', $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'c0000000-0000-4000-a000-000000000003/na.jpg', auth.uid())$q$);
select tests.faalt('A4: toetser voegt na-foto toe: geweigerd',
  $q$update public.acties set nafoto_pad = 'c0000000-0000-4000-a000-000000000003/na.jpg' where id = 'ACT-a4'$q$, '%toetser voegt geen na-foto%');
:W
select tests.lukt('A4: andere coordinator start de uitvoering namens de houder', $q$update public.acties set status = 'In uitvoering' where id = 'ACT-a4'$q$);
select tests.klopt('A4: wie een uitvoeringsstap zet, staat bij de uitvoerders',
  (select uitvoerders @> array['c0000000-0000-4000-a000-000000000002'::uuid, 'a0000000-0000-4000-a000-000000000012'::uuid] from public.acties where id = 'ACT-a4'));
:I2
select tests.lukt('A4: houder meldt klaar', $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-a4'$q$);
:D
select tests.lukt('A4: toetser (niet betrokken bij uitvoering) rondt af', $q$update public.acties set status = 'Afgerond' where id = 'ACT-a4'$q$);

-- =====================================================================
-- 13. Methode: alleen de eigen inspecteur koppelt een bevinding aan zijn inspectie
-- =====================================================================
:I1
select tests.faalt('A2: beoordeelde bevinding aan inspectie van een ander koppelen geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, status, houder, toetser, plandatum)
     values ('ACT-f1', 'WPI-2', 'x', 'V', 'verzonnen', 'Open', 'a0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000003', current_date + 3)$q$,
  '%alleen de inspecteur van die inspectie%');
select tests.faalt('A2: niet-bestaande inspectie geeft DEZELFDE melding (geen bestaanslek via FK)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-f1b', 'WPI-bestaatniet', 'x', 'V', 'Voorstel')$q$,
  '%alleen de inspecteur van die inspectie%');
select tests.faalt('methode: handmatige actie met oordeel V geweigerd (oordeel hoort bij een inspectie)',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-f3', 'x', 'V', true, 'Open', 'a0000000-0000-4000-a000-000000000012', 'c0000000-0000-4000-a000-000000000003', current_date + 3)$q$, '%hoort bij een waarneming%');
:Q
select tests.faalt('A13: QHSE koppelt bevinding aan inspectie van een ander: geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-f2', 'WPI-2', 'x', 'V', 'Voorstel')$q$,
  '%alleen de inspecteur van die inspectie%');
:W
select tests.faalt('methode: ook coordinator koppelt niets aan inspectie van een ander',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-f4', 'WPI-2', 'x', 'C', 'Voorstel')$q$,
  '%alleen de inspecteur van die inspectie%');
:I2
select tests.lukt('upsert: inspecteur 2 maakt voorstel uit eigen inspectie',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, status) values ('ACT-21', 'WPI-2', 'Pomp afschermen', 'A', 'Draaiende as onafgeschermd', 'Voorstel')$q$);
:W
select tests.lukt('upsert: coordinator stelt in met inspecteur 1 als houder',
  $q$update public.acties set status = 'Open', houder = 'a0000000-0000-4000-a000-000000000011', toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 7 where id = 'ACT-21'$q$);
:I1
select tests.lukt('upsert: houder (niet de inspecteur) upsert de volledige rij (merge-duplicates) en start',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, status, houder, toetser, plandatum)
     values ('ACT-21', 'WPI-2', 'Pomp afschermen', 'A', 'Draaiende as onafgeschermd', 'In uitvoering', 'a0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000003', current_date + 7)
     on conflict (id) do update set inspectie_id = excluded.inspectie_id, tekst = excluded.tekst, oordeel = excluded.oordeel,
       waarneming = excluded.waarneming, status = excluded.status, houder = excluded.houder, toetser = excluded.toetser,
       plandatum = excluded.plandatum$q$);

-- =====================================================================
-- 14. actie_log: geen vervalste statusregels, tijd van het toestel begrensd
-- =====================================================================
:I1
select tests.faalt('A5: client schrijft een nep-statusregel: geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-21', 'Status: Klaar voor toetsing → Afgerond')$q$, '%alleen de server%');
select tests.faalt('A5: ook in kleine letters / met spaties geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-21', '  aangemaakt met status Afgerond')$q$, '%alleen de server%');
select tests.faalt('actie_log: zelf bron meesturen kan niet (kolomrecht)',
  $q$insert into public.actie_log (actie_id, wat, bron) values ('ACT-21', 'Afscherming besteld', 'server')$q$, '%permission denied%');
select tests.lukt('actie_log: toelichting met offline tijd',
  $q$insert into public.actie_log (actie_id, wat, t_client) values ('ACT-21', 'Afscherming besteld', now() - interval '2 hours')$q$);
select tests.klopt('actie_log: bron door de server op client gezet; t_client bewaard',
  (select bron = 'client' and t_client between now() - interval '2 hours 1 minute' and now() - interval '119 minutes'
   from public.actie_log where actie_id = 'ACT-21' and wat = 'Afscherming besteld'));
select tests.lukt('actie_log: t_client in de toekomst',
  $q$insert into public.actie_log (actie_id, wat, t_client) values ('ACT-21', 'Klok loopt voor', now() + interval '1 day')$q$);
select tests.klopt('actie_log: onmogelijke t_client wordt leeg (servertijd t geldt)',
  (select t_client is null from public.actie_log where actie_id = 'ACT-21' and wat = 'Klok loopt voor'));
select tests.klopt('actie_log: statusregels van de server hebben bron server',
  (select bool_and(bron = 'server') from public.actie_log where actie_id = 'ACT-21' and (wat like 'Status:%' or wat like 'Aangemaakt%')));

-- =====================================================================
-- 15. Iedereen mag instellen; te laat = hele team
-- =====================================================================
:I2
select tests.telt('instellen: inspecteur 2 ziet het voorstel van inspecteur 1', $q$select * from public.acties where id = 'ACT-11'$q$, 1);
select tests.faalt('methode: waarneming van een ander aanpassen geweigerd',
  $q$update public.acties set waarneming = 'verzonnen' where id = 'ACT-11'$q$, '%liggen vast%');
select tests.lukt('instellen: inspecteur 2 stelt het voorstel van inspecteur 1 in (tekst aangepast)',
  $q$update public.acties set status = 'Open', tekst = 'Afzetting plaatsen en dagelijks controleren', houder = 'c0000000-0000-4000-a000-000000000002',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 10 where id = 'ACT-11'$q$);
:W
select tests.lukt('te laat: coordinator maakt actie met plandatum in het verleden',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-laat', 'Brandblusser keuren', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000003', 'b0000000-0000-4000-a000-000000000001', current_date - 3)$q$);
:I2
select tests.telt('te laat: inspecteur ziet late actie van het hele team', $q$select * from public.acties where id = 'ACT-laat'$q$, 1);
select tests.telt('te laat: inspecteur ziet ook het verloop', $q$select * from public.actie_log where actie_id = 'ACT-laat'$q$, 1);
select tests.raakt('te laat: maar kan hem niet wijzigen (0 rijen)', $q$update public.acties set tekst = 'x' where id = 'ACT-laat'$q$, 0);
select tests.telt('zichtbaarheid: afgeronde actie van een ander blijft onzichtbaar', $q$select * from public.acties where id = 'ACT-12'$q$, 0);

-- =====================================================================
-- 16. Planning zoals de app
-- =====================================================================
:I1
select tests.lukt('planning: inspecteur plant voor een ander (zoals planning.js)',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-5', current_date + 4, 'POM', 'a0000000-0000-4000-a000-000000000012')$q$);
select tests.telt('planning: maker ziet zijn planning voor een ander', $q$select * from public.planning where id = 'PL-5'$q$, 1);
:W
select tests.lukt('planning: coordinator plant inspecteur 1', $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-6', current_date + 2, 'DAM', 'a0000000-0000-4000-a000-000000000011')$q$);
:I1
select tests.lukt('planning: toegewezen inspecteur verzet de datum (Wijzig)', $q$update public.planning set datum = current_date + 5, locatie = 'Gemaal Test' where id = 'PL-6'$q$);
select tests.faalt('planning: toegewezen inspecteur geeft planning van coordinator aan een ander: geweigerd',
  $q$update public.planning set inspecteur = 'a0000000-0000-4000-a000-000000000012' where id = 'PL-6'$q$, '%mag de inspecteur wijzigen%');
select tests.raakt('planning: toegewezen inspecteur haalt geplande planning van coordinator weg (zoals planning.js)',
  $q$delete from public.planning where id = 'PL-6'$q$, 1);
:I2
select tests.raakt('planning: toegewezen (niet de maker) haalt geplande planning weg (zoals planning.js)',
  $q$delete from public.planning where id = 'PL-5'$q$, 1);
:I1
select tests.lukt('planning: maker plant opnieuw', $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-5b', current_date + 4, 'POM', 'a0000000-0000-4000-a000-000000000012')$q$);
select tests.raakt('planning: maker haalt eigen geplande planning weg', $q$delete from public.planning where id = 'PL-5b'$q$, 1);
:I2
select tests.raakt('planning: planning die je niet kunt zien raakt een DELETE niet (0 rijen, zoals altijd bij RLS)',
  $q$delete from public.planning where id = 'PL-1'$q$, 0);
select tests.faalt('planning: voorbeelddata (PL-demo1) geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-demo1', current_date, 'DAM', auth.uid())$q$, '%geen_demo%');

-- =====================================================================
-- 17. Monteurs: naam toevoegen tijdens de inspectie (RPC), uniek zoals beheer.js
-- =====================================================================
:I1
select tests.klopt('monteur: bestaande naam met andere schrijfwijze geeft de bestaande terug',
  (select r ->> 'naam' = 'Henk Voorbeeld' and (r ->> 'nieuw')::boolean = false
   from (select public.monteur_aanmelden('  henk   VOORBEELD ') r) x));
select tests.klopt('monteur: ook met accent', (select (public.monteur_aanmelden('Hénk Voorbeeld') ->> 'nieuw')::boolean = false));
select tests.klopt('monteur: nieuwe naam wordt toegevoegd (genormaliseerd)',
  (select r ->> 'naam' = 'Nieuwe Monteur' and (r ->> 'nieuw')::boolean from (select public.monteur_aanmelden(' Nieuwe  Monteur ') r) x));
select tests.faalt('monteur: lege naam geweigerd', $q$select public.monteur_aanmelden('   ')$q$, '%1 tot 120%');
select tests.faalt('monteur: direct in de tabel schrijven blijft alleen voor het hoofd',
  $q$insert into public.monteurs (naam) values ('Direct Ingevoegd')$q$, '%row-level security%');
select tests.faalt('monteur: max 20 nieuwe namen per dag per gebruiker',
  $q$select public.monteur_aanmelden('Naam ' || g) from generate_series(1, 25) g$q$, '%Te veel nieuwe namen%');
:H
select tests.faalt('monteur: hoofd voegt "HENK  VOORBEELD" toe: dubbel geweigerd',
  $q$insert into public.monteurs (naam) values ('HENK VOORBEELD')$q$, '%monteurs_naam_uniek%');
select tests.lukt('monteur: hoofd zet Kees Demo op inactief', $q$update public.monteurs set actief = false where naam = 'Kees Demo'$q$);
:I1
select tests.klopt('monteur: inactieve naam getypt in een inspectie wordt weer actief (zoals beheer.js)',
  (select (r ->> 'actief')::boolean and not (r ->> 'nieuw')::boolean and (r ->> 'heractiveerd')::boolean
          and r ->> 'naam' = 'Kees Demo'
   from (select public.monteur_aanmelden('kees demo') r) x));
select tests.klopt('monteur: Kees Demo staat weer op actief', (select actief from public.monteurs where naam = 'Kees Demo'));

-- =====================================================================
-- 18. Diversen: foto's in record, voorbeelddata
-- =====================================================================
:I1
select tests.faalt('A8: DATA:IMAGE in hoofdletters in het record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-12', 'x', '{"foto":"DATA:IMAGE/png;base64,AAAA"}')$q$, '%Storage%');
select tests.faalt('voorbeelddata: WPI-demo1 geweigerd',
  $q$insert into public.inspecties (id, titel) values ('WPI-demo1', 'x')$q$, '%geen_demo%');
select tests.faalt('voorbeelddata: ACT-demo9 geweigerd',
  $q$insert into public.acties (id, tekst, oordeel) values ('ACT-demo9', 'x', '–')$q$, '%geen_demo%');

-- =====================================================================
-- 19. Offline akkoord: tijdstip van het toestel, begrensd door de server
-- =====================================================================
:W
select tests.lukt('offline: twee acties voor inspecteur 1, toetser Douwe',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum) values
       ('ACT-o1', 'Gasmeter kalibreren', '–', true, 'Open', 'a0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000003', current_date + 2),
       ('ACT-o2', 'Gasmeter vervangen', '–', true, 'Open', 'a0000000-0000-4000-a000-000000000011', 'c0000000-0000-4000-a000-000000000003', current_date + 2)$q$);
:I1
select tests.lukt('offline: houder meldt beide klaar',
  $q$update public.acties set status = 'Klaar voor toetsing' where id in ('ACT-o1', 'ACT-o2')$q$);
:PG
select pg_sleep(0.3);
:D
select tests.lukt('offline: toetser stuurt akkoord met toestel-tijd net na klaar_op',
  $q$update public.acties set status = 'Afgerond', afgerond_op = klaar_op + interval '100 milliseconds' where id = 'ACT-o1'$q$);
select tests.klopt('offline: afgerond_op = tijd van het toestel; afgerond_server = ontvangst',
  (select afgerond_op = klaar_op + interval '100 milliseconds' and afgerond_server > afgerond_op from public.acties where id = 'ACT-o1'));
select tests.lukt('offline: toetser stuurt akkoord 10 dagen terug (vóór klaar_op)',
  $q$update public.acties set status = 'Afgerond', afgerond_op = now() - interval '10 days' where id = 'ACT-o2'$q$);
select tests.klopt('offline: tijd vóór klaar_op niet geaccepteerd (servertijd)',
  (select afgerond_op = afgerond_server from public.acties where id = 'ACT-o2'));


-- =====================================================================
-- 20. Upserts in precies de vorm die PostgREST v12 genereert
--     (POST ?on_conflict=id, Prefer: resolution=merge-duplicates,return=representation):
--     json_to_recordset + ON CONFLICT DO UPDATE SET <alle meegestuurde kolommen> + RETURNING.
--     RETURNING dwingt ook de SELECT-policy af op de teruggegeven rij.
-- =====================================================================
:I2
select tests.lukt('postgrest: inspecteur 2 maakt voorstel uit eigen inspectie',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status, handmatig)
     values ('ACT-p1', 'WPI-2', 'Leuning plaatsen', 'V', 'Bordes zonder leuning', 'direct', 'Voorstel', false)$q$);
:I1
select tests.raakt('postgrest: inspecteur 1 stelt het voorstel van inspecteur 2 in (upsert + RETURNING)',
  $q$with pgrst_source as (
       insert into public.acties (id, inspectie_id, tekst, oordeel, ref, waarneming, prio, status, houder, toetser, plandatum, handmatig, foto_pad, nafoto_pad)
       select b.id, b.inspectie_id, b.tekst, b.oordeel, b.ref, b.waarneming, b.prio, b.status, b.houder, b.toetser, b.plandatum, b.handmatig, b.foto_pad, b.nafoto_pad
       from (select '[{"id":"ACT-p1","inspectie_id":"WPI-2","tekst":"Leuning plaatsen","oordeel":"V","ref":null,"waarneming":"Bordes zonder leuning","prio":"direct","status":"Open","houder":"c0000000-0000-4000-a000-000000000002","toetser":"c0000000-0000-4000-a000-000000000003","plandatum":"2030-01-15","handmatig":false,"foto_pad":null,"nafoto_pad":null}]'::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, inspectie_id text, tekst text, oordeel text, ref text, waarneming text, prio text,
                 status public.actie_status, houder uuid, toetser uuid, plandatum date, handmatig boolean, foto_pad text, nafoto_pad text)) b
       on conflict (id) do update set id = excluded.id, inspectie_id = excluded.inspectie_id, tekst = excluded.tekst, oordeel = excluded.oordeel,
         ref = excluded.ref, waarneming = excluded.waarneming, prio = excluded.prio, status = excluded.status, houder = excluded.houder,
         toetser = excluded.toetser, plandatum = excluded.plandatum, handmatig = excluded.handmatig, foto_pad = excluded.foto_pad,
         nafoto_pad = excluded.nafoto_pad
       returning public.acties.*)
     select * from pgrst_source where status = 'Open' and ingesteld_door = auth.uid()$q$, 1);
select tests.faalt('postgrest: wie instelde, wijzigt de ingestelde actie daarna niet meer (upsert met verzonnen waarneming)',
  $q$with pgrst_source as (
       insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming)
       select b.id, b.inspectie_id, b.tekst, b.oordeel, b.waarneming
       from (select '[{"id":"ACT-p1","inspectie_id":"WPI-2","tekst":"Leuning plaatsen","oordeel":"V","waarneming":"Iets anders"}]'::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, inspectie_id text, tekst text, oordeel text, waarneming text)) b
       on conflict (id) do update set id = excluded.id, inspectie_id = excluded.inspectie_id, tekst = excluded.tekst,
         oordeel = excluded.oordeel, waarneming = excluded.waarneming
       returning public.acties.*)
     select * from pgrst_source$q$, '%liggen vast%');
select tests.raakt('postgrest: planning voor een ander inplannen (upsert + RETURNING: maker ziet hem terug)',
  $q$with pgrst_source as (
       insert into public.planning (id, datum, code, project, locatie, monteurs, inspecteur, toelichting, status, inspectie_id)
       select b.id, b.datum, b.code, b.project, b.locatie, b.monteurs, b.inspecteur, b.toelichting, b.status, b.inspectie_id
       from (select '[{"id":"PL-p1","datum":"2030-02-01","code":"BAN","project":null,"locatie":"RWZI Test","monteurs":2,"inspecteur":"c0000000-0000-4000-a000-000000000002","toelichting":null,"status":"gepland","inspectie_id":null}]'::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, datum date, code text, project text, locatie text, monteurs int,
                 inspecteur uuid, toelichting text, status text, inspectie_id text)) b
       on conflict (id) do update set id = excluded.id, datum = excluded.datum, code = excluded.code, project = excluded.project,
         locatie = excluded.locatie, monteurs = excluded.monteurs, inspecteur = excluded.inspecteur, toelichting = excluded.toelichting,
         status = excluded.status, inspectie_id = excluded.inspectie_id
       returning public.planning.*)
     select * from pgrst_source where gemaakt_door = auth.uid()$q$, 1);
:I2
select tests.lukt('postgrest: houder meldt ACT-a3b klaar', $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-a3b'$q$);
:PG
select pg_sleep(0.2);
:I1
select tests.raakt('postgrest: toetser keurt goed via upsert met offline afgerond_op (claim wordt geaccepteerd)',
  format($f$with pgrst_source as (
       insert into public.acties (id, tekst, status, houder, toetser, plandatum, afgerond_op)
       select b.id, b.tekst, b.status, b.houder, b.toetser, b.plandatum, b.afgerond_op
       from (select %L::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, tekst text, status public.actie_status, houder uuid,
                 toetser uuid, plandatum date, afgerond_op timestamptz)) b
       on conflict (id) do update set id = excluded.id, tekst = excluded.tekst, status = excluded.status, houder = excluded.houder,
         toetser = excluded.toetser, plandatum = excluded.plandatum, afgerond_op = excluded.afgerond_op
       returning public.acties.*)
     select * from pgrst_source where status = 'Afgerond' and afgerond_op < afgerond_server$f$,
     (select json_build_array(json_build_object('id', id, 'tekst', tekst, 'status', 'Afgerond', 'houder', houder, 'toetser', toetser,
             'plandatum', plandatum, 'afgerond_op', klaar_op + interval '50 milliseconds'))::text
      from public.acties where id = 'ACT-a3b')), 1);

-- =====================================================================
-- 21. Herstelronde na de review (elke aanval uit de review als regressietest)
-- =====================================================================
-- 21a. Voorstel mag zonder tekst ("toch vastleggen"); vanaf Open is tekst verplicht
:I1
select tests.lukt('voorstel: zonder tekst aanmaken mag (toch vastleggen met open punt)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-r1', 'WPI-11', '', 'A', 'Voorstel'),
                                                                         ('ACT-r1b', 'WPI-11', '', 'V', 'Voorstel')$q$);
select tests.lukt('voorstel: ter plaatse gecorrigeerd zonder tekst mag',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status, toetser) values ('ACT-r1c', 'WPI-11', '', 'A', 'Afgerond', auth.uid())$q$);
-- 21b. uitvoerders: houders kiezen in een voorstel blokkeert niemand als toetser
:I2
select tests.faalt('blokkade: inspecteur 2 kan in het voorstel van inspecteur 1 niet tussendoor houders kiezen',
  $q$update public.acties set houder = 'b0000000-0000-4000-a000-000000000001' where id = 'ACT-r1'$q$, '%alleen aan bij het instellen%');
:I1
select tests.lukt('blokkade: inspecteur 1 kiest en wist houders in zijn eigen voorstel',
  $q$update public.acties set houder = 'b0000000-0000-4000-a000-000000000001' where id = 'ACT-r1';
     update public.acties set houder = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-r1';
     update public.acties set houder = 'a0000000-0000-4000-a000-000000000012' where id = 'ACT-r1';
     update public.acties set houder = null where id = 'ACT-r1'$q$);
:PG
select tests.klopt('blokkade: voorstel heeft geen uitvoerders', (select uitvoerders = '{}' from public.acties where id = 'ACT-r1'));
:I2
select tests.faalt('voorstel: instellen zonder tekst geweigerd',
  $q$update public.acties set status = 'Open', houder = 'c0000000-0000-4000-a000-000000000003',
       toetser = 'c0000000-0000-4000-a000-000000000002', plandatum = '2030-03-01' where id = 'ACT-r1b'$q$, '%tekst_lengte%');
select tests.lukt('blokkade: instellen met een eerdere (voorstel)houder als toetser lukt',
  $q$update public.acties set status = 'Open', tekst = 'Hekwerk plaatsen', houder = 'c0000000-0000-4000-a000-000000000003',
       toetser = 'c0000000-0000-4000-a000-000000000002', plandatum = '2030-03-01' where id = 'ACT-r1'$q$);
:I2
select tests.lukt('blokkade: wie instelde zet de toelichting in het verloop (nu betrokken)',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-r1', auth.uid(), 'Ingesteld (tekst aangepast): actiehouder Douwe de Boer')$q$);
:PG
select tests.klopt('blokkade: na instellen is alleen de houder uitvoerder',
  (select uitvoerders = array['c0000000-0000-4000-a000-000000000003'::uuid] from public.acties where id = 'ACT-r1'));

-- 21c. iedereen mag een voorstel laten vervallen (ook niet-betrokkenen), ook via upsert
:I1
select tests.lukt('vervallen: inspecteur 1 maakt twee voorstellen',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-r2', 'WPI-11', 'Kabel ophangen', 'A', 'Voorstel'),
                                                                         ('ACT-r3', 'WPI-11', 'Bord plaatsen', 'A', 'Voorstel')$q$);
:I2
select tests.raakt('vervallen: inspecteur 2 laat het voorstel vervallen met PostgREST-upsert + RETURNING',
  $q$with pgrst_source as (
       insert into public.acties (id, inspectie_id, tekst, oordeel, status, houder, toetser, plandatum, handmatig)
       select b.id, b.inspectie_id, b.tekst, b.oordeel, b.status, b.houder, b.toetser, b.plandatum, b.handmatig
       from (select '[{"id":"ACT-r2","inspectie_id":"WPI-11","tekst":"Kabel ophangen","oordeel":"A","status":"Vervallen","houder":null,"toetser":null,"plandatum":null,"handmatig":false}]'::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, inspectie_id text, tekst text, oordeel text,
                 status public.actie_status, houder uuid, toetser uuid, plandatum date, handmatig boolean)) b
       on conflict (id) do update set id = excluded.id, inspectie_id = excluded.inspectie_id, tekst = excluded.tekst,
         oordeel = excluded.oordeel, status = excluded.status, houder = excluded.houder, toetser = excluded.toetser,
         plandatum = excluded.plandatum, handmatig = excluded.handmatig
       returning public.acties.*)
     select * from pgrst_source where status = 'Vervallen' and vervallen_door = auth.uid()$q$, 1);
select tests.lukt('vervallen: reden in het verloop zetten lukt',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-r2', auth.uid(), 'Voorstel vervallen: dubbel gemeld')$q$);
select tests.raakt('vervallen: dezelfde upsert nogmaals (herhaling na netwerkfout) lukt zonder wijziging',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values ('ACT-r2', 'WPI-11', 'Kabel ophangen', 'A', 'Vervallen')
     on conflict (id) do update set tekst = excluded.tekst, status = excluded.status returning id$q$, 1);
select tests.raakt('vervallen: met een gewone PATCH lukt het ook', $q$update public.acties set status = 'Vervallen' where id = 'ACT-r3'$q$, 1);
select tests.telt('vervallen: inspecteur 2 ziet beide vervallen voorstellen nog', $q$select * from public.acties where id in ('ACT-r2', 'ACT-r3')$q$, 2);

-- 21d. id's vooraf claimen: toekomst geweigerd, en een limiet op nieuwe rijen per uur
:I2
select tests.faalt('id-claim: actie-id ver in de toekomst geweigerd',
  format('insert into public.acties (id, tekst) values (%L, %L)', 'ACT-' || ((extract(epoch from now()) * 1000)::bigint + 3600000) || '-0', 'x'),
  '%in de toekomst%');
select tests.faalt('id-claim: planning-id ver in de toekomst geweigerd',
  format('insert into public.planning (id, datum, code, inspecteur) values (%L, %L, %L, auth.uid())',
         'PL-' || ((extract(epoch from now()) * 1000)::bigint + 3600000), '2030-01-01', 'BAN'), '%in de toekomst%');
select tests.faalt('id-claim: bulk van 31 nieuwe inspecties in één keer geweigerd (limiet per uur)',
  $q$insert into public.inspecties (id, titel) select 'WPI-bulk' || g, 'x' from generate_series(1, 31) g$q$, '%Te veel nieuwe inspecties%');
select tests.faalt('id-claim: bulk van 301 nieuwe acties geweigerd (limiet per uur)',
  $q$insert into public.acties (id, tekst) select 'ACT-bulk' || g, 'x' from generate_series(1, 301) g$q$, '%Te veel nieuwe acties%');
select tests.faalt('id-claim: bulk van 101 nieuwe planningen geweigerd (limiet per uur)',
  $q$insert into public.planning (id, datum, code, inspecteur) select 'PL-bulk' || g, '2030-01-01', 'BAN', auth.uid() from generate_series(1, 101) g$q$,
  '%Te veel nieuwe planningen%');
select tests.telt('id-claim: niets van de bulk is opgeslagen', $q$select * from public.acties where id like 'ACT-bulk%'$q$, 0);

-- 21e. het verloop van een verwijderde actie lekt niet naar een nieuwe actie met hetzelfde id
:I1
select tests.lukt('avg: inspecteur 1 maakt handmatige actie met privé-opmerking',
  $q$insert into public.acties (id, tekst, oordeel, status) values ('ACT-avg', 'Helmplicht bespreken', '–', 'Voorstel');
     insert into public.actie_log (actie_id, wie, wat) values ('ACT-avg', auth.uid(), 'Jan had geen helm, privé-opmerking')$q$);
:H
select tests.raakt('avg: hoofd verwijdert de actie', $q$delete from public.acties where id = 'ACT-avg'$q$, 1);
:I2
select tests.lukt('avg: inspecteur 2 maakt een nieuwe actie met hetzelfde id', $q$insert into public.acties (id, tekst) values ('ACT-avg', 'Iets anders')$q$);
select tests.telt('avg: inspecteur 2 ziet het oude verloop NIET', $q$select * from public.actie_log where actie_id = 'ACT-avg' and wat like '%privé%'$q$, 0);
select tests.telt('avg: alleen het verloop van de nieuwe actie', $q$select * from public.actie_log where actie_id = 'ACT-avg'$q$, 1);

-- 21f. geen bestaanstest van inspectie-id's via UPDATE: altijd hetzelfde antwoord
:I2
select tests.lukt('oracle: eigen handmatige actie', $q$insert into public.acties (id, tekst, status) values ('ACT-r4', 'Eigen actie', 'Voorstel')$q$);
select tests.raakt('oracle: onbekend inspectie-id koppelen: stil leeg', $q$update public.acties set inspectie_id = 'WPI-bestaatniet' where id = 'ACT-r4'$q$, 1);
select tests.raakt('oracle: bestaand inspectie-id van een ander koppelen: precies hetzelfde (stil leeg)', $q$update public.acties set inspectie_id = 'WPI-11' where id = 'ACT-r4'$q$, 1);
select tests.klopt('oracle: koppeling bleef leeg', (select inspectie_id is null from public.acties where id = 'ACT-r4'));

-- 21g. verloop: geen vervalste statusregels, alleen betrokkenen, volumegrens
select tests.faalt('verloop: statusregel met zero-width-teken ervoor geweigerd',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-r4', E'​Status: Klaar voor toetsing → Afgerond'),
  '%onzichtbare%');
select tests.faalt('verloop: statusregel met fullwidth dubbele punt geweigerd',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-r4', 'Status： Klaar voor toetsing → Afgerond'),
  '%Statusregels%');
select tests.faalt('verloop: statusregel met opsommingsteken ervoor geweigerd',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-r4', auth.uid(), '- Status : Open → Afgerond')$q$, '%Statusregels%');
select tests.lukt('verloop: gewone toelichting met regelafbreking mag',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-r4', E'Besproken met de ploeg.\nVolgt morgen.'));
select tests.faalt('verloop: niet-betrokkene schrijft niet in het verloop van andermans voorstel',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-r1b', auth.uid(), 'Getoetst en akkoord · afgerond')$q$, '%row-level security%');
select tests.faalt('verloop: 1000 regels van 2000 tekens in één keer geweigerd (volumegrens)',
  $q$insert into public.actie_log (actie_id, wie, wat) select 'ACT-r4', auth.uid(), repeat('x', 2000) from generate_series(1, 1000)$q$,
  '%Te veel regels%');
select tests.telt('verloop: niets van de vloed opgeslagen', $q$select * from public.actie_log where actie_id = 'ACT-r4' and wat like 'xxxx%'$q$, 0);

-- 21h. foto verwijderen: een ander kan het niet blokkeren via zijn eigen record
:I1
select tests.lukt('foto: inspecteur 1 uploadt een (nog ongebruikte) foto',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/los.jpg', auth.uid())$q$);
:I2
-- (sinds 0007 kan dat niet eens meer: een fotopad in een inspectierecord moet in de eigen map staan)
select tests.faalt('foto: inspecteur 2 kan dat pad NIET in zijn eigen inspectierecord zetten (0007)',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-r9', 'x', '{"foto":"a0000000-0000-4000-a000-000000000011/los.jpg"}')$q$,
  '%fotos_eigen%');
:I1
select tests.raakt('foto: inspecteur 1 kan zijn ongebruikte foto toch verwijderen',
  $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000011/los.jpg'$q$, 1);

-- 21i. namen: geen onzichtbare tekens, sleutel gelijk aan beheer.js
-- (als coördinator: monteur_aanmelden is sinds 0008 alleen voor wie inspecteert)
:W
select tests.faalt('naam: monteur met zero-width-spatie geweigerd',
  format('select public.monteur_aanmelden(%L)', E'Henk​ Voorbeeld'), '%onzichtbare%');
select tests.faalt('naam: monteur met richtingteken geweigerd',
  format('select public.monteur_aanmelden(%L)', E'‮Henk'), '%onzichtbare%');
select tests.faalt('naam: monteur met zero-width aan het eind geweigerd',
  format('select public.monteur_aanmelden(%L)', E'Henk Voorbeeld​'), '%onzichtbare%');
select tests.klopt('naam: "Æsa Test" nieuw', (select (public.monteur_aanmelden('Æsa Test') ->> 'nieuw')::boolean));
select tests.klopt('naam: "Aesa  test" is dezelfde persoon (zoals beheer.js)',
  (select not (r ->> 'nieuw')::boolean and r ->> 'naam' = 'Æsa Test' from (select public.monteur_aanmelden('Aesa  test') r) x));
select tests.klopt('naam: sleutel als beheer.js (ß, ø, ł, þ, đ, accenten; spaties en leestekens tellen niet)',
  public.naam_sleutel('Straße Ørsted') = 'strasseorsted' and public.naam_sleutel('ŁUKASZ Þór Đorđe') = 'lukaszthordorde'
  and public.naam_sleutel('  Hénk   VOORBEELD ') = 'henkvoorbeeld' and public.naam_sleutel('Œdipe') = 'oedipe'
  and public.naam_sleutel('Henk-Voorbeeld') = 'henkvoorbeeld' and public.naam_sleutel('Henk Voorbeeld.') = 'henkvoorbeeld'
  and public.naam_sleutel('ОЛЬГА') = 'ольга' and public.naam_sleutel('Kees ²') = 'kees²');
:H
select tests.faalt('naam: profielnaam met zero-width-teken geweigerd',
  format('update public.profiles set full_name = %L where id = %L', E'Inspecteur​ Twee', 'a0000000-0000-4000-a000-000000000012'),
  '%naam_tekens%');
:PG
insert into auth.users (id, email, raw_user_meta_data, invited_at)
values ('a0000000-0000-4000-a000-000000000099', 'zw@test.invalid', jsonb_build_object('full_name', E'Nieuwe​ ‮Collega'), now());
select tests.klopt('naam: uitnodiging met onzichtbare tekens in de naam: profiel krijgt een schone naam',
  (select full_name = 'Nieuwe Collega' from public.profiles where id = 'a0000000-0000-4000-a000-000000000099'));

-- =====================================================================
-- 22. Tweede herstelronde (elke bevinding uit de tweede review als regressietest)
-- =====================================================================
-- 22a. actie_log: geen zelfgekozen id (daarmee kon je het volgende id van een ander
--      claimen en zijn opslaan laten mislukken met "duplicate key actie_log_pkey")
:I2
select tests.lukt('logid: inspecteur 2 maakt een handmatig voorstel',
  $q$insert into public.acties (id, tekst, oordeel, status) values ('ACT-q1', 'Trap repareren', '–', 'Voorstel')$q$);
:PG
select last_value + 3 as claim from public.actie_log_id_seq \gset
:I1
select tests.faalt('logid: inspecteur 1 kan geen id meesturen (kolomrecht)',
  format('insert into public.actie_log (id, actie_id, wat) select %s + g, %L, %L from generate_series(0, 9) g', :claim, 'ACT-11', 'claim'),
  '%permission denied%');
:PG
insert into public.actie_log (id, actie_id, wat) values (:claim, 'ACT-q1', 'beheer met eigen id');
select tests.klopt('logid: ook een zelfgekozen id van de eigenaar wordt vervangen door de reeks',
  (select id <> :claim from public.actie_log where actie_id = 'ACT-q1' and wat = 'beheer met eigen id'));
:I2
select tests.lukt('logid: inspecteur 2 slaat daarna gewoon acties en statuswijzigingen op',
  $q$insert into public.acties (id, tekst, oordeel, status) values ('ACT-q2', 'a', '–', 'Voorstel'), ('ACT-q3', 'b', '–', 'Voorstel');
     update public.acties set status = 'Vervallen' where id = 'ACT-q3'$q$);

-- 22b. auditlog vol laten lopen: inspectie ligt vast, alleen verschillen in de auditlog,
--      grens per record, per uur en in bytes per dag
:I1
select tests.faalt('audit: inspectierecord met 200 KB nieuwe inhoud overschrijven geweigerd (momentopname)',
  format('update public.inspecties set record = record || jsonb_build_object(%L, %L) where id = %L', 'gesprek', repeat('x', 200000), 'WPI-11'),
  '%momentopname ligt vast%');
select tests.faalt('audit: tekst van een waarneming wijzigen en de foto weghalen geweigerd',
  $q$update public.inspecties set record = jsonb_set(record, '{waarnemingen,0}', '{"oordeel":"C","tekst":"klein dingetje","foto":null}') where id = 'WPI-11'$q$,
  '%momentopname ligt vast%');
:I2
select tests.lukt('audit: waarnemer past de plandatum van zijn eigen voorstel aan',
  $q$update public.acties set plandatum = current_date + 3 where id = 'ACT-q1'$q$);
:H2
select tests.klopt('audit: bij een wijziging alleen de gewijzigde kolommen (plus id) in oud/nieuw',
  (select nieuw ? 'plandatum' and nieuw ? 'id' and not (nieuw ? 'tekst') and not (oud ? 'waarneming') and grootte > 0
   from public.audit_log where tabel = 'acties' and record_id = 'ACT-q1' and actie = 'UPDATE' order by id desc limit 1));
select tests.klopt('audit: een nieuwe rij staat er volledig in',
  (select nieuw ? 'tekst' and nieuw ? 'status' from public.audit_log where tabel = 'acties' and record_id = 'ACT-q1' and actie = 'INSERT'));
:I2
select tests.lukt('audit: 29 wijzigingen meer aan hetzelfde record binnen het uur lukken (samen 30)',
  $q$do $d$ begin for i in 1..29 loop update public.acties set plandatum = current_date + 3 + i where id = 'ACT-q1'; end loop; end $d$$q$);
select tests.faalt('audit: de 31e wijziging aan hetzelfde record binnen het uur geweigerd',
  $q$update public.acties set plandatum = current_date + 100 where id = 'ACT-q1'$q$, '%hetzelfde record%');
select tests.faalt('audit: meer dan 300 wijzigingen per uur (verspreid over records) geweigerd',
  $q$do $d$ begin
       insert into public.acties (id, tekst, oordeel, status) select 'ACT-vl' || g, 'x', '–', 'Voorstel' from generate_series(1, 11) g;
       for i in 1..28 loop update public.acties set plandatum = current_date + i where id like 'ACT-vl%'; end loop;
     end $d$$q$, '%Te veel wijzigingen in het afgelopen uur%');
select tests.faalt('audit: een inspectie van 1 MB geweigerd (vormgrens 256 KB, vóór het schrijfquotum)',
  format('insert into public.inspecties (id, titel, record) values (%L, %L, jsonb_build_object(%L, %L))', 'WPI-groot0', 'x', 'gesprek', repeat('y', 1000000)),
  '%te groot%');
:PG
-- schrijfquotum 25 MiB per dag: een record is nu hooguit 256 KB en er mogen 30 inspecties per uur bij, dus
-- het dagquotum wordt pas over meerdere uren bereikt; hier staat er al bijna 25 MiB van inspecteur 2 in de auditlog
set session_replication_role = replica;
insert into public.audit_log (t, wie, tabel, record_id, actie, grootte)
values (now() - interval '2 hours', 'a0000000-0000-4000-a000-000000000012', 'inspecties', 'WPI-quotumtest', 'INSERT', 25 * 1024 * 1024 - 300000);
set session_replication_role = origin;
:I2
select tests.faalt('audit: twee inspecties van 200 KB boven het dagquotum (25 MiB) geweigerd',
  format($f$do $d$ begin
       for i in 1..2 loop
         insert into public.inspecties (id, titel, record) values ('WPI-groot' || i, 'x', jsonb_build_object('gesprek', %L || i));
       end loop;
     end $d$$f$, repeat('y', 200000)), '%Schrijfquotum%');
select tests.telt('audit: niets van de vloed opgeslagen', $q$select * from public.inspecties where id like 'WPI-groot%'$q$, 0);
:PG
set session_replication_role = replica;
delete from public.audit_log where record_id = 'WPI-quotumtest';
set session_replication_role = origin;
:I2

-- 22c. het officiële verloop van andermans voorstel volschrijven
:I1
select tests.faalt('verloop-vloed: inspecteur 1 verzet de plandatum van het voorstel van inspecteur 2: geweigerd',
  $q$update public.acties set plandatum = current_date + 7 where id = 'ACT-q2'$q$, '%alleen aan bij het instellen%');
:I2
select tests.lukt('verloop-vloed: waarnemer kiest in zijn eigen voorstel houder, toetser en plandatum',
  $q$update public.acties set houder = 'c0000000-0000-4000-a000-000000000002', toetser = 'c0000000-0000-4000-a000-000000000003',
       plandatum = current_date + 7 where id = 'ACT-q2';
     update public.acties set plandatum = current_date + 8 where id = 'ACT-q2'$q$);
select tests.telt('verloop-vloed: kladkeuzes in een voorstel geven geen serverregels (alleen "Aangemaakt")',
  $q$select * from public.actie_log where actie_id = 'ACT-q2' and bron = 'server'$q$, 1);

-- 22d. handmatig voorstel: waarneming en foto zijn van de waarnemer
:I2
select tests.lukt('waarnemer: inspecteur 2 maakt een handmatig voorstel met waarneming en eigen foto',
  $q$insert into public.acties (id, tekst, oordeel, waarneming, prio, status, handmatig, foto_pad)
     values ('ACT-1700000000900-1', 'Valbeveiliging regelen', '–', 'Geen valbeveiliging op 6 m', 'direct', 'Voorstel', true,
             'a0000000-0000-4000-a000-000000000012/bewijs.jpg')$q$);
:I1
select tests.faalt('waarnemer: niet-betrokkene haalt foto weg, herschrijft de waarneming en laat vervallen: geweigerd',
  $q$update public.acties set foto_pad = null, waarneming = 'niets aan de hand', status = 'Vervallen' where id = 'ACT-1700000000900-1'$q$,
  '%komen van de waarnemer%');
select tests.faalt('waarnemer: niet-betrokkene maakt de tekst van het voorstel leeg: geweigerd',
  $q$update public.acties set tekst = '' where id = 'ACT-1700000000900-1'$q$, '%alleen aan bij het instellen%');
:W
select tests.faalt('waarnemer: ook staf herschrijft de waarneming niet',
  $q$update public.acties set waarneming = 'anders' where id = 'ACT-1700000000900-1'$q$, '%komen van de waarnemer%');
:I1
select tests.raakt('waarnemer: niet-betrokkene laat vervallen met een verouderde (lege) tekst: vervalt, tekst blijft',
  $q$insert into public.acties (id, tekst, oordeel, waarneming, prio, status, handmatig, foto_pad)
     values ('ACT-1700000000900-1', '', '–', 'Geen valbeveiliging op 6 m', 'direct', 'Vervallen', true, 'a0000000-0000-4000-a000-000000000012/bewijs.jpg')
     on conflict (id) do update set tekst = excluded.tekst, waarneming = excluded.waarneming, prio = excluded.prio,
       status = excluded.status, handmatig = excluded.handmatig, foto_pad = excluded.foto_pad
     returning id$q$, 1);
:PG
select tests.klopt('waarnemer: waarneming, foto en tekst onveranderd; vervallen door inspecteur 1',
  (select waarneming = 'Geen valbeveiliging op 6 m' and foto_pad is not null and tekst = 'Valbeveiliging regelen'
          and status = 'Vervallen' and vervallen_door = 'a0000000-0000-4000-a000-000000000011'
   from public.acties where id = 'ACT-1700000000900-1'));
:I2
select tests.klopt('waarnemer: de foto blijft "in gebruik" (dus niet te verwijderen)',
  public.foto_in_gebruik('a0000000-0000-4000-a000-000000000012/bewijs.jpg'));

-- 22e. bestaanstest via upsert op andermans id (restrisico, zie README): geweigerd, niets gewijzigd
:I2
select tests.faalt('upsert: op het planning-id van een ander geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-1', current_date, 'DAM', auth.uid())
     on conflict (id) do update set datum = excluded.datum$q$, '%row-level security%');
:PG
select tests.klopt('upsert: planning van een ander onveranderd', (select datum = current_date + 1 from public.planning where id = 'PL-1'));

-- 22f. aanmelden met signups aan: geen naam bezetten, onzichtbaar voor leden; vooraf
--      geregistreerd account wordt bij een latere uitnodiging NIET automatisch actief
:I1
select tests.telt('profielen: leden zien een niet-uitgenodigde aanmelding niet',
  $q$select * from public.profiles where id = 'f0000000-0000-4000-a000-000000000042'$q$, 0);
select tests.telt('profielen: leden zien wel een inactief gezet (oud-)collega-profiel (historie)',
  $q$select * from public.profiles where id = 'e0000000-0000-4000-a000-000000000031'$q$, 1);
:H2
select tests.telt('profielen: het hoofd ziet de niet-uitgenodigde aanmelding wel (beheer)',
  $q$select * from public.profiles where id = 'f0000000-0000-4000-a000-000000000042'$q$, 1);
:PG
-- uitnodiging precies zoals Supabase Auth: gebruiker en invited_at in één transactie
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-a000-000000000044', 'collega@test.invalid', '{"full_name":"Nieuwe Collega Twee"}');
update auth.users set invited_at = now() where id = 'f0000000-0000-4000-a000-000000000044';
commit;
select tests.klopt('uitnodiging: actief, uitgenodigd en met de naam uit de uitnodiging',
  (select actief and uitgenodigd and full_name = 'Nieuwe Collega Twee' from public.profiles where id = 'f0000000-0000-4000-a000-000000000044'));
-- vooraf geregistreerd (een dag geleden) en pas later uitgenodigd
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-a000-000000000045', 'toekomstig@test.invalid', '{"full_name":"Toekomstige Collega"}');
alter table public.profiles disable trigger profiles_bewaak;
update public.profiles set created_at = now() - interval '1 day' where id = 'f0000000-0000-4000-a000-000000000045';
alter table public.profiles enable trigger profiles_bewaak;
update auth.users set invited_at = now() where id = 'f0000000-0000-4000-a000-000000000045';
select tests.klopt('uitnodiging: vooraf geregistreerd account wordt NIET automatisch actief',
  (select not actief and not uitgenodigd from public.profiles where id = 'f0000000-0000-4000-a000-000000000045'));
select tests.klopt('uitnodiging: daarvan komt een security_event voor het hoofd',
  exists (select 1 from public.security_events where soort = 'uitnodiging_bestaand_account'
            and details ->> 'profiel' = 'f0000000-0000-4000-a000-000000000045'));
:I1
select tests.faalt('uitnodiging: een client kan die melding niet nabootsen',
  $q$select public.report_security_event('uitnodiging_bestaand_account', '{}'::jsonb)$q$, '%Ongeldige soort%');

-- 22g. offline-first: samengestelde statusovergangen (de app stuurt alleen de laatste stand)
:I1
select tests.lukt('offline: inspecteur 1 maakt drie voorstellen uit zijn inspectie',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, status) values
       ('ACT-c1', 'WPI-11', 'Ladder vastzetten', 'A', 'Voorstel'),
       ('ACT-c2', 'WPI-11', 'Gat afdekken', 'V', 'Voorstel'),
       ('ACT-c3', 'WPI-11', 'Kabel ophangen', 'A', 'Voorstel')$q$);
select tests.lukt('offline: zelf instellen als houder en starten in één upload (Voorstel → In uitvoering)',
  $q$update public.acties set status = 'In uitvoering', houder = auth.uid(), toetser = 'c0000000-0000-4000-a000-000000000002',
       plandatum = current_date + 5 where id = 'ACT-c1'$q$);
select tests.klopt('offline: als losse stappen gelogd, ingesteld_door en uitvoerders gezet',
  (select array_agg(wat order by id) = array['Aangemaakt met status Voorstel', 'Status: Voorstel → Open (impliciet)', 'Status: Open → In uitvoering']
   from public.actie_log where actie_id = 'ACT-c1' and bron = 'server')
  and (select ingesteld_door = auth.uid() and uitvoerders = array[auth.uid()] from public.acties where id = 'ACT-c1'));
select tests.raakt('offline: Voorstel → Klaar voor toetsing met na-foto (PostgREST-upsert)',
  $q$with pgrst_source as (
       insert into public.acties (id, inspectie_id, tekst, oordeel, status, houder, toetser, plandatum, handmatig, nafoto_pad)
       select b.id, b.inspectie_id, b.tekst, b.oordeel, b.status, b.houder, b.toetser, b.plandatum, b.handmatig, b.nafoto_pad
       from (select '[{"id":"ACT-c2","inspectie_id":"WPI-11","tekst":"Gat afdekken","oordeel":"V","status":"Klaar voor toetsing","houder":"a0000000-0000-4000-a000-000000000011","toetser":"c0000000-0000-4000-a000-000000000002","plandatum":"2030-01-15","handmatig":false,"nafoto_pad":"a0000000-0000-4000-a000-000000000011/na-c2.jpg"}]'::json as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, inspectie_id text, tekst text, oordeel text,
                 status public.actie_status, houder uuid, toetser uuid, plandatum date, handmatig boolean, nafoto_pad text)) b
       on conflict (id) do update set id = excluded.id, inspectie_id = excluded.inspectie_id, tekst = excluded.tekst,
         oordeel = excluded.oordeel, status = excluded.status, houder = excluded.houder, toetser = excluded.toetser,
         plandatum = excluded.plandatum, handmatig = excluded.handmatig, nafoto_pad = excluded.nafoto_pad
       returning public.acties.*)
     select * from pgrst_source where status = 'Klaar voor toetsing' and klaar_op is not null and nafoto_door = auth.uid()$q$, 1);
select tests.telt('offline: drie stappen gelogd (twee impliciet)',
  $q$select * from public.actie_log where actie_id = 'ACT-c2' and bron = 'server' and wat like 'Status:%'$q$, 3);
:I2
select tests.faalt('offline: samengesteld door een ander dan de houder (geen staf): geweigerd',
  $q$update public.acties set status = 'In uitvoering', houder = 'c0000000-0000-4000-a000-000000000002',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 5 where id = 'ACT-c3'$q$, '%Alleen de actiehouder%');
select tests.faalt('offline: samengesteld door wie zichzelf toetser maakt: geweigerd',
  $q$update public.acties set status = 'In uitvoering', houder = 'c0000000-0000-4000-a000-000000000002',
       toetser = auth.uid(), plandatum = current_date + 5 where id = 'ACT-c3'$q$, '%toetser voert de actie niet zelf uit%');
select tests.lukt('offline: nieuwe handmatige actie al In uitvoering door de houder (eerste upload)',
  $q$insert into public.acties (id, tekst, oordeel, status, handmatig, houder, toetser, plandatum)
     values ('ACT-c4', 'Afzetting herstellen', '–', 'In uitvoering', true, auth.uid(), 'c0000000-0000-4000-a000-000000000002', current_date + 2)$q$);
select tests.klopt('offline: nieuwe actie gelogd als Aangemaakt (Open) + stap',
  (select array_agg(wat order by id) = array['Aangemaakt met status Open', 'Status: Open → In uitvoering']
   from public.actie_log where actie_id = 'ACT-c4' and bron = 'server'));
select tests.lukt('offline: nieuwe handmatige actie al Klaar voor toetsing met na-foto door de houder',
  $q$insert into public.acties (id, tekst, oordeel, status, handmatig, houder, toetser, plandatum, nafoto_pad)
     values ('ACT-c5', 'Bord plaatsen', '–', 'Klaar voor toetsing', true, auth.uid(), 'c0000000-0000-4000-a000-000000000002', current_date + 2,
             'a0000000-0000-4000-a000-000000000012/na-c5.jpg')$q$);
select tests.lukt('offline: nieuw voorstel dat vóór de eerste upload al verviel',
  $q$insert into public.acties (id, tekst, oordeel, status) values ('ACT-c6', 'Dubbel', '–', 'Vervallen')$q$);
select tests.klopt('offline: vervallen bij aanmaken: vervallen_door en twee serverregels',
  (select vervallen_door = auth.uid() from public.acties where id = 'ACT-c6')
  and (select count(*) = 2 from public.actie_log where actie_id = 'ACT-c6' and bron = 'server'));
select tests.faalt('offline: nieuwe actie al Klaar voor toetsing met jezelf als toetser: geweigerd',
  $q$insert into public.acties (id, tekst, oordeel, status, handmatig, houder, toetser, plandatum)
     values ('ACT-c7', 'x', '–', 'Klaar voor toetsing', true, 'c0000000-0000-4000-a000-000000000002', auth.uid(), current_date)$q$,
  '%toetser voert de actie niet zelf uit%');
select tests.faalt('offline: Afgerond blijft nooit samengesteld (voorstel → afgerond geweigerd)',
  $q$update public.acties set status = 'Afgerond', toetser = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-c3'$q$,
  '%Ongeldige statusovergang%');
:W
select tests.lukt('offline: staf stelt in en start in één upload (Voorstel → Klaar voor toetsing)',
  $q$update public.acties set status = 'Klaar voor toetsing', houder = 'c0000000-0000-4000-a000-000000000003',
       toetser = 'b0000000-0000-4000-a000-000000000001', plandatum = current_date + 5 where id = 'ACT-c3'$q$);
select tests.lukt('offline: toetser (coordinator) rondt de samengestelde actie van inspecteur 1 af',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-c2'$q$);

-- 22h. klokafwijking: duidelijke melding
:I2
select tests.faalt('klok: id 10 minuten in de toekomst geweigerd met een hint over de klok',
  format('insert into public.acties (id, tekst) values (%L, %L)', 'ACT-' || ((extract(epoch from now()) * 1000)::bigint + 600000) || '-0', 'x'),
  '%klok van het toestel%');

-- =====================================================================
-- 23. Derde herstelronde (elke bevinding uit de derde review als regressietest)
-- =====================================================================
-- 23a. NULL-logica: een voorstel dat service_role/postgres aanmaakte (aangemaakt_door leeg)
:PG
insert into public.acties (id, tekst, oordeel, waarneming, prio, status, handmatig)
values ('ACT-s1', 'Leuning plaatsen', '–', 'Leuning ontbreekt op steiger', 'direct', 'Voorstel', true);
select tests.klopt('null: systeemvoorstel heeft geen aanmaker', (select aangemaakt_door is null from public.acties where id = 'ACT-s1'));
:I2
select tests.faalt('null: gewone inspecteur herschrijft waarneming/dringendheid van een systeemvoorstel: geweigerd',
  $q$update public.acties set waarneming = 'Niets aan de hand', prio = 'planmatig', handmatig = false, tekst = '',
       houder = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-s1'$q$, '%komen van de waarnemer%');
select tests.faalt('null: tussendoor houder kiezen in het systeemvoorstel: geweigerd (alleen bij instellen)',
  $q$update public.acties set houder = 'c0000000-0000-4000-a000-000000000002' where id = 'ACT-s1'$q$, '%alleen aan bij het instellen%');
select tests.klopt('null: systeemvoorstel ongewijzigd, geen extra regels in het verloop',
  (select (waarneming, prio, handmatig, tekst, houder) is not distinct from
          ('Leuning ontbreekt op steiger'::text, 'direct'::text, true, 'Leuning plaatsen'::text, null::uuid)
     from public.acties where id = 'ACT-s1')
  and (select count(*) = 1 from public.actie_log where actie_id = 'ACT-s1'));
select tests.lukt('null: instellen van het systeemvoorstel mag wel (iedereen mag instellen)',
  $q$update public.acties set status = 'Open', houder = 'c0000000-0000-4000-a000-000000000002',
       toetser = 'c0000000-0000-4000-a000-000000000003', plandatum = current_date + 3 where id = 'ACT-s1'$q$);

-- 23b. QHSE-manager en beheerder nooit actiehouder, beheerder nooit toetser (QHSE mag toetsen; 0008), ook niet na
--      een rolwijziging. T is een coördinator die alleen toetser is (nergens actiehouder).
:PG
insert into tests.gebruiker values ('T', 'c0000000-0000-4000-a000-000000000004');
begin;
insert into auth.users (id, email, raw_user_meta_data) values ('c0000000-0000-4000-a000-000000000004', 'toetser@test.invalid', '{"full_name":"Toet Ser"}');
update auth.users set invited_at = now() where id = 'c0000000-0000-4000-a000-000000000004';
commit;
update public.profiles set role = 'coordinator' where id = 'c0000000-0000-4000-a000-000000000004';
\set T 'reset role; select tests.als(''T'');  set role authenticated;'
:W
select tests.lukt('qhse-rol: actie ingesteld met inspecteur 2 als houder en T als toetser',
  $q$insert into public.acties (id, tekst, oordeel, status, handmatig, houder, toetser, plandatum)
     values ('ACT-qr', 'Hek repareren', '–', 'Open', true, 'a0000000-0000-4000-a000-000000000012',
             'c0000000-0000-4000-a000-000000000004', current_date + 4)$q$);
:I2
select tests.lukt('qhse-rol: houder start en meldt klaar',
  $q$update public.acties set status = 'In uitvoering' where id = 'ACT-qr';
     update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-qr'$q$);
:H2
select tests.faalt('qhse-rol: hoofd maakt de houder van een lopende actie QHSE-manager: geweigerd',
  $q$update public.profiles set role = 'qhse' where id = 'a0000000-0000-4000-a000-000000000012'$q$, '%nooit actiehouder%');
select tests.faalt('qhse-rol: hoofd maakt de houder van een lopende actie beheerder: geweigerd',
  $q$update public.profiles set role = 'beheerder' where id = 'a0000000-0000-4000-a000-000000000012'$q$, '%nooit actiehouder%');
select tests.faalt('qhse-rol: hoofd maakt de toetser van een lopende actie beheerder: geweigerd',
  $q$update public.profiles set role = 'beheerder' where id = 'c0000000-0000-4000-a000-000000000004'$q$, '%beheerder is nooit toetser%');
-- tweede verdedigingslinie: rol buiten de controle om gewijzigd (bv. noodcorrectie in SQL)
:PG
set session_replication_role = replica;
update public.profiles set role = 'beheerder' where id = 'c0000000-0000-4000-a000-000000000004';
set session_replication_role = origin;
:T
select tests.faalt('qhse-rol: toetser die (toch) beheerder werd, kan niet afronden',
  $q$update public.acties set status = 'Afgerond' where id = 'ACT-qr'$q$, '%beheerder kan geen toetser zijn%');
:PG
set session_replication_role = replica;
update public.profiles set role = 'coordinator' where id = 'c0000000-0000-4000-a000-000000000004';
set session_replication_role = origin;
:H2
select tests.lukt('qhse-rol: de toetser van een lopende actie QHSE-manager maken mag (de QHSE-manager mag toetsen)',
  $q$update public.profiles set role = 'qhse' where id = 'c0000000-0000-4000-a000-000000000004'$q$);
:T
select tests.lukt('qhse-rol: QHSE-manager rondt als toetser af', $q$update public.acties set status = 'Afgerond' where id = 'ACT-qr'$q$);
:H2
select tests.lukt('qhse-rol: weer coordinator', $q$update public.profiles set role = 'coordinator' where id = 'c0000000-0000-4000-a000-000000000004'$q$);

-- 23c. uitnodiging: alleen een account uit DEZELFDE transactie wordt actief
:PG
insert into auth.users (id, email, raw_user_meta_data) values
  ('f0000000-0000-4000-a000-000000000046', 'vooraf@test.invalid', '{"full_name":"Vooraf Aangemeld"}');
-- (aparte transactie, net als een aanmelding die 90 s eerder gebeurde; geen terugdateren nodig)
update auth.users set invited_at = now(), raw_user_meta_data = '{"full_name":"Collega Drie"}'
 where id = 'f0000000-0000-4000-a000-000000000046';
select tests.klopt('uitnodiging: account uit een eerdere transactie wordt NIET actief en krijgt de naam niet',
  (select not actief and not uitgenodigd and full_name <> 'Collega Drie' from public.profiles where id = 'f0000000-0000-4000-a000-000000000046'));
select tests.klopt('uitnodiging: en er komt een security_event',
  exists (select 1 from public.security_events where soort = 'uitnodiging_bestaand_account'
            and details ->> 'profiel' = 'f0000000-0000-4000-a000-000000000046'));

-- 23d. planning: uitgevoerd alleen met een inspectie van de ingeplande inspecteur
:W
select tests.lukt('uitgevoerd: coordinator plant inspecteur 2 in',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-u1', current_date, 'POM', 'a0000000-0000-4000-a000-000000000012'),
       ('PL-u2', current_date, 'POM', 'a0000000-0000-4000-a000-000000000012')$q$);
:I2
select tests.faalt('uitgevoerd: zonder inspectie markeren geweigerd (herinnering wegklikken kan niet)',
  $q$update public.planning set status = 'uitgevoerd' where id = 'PL-u1'$q$, '%ingeplande inspecteur, met zijn eigen vastgelegde inspectie%');
select tests.klopt('uitgevoerd: planning bleef gepland', (select status = 'gepland' from public.planning where id = 'PL-u1'));
select tests.faalt('uitgevoerd: nieuwe planning meteen uitgevoerd zonder inspectie geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur, status) values ('PL-u3', current_date, 'POM', auth.uid(), 'uitgevoerd')$q$,
  '%planning_uitgevoerd_inspectie%');
select tests.faalt('uitgevoerd: nieuwe planning voor een ander, uitgevoerd met je eigen inspectie: geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur, status, inspectie_id)
     values ('PL-u4', current_date, 'POM', 'a0000000-0000-4000-a000-000000000011', 'uitgevoerd', 'WPI-2')$q$,
  '%ingeplande inspecteur%');
select tests.lukt('uitgevoerd: met de eigen inspectie markeren lukt (zoals de app)',
  $q$update public.planning set status = 'uitgevoerd', inspectie_id = 'WPI-2' where id = 'PL-u1'$q$);
:W
select tests.faalt('uitgevoerd: ook staf markeert niet als uitgevoerd zonder inspectie (CHECK)',
  $q$update public.planning set status = 'uitgevoerd' where id = 'PL-u2'$q$, '%planning_uitgevoerd_inspectie%');
select tests.lukt('uitgevoerd: coordinator koppelt planning PL-u2 aan inspecteur 1 (maker)',
  $q$update public.planning set inspecteur = 'a0000000-0000-4000-a000-000000000011' where id = 'PL-u2'$q$);
:I1
select tests.faalt('uitgevoerd: met een eigen inspectie die niet bij deze planning hoort (andere inspecteur): kan niet',
  $q$update public.planning set status = 'uitgevoerd', inspectie_id = 'WPI-2' where id = 'PL-u2'$q$, '%eigen inspectie%');

-- 23e. oordeel '–' en leeg zijn hetzelfde (heen-en-terug via de app)
:W
select tests.lukt('oordeel: coordinator maakt een handmatige actie (Open) voor inspecteur 2, toetser Douwe',
  $q$insert into public.acties (id, tekst, oordeel, ref, waarneming, status, handmatig, houder, toetser, plandatum)
     values ('ACT-rt1', 'Trapleuning vastzetten', '–', 'Handmatig', 'Leuning zit los', 'Open', true,
             'a0000000-0000-4000-a000-000000000012', 'c0000000-0000-4000-a000-000000000003', current_date + 5)$q$);
select tests.lukt('oordeel: handmatige actie zonder oordeel krijgt "–"',
  $q$insert into public.acties (id, tekst, status, handmatig, houder, toetser, plandatum)
     values ('ACT-rt2', 'Bord ophangen', 'Open', true, 'a0000000-0000-4000-a000-000000000012',
             'c0000000-0000-4000-a000-000000000003', current_date + 5)$q$);
select tests.klopt('oordeel: opgeslagen als "–"', (select oordeel = '–' from public.acties where id = 'ACT-rt2'));
:I2
select tests.raakt('oordeel: houder start met de rij zoals de app hem terugstuurt (oordeel leeg, PostgREST-upsert)',
  $q$with pgrst_source as (
       insert into public.acties (id, inspectie_id, tekst, oordeel, ref, waarneming, prio, status, houder, toetser, plandatum, handmatig)
       select b.id, b.inspectie_id, b.tekst, b.oordeel, b.ref, b.waarneming, b.prio, b.status, b.houder, b.toetser, b.plandatum, b.handmatig
       from (select json_build_array(json_build_object('id', 'ACT-rt1', 'inspectie_id', null, 'tekst', 'Trapleuning vastzetten',
               'oordeel', null, 'ref', 'Handmatig', 'waarneming', 'Leuning zit los', 'prio', null, 'status', 'In uitvoering',
               'houder', 'a0000000-0000-4000-a000-000000000012', 'toetser', 'c0000000-0000-4000-a000-000000000003',
               'plandatum', current_date + 5, 'handmatig', true)) as json_data) p,
       lateral (select * from json_to_recordset(p.json_data) as _(id text, inspectie_id text, tekst text, oordeel text, ref text,
                 waarneming text, prio text, status public.actie_status, houder uuid, toetser uuid, plandatum date, handmatig boolean)) b
       on conflict (id) do update set inspectie_id = excluded.inspectie_id, tekst = excluded.tekst, oordeel = excluded.oordeel,
         ref = excluded.ref, waarneming = excluded.waarneming, prio = excluded.prio, status = excluded.status,
         houder = excluded.houder, toetser = excluded.toetser, plandatum = excluded.plandatum, handmatig = excluded.handmatig
       returning public.acties.*)
     select * from pgrst_source where status = 'In uitvoering' and oordeel = '–'$q$, 1);
select tests.lukt('oordeel: houder meldt klaar met een PATCH met oordeel leeg',
  $q$update public.acties set status = 'Klaar voor toetsing', oordeel = null where id = 'ACT-rt1'$q$);
:D
select tests.lukt('oordeel: toetser rondt af met oordeel leeg', $q$update public.acties set status = 'Afgerond', oordeel = null where id = 'ACT-rt1'$q$);
select tests.klopt('oordeel: bleef "–"', (select oordeel = '–' and status = 'Afgerond' from public.acties where id = 'ACT-rt1'));
:I1
select tests.faalt('oordeel: oordeel A van een inspectie-actie leeg maken blijft geweigerd',
  $q$update public.acties set oordeel = null where id = 'ACT-c1'$q$, '%oordeel komt van de inspecteur%');

-- 23f. acties uit een inspectie horen bij de bevroren momentopname
:I1
select tests.lukt('momentopname: inspecteur 1 legt inspectie WPI-m vast',
  $q$insert into public.inspecties (id, titel, code, record) values ('WPI-m', 'Steiger · Test', 'STG', tests.rec('WPI-m'))$q$);
select tests.lukt('momentopname: voorstel dat precies bij een waarneming hoort',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, ref, waarneming, prio, status)
     values ('ACT-m1', 'WPI-m', 'Leuning plaatsen', 'A', 'STG-1.01', 'Steiger zonder leuning', 'direct', 'Voorstel')$q$);
select tests.faalt('momentopname: actie die niet in het record staat geweigerd (later toevoegen kan niet)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status)
     values ('ACT-m9', 'WPI-m', 'x', 'A', 'Steiger zonder leuning', 'direct', 'Voorstel')$q$, '%precies één waarneming%');
select tests.faalt('momentopname: ander oordeel dan in het record geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status)
     values ('ACT-m2', 'WPI-m', 'x', 'A', 'Kabel over looppad', 'planmatig', 'Voorstel')$q$, '%oordeel van de waarneming%');
select tests.faalt('momentopname: andere waarneming dan in het record geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status)
     values ('ACT-m2', 'WPI-m', 'x', 'V', 'Iets anders gezien', 'planmatig', 'Voorstel')$q$, '%waarneming in de vastgelegde inspectie%');
select tests.faalt('momentopname: andere dringendheid dan in het record geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status)
     values ('ACT-m2', 'WPI-m', 'x', 'V', 'Kabel over looppad', 'direct', 'Voorstel')$q$, '%dringendheid%');
select tests.faalt('momentopname: waarneming met oordeel C kan geen actie zijn',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, status)
     values ('ACT-m5', 'WPI-m', 'x', 'C', 'Netjes', 'Voorstel')$q$, '%(A of V)%');
select tests.faalt('momentopname: direct Afgerond zonder "ter plaatse gecorrigeerd" in het record geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status, toetser, plandatum)
     values ('ACT-m4', 'WPI-m', 'Gat afgedekt', 'A', 'Gat niet afgedekt', 'kort', 'Afgerond', auth.uid(), current_date)$q$,
  '%ter plaatse gecorrigeerd%');
select tests.faalt('momentopname: de waarnemer wijzigt de waarneming van zijn voorstel niet meer',
  $q$update public.acties set waarneming = 'Steiger had wel een leuning' where id = 'ACT-m1'$q$, '%liggen vast%');
select tests.faalt('momentopname: en de dringendheid ook niet',
  $q$update public.acties set prio = 'planmatig' where id = 'ACT-m1'$q$, '%liggen vast%');
select tests.faalt('momentopname: en de referentie ook niet',
  $q$update public.acties set ref = 'STG-9.99' where id = 'ACT-m1'$q$, '%liggen vast%');

-- 23g. verloop: actie uit een inspectie die bij de eerste upload al Open is
:I1
select tests.lukt('verloop: voorstel offline al ingesteld (eerste upload is Open)',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status, houder, toetser, plandatum)
     values ('ACT-m3', 'WPI-m', 'Afzetting terugzetten', 'A', 'Afzetting weg', 'kort', 'Open',
             'a0000000-0000-4000-a000-000000000012', 'c0000000-0000-4000-a000-000000000002', current_date + 3)$q$);
select tests.klopt('verloop: begint bij Voorstel, met de stap Voorstel → Open (zoals de andere eerste uploads)',
  (select array_agg(wat order by id) = array['Aangemaakt met status Voorstel', 'Status: Voorstel → Open']
     from public.actie_log where actie_id = 'ACT-m3' and bron = 'server')
  and (select ingesteld_door = auth.uid() from public.acties where id = 'ACT-m3'),
  (select string_agg(wat, ' | ' order by id) from public.actie_log where actie_id = 'ACT-m3'));

-- 23h. monteursnamen: dezelfde regel als beheer.js (spaties en leestekens tellen niet)
:I2
select tests.klopt('monteur: "Henk-Voorbeeld" is Henk Voorbeeld (geen nieuwe monteur)',
  (select not (r ->> 'nieuw')::boolean and r ->> 'naam' = 'Henk Voorbeeld' from (select public.monteur_aanmelden('Henk-Voorbeeld') r) x));
select tests.klopt('monteur: "Henk Voorbeeld." is Henk Voorbeeld',
  (select not (r ->> 'nieuw')::boolean and r ->> 'naam' = 'Henk Voorbeeld' from (select public.monteur_aanmelden('Henk Voorbeeld.') r) x));
select tests.klopt('monteur: "henkvoorbeeld" is Henk Voorbeeld',
  (select not (r ->> 'nieuw')::boolean from (select public.monteur_aanmelden('henkvoorbeeld') r) x));
select tests.klopt('monteur: nieuwe naam wordt opgeschoond zoals schoon() ("Jan  Nieuw ." → "Jan Nieuw")',
  (select (r ->> 'nieuw')::boolean and r ->> 'naam' = 'Jan Nieuw' from (select public.monteur_aanmelden(E'Jan  Nieuw .') r) x));
select tests.klopt('monteur: geen dubbelen in de lijst onder de sleutel van beheer.js',
  (select count(*) = count(distinct public.naam_sleutel(naam)) from public.monteurs));
:H2
select tests.faalt('monteur: hoofd voegt "Pieter-Proef" toe: dubbel geweigerd',
  $q$insert into public.monteurs (naam) values ('Pieter-Proef')$q$, '%monteurs_naam_uniek%');

-- 23i. volumegrens over alle append-only tabellen (security_events, actie_log, audit_log)
:PG
-- 100 meldingen van inspecteur 2 eerder vandaag (ouder dan een minuut)
set session_replication_role = replica;
insert into public.security_events (t, wie, soort, details)
select now() - interval '2 hours', 'a0000000-0000-4000-a000-000000000012', 'test_vol', '{}'::jsonb from generate_series(1, 100);
set session_replication_role = origin;
:I2
select tests.klopt('quotum: 101e beveiligingsmelding op een dag wordt niet opgeslagen (false)',
  (select public.report_security_event('test_vol', '{}'::jsonb) = false));
:PG
-- 300 regels van inspecteur 2 in het verloop eerder vandaag
set session_replication_role = replica;
insert into public.actie_log (actie_id, t, wie, wat, bron)
select 'ACT-q2', now() - interval '3 hours', 'a0000000-0000-4000-a000-000000000012', 'oude toelichting', 'client' from generate_series(1, 300);
set session_replication_role = origin;
:I2
select tests.faalt('quotum: 301e regel in het verloop op een dag geweigerd',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-q2', auth.uid(), 'nog een toelichting')$q$, '%Schrijfquotum%');
:I1
select tests.lukt('quotum: inspecteur 1 schrijft gewoon in het verloop (quotum is per gebruiker)',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-m1', auth.uid(), 'Besproken met de ploeg')$q$);
select tests.faalt('quotum: 61 regels in een uur geweigerd (uurgrens 60)',
  $q$insert into public.actie_log (actie_id, wie, wat) select 'ACT-c' || (1 + g % 3), auth.uid(), 'regel ' || g from generate_series(1, 61) g$q$,
  '%Te veel regels%');
:PG
-- inspecteur 1 zit (via de auditlog) aan het gezamenlijke dagquotum
set session_replication_role = replica;
insert into public.audit_log (t, wie, tabel, record_id, actie, grootte)
values (now() - interval '1 hour', 'a0000000-0000-4000-a000-000000000011', 'acties', 'ACT-x', 'UPDATE', 25 * 1024 * 1024);
set session_replication_role = origin;
:I1
select tests.faalt('quotum: gezamenlijk dagquotum geldt ook voor het verloop',
  $q$insert into public.actie_log (actie_id, wie, wat) values ('ACT-m1', auth.uid(), 'nog iets')$q$, '%Schrijfquotum%');
select tests.klopt('quotum: en voor beveiligingsmeldingen (false, niets opgeslagen)',
  (select public.report_security_event('test_quotum', '{"x":1}'::jsonb) = false)
  and not exists (select 1 from public.security_events where soort = 'test_quotum'));
select tests.faalt('quotum: en voor gewone wijzigingen',
  $q$update public.acties set tekst = 'Leuning plaatsen (nu)' where id = 'ACT-m1'$q$, '%Schrijfquotum%');

-- 23j. nieuwe tabellen zijn niet vanzelf bereikbaar (default privileges)
:PG
create table public.wpi_test_nieuw (id int);
create sequence public.wpi_test_nieuw_seq;
select tests.klopt('rechten: een later aangemaakte tabel/reeks geeft anon en authenticated geen rechten',
  not has_table_privilege('anon', 'public.wpi_test_nieuw', 'select')
  and not has_table_privilege('authenticated', 'public.wpi_test_nieuw', 'select')
  and not has_table_privilege('authenticated', 'public.wpi_test_nieuw', 'insert')
  and not has_sequence_privilege('authenticated', 'public.wpi_test_nieuw_seq', 'usage')
  and not has_sequence_privilege('anon', 'public.wpi_test_nieuw_seq', 'usage'));
drop table public.wpi_test_nieuw;
drop sequence public.wpi_test_nieuw_seq;

-- 23k. foto opnieuw uploaden met x-upsert: true (Storage: INSERT … ON CONFLICT DO UPDATE)
:I2
select tests.lukt('upsert-foto: eerste upload met upsert lukt',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/abc123.jpg', auth.uid())
     on conflict (bucket_id, name) do update set owner = excluded.owner, updated_at = now() returning *$q$);
select tests.lukt('upsert-foto: dezelfde (ongebruikte) foto nogmaals uploaden lukt (antwoord kwijt na netwerkfout)',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/abc123.jpg', auth.uid())
     on conflict (bucket_id, name) do update set owner = excluded.owner, updated_at = now() returning *$q$);
select tests.faalt('upsert-foto: de na-foto van ACT-c5 is al gekoppeld: alsnog uploaden geweigerd (eerst uploaden, dan koppelen)',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/na-c5.jpg', auth.uid())$q$, '%row-level security%');
:PG
insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/na-c5.jpg', 'a0000000-0000-4000-a000-000000000012');
:I2
select tests.faalt('upsert-foto: een foto die als bewijs in een actie staat, kan niet worden overschreven',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/na-c5.jpg', auth.uid())
     on conflict (bucket_id, name) do update set owner = excluded.owner, updated_at = now() returning *$q$, '%row-level security%');
:I1
select tests.faalt('upsert-foto: andermans foto overschrijven geweigerd',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/abc123.jpg', auth.uid())
     on conflict (bucket_id, name) do update set owner = excluded.owner returning *$q$, '%row-level security%');

-- =====================================================================
-- 24. Beveiligingsronde: aanvullende validatie en uploadquotum (migratie 0007)
-- =====================================================================
-- 24a. datums: altijd tussen 2000 en 2100; vanuit de app tussen 2 jaar terug en 5 jaar vooruit
-- (coördinator D: I1 heeft in 23i zijn dagquotum al opgebruikt)
:D
select tests.faalt('datum: planning in het jaar 9999 geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-s1', '9999-12-31', 'ROO', auth.uid())$q$, '%niet tussen twee jaar%');
select tests.faalt('datum: planning drie jaar terug geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-s2', current_date - 1100, 'ROO', auth.uid())$q$, '%niet tussen twee jaar%');
select tests.lukt('datum: planning over een week mag',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-s3', current_date + 7, 'ROO', auth.uid())$q$);
select tests.lukt('datum: planning een maand terug (achteraf inplannen) mag',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-s4', current_date - 30, 'ROO', auth.uid())$q$);
select tests.faalt('datum: eigen planning verzetten naar over zes jaar geweigerd',
  $q$update public.planning set datum = current_date + 2200 where id = 'PL-s3'$q$, '%niet tussen twee jaar%');
select tests.lukt('datum: andere velden van een planning wijzigen zonder de datum mag',
  $q$update public.planning set toelichting = 'Let op hijswerk' where id = 'PL-s3'$q$);
select tests.faalt('datum: handmatige actie met plandatum over tien jaar geweigerd',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-s1', 'Opstap herstellen', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000002',
             'b0000000-0000-4000-a000-000000000001', current_date + 3650)$q$, '%niet tussen twee jaar%');
:PG
select tests.faalt('datum: ook beheer via SQL kan geen jaar 9999 opslaan (CHECK)',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-s5', '9999-12-31', 'ROO', 'a0000000-0000-4000-a000-000000000011')$q$,
  '%datum_bereik%');

-- 24b. vrije tekst: geen besturingstekens of bidi-overrides
:D
select tests.faalt('tekst: planning-toelichting met bidi-override (U+202E) geweigerd',
  format('insert into public.planning (id, datum, code, inspecteur, toelichting) values (%L, current_date + 1, %L, auth.uid(), %L)',
         'PL-s6', 'ROO', 'Hijswerk ' || U&'\202E' || 'kcehc'), '%tekst_tekens%');
select tests.faalt('tekst: planning-locatie met besturingsteken (BEL) geweigerd',
  format('insert into public.planning (id, datum, code, inspecteur, locatie) values (%L, current_date + 1, %L, auth.uid(), %L)',
         'PL-s7', 'ROO', 'RWZI' || chr(7)), '%tekst_tekens%');
select tests.lukt('tekst: toelichting met regeleinde, tab, accenten en emoji mag',
  format('insert into public.planning (id, datum, code, inspecteur, toelichting) values (%L, current_date + 1, %L, auth.uid(), %L)',
         'PL-s8', 'ROO', E'Café-terrein:\n\tmobiele kraan 👷‍♂️'));
select tests.faalt('tekst: actietekst met bidi-isolate (U+2066) geweigerd',
  format('insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum) values (%L, %L, %L, true, %L, %L, %L, current_date + 3)',
         'ACT-s2', 'Kabel ' || U&'\2066' || 'ophangen', '–', 'Open', 'c0000000-0000-4000-a000-000000000002', 'b0000000-0000-4000-a000-000000000001'),
  '%tekst_tekens%');
:I2
select tests.faalt('tekst: inspectietitel met besturingsteken geweigerd',
  format('insert into public.inspecties (id, titel) values (%L, %L)', 'WPI-s1', 'Damwand' || chr(27) || '[2J'), '%tekst_tekens%');
select tests.faalt('tekst: besturingsteken in de tekst van een waarneming (record) geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-s2', 'x', '{"waarnemingen":[{"oordeel":"C","tekst":"ok\u0007"}]}')$q$, '%tekst_tekens%');
select tests.faalt('tekst: bidi-override in het gesprek (record) geweigerd',
  format('insert into public.inspecties (id, titel, record) values (%L, %L, %L)', 'WPI-s3', 'x',
         jsonb_build_object('gesprek', 'goed ' || U&'\202E' || 'tseg')), '%tekst_tekens%');
select tests.lukt('tekst: een letterlijk getypte backslash-u (C:\u0001) in het record mag',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-s4', 'x', '{"gesprek":"pad C:\\u0001\\map","positief":"regel1\nregel2"}')$q$);
select tests.klopt('tekst: de helpers zelf', public.tekst_tekens_ok(E'a\tb\nc\r') and not public.tekst_tekens_ok('a' || chr(0127))
  and not public.tekst_tekens_ok(U&'\202D') and public.tekst_tekens_ok(null) and public.record_tekens_ok('{"a":"\\\\u0007"}')
  and not public.record_tekens_ok('{"a":"\\\\\u0007"}'));

-- 24c. fotopaden in de momentopname: alleen de eigen map
select tests.lukt('fotos: eigen fotopad (en lege handtekening) in het record mag',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-s5', 'x',
     '{"waarnemingen":[{"oordeel":"C","foto":"a0000000-0000-4000-a000-000000000012/abc.jpg","extraFotos":[{"foto":"fotos/a0000000-0000-4000-a000-000000000012/def.webp"}]}],"handtekening":"","fotos":{"r1":null}}')$q$);
select tests.faalt('fotos: andermans fotopad in een waarneming geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-s6', 'x', '{"waarnemingen":[{"oordeel":"A","foto":"a0000000-0000-4000-a000-000000000011/voor.jpg"}]}')$q$,
  '%fotos_eigen%');
select tests.klopt('fotos: alle plekken en vormen gecontroleerd (record_fotos_ok)',
  public.record_fotos_ok('{"waarnemingen":[{"foto":"a0000000-0000-4000-a000-000000000012/a.png"}]}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"handtekening":"a0000000-0000-4000-a000-000000000011/sig.png"}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"waarnemingen":[{"extraFotos":[{"foto":"a0000000-0000-4000-a000-000000000011/x.jpg"}]}]}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"fotos":{"r7":"a0000000-0000-4000-a000-000000000011/x.jpg"}}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"fotos":["a0000000-0000-4000-a000-000000000011/x.jpg"]}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"foto":"a0000000-0000-4000-a000-000000000012/../a0000000-0000-4000-a000-000000000011/x.jpg"}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"foto":"javascript:alert(1)"}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"foto":"https://evil.example/x.jpg"}', 'a0000000-0000-4000-a000-000000000012')
  and not public.record_fotos_ok('{"nafoto":"a0000000-0000-4000-a000-000000000012/x.svg"}', 'a0000000-0000-4000-a000-000000000012')
  and public.record_fotos_ok('{"tekst":"a0000000-0000-4000-a000-000000000011/x.jpg","foto":null}', 'a0000000-0000-4000-a000-000000000012'));

-- 24d. uploadquotum: max 120 foto's per uur per gebruiker
:I1
select tests.lukt('quotum: een gewone upload lukt',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000011/q0.jpg', auth.uid())$q$);
select tests.faalt('quotum: 200 uploads in één keer geweigerd',
  $q$insert into storage.objects (bucket_id, name, owner) select 'fotos', 'a0000000-0000-4000-a000-000000000011/q' || g || '.jpg', auth.uid() from generate_series(1, 200) g$q$,
  '%row-level security%');
select tests.telt('quotum: niets van de vloed opgeslagen',
  $q$select * from storage.objects where name like 'a0000000-0000-4000-a000-000000000011/q%'$q$, 1);
:I2
select tests.lukt('quotum: telt per gebruiker (een ander kan nog gewoon uploaden)',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/q0.jpg', auth.uid())$q$);

-- =====================================================================
-- 25. Aanvalstest (beveiligingsronde): elke bevinding als regressietest
-- =====================================================================
-- 25a. besturingstekens: record en kolommen volgen precies dezelfde regel (tekst_tekens_ok)
:I2
select tests.faalt('tekens: backspace (U+0008) in het gesprek (record) geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk1', 't', jsonb_build_object('gesprek', 'abc' || chr(8) || chr(8) || chr(8) || 'xyz'))$q$, '%tekst_tekens%');
select tests.faalt('tekens: form feed (U+000C) in het record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk1', 't', jsonb_build_object('positief', 'ok' || chr(12)))$q$, '%tekst_tekens%');
select tests.faalt('tekens: besturingsteken in een SLEUTEL van het record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk1', 't', jsonb_build_object('a' || chr(27), 'x'))$q$, '%tekst_tekens%');
select tests.faalt('tekens: C1-besturingstekens (U+009B CSI, U+0085 NEL) in een actietekst geweigerd',
  $q$insert into public.acties (id, tekst, status) values ('ACT-atk2', 'ok' || chr(155) || '31m' || chr(133) || 'Status: Afgerond', 'Voorstel')$q$, '%tekst_tekens%');
select tests.faalt('tekens: zero-width space (U+200B) in een actietekst geweigerd',
  $q$insert into public.acties (id, tekst, status) values ('ACT-atk2', 'Afge' || U&'\200B' || 'rond', 'Voorstel')$q$, '%tekst_tekens%');
select tests.faalt('tekens: LRM/RLM (U+200E/U+200F) en U+061C in het record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk1', 't', jsonb_build_object('w', jsonb_build_array('a' || U&'\200F' || 'b')))$q$, '%tekst_tekens%');
select tests.faalt('tekens: regelscheider U+2028 in een actietekst geweigerd',
  $q$insert into public.acties (id, tekst, status) values ('ACT-atk2', 'regel' || U&'\2028' || 'twee', 'Voorstel')$q$, '%tekst_tekens%');
select tests.lukt('tekens: emoji met zero-width joiner (👷‍♀️), regeleinde en tab in het record mag',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk1', 't', jsonb_build_object('gesprek', E'Goed gesprek 👷‍♀️\n\tafspraak'))$q$);
select tests.klopt('tekens: record_tekens_ok en tekst_tekens_ok zijn het voor elk teken U+0001–U+10FFFF eens (waarde en sleutel)',
  (select bool_and(public.tekst_tekens_ok(chr(c)) = public.record_tekens_ok(jsonb_build_object('a', 'x' || chr(c) || 'y'))
               and public.tekst_tekens_ok(chr(c)) = public.record_tekens_ok(jsonb_build_object('k' || chr(c), 1)))
     from generate_series(1, 1114111) c where c not between 55296 and 57343));

-- 25b. de foto van een actie uit een inspectie is de foto uit de momentopname en ligt vast
:PG
insert into storage.objects (bucket_id, name, owner) values
  ('fotos', 'a0000000-0000-4000-a000-000000000012/orig.jpg', 'a0000000-0000-4000-a000-000000000012'),
  ('fotos', 'a0000000-0000-4000-a000-000000000012/nep.jpg', 'a0000000-0000-4000-a000-000000000012');
:I2
select tests.lukt('foto-snapshot: inspectie met foto bij de waarneming en een actievoorstel',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-atk3', 't',
     '{"waarnemingen":[{"tekst":"Put open","oordeel":"A","foto":"a0000000-0000-4000-a000-000000000012/orig.jpg","actie":{"actie_id":"ACT-atk3","prio":"kort"}}]}')$q$);
select tests.faalt('foto-snapshot: actie met een ANDERE eigen foto dan in de momentopname geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status, foto_pad)
     values ('ACT-atk3', 'WPI-atk3', '', 'A', 'Put open', 'kort', 'Voorstel', 'a0000000-0000-4000-a000-000000000012/nep.jpg')$q$, '%foto van de waarneming%');
select tests.faalt('foto-snapshot: actie zonder foto terwijl de waarneming er een heeft geweigerd',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status)
     values ('ACT-atk3', 'WPI-atk3', '', 'A', 'Put open', 'kort', 'Voorstel')$q$, '%foto van de waarneming%');
select tests.lukt('foto-snapshot: actie met de foto uit de momentopname (met "fotos/" ervoor) mag',
  $q$insert into public.acties (id, inspectie_id, tekst, oordeel, waarneming, prio, status, foto_pad)
     values ('ACT-atk3', 'WPI-atk3', '', 'A', 'Put open', 'kort', 'Voorstel', 'fotos/a0000000-0000-4000-a000-000000000012/orig.jpg')$q$);
select tests.faalt('foto-snapshot: foto daarna leegmaken geweigerd (ook door de inspecteur zelf)',
  $q$update public.acties set foto_pad = null where id = 'ACT-atk3'$q$, '%liggen vast%');
select tests.faalt('foto-snapshot: foto daarna vervangen door een andere eigen foto geweigerd',
  $q$update public.acties set foto_pad = 'a0000000-0000-4000-a000-000000000012/nep.jpg' where id = 'ACT-atk3'$q$, '%liggen vast%');
select tests.raakt('foto-snapshot: de foto in de momentopname kan de inspecteur niet uit Storage verwijderen',
  $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/orig.jpg'$q$, 0);

-- 25c. prestatie: uploaden en foto's opvragen blijft snel bij veel foto's en acties (Supabase: 8 s timeout)
:PG
create or replace function tests.duur(p_sql text) returns interval
language plpgsql as $$
declare t0 timestamptz := clock_timestamp();
begin
  execute p_sql;
  return clock_timestamp() - t0;
end $$;
grant execute on function tests.duur(text) to authenticated;
insert into storage.objects (bucket_id, name, owner)
  select 'fotos', 'a0000000-0000-4000-a000-000000000011/p' || g || '.jpg', 'a0000000-0000-4000-a000-000000000011'
    from generate_series(1, 1000) g;
insert into public.acties (id, tekst, status, foto_pad)
  select 'ACT-perf' || g, 'x', 'Voorstel', case when g % 2 = 0 then 'a0000000-0000-4000-a000-000000000011/p' || g || '.jpg' end
    from generate_series(1, 1000) g;
analyze public.acties;
:I2
set statement_timeout = '8s';
select tests.klopt('prestatie: upload als inspecteur bij 1000 foto''s × 1000 acties duurt < 1 s',
  tests.duur($q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/p0.jpg', auth.uid())$q$) < interval '1 second');
select tests.klopt('prestatie: alle zichtbare foto''s opsommen als inspecteur duurt < 2 s',
  tests.duur($q$select count(*) from storage.objects$q$) < interval '2 seconds');
select tests.klopt('prestatie: één foto via een actie opvragen duurt < 0,2 s',
  tests.duur($q$select * from storage.objects where bucket_id = 'fotos' and name = 'a0000000-0000-4000-a000-000000000011/p2.jpg'$q$) < interval '200 milliseconds');
reset statement_timeout;
:PG
select tests.klopt('prestatie: het quotum telt in public.foto_uploads (niet in storage.objects)',
  (select count(*) from public.foto_uploads where wie = 'a0000000-0000-4000-a000-000000000012') >= 1
  and not exists (select 1 from information_schema.role_table_grants
                   where table_schema = 'public' and table_name = 'foto_uploads' and grantee in ('anon', 'authenticated')));

-- =====================================================================
-- 26. Aanvalstest ronde 4: regressietests voor de bevindingen van de tweede aanvalsronde
-- =====================================================================
-- 26a. onzichtbare tekens buiten de BMP, zacht afbreekstreepje en opvullers ("ASCII smuggling")
:I2
select tests.faalt('tekens: Unicode-tag-tekens (U+E0061…) in een actietekst geweigerd',
  $q$insert into public.acties (id, tekst, status) values ('ACT-t1', 'Leuning' || chr(917601) || chr(917606) || chr(917631), 'Voorstel')$q$, '%tekst_tekens%');
select tests.faalt('tekens: tag-tekens in een SLEUTEL van het record geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-t1', 't', jsonb_build_object('gesprek' || chr(917601), 'x'))$q$, '%tekst_tekens%');
select tests.faalt('tekens: zacht afbreekstreepje (U+00AD) in de waarnemingstekst (record) geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-t1', 't', jsonb_build_object('waarnemingen', jsonb_build_array(jsonb_build_object('oordeel', 'C', 'tekst', 'Afge' || chr(173) || 'rond'))))$q$, '%tekst_tekens%');
select tests.klopt('tekens: U+00AD, U+034F, U+115F, U+3164, U+FFA0, U+FFF9, U+1D173, U+E0001, U+E007F en U+E0100 geweigerd',
  (select bool_and(not public.tekst_tekens_ok('a' || chr(c) || 'b'))
     from unnest(array[173, 847, 4447, 12644, 65440, 65529, 119155, 917505, 917631, 917760]) c));
select tests.klopt('tekens: emoji met ZWJ en variatiekiezer (👷‍♀️, ❤️) en accenten blijven toegestaan',
  public.tekst_tekens_ok('Café 👷‍♀️ ❤️ naïef') and public.record_tekens_ok(jsonb_build_object('gesprek', 'Café 👷‍♀️ ❤️')));
select tests.lukt('tekens: een getypte backslash + b/f in het record ("C:\bin\fmap") is geen besturingsteken',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-t2', 't', '{"gesprek":"pad C:\\bin\\fmap en \\\\u0008"}')$q$);
:H
select tests.faalt('tekens: monteursnaam met tag-tekens geweigerd (iedereen ziet de naam)',
  $q$insert into public.monteurs (naam) values ('Wim' || chr(917601) || chr(917631) || ' Tag')$q$, '%tekens%');

-- 26b. extraFotos: ook een losse tekst in de lijst is een foto (de app toont hem zo)
:I1
select tests.klopt('fotos: andermans pad als TEKST in extraFotos geweigerd door record_fotos_ok',
  not public.record_fotos_ok('{"waarnemingen":[{"oordeel":"A","extraFotos":["a0000000-0000-4000-a000-000000000012/na-c5.jpg"]}]}', 'a0000000-0000-4000-a000-000000000011')
  and not public.record_fotos_ok('{"waarnemingen":[{"extraFotos":[["a0000000-0000-4000-a000-000000000012/x.jpg"]]}]}', 'a0000000-0000-4000-a000-000000000011')
  and public.record_fotos_ok('{"waarnemingen":[{"extraFotos":["a0000000-0000-4000-a000-000000000011/eigen.jpg",{"foto":"a0000000-0000-4000-a000-000000000011/b.jpg"},null,""]}]}', 'a0000000-0000-4000-a000-000000000011'));
select tests.faalt('fotos: inspectie met de foto van een collega als tekst in extraFotos geweigerd',
  $q$insert into public.inspecties (id, inspecteur_id, titel, record, opgeslagen) values ('WPI-x1', auth.uid(), 'Test',
     '{"waarnemingen":[{"oordeel":"A","tekst":"zie foto","extraFotos":["a0000000-0000-4000-a000-000000000012/na-c5.jpg"]}]}', now())$q$, '%fotos_eigen%');
select tests.klopt('fotos: een foto dieper dan 64 niveaus wordt niet overgeslagen maar geweigerd',
  not public.record_fotos_ok(('{"fotos":' || repeat('[', 70) || '"a0000000-0000-4000-a000-000000000012/x.jpg"' || repeat(']', 70) || '}')::jsonb, 'a0000000-0000-4000-a000-000000000011')
  and not public.record_fotos_ok(('{"a":' || repeat('[', 70) || '1' || repeat(']', 70) || '}')::jsonb, 'a0000000-0000-4000-a000-000000000011'));

-- 26c. rekentijd: een groot of diep record wordt goedkoop geweigerd (Supabase: statement_timeout 8 s)
:I2
set statement_timeout = '8s';
select tests.klopt('vorm: 250.000 lege lijsten (< 1 MB) binnen 1 s geweigerd ("te groot")',
  tests.duur($q$select tests.faalt('vorm: record met 250.000 lege lijsten geweigerd',
    $x$insert into public.inspecties (id, inspecteur_id, titel, record, opgeslagen) select 'WPI-dos1', auth.uid(), 'x', jsonb_build_object('fotos', jsonb_agg('[]'::jsonb)), now() from generate_series(1, 250000)$x$, '%te groot%')$q$) < interval '1 second');
select tests.klopt('vorm: 30.000 elementen in 90 KB binnen 0,5 s geweigerd ("te veel onderdelen")',
  tests.duur($q$select tests.faalt('vorm: record met 30.000 elementen geweigerd',
    $x$insert into public.inspecties (id, inspecteur_id, titel, record, opgeslagen) select 'WPI-dos2', auth.uid(), 'x', jsonb_build_object('w', jsonb_agg(0)), now() from generate_series(1, 30000)$x$, '%te veel onderdelen%')$q$) < interval '500 milliseconds');
select tests.faalt('vorm: record van 40 niveaus diep geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-dos3', 'x', ('{"a":' || repeat('[', 40) || repeat(']', 40) || '}')::jsonb)$q$, '%te diep%');
select tests.faalt('vorm: meer dan 500 waarnemingen geweigerd',
  $q$insert into public.inspecties (id, titel, record) select 'WPI-dos4', 'x', jsonb_build_object('waarnemingen', jsonb_agg(jsonb_build_object('oordeel', 'C'))) from generate_series(1, 501)$q$, '%500 waarnemingen%');
select tests.klopt('vorm: record_tekens_ok op 250.000 lege lijsten duurt < 1 s (was 5–11 s)',
  tests.duur($q$select public.record_tekens_ok(jsonb_build_object('fotos', jsonb_agg('[]'::jsonb))) from generate_series(1, 250000)$q$) < interval '1 second');
select tests.lukt('vorm: een gewone inspectie met 60 waarnemingen van 2000 tekens (± 125 KB) mag',
  $q$insert into public.inspecties (id, titel, record) select 'WPI-dos5', 'x', jsonb_build_object('waarnemingen', jsonb_agg(jsonb_build_object('oordeel', 'C', 'tekst', repeat('Goed, netjes. ', 142)))) from generate_series(1, 60)$q$);
reset statement_timeout;

-- 26d. bewijs kan niet (opnieuw) worden geüpload zodra het gekoppeld is, ook niet na verwijderen
--      (als inspecteur 2: inspecteur 1 zit sinds 23 aan zijn dagquotum)
:I2
select tests.lukt('bewijs: actie koppelen aan een eigen pad dat (nog) niet bestaat',
  $q$insert into public.acties (id, tekst, status, foto_pad, waarneming) values ('ACT-ev1', 'Leuning plaatsen', 'Voorstel', 'a0000000-0000-4000-a000-000000000012/bewijs-ev1.jpg', 'Leuning ontbrak')$q$);
select tests.faalt('bewijs: daarna iets uploaden onder dat gekoppelde pad geweigerd',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/bewijs-ev1.jpg', auth.uid())$q$, '%row-level security%');
select tests.lukt('bewijs: een nieuwe, nog niet gekoppelde foto uploaden mag gewoon (eerst uploaden, dan koppelen)',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/bewijs-ev2.jpg', auth.uid())$q$);
select tests.lukt('bewijs: en daarna koppelen aan een actie',
  $q$insert into public.acties (id, tekst, status, foto_pad, waarneming) values ('ACT-ev2', 'Afzetting plaatsen', 'Voorstel', 'a0000000-0000-4000-a000-000000000012/bewijs-ev2.jpg', 'Afzetting weg')$q$);
:H2
select tests.raakt('bewijs: het hoofd verwijdert de foto (AVG/bewaartermijn)',
  $q$delete from storage.objects where name = 'a0000000-0000-4000-a000-000000000012/bewijs-ev2.jpg'$q$, 1);
:I2
select tests.faalt('bewijs: na verwijderen een andere foto onder dezelfde naam zetten geweigerd',
  $q$insert into storage.objects (bucket_id, name, owner) values ('fotos', 'a0000000-0000-4000-a000-000000000012/bewijs-ev2.jpg', auth.uid())$q$, '%row-level security%');

-- =====================================================================
-- 26. Rollen van het echte team (0008): beheerder, QHSE-manager, tweede hoofd, nog geen rol,
--     MFA voor de beheerrollen, verloop-tekens en de bewaartermijn van 7 jaar
-- =====================================================================
:PG
insert into tests.gebruiker values
  ('B',  'd0000000-0000-4000-a000-000000000022'),  -- beheerder
  ('M',  'b0000000-0000-4000-a000-000000000002'),  -- tweede hoofd, functie Manager Projects
  ('NR', 'f0000000-0000-4000-a000-000000000047');  -- uitgenodigd, nog geen rol
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('d0000000-0000-4000-a000-000000000022', 'beheer@test.invalid',  '{"full_name":"Beheer Der"}'),
  ('b0000000-0000-4000-a000-000000000002', 'manager@test.invalid', '{"full_name":"Manager Projecten"}'),
  ('f0000000-0000-4000-a000-000000000047', 'norol@test.invalid',   '{"full_name":"Nog Geen Rol"}');
update auth.users set invited_at = now()
 where id in ('d0000000-0000-4000-a000-000000000022', 'b0000000-0000-4000-a000-000000000002', 'f0000000-0000-4000-a000-000000000047');
commit;
update public.profiles set role = 'beheerder', functie = 'Applicatiebeheerder' where id = 'd0000000-0000-4000-a000-000000000022';
update public.profiles set role = 'hoofd', functie = 'Manager Projects' where id = 'b0000000-0000-4000-a000-000000000002';
\set B  'reset role; select tests.als(''B'');  set role authenticated;'
\set B2 'reset role; select tests.als(''B'', ''aal2''); set role authenticated;'
\set Q2 'reset role; select tests.als(''Q'', ''aal2''); set role authenticated;'
\set M  'reset role; select tests.als(''M'');  set role authenticated;'
\set M2 'reset role; select tests.als(''M'', ''aal2''); set role authenticated;'
\set NR 'reset role; select tests.als(''NR''); set role authenticated;'
select tests.klopt('rollen: enum kent beheerder (en nog steeds inspecteur, voor compatibiliteit)',
  enum_range(null::public.user_role)::text[] @> array['inspecteur', 'coordinator', 'hoofd', 'qhse', 'beheerder']);
select tests.klopt('rollen: uitgenodigd profiel is actief maar heeft nog geen rol',
  (select actief and role is null from public.profiles where id = 'f0000000-0000-4000-a000-000000000047'));

-- 26a. nog geen rol = nog geen toegang (wel de eigen rij, zodat de app "nog geen rol" kan zeggen)
:NR
select tests.telt('nog geen rol: ziet alleen het eigen profiel', $q$select * from public.profiles$q$, 1);
select tests.telt('nog geen rol: ziet geen monteurs', $q$select * from public.monteurs$q$, 0);
select tests.telt('nog geen rol: ziet geen inspecties', $q$select * from public.inspecties$q$, 0);
select tests.faalt('nog geen rol: actie aanmaken geweigerd', $q$insert into public.acties (id, tekst) values ('ACT-nr', 'x')$q$, '%row-level security%');
select tests.faalt('nog geen rol: dashboard geweigerd', $q$select public.dashboard_cijfers()$q$, '%alleen voor de coördinatoren%');
:W
select tests.faalt('nog geen rol: kan geen actiehouder zijn',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-nr2', 'x', '–', true, 'Open', 'f0000000-0000-4000-a000-000000000047', 'c0000000-0000-4000-a000-000000000003', current_date + 3)$q$,
  '%nog geen rol%');

-- 26b. beheerder: ziet alles en beheert, maar inspecteert en plant niet
:B
select tests.klopt('beheerder: mag alles lezen en beheren, is geen staf en inspecteert niet',
  public.mag_alles_lezen() and public.is_beheer_admin() and not public.is_staf() and not public.mag_inspecteren());
select tests.klopt('beheerder: leest alle inspecties (zoals een coördinator)',
  (select count(*) from public.inspecties) > 0);
select tests.klopt('beheerder: ziet het dashboard', (select public.dashboard_cijfers() ? 'inspecties'));
select tests.klopt('beheerder: leest de auditlog en de beveiligingsgebeurtenissen',
  exists (select 1 from public.audit_log) and exists (select 1 from public.security_events));
select tests.telt('beheerder: ziet ook het profiel zonder rol en de niet-uitgenodigde aanmelding (beheer)',
  $q$select * from public.profiles where id in ('f0000000-0000-4000-a000-000000000047', 'f0000000-0000-4000-a000-000000000042')$q$, 2);
select tests.lukt('beheerder: monteur toevoegen', $q$insert into public.monteurs (naam) values ('Bert Beheerlijst')$q$);
select tests.lukt('beheerder: doel_conform wijzigen (80) en terug (85)',
  $q$update public.instellingen set waarde = '80' where sleutel = 'doel_conform';
     update public.instellingen set waarde = '85' where sleutel = 'doel_conform'$q$);
select tests.lukt('beheerder: een uitgenodigd profiel een rol geven (coördinator)',
  $q$update public.profiles set role = 'coordinator', functie = 'Montage Coördinator' where id = 'f0000000-0000-4000-a000-000000000047'$q$);
select tests.faalt('beheerder: de oude rol inspecteur toekennen geweigerd',
  $q$update public.profiles set role = 'inspecteur' where id = 'f0000000-0000-4000-a000-000000000047'$q$, '%inspecteur wordt niet meer toegekend%');
select tests.faalt('beheerder: eigen rol naar hoofd zetten geweigerd (geen zelfpromotie)',
  $q$update public.profiles set role = 'hoofd' where id = auth.uid()$q$, '%eigen rol%');
select tests.faalt('beheerder: zichzelf deactiveren geweigerd',
  $q$update public.profiles set actief = false where id = auth.uid()$q$, '%eigen rol%');
select tests.faalt('beheerder: inspectie aanmaken geweigerd (inspecteert niet)',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-b1', 'x', '{}')$q$, '%row-level security%');
select tests.faalt('beheerder: planning maken geweigerd (leest alleen)',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-b1', current_date + 1, 'DAM', 'c0000000-0000-4000-a000-000000000002')$q$, '%row-level security%');
select tests.raakt('beheerder: planning wijzigen raakt niets', $q$update public.planning set locatie = 'x'$q$, 0);
-- de laatste-hoofd-bescherming geldt ook voor de beheerder
select tests.lukt('beheerder: tweede hoofd (Manager Projects) tijdelijk coördinator maken',
  $q$update public.profiles set role = 'coordinator' where id = 'b0000000-0000-4000-a000-000000000002'$q$);
select tests.faalt('beheerder: het laatste actieve hoofd degraderen geweigerd',
  $q$update public.profiles set role = 'qhse' where id = 'b0000000-0000-4000-a000-000000000001'$q$, '%minstens één actief hoofd%');
select tests.faalt('beheerder: het laatste actieve hoofd deactiveren geweigerd',
  $q$update public.profiles set actief = false where id = 'b0000000-0000-4000-a000-000000000001'$q$, '%minstens één actief hoofd%');
select tests.lukt('beheerder: Manager Projects weer hoofd',
  $q$update public.profiles set role = 'hoofd' where id = 'b0000000-0000-4000-a000-000000000002'$q$);
:M
select tests.klopt('tweede hoofd (Manager Projects): dezelfde rechten als het hoofd',
  public.is_hoofd() and public.is_staf() and public.mag_inspecteren() and public.is_beheer_admin());
select tests.faalt('tweede hoofd: zichzelf degraderen geweigerd (eigen rol)',
  $q$update public.profiles set role = 'coordinator' where id = auth.uid()$q$, '%eigen rol%');

-- 26c. QHSE-manager: ziet alles en beheert; toetser ja, actiehouder nooit; inspecteert niet
:Q
select tests.klopt('qhse: mag alles lezen en beheren, is geen staf en inspecteert niet',
  public.mag_alles_lezen() and public.is_beheer_admin() and not public.is_staf() and not public.mag_inspecteren());
select tests.lukt('qhse: monteur toevoegen (beheer)', $q$insert into public.monteurs (naam) values ('Quirine Qlijst')$q$);
select tests.lukt('qhse: functie van een collega wijzigen (beheer)',
  $q$update public.profiles set functie = 'Montage Coördinator' where id = 'f0000000-0000-4000-a000-000000000047'$q$);
select tests.faalt('qhse: eigen rol naar coördinator zetten geweigerd (dan zou ze actiehouder kunnen worden)',
  $q$update public.profiles set role = 'coordinator' where id = auth.uid()$q$, '%eigen rol%');
select tests.faalt('qhse: inspectie aanmaken geweigerd',
  $q$insert into public.inspecties (id, titel, record) values ('WPI-q1', 'x', '{}')$q$, '%row-level security%');
:W
select tests.lukt('qhse: als toetser van een nieuwe actie',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-26q', 'Leuning plaatsen', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000021', current_date + 3)$q$);
select tests.faalt('beheerder: als actiehouder geweigerd',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-26b', 'x', '–', true, 'Open', 'd0000000-0000-4000-a000-000000000022', 'c0000000-0000-4000-a000-000000000003', current_date + 3)$q$,
  '%beheerder kan geen actiehouder%');
select tests.faalt('beheerder: als toetser geweigerd',
  $q$insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum)
     values ('ACT-26c', 'x', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000022', current_date + 3)$q$,
  '%beheerder kan geen toetser%');
select tests.faalt('beheerder: later als toetser kiezen geweigerd',
  $q$update public.acties set toetser = 'd0000000-0000-4000-a000-000000000022' where id = 'ACT-26q'$q$, '%beheerder kan geen toetser%');
select tests.faalt('planning: de beheerder als inspecteur inplannen geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-26b', current_date + 2, 'DAM', 'd0000000-0000-4000-a000-000000000022')$q$,
  '%als inspecteur worden ingepland%');
select tests.faalt('planning: de QHSE-manager als inspecteur inplannen geweigerd',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-26q', current_date + 2, 'DAM', 'd0000000-0000-4000-a000-000000000021')$q$,
  '%als inspecteur worden ingepland%');
select tests.lukt('planning: het tweede hoofd (Manager Projects) inplannen mag',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-26m', current_date + 2, 'DAM', 'b0000000-0000-4000-a000-000000000002')$q$);
select tests.faalt('planning: daarna aan de QHSE-manager toewijzen geweigerd',
  $q$update public.planning set inspecteur = 'd0000000-0000-4000-a000-000000000021' where id = 'PL-26m'$q$, '%als inspecteur worden ingepland%');
:D
select tests.lukt('qhse: houder meldt klaar voor toetsing', $q$update public.acties set status = 'Klaar voor toetsing' where id = 'ACT-26q'$q$);
-- 26c2. nagemaakte serverregels in het verloop (critic: variatiekiezers, lookalikes, onzichtbare tekst). D is
--       actiehouder van ACT-26q, dat nu echt op 'Klaar voor toetsing' staat: precies de situatie uit de melding.
select tests.faalt('verloop-spoof: VS16 na het woord ("Status<VS16>: Klaar voor toetsing → Afgerond", melding van de critic) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\FE0F: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: VS16 midden in het woord geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Sta\FE0Ftus: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: VS1 (U+FE00) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\FE00: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: VS15 (U+FE0E) na een letter geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\FE0E: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: Mongoolse variatiekiezer U+180B geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\180B: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: Mongoolse variatiekiezer U+180F geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\180F: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: braillespatie U+2800 geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\2800: Klaar voor toetsing \2192 Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: "Aangemaakt<VS16> met status" geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Aangemaakt\FE0F met status Open')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: "Actiehouder<VS16>, toetser of plandatum gewijzigd" geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Actiehouder\FE0F, toetser of plandatum gewijzigd')$q$, '%onzichtbare%');
select tests.faalt('verloop-spoof: RATIO U+2236 als dubbele punt geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\2236 Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: modifier letter colon U+A789 geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Status\A789 Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: Cyrillische S (U+0405) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\0405tatus: Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: helemaal Cyrillisch/Grieks (Ѕτατυѕ) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\0405\03C4\03B1\03C4\03C5\0455: Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: wiskundige vette S (U+1D412) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\+01D412tatus: Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: spaties tussen de letters geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', 'S t a t u s : Klaar voor toetsing → Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: met accent (Stätus) geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'St\00E4tus: Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: emoji ervoor geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\2705 Status: Klaar voor toetsing \2192 Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-spoof: "Aangemaakt∶ met status" geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Aangemaakt\2236 met status Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-leeg: alleen "ho<VS16>i" geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', 'ho' || U&'\FE0F' || 'i')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen VS1 geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\FE00')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen U+180F geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\180F')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen een braillespatie geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\2800')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen U+3000 geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\3000')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen spaties geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', '   ')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen U+00A0 geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\00A0')$q$, '%onzichtbare%');
select tests.faalt('verloop-leeg: alleen een ZWJ en VS16 geweigerd (geen zichtbaar teken of losse variatiekiezer)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'\200D\FE0F')$q$, '%onzichtbare%');
select tests.lukt('verloop-spoof: gewone regels van de app mogen ("Klaar voor toetsing gemeld", ook met "status" verderop)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', 'Klaar voor toetsing gemeld, met na-foto'),
     ('ACT-26q', 'Toelichting: status volgens de ploeg in orde')$q$);
select tests.lukt('verloop-spoof: emoji met VS16, VS15 na een pijl en een toetsdop (1️⃣) mogen',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-26q', U&'Top \2764\FE0F 1\FE0F\20E3 \2194\FE0E klaar')$q$);
select tests.klopt('verloop-spoof: geen enkele clientregel van ACT-26q lijkt op een serverregel of bevat een losse variatiekiezer',
  not exists (select 1 from public.actie_log where actie_id = 'ACT-26q' and bron = 'client'
              and (public.verloop_lijkt_serverregel(wat) or not public.verloop_tekens_ok(wat))));
select tests.klopt('verloop-spoof: de echte statusregels van ACT-26q staan er wel, met bron server',
  exists (select 1 from public.actie_log where actie_id = 'ACT-26q' and bron = 'server' and wat like 'Status: % → Klaar voor toetsing'));
:Q
select tests.lukt('qhse: rondt als toetser af (Afgerond pas na toetsing)', $q$update public.acties set status = 'Afgerond' where id = 'ACT-26q'$q$);

-- 26d. MFA (aal2) voor ALLE beheerrollen zodra die verplicht is
:PG
update public.instellingen set waarde = 'true' where sleutel = 'mfa_verplicht_hoofd';
update public.monteurs set actief = false where naam = 'Quirine Qlijst';
:B
select tests.faalt('beheerder zonder MFA (aal1): nieuwe monteur via monteur_aanmelden geweigerd',
  $q$select public.monteur_aanmelden('Mfa Beheer Nieuw')$q$, '%Alleen wie inspecteert%');
select tests.faalt('beheerder zonder MFA (aal1): non-actieve monteur via monteur_aanmelden weer actief maken geweigerd',
  $q$select public.monteur_aanmelden('Quirine Qlijst')$q$, '%Alleen wie inspecteert%');
select tests.faalt('beheerder zonder MFA (aal1): monteur toevoegen geweigerd', $q$insert into public.monteurs (naam) values ('Zonder Mfa B')$q$, '%row-level security%');
select tests.raakt('beheerder zonder MFA (aal1): rol wijzigen raakt niets',
  $q$update public.profiles set role = 'hoofd' where id = 'f0000000-0000-4000-a000-000000000047'$q$, 0);
select tests.telt('beheerder zonder MFA (aal1): auditlog niet leesbaar', $q$select * from public.audit_log$q$, 0);
select tests.klopt('beheerder zonder MFA (aal1): geen volledige inzage', not public.mag_alles_lezen() and not public.is_beheer_admin());
select tests.telt('beheerder zonder MFA (aal1): leest geen inspecties', $q$select * from public.inspecties$q$, 0);
:Q
select tests.faalt('qhse zonder MFA (aal1): nieuwe monteur via monteur_aanmelden geweigerd',
  $q$select public.monteur_aanmelden('Mfa Qhse Nieuw')$q$, '%Alleen wie inspecteert%');
select tests.faalt('qhse zonder MFA (aal1): non-actieve monteur via monteur_aanmelden weer actief maken geweigerd',
  $q$select public.monteur_aanmelden('Quirine Qlijst')$q$, '%Alleen wie inspecteert%');
select tests.faalt('qhse zonder MFA (aal1): instelling wijzigen geweigerd',
  $q$insert into public.instellingen (sleutel, waarde) values ('doel_conform', '70') on conflict (sleutel) do update set waarde = excluded.waarde$q$, '%row-level security%');
select tests.telt('qhse zonder MFA (aal1): leest geen inspecties', $q$select * from public.inspecties$q$, 0);
:M
select tests.faalt('tweede hoofd zonder MFA (aal1): monteur toevoegen geweigerd', $q$insert into public.monteurs (naam) values ('Zonder Mfa M')$q$, '%row-level security%');
select tests.faalt('tweede hoofd zonder MFA (aal1): monteur_aanmelden geweigerd (nieuw)',
  $q$select public.monteur_aanmelden('Mfa Hoofd Nieuw')$q$, '%tweestapsverificatie%');
select tests.faalt('tweede hoofd zonder MFA (aal1): monteur_aanmelden geweigerd (weer actief maken)',
  $q$select public.monteur_aanmelden('Quirine Qlijst')$q$, '%tweestapsverificatie%');
:W
select tests.lukt('coördinator (geen beheerrol): monteur toevoegen blijft mogen zonder MFA', $q$insert into public.monteurs (naam) values ('Coor Dinator Lijst')$q$);
select tests.klopt('coördinator (geen beheerrol): monteur_aanmelden tijdens een inspectie blijft mogen zonder MFA',
  (select (public.monteur_aanmelden('Coor Aanmeld Nieuw') ->> 'nieuw')::boolean));
:B2
select tests.lukt('beheerder met MFA (aal2): monteur toevoegen', $q$insert into public.monteurs (naam) values ('Met Mfa B')$q$);
select tests.klopt('beheerder met MFA (aal2): volledige inzage', public.mag_alles_lezen() and public.is_beheer_admin());
select tests.faalt('beheerder met MFA (aal2): monteur_aanmelden blijft geweigerd (inspecteert niet; beheer via de lijst)',
  $q$select public.monteur_aanmelden('Mfa Beheer Nieuw')$q$, '%Alleen wie inspecteert%');
:Q2
select tests.lukt('qhse met MFA (aal2): monteur toevoegen', $q$insert into public.monteurs (naam) values ('Met Mfa Q')$q$);
select tests.faalt('qhse met MFA (aal2): monteur_aanmelden blijft geweigerd (inspecteert niet)',
  $q$select public.monteur_aanmelden('Quirine Qlijst')$q$, '%Alleen wie inspecteert%');
:M2
select tests.klopt('tweede hoofd met MFA (aal2): monteur_aanmelden maakt een non-actieve monteur weer actief',
  (select (public.monteur_aanmelden('Quirine Qlijst') ->> 'heractiveerd')::boolean));
:PG
select tests.klopt('monteur_aanmelden: de geweigerde aanroepen hebben niets toegevoegd',
  not exists (select 1 from public.monteurs where naam in ('Mfa Beheer Nieuw', 'Mfa Qhse Nieuw', 'Mfa Hoofd Nieuw')));
update public.instellingen set waarde = 'false' where sleutel = 'mfa_verplicht_hoofd';
:B
select tests.faalt('beheerder (MFA niet verplicht): monteur_aanmelden geweigerd (inspecteert niet)',
  $q$select public.monteur_aanmelden('Geen Mfa Beheer')$q$, '%Alleen wie inspecteert%');

-- 26d2. "geen doel" zoals PostgREST het schrijft: {"waarde": null} in de body wordt SQL NULL (json_populate_recordset)
:B2
select tests.lukt('doel: "geen doel" via de PostgREST-route (JSON null in de body → SQL NULL) wordt opgeslagen',
  $q$insert into public.instellingen (sleutel, waarde)
     select sleutel, waarde from json_populate_recordset(null::public.instellingen, '[{"sleutel":"doel_conform","waarde":null}]')
     on conflict (sleutel) do update set waarde = excluded.waarde$q$);
select tests.klopt('doel: daarna staat er JSON null (bewust geen doel), niet de standaard 85',
  (select waarde = 'null'::jsonb from public.instellingen where sleutel = 'doel_conform')
  and jsonb_typeof(public.dashboard_cijfers() -> 'doel_conform') = 'null');
select tests.lukt('doel: PATCH met waarde null (PostgREST) wordt ook JSON null',
  $q$update public.instellingen set waarde = null where sleutel = 'doel_conform'$q$);
select tests.lukt('doel: weer een getal (85) via dezelfde route',
  $q$insert into public.instellingen (sleutel, waarde)
     select sleutel, waarde from json_populate_recordset(null::public.instellingen, '[{"sleutel":"doel_conform","waarde":85}]')
     on conflict (sleutel) do update set waarde = excluded.waarde$q$);
select tests.klopt('doel: staat weer op 85', (select (public.dashboard_cijfers() ->> 'doel_conform')::int = 85));
select tests.faalt('doel: NULL voor een andere instelling (mfa_verplicht_hoofd) blijft geweigerd',
  $q$update public.instellingen set waarde = null where sleutel = 'mfa_verplicht_hoofd'$q$, '%null value%');

-- 26d3. wie een niet-inspecterende rol krijgt, staat niet meer als inspecteur in de open planning
:M2
select tests.lukt('planning: het hoofd plant een coördinator in',
  $q$insert into public.planning (id, datum, code, inspecteur) values ('PL-atkT', current_date, 'X', 'c0000000-0000-4000-a000-000000000004')$q$);
select tests.faalt('rollen: die coördinator QHSE-manager maken zolang de planning openstaat geweigerd',
  $q$update public.profiles set role = 'qhse' where id = 'c0000000-0000-4000-a000-000000000004'$q$, '%in de planning%');
select tests.faalt('rollen: of beheerder maken geweigerd',
  $q$update public.profiles set role = 'beheerder' where id = 'c0000000-0000-4000-a000-000000000004'$q$, '%in de planning%');
select tests.faalt('rollen: of de rol weghalen geweigerd',
  $q$update public.profiles set role = null where id = 'c0000000-0000-4000-a000-000000000004'$q$, '%in de planning%');
select tests.lukt('rollen: hoofd maken mag wel (inspecteert ook)',
  $q$update public.profiles set role = 'hoofd' where id = 'c0000000-0000-4000-a000-000000000004'$q$);
select tests.lukt('rollen: en weer coördinator',
  $q$update public.profiles set role = 'coordinator' where id = 'c0000000-0000-4000-a000-000000000004'$q$);
select tests.raakt('planning: inspectie weer weghalen', $q$delete from public.planning where id = 'PL-atkT'$q$, 1);

-- 26e. verloop (actie_log.wat): dezelfde tekenregel als alle vrije tekst (tekst_tekens_ok)
:M
select tests.lukt('verloop-tekens: eigen handmatige actie', $q$insert into public.acties (id, tekst, status) values ('ACT-26t', 'Tekentest', 'Voorstel')$q$);
select tests.faalt('verloop-tekens: Unicode-tag-teken (U+E0041) geweigerd',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-26t', 'Toelichting' || chr(917569)), '%onzichtbare%');
select tests.faalt('verloop-tekens: variatiekiezer U+E0100 geweigerd',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-26t', 'Toelichting' || chr(917760)), '%onzichtbare%');
select tests.faalt('verloop-tekens: opvuller U+3164 geweigerd',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-26t', 'Toelichting' || chr(12644)), '%onzichtbare%');
select tests.lukt('verloop-tekens: emoji met zero-width joiner (U+200D) mag',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-26t', 'Gedaan ' || chr(128119) || chr(8205) || chr(9792) || chr(65039)));
select tests.lukt('verloop-tekens: ook 👩🏽‍💻 (huidskleur), ❤️‍🔥 (VS16 vóór de ZWJ) en 🧑‍🤝‍🧑 (twee ZWJ) mogen',
  format('insert into public.actie_log (actie_id, wie, wat) values (%L, auth.uid(), %L)', 'ACT-26t',
         'Top ' || chr(128105) || chr(127997) || chr(8205) || chr(128187) || ' ' || chr(10084) || chr(65039) || chr(8205) || chr(128293)
         || ' ' || chr(129489) || chr(8205) || chr(129309) || chr(8205) || chr(129489)));
:W
select tests.faalt('verloop-tekens: nagemaakte statusregel "Status<ZWJ>: Open → Afgerond" geweigerd (ZWJ niet tussen emoji)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', 'Status' || U&'\200D' || ': Open → Afgerond')$q$, '%onzichtbare%');
select tests.faalt('verloop-tekens: controle: "Status: Open → Afgerond" geweigerd (alleen de server)',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', 'Status: Open → Afgerond')$q$, '%alleen de server%');
select tests.faalt('verloop-tekens: alleen een ZWJ geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', U&'\200D')$q$, '%onzichtbare%');
select tests.faalt('verloop-tekens: ZWJ midden in een woord ("ho<ZWJ>i") geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', 'ho' || U&'\200D' || 'i')$q$, '%onzichtbare%');
select tests.faalt('verloop-tekens: ZWJ tussen tekst en emoji ("a<ZWJ>👷") geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', 'a' || U&'\200D' || chr(128119))$q$, '%onzichtbare%');
select tests.faalt('verloop-tekens: twee ZWJ achter elkaar tussen emoji geweigerd',
  $q$insert into public.actie_log (actie_id, wat) values ('ACT-11', chr(128119) || U&'\200D\200D' || chr(9792))$q$, '%onzichtbare%');
:PG
select tests.faalt('verloop-tekens: de CHECK weigert een losse ZWJ ook bij beheer via SQL (postgres)',
  $q$insert into public.actie_log (actie_id, wat, bron) values ('ACT-11', 'Status' || U&'\200D' || ': Open', 'server')$q$, '%actie_log_wat_tekens%');
select tests.klopt('verloop-tekens: CHECK actie_log_wat_tekens bestaat (ook voor beheer via SQL)',
  exists (select 1 from pg_constraint where conrelid = 'public.actie_log'::regclass and conname = 'actie_log_wat_tekens'));
select tests.klopt('verloop-tekens: regel van de app = tekst_tekens_ok voor elk codepunt U+0001–U+FFFF en U+E0000–U+E01EF',
  not exists (select 1 from generate_series(1, 917999) cp
              where (cp < 65536 or cp >= 917504) and cp not between 55296 and 57343
                and public.tekst_tekens_ok('a' || chr(cp)) is distinct from
                    (('a' || chr(cp)) !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­͏؜؀-؅۝܏࢐࢑࣢ᅟᅠ឴឵᠎​‌‎‏ -‮⁠-⁯ㅤ﻿ﾠ￹-￻\U000E0000-\U000E007F\U000E0100-\U000E01EF]')));

-- 26f. bewaartermijn 7 jaar: inspecties, acties, planning, verloop, auditregels en foto's
:PG
-- oude rijen maken (triggers even uit, alleen in de test, om tijdstempels van 8 jaar terug te kunnen zetten)
set session_replication_role = replica;
insert into public.inspecties (id, inspecteur_id, titel, opgeslagen, record, created_at, updated_at) values
  ('WPI-oud7', 'b0000000-0000-4000-a000-000000000001', 'Oude inspectie', now() - interval '8 years',
   '{"waarnemingen":[{"oordeel":"A","foto":"b0000000-0000-4000-a000-000000000001/oud-insp.jpg"}]}',
   now() - interval '8 years', now() - interval '8 years');
insert into public.acties (id, tekst, oordeel, status, handmatig, foto_pad, created_at, updated_at) values
  ('ACT-oud7', 'Oude actie', '–', 'Vervallen', true, 'b0000000-0000-4000-a000-000000000001/oud-act.jpg', now() - interval '8 years', now() - interval '8 years'),
  ('ACT-oud7b', 'Oude actie met gedeelde foto', '–', 'Vervallen', true, 'b0000000-0000-4000-a000-000000000001/gedeeld.jpg', now() - interval '8 years', now() - interval '8 years'),
  ('ACT-nieuw7', 'Recente actie met dezelfde foto', '–', 'Voorstel', true, 'b0000000-0000-4000-a000-000000000001/gedeeld.jpg', now(), now());
insert into public.planning (id, datum, code, inspecteur, status, created_at, updated_at) values
  ('PL-oud7', current_date - 3000, 'DAM', 'b0000000-0000-4000-a000-000000000001', 'gepland', now() - interval '8 years', now() - interval '8 years');
-- een actie die nog loopt (Open), 8 jaar niet gewijzigd: blijft staan, met haar verloop
insert into public.acties (id, tekst, oordeel, handmatig, status, houder, toetser, plandatum, created_at, updated_at, uitvoerders) values
  ('ACT-loopt-oud', 'lopend', '–', true, 'Open', 'c0000000-0000-4000-a000-000000000003', 'b0000000-0000-4000-a000-000000000001',
   current_date - 2900, now() - interval '8 years', now() - interval '8 years', array['c0000000-0000-4000-a000-000000000003'::uuid]);
insert into public.actie_log (actie_id, wat, bron, t) values ('ACT-oud7', 'Oude verloopregel', 'server', now() - interval '8 years');
insert into public.actie_log (actie_id, t, wie, wat, bron) values
  ('ACT-loopt-oud', now() - interval '8 years', 'c0000000-0000-4000-a000-000000000002', 'Verloop van een lopende actie', 'client'),
  -- verloop van acties die een hoofd al eerder verwijderde (het verloop bleef toen staan): oud weg, recent blijft
  ('ACT-weg-oud', now() - interval '8 years', 'c0000000-0000-4000-a000-000000000002', 'Opmerking met een naam erin', 'client'),
  ('ACT-weg-nieuw', now() - interval '1 year', 'c0000000-0000-4000-a000-000000000002', 'Recente opmerking', 'client');
insert into public.audit_log (tabel, record_id, actie, nieuw, t) values
  ('acties', 'ACT-oud7', 'INSERT', '{"tekst":"Oude actie"}', now() - interval '8 years'),
  ('inspecties', 'WPI-oud7', 'INSERT', '{"titel":"Oude inspectie"}', now() - interval '8 years');
set session_replication_role = origin;
create temp table bt_voor as select (select count(*) from public.inspecties) as ins, (select count(*) from public.acties) as act,
  (select count(*) from public.planning) as pl;
select tests.klopt('bewaartermijn: proefrun telt 1 inspectie, 2 acties, 1 planning en 2 foto''s (de gedeelde foto blijft)',
  (select (r ->> 'inspecties')::int = 1 and (r ->> 'acties')::int = 2 and (r ->> 'planning')::int = 1
          and r -> 'fotos' = '["b0000000-0000-4000-a000-000000000001/oud-act.jpg", "b0000000-0000-4000-a000-000000000001/oud-insp.jpg"]'::jsonb
     from (select public.bewaartermijn_opschonen(p_proef => true) r) x),
  (select public.bewaartermijn_opschonen(p_proef => true)::text));
select tests.klopt('bewaartermijn: proefrun verwijdert niets',
  exists (select 1 from public.inspecties where id = 'WPI-oud7') and exists (select 1 from public.acties where id = 'ACT-oud7')
  and not exists (select 1 from public.bewaartermijn_fotos));
select tests.klopt('bewaartermijn: opschonen',
  (select (r ->> 'inspecties')::int = 1 and (r ->> 'acties')::int = 2 and (r ->> 'actie_log')::int >= 1
     from (select public.bewaartermijn_opschonen() r) x));
select tests.klopt('bewaartermijn: oude inspectie, acties en planning zijn weg; de recente actie met dezelfde foto blijft',
  not exists (select 1 from public.inspecties where id = 'WPI-oud7')
  and not exists (select 1 from public.acties where id in ('ACT-oud7', 'ACT-oud7b'))
  and not exists (select 1 from public.planning where id = 'PL-oud7')
  and exists (select 1 from public.acties where id = 'ACT-nieuw7'));
select tests.klopt('bewaartermijn: alles wat jonger is dan 7 jaar staat er nog',
  (select ins - 1 from bt_voor) = (select count(*) from public.inspecties)
  and (select act - 2 from bt_voor) = (select count(*) from public.acties)
  and (select pl - 1 from bt_voor) = (select count(*) from public.planning));
select tests.klopt('bewaartermijn: geen verloop- of auditregels van de verwijderde records meer (ook niet van de verwijdering zelf)',
  not exists (select 1 from public.actie_log where actie_id in ('ACT-oud7', 'ACT-oud7b'))
  and not exists (select 1 from public.audit_log where record_id in ('WPI-oud7', 'ACT-oud7', 'ACT-oud7b', 'PL-oud7')));
select tests.klopt('bewaartermijn: een actie die nog loopt (Open) blijft staan, hoe oud ook, met haar verloop',
  exists (select 1 from public.acties where id = 'ACT-loopt-oud')
  and exists (select 1 from public.actie_log where actie_id = 'ACT-loopt-oud'));
select tests.klopt('bewaartermijn: oud verloop van een al verwijderde actie is weg, recent verloop daarvan blijft',
  not exists (select 1 from public.actie_log where actie_id = 'ACT-weg-oud')
  and exists (select 1 from public.actie_log where actie_id = 'ACT-weg-nieuw'));
select tests.klopt('bewaartermijn: de foto''s die nergens meer gebruikt worden staan klaar voor de Storage-API',
  (select array_agg(pad order by pad) from public.bewaartermijn_fotos)
    = array['b0000000-0000-4000-a000-000000000001/oud-act.jpg', 'b0000000-0000-4000-a000-000000000001/oud-insp.jpg']);
select tests.faalt('bewaartermijn: korter dan 7 jaar geweigerd', $q$select public.bewaartermijn_opschonen(6)$q$, '%minstens 7 jaar%');
select tests.faalt('bewaartermijn: daarna is de onderhoudsmodus weer uit (actie_log append-only)',
  $q$delete from public.actie_log where actie_id = 'ACT-26t'$q$, '%append-only%');
:H2
select tests.faalt('bewaartermijn: niet vanuit de app (ook niet als hoofd)', $q$select public.bewaartermijn_opschonen()$q$, '%permission denied%');
:SR
select tests.faalt('bewaartermijn: niet met de service_role', $q$select public.bewaartermijn_opschonen()$q$, '%permission denied%');

-- 26g. de laatste hoofd kan ook niet worden VERWIJDERD (service_role, of het account wissen in het dashboard)
:SR
select tests.faalt('laatste hoofd: service_role verwijdert alle hoofden geweigerd',
  $q$delete from public.profiles where role::text = 'hoofd'$q$, '%minstens één actief hoofd%');
:PG
select tests.faalt('laatste hoofd: de auth-accounts van alle hoofden wissen (cascade) geweigerd',
  $q$delete from auth.users where id in (select id from public.profiles where role::text = 'hoofd')$q$, '%minstens één actief hoofd%');
select tests.klopt('laatste hoofd: na de pogingen zijn er nog steeds actieve hoofden',
  (select count(*) from public.profiles where role::text = 'hoofd' and actief) >= 2);
-- een niet-hoofd zonder gegevens verwijderen mag gewoon (AVG), ook het profiel van een inactief hoofd blijft verwijderbaar
begin;
insert into auth.users (id, email, raw_user_meta_data, invited_at) values
  ('b0000000-0000-4000-a000-000000000099', 'oudhoofd@test.invalid', '{"full_name":"Oud Hoofd"}', now());
update public.profiles set role = 'hoofd', actief = false where id = 'b0000000-0000-4000-a000-000000000099';
commit;
select tests.raakt('laatste hoofd: een inactief hoofd zonder gegevens verwijderen mag',
  $q$delete from auth.users where id = 'b0000000-0000-4000-a000-000000000099'$q$, 1);
select tests.klopt('laatste hoofd: trigger profiles_laatste_hoofd bestaat (BEFORE DELETE)',
  exists (select 1 from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_laatste_hoofd' and not tgisinternal));

-- =====================================================================
-- Resultaat
-- =====================================================================
:PG
\o
\pset format aligned
select nr, case when ok then 'OK ' else 'FOUT' end as status, naam, coalesce(detail, '') as detail
  from tests.resultaat order by nr;
select count(*) as totaal, count(*) filter (where ok) as geslaagd, count(*) filter (where not ok) as mislukt
  from tests.resultaat;
do $$
begin
  if exists (select 1 from tests.resultaat where not ok) then
    raise exception 'RLS-tests: % mislukt', (select count(*) from tests.resultaat where not ok);
  end if;
end $$;
