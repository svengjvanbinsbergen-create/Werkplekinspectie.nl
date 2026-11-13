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
