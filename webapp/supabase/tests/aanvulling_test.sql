-- =====================================================================
-- Werkplekinspectie — tests voor migratie 0010 (aanvullingen op een vastgelegde inspectie)
-- Draait NA rls_test.sql in dezelfde testdatabase (run.sh): gebruikt de testgebruikers en tests.als().
-- =====================================================================
\set ON_ERROR_STOP 1
\pset pager off
\set PG 'reset role; select set_config(''request.jwt.claims'', '''', false) is null;'
\set SR 'reset role; select set_config(''request.jwt.claims'', ''{"role":"service_role"}'', false) is null; set role service_role;'
\set H  'reset role; select tests.als(''H'');  set role authenticated;'
\set H2 'reset role; select tests.als(''H'', ''aal2''); set role authenticated;'
\set W  'reset role; select tests.als(''W'');  set role authenticated;'
\set D  'reset role; select tests.als(''D'');  set role authenticated;'
\set I1 'reset role; select tests.als(''I1''); set role authenticated;'
\set I2 'reset role; select tests.als(''I2''); set role authenticated;'
\set Q  'reset role; select tests.als(''Q'');  set role authenticated;'
\set Q2 'reset role; select tests.als(''Q'', ''aal2''); set role authenticated;'
\set B2 'reset role; select tests.als(''B'', ''aal2''); set role authenticated;'
\set ANON 'reset role; select set_config(''request.jwt.claims'', '''', false) is null; set role anon;'

:PG
delete from tests.resultaat;
-- twee vastgelegde inspecties: van coördinator W en van (oude rol) inspecteur I1
insert into public.inspecties (id, inspecteur_id, titel, code, record) values
  ('WPI-aanv-w', 'c0000000-0000-4000-a000-000000000002', 'Damwand · Aanvulproef', 'DAM', '{"waarnemingen":[{"id":"w1","oordeel":"C"}],"monteurs":["Henk Voorbeeld"]}'),
  ('WPI-aanv-i', 'a0000000-0000-4000-a000-000000000011', 'Pomp · Aanvulproef', 'POM', '{"waarnemingen":[]}')
  on conflict (id) do nothing;
select set_config('wpi.mfa_oud', (select waarde::text from public.instellingen where sleutel = 'mfa_verplicht_hoofd'), false);
update public.instellingen set waarde = 'true' where sleutel = 'mfa_verplicht_hoofd';

