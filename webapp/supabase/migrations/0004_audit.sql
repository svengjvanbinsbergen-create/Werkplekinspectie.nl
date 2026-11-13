-- =====================================================================
-- Werkplekinspectie — migratie 0004: audittrail en append-only logs
-- audit_log: oud/nieuw (jsonb) bij elke wijziging in de kerntabellen; bij een
-- UPDATE alleen de gewijzigde kolommen. Schrijfquotum per gebruiker (audit_quotum).
-- audit_log, actie_log en security_events zijn append-only: UPDATE, DELETE
-- en TRUNCATE worden door triggers geweigerd, ook voor service_role.
-- =====================================================================

-- Schrijfquotum per gebruiker (via de auditlog, dus over alle geauditte tabellen samen).
-- De auditlog is append-only en alleen in onderhoudsmodus op te schonen; zonder grens kan
-- één account hem met grote of eindeloos herhaalde wijzigingen laten vollopen tot de
-- database vol is (project read-only). Grenzen (ruim boven normaal gebruik):
--   * max 300 wijzigingen/verwijderingen per gebruiker per uur (nieuwe rijen hebben al
--     eigen limieten: 30 inspecties, 300 acties, 100 planningen per uur);
--   * max 30 wijzigingen per gebruiker aan hetzelfde record per uur;
--   * max 25 MiB per gebruiker per 24 uur, samen met wat hij in actie_log en
--     security_events schreef (schrijf_bytes_24u, 0002): alle append-only tabellen.
-- Overschrijding: fout 54000 ("probeer het later opnieuw"); de app ziet dat als tijdelijk.
-- service_role/postgres (auth.uid() leeg) vallen erbuiten (bewust beheer, bewaartermijn).
create or replace function public.audit_quotum(p_uid uuid, p_tabel text, p_id text, p_actie text, p_grootte integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_uid is null then
    return;
  end if;
  -- één tegelijk per gebruiker: gelijktijdige verzoeken omzeilen de grens niet
  perform pg_advisory_xact_lock(hashtextextended('wpi_quotum:' || p_uid::text, 0));
  if p_actie <> 'INSERT' then
    if (select count(*) from public.audit_log l
         where l.wie = p_uid and l.actie <> 'INSERT' and l.t > now() - interval '1 hour') >= 300 then
      raise exception 'Te veel wijzigingen in het afgelopen uur; probeer het later opnieuw' using errcode = '54000';
    end if;
    if (select count(*) from public.audit_log l
         where l.tabel = p_tabel and l.record_id = p_id and l.wie = p_uid and l.actie = 'UPDATE'
           and l.t > now() - interval '1 hour') >= 30 then
      raise exception 'Te veel wijzigingen aan hetzelfde record in het afgelopen uur; probeer het later opnieuw'
        using errcode = '54000';
    end if;
  end if;
  if public.schrijf_bytes_24u(p_uid) + p_grootte > 25 * 1024 * 1024 then
    raise exception 'Schrijfquotum voor vandaag bereikt (te veel of te grote wijzigingen); probeer het morgen opnieuw of vraag het hoofd'
      using errcode = '54000';
  end if;
end $$;

-- INSERT: hele nieuwe rij; DELETE: hele oude rij; UPDATE: alleen de gewijzigde kolommen
-- (oud en nieuw) plus id/sleutel. Elke versie blijft zo te herleiden, zonder dat elke
-- kleine wijziging een volledige kopie van een (tot 1 MB groot) record kost.
create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_oud     jsonb;
  v_nieuw   jsonb;
  v_rij_oud jsonb;
  v_rij     jsonb;
  v_id      text;
  v_grootte integer;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_rij_oud := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_rij := to_jsonb(new); end if;
  v_id := coalesce(v_rij ->> 'id', v_rij_oud ->> 'id', v_rij ->> 'sleutel', v_rij_oud ->> 'sleutel');
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(o.key, o.value), jsonb_object_agg(o.key, n.value)
      into v_oud, v_nieuw
      from jsonb_each(v_rij_oud) o
      join jsonb_each(v_rij) n on n.key = o.key
     where o.value is distinct from n.value and o.key <> 'updated_at';
    -- niets veranderd (bijv. identieke upsert bij synchroniseren): niet loggen
    if v_oud is null then
      return null;
    end if;
    -- herkenbaar houden: id (of sleutel) altijd mee
    if v_rij ? 'id' then
      v_oud := v_oud || jsonb_build_object('id', v_rij_oud -> 'id');
      v_nieuw := v_nieuw || jsonb_build_object('id', v_rij -> 'id');
    elsif v_rij ? 'sleutel' then
      v_oud := v_oud || jsonb_build_object('sleutel', v_rij_oud -> 'sleutel');
      v_nieuw := v_nieuw || jsonb_build_object('sleutel', v_rij -> 'sleutel');
    end if;
  elsif tg_op = 'INSERT' then
    v_nieuw := v_rij;
  else
    v_oud := v_rij_oud;
  end if;
  v_grootte := coalesce(pg_column_size(v_oud), 0) + coalesce(pg_column_size(v_nieuw), 0);
  perform public.audit_quotum(auth.uid(), tg_table_name, v_id, tg_op, v_grootte);
  insert into public.audit_log (wie, tabel, record_id, actie, oud, nieuw, grootte)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_oud, v_nieuw, v_grootte);
  return null;
end $$;

drop trigger if exists audit on public.inspecties;
create trigger audit after insert or update or delete on public.inspecties
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.acties;
create trigger audit after insert or update or delete on public.acties
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.planning;
create trigger audit after insert or update or delete on public.planning
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.monteurs;
create trigger audit after insert or update or delete on public.monteurs
  for each row execute function public.audit_trigger();
drop trigger if exists audit on public.instellingen;
create trigger audit after insert or update or delete on public.instellingen
  for each row execute function public.audit_trigger();
-- rollen/activering zijn beveiligingsrelevant: ook profielen auditen
drop trigger if exists audit on public.profiles;
create trigger audit after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();

-- ---------- Rolwijziging => ook een security_event ----------
create or replace function public.profiles_rol_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.actief is distinct from old.actief then
    insert into public.security_events (wie, soort, details)
    values (auth.uid(), 'rol_gewijzigd',
            jsonb_build_object('profiel', new.id,
                               'rol_oud', old.role, 'rol_nieuw', new.role,
                               'actief_oud', old.actief, 'actief_nieuw', new.actief));
  end if;
  return null;
end $$;

drop trigger if exists profiles_rol_event on public.profiles;
create trigger profiles_rol_event after update on public.profiles
  for each row execute function public.profiles_rol_event();

-- ---------- Append-only bewaking ----------
-- Uitzondering alleen voor bewaartermijn-onderhoud door de eigenaar (postgres)
-- in een sessie met: set local wpi.onderhoud = 'aan';  (zie README)
create or replace function public.weiger_wijziging_log()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'postgres' and current_setting('wpi.onderhoud', true) = 'aan'
     and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'Tabel % is append-only: % is niet toegestaan', tg_table_name, tg_op
    using errcode = '42501';
end $$;

drop trigger if exists append_only on public.audit_log;
create trigger append_only before update or delete on public.audit_log
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.audit_log;
create trigger append_only_truncate before truncate on public.audit_log
  for each statement execute function public.weiger_wijziging_log();

drop trigger if exists append_only on public.actie_log;
create trigger append_only before update or delete on public.actie_log
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.actie_log;
create trigger append_only_truncate before truncate on public.actie_log
  for each statement execute function public.weiger_wijziging_log();

drop trigger if exists append_only on public.security_events;
create trigger append_only before update or delete on public.security_events
  for each row execute function public.weiger_wijziging_log();
drop trigger if exists append_only_truncate on public.security_events;
create trigger append_only_truncate before truncate on public.security_events
  for each statement execute function public.weiger_wijziging_log();

revoke execute on function public.audit_trigger(), public.profiles_rol_event(),
  public.weiger_wijziging_log() from public, anon, authenticated;
revoke execute on function public.audit_quotum(uuid, text, text, text, integer) from public, anon, authenticated;