-- ---------- toevoegen ----------
:W
select tests.lukt('aanvulling: de inspecteur vult zijn eigen vastgelegde inspectie aan',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, over, tekst) values ('WPI-aanv-w', 'Monteurs', 'De monteur heet Henk Voorbeeldt (met t).')$q$);
select tests.klopt('aanvulling: tijd en auteur van de server, niet van de client',
  (select wie = 'c0000000-0000-4000-a000-000000000002' and t > now() - interval '1 minute' from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w' order by id desc limit 1));
select tests.faalt('aanvulling: een andere auteur opgeven kan niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, wie) values ('WPI-aanv-w', 'x', 'b0000000-0000-4000-a000-000000000001')$q$, '%permission denied%');
select tests.faalt('aanvulling: een eigen tijdstip opgeven kan niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, t) values ('WPI-aanv-w', 'x', now() - interval '1 year')$q$, '%permission denied%');
select tests.lukt('aanvulling: t_client in het verleden (offline) mag',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, t_client) values ('WPI-aanv-w', 'Nagekomen: afzetting ≥ 10 m 🚧', now() - interval '2 hours')$q$);
select tests.klopt('aanvulling: tekst met ≥ en emoji blijft precies zoals ingevoerd',
  exists (select 1 from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w' and tekst = 'Nagekomen: afzetting ≥ 10 m 🚧'));
select tests.faalt('aanvulling: lege tekst niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', '')$q$, '%aanvulling_tekst%');
select tests.faalt('aanvulling: te lange tekst niet',
  format('insert into public.inspectie_aanvullingen (inspectie_id, tekst) values (%L, %L)', 'WPI-aanv-w', repeat('x', 2001)), '%aanvulling_tekst_lengte%');
select tests.faalt('aanvulling: onzichtbare tekens niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', E'verborgen​tekst')$q$, '%aanvulling_tekst_tekens%');
:D
select tests.faalt('aanvulling: een andere coördinator (niet de inspecteur) kan niet aanvullen',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', 'van een ander')$q$, '%row-level security%');
select tests.telt('aanvulling: de coördinator leest wel mee (ziet alle inspecties)',
  $q$select 1 from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w'$q$, 2);
:I2
select tests.faalt('aanvulling: een lid zonder leesrecht kan niet aanvullen',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-i', 'van een ander')$q$, '%row-level security%');
select tests.telt('aanvulling: en ziet de aanvullingen van een andermans inspectie niet',
  $q$select 1 from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w'$q$, 0);
:Q
select tests.faalt('aanvulling: QHSE-manager zonder tweede stap (MFA verplicht) niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', 'Correctie QHSE')$q$, '%row-level security%');
:Q2
select tests.lukt('aanvulling: QHSE-manager met aal2 wel',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, over, tekst) values ('WPI-aanv-w', 'Algemeen', 'Correctie QHSE: rapport besproken in het MT.')$q$);
:H
select tests.faalt('aanvulling: hoofd zonder tweede stap niet (andermans inspectie)',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', 'Correctie hoofd')$q$, '%row-level security%');
:H2
select tests.lukt('aanvulling: hoofd met aal2 wel',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', 'Correctie hoofd')$q$);
:B2
select tests.faalt('aanvulling: de beheerder (app-beheer) vult niet inhoudelijk aan',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) values ('WPI-aanv-w', 'van de beheerder')$q$, '%row-level security%');
:ANON
select tests.faalt('aanvulling: anoniem niets',
  $q$select * from public.inspectie_aanvullingen$q$, '%permission denied%');

-- ---------- nagekomen foto (migratie 0011) ----------
:W
select tests.lukt('aanvulling: met een nagekomen foto in de eigen map',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, over, tekst, foto) values ('WPI-aanv-w', 'Waarneming 1', 'Nagekomen foto', 'c0000000-0000-4000-a000-000000000002/aaaa.jpg')$q$);
select tests.lukt('aanvulling: pad met fotos/ ervoor wordt het kale pad',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, foto) values ('WPI-aanv-w', 'Nog een foto', 'fotos/c0000000-0000-4000-a000-000000000002/bbbb.png')$q$);
select tests.klopt('aanvulling: foto als kaal pad opgeslagen',
  exists (select 1 from public.inspectie_aanvullingen where foto = 'c0000000-0000-4000-a000-000000000002/bbbb.png'));
select tests.faalt('aanvulling: foto in de map van een ander niet',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, foto) values ('WPI-aanv-w', 'x', 'b0000000-0000-4000-a000-000000000001/cccc.jpg')$q$, '%aanvulling_foto_vorm%');
select tests.faalt('aanvulling: geen ander bestandstype',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst, foto) values ('WPI-aanv-w', 'x', 'c0000000-0000-4000-a000-000000000002/x.svg')$q$, '%aanvulling_foto_vorm%');
select tests.klopt('aanvulling: de foto telt als bewijs (niet meer te overschrijven of te verwijderen door de uploader)',
  public.foto_in_gebruik('c0000000-0000-4000-a000-000000000002/aaaa.jpg') and public.foto_in_gebruik('fotos/c0000000-0000-4000-a000-000000000002/aaaa.jpg'));
select tests.klopt('aanvulling: een ongebruikte eigen foto telt niet als bewijs',
  not public.foto_in_gebruik('c0000000-0000-4000-a000-000000000002/ongebruikt.jpg'));
:D
select tests.telt('aanvulling: de foto is zichtbaar voor wie de inspectie ziet',
  $q$select 1 from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w' and foto is not null$q$, 2);

-- ---------- append-only ----------
:W
select tests.faalt('aanvulling: niet te wijzigen (ook niet door de schrijver)',
  $q$update public.inspectie_aanvullingen set tekst = 'anders' where inspectie_id = 'WPI-aanv-w'$q$, '%permission denied%');
select tests.faalt('aanvulling: niet te verwijderen',
  $q$delete from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w'$q$, '%permission denied%');
:SR
select tests.faalt('aanvulling: ook service_role wijzigt niet',
  $q$update public.inspectie_aanvullingen set tekst = 'anders' where inspectie_id = 'WPI-aanv-w'$q$, '%permission denied%');
:W
select tests.klopt('aanvulling: de vastgelegde inspectie zelf is onveranderd (momentopname)',
  (select record -> 'monteurs' = '["Henk Voorbeeld"]'::jsonb from public.inspecties where id = 'WPI-aanv-w'));

-- ---------- volume ----------
:W
select tests.faalt('aanvulling: max 20 per inspectie',
  $q$insert into public.inspectie_aanvullingen (inspectie_id, tekst) select 'WPI-aanv-w', 'reeks ' || g from generate_series(1, 20) g$q$, '%maximale aantal%');

-- ---------- bewaartermijn: met de inspectie mee weg ----------
:PG
delete from public.inspecties where id = 'WPI-aanv-w';
select tests.telt('aanvulling: verdwijnt met de inspectie (bewaartermijn)',
  $q$select 1 from public.inspectie_aanvullingen where inspectie_id = 'WPI-aanv-w'$q$, 0);
delete from public.inspecties where id = 'WPI-aanv-i';
update public.instellingen set waarde = current_setting('wpi.mfa_oud')::jsonb where sleutel = 'mfa_verplicht_hoofd';

-- ---------- resultaat ----------
:PG
\o
\pset format aligned
select nr, case when ok then 'OK ' else 'FOUT' end as status, naam, coalesce(detail, '') as detail
  from tests.resultaat order by nr;
do $$
begin
  if exists (select 1 from tests.resultaat where not ok) then
    raise exception 'Aanvulling-tests: % mislukt', (select count(*) from tests.resultaat where not ok);
  end if;
end $$;
\echo 'aanvulling_test.sql: OK'
