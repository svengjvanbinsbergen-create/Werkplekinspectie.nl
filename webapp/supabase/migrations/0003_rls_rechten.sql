-- =====================================================================
-- Werkplekinspectie — migratie 0003: rechten (GRANT) en Row Level Security
-- Uitgangspunt: alles dicht, dan per rol precies openzetten.
--   anon          : niets (geen enkele tabel of functie)
--   authenticated : rijen via RLS; inactieve profielen zien niets
--   service_role  : alleen server-side (dashboard/Edge Function), nooit in de app
-- =====================================================================

-- ---------- Basisrechten: Supabase geeft standaard ALL aan anon/authenticated ----------
-- Voortaan ook voor NIEUWE tabellen en reeksen (een latere migratie): die zijn niet meer
-- vanzelf bereikbaar met de anon-sleutel; elke nieuwe tabel krijgt bewust GRANTs en RLS.
-- (Geldt voor objecten die de rol maakt die dit draait: postgres, zoals de migraties.)
alter default privileges in schema public revoke all on tables from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated, public;
revoke all on table public.profiles, public.monteurs, public.planning, public.inspecties,
  public.acties, public.actie_log, public.instellingen, public.audit_log, public.security_events
  from anon, authenticated, public;
-- TRUNCATE omzeilt RLS: nooit voor clients
revoke truncate, references, trigger on table public.profiles, public.monteurs, public.planning,
  public.inspecties, public.acties, public.actie_log, public.instellingen, public.audit_log,
  public.security_events from service_role;
-- logtabellen: ook service_role mag niet wijzigen/verwijderen of direct invoegen
revoke insert, update, delete on table public.audit_log, public.security_events from service_role;
revoke update, delete on table public.actie_log from service_role;

grant select on table public.profiles to authenticated;
grant update (full_name, functie, role, actief) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.monteurs     to authenticated;
grant select, insert, update, delete on table public.planning     to authenticated;
grant select, insert, update, delete on table public.inspecties   to authenticated;
grant select, insert, update, delete on table public.acties       to authenticated;
grant select, insert, update, delete on table public.instellingen to authenticated;
grant select                         on table public.actie_log    to authenticated;
-- invoegen alleen met deze kolommen: id, t en bron zet de server (een zelfgekozen id
-- kan het volgende id van een ander claimen en zijn opslaan laten mislukken)
grant insert (actie_id, wie, wat, t_client) on table public.actie_log to authenticated;
grant usage on sequence public.actie_log_id_seq to authenticated;
grant select on table public.audit_log       to authenticated;   -- RLS: alleen hoofd
grant select on table public.security_events to authenticated;   -- RLS: alleen hoofd

revoke all on sequence public.audit_log_id_seq, public.security_events_id_seq from anon, authenticated, public;
revoke all on sequence public.actie_log_id_seq from anon, public;

-- ---------- Functies: standaard niemand, daarna gericht toestaan ----------
revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.zet_updated_at(), public.handle_new_user(), public.profiles_bewaak(),
  public.inspecties_valideer(), public.planning_valideer(), public.planning_controle_nieuw(),
  public.acties_valideer(), public.acties_controle_nieuw(),
  public.acties_controle_personen(uuid, uuid, boolean, boolean),
  public.acties_log_status(), public.actie_log_stempel(), public.actie_log_limiet(),
  public.handle_user_invited(), public.planning_verwijder(), public.monteurs_normaliseer(),
  public.inspecties_controle_nieuw(), public.profiel_beginnaam(jsonb, text, uuid),
  public.acties_log_keten(text, text, text), public.acties_geen_qhse(uuid, uuid),
  public.schrijf_bytes_24u(uuid), public.planning_uitgevoerd_ok(text, uuid)
  from authenticated;
-- helpers die in policies worden gebruikt (lopen als de aanroeper)
grant execute on function
  public.mijn_rol(), public.is_lid(), public.is_staf(), public.mag_alles_lezen(),
  public.is_hoofd(), public.mfa_ok(), public.is_hoofd_admin(),
  public.is_eigen_inspectie(text), public.foto_via_actie(text), public.foto_in_gebruik(text),
  public.actie_zichtbaar(uuid, uuid, uuid, uuid, uuid, text, public.actie_status, date),
  public.actie_betrokken(text),
  public.vandaag(), public.naam_sleutel(text), public.naam_schoon(text), public.naam_tekens_ok(text),
  public.foto_eigenaar(text), public.tekst_trim(text),
  public.id_tijd_ok(text), public.inspectie_oordelen(jsonb)
  to authenticated;

-- ---------- RLS aan op ALLE tabellen ----------
alter table public.profiles        enable row level security;
alter table public.monteurs        enable row level security;
alter table public.planning        enable row level security;
alter table public.inspecties      enable row level security;
alter table public.acties          enable row level security;
alter table public.actie_log       enable row level security;
alter table public.instellingen    enable row level security;
alter table public.audit_log       enable row level security;
alter table public.security_events enable row level security;

-- ---------- profiles ----------
-- Leden zien namen/functies van collega's (nodig voor actiehouder/toetser kiezen en om
-- namen in het verloop te tonen): actieve profielen en profielen die ooit via een
-- uitnodiging binnenkwamen (ook oud-collega's, voor de historie). Een losse aanmelding
-- die nooit is uitgenodigd of geactiveerd, zien alleen het hoofd (beheer) en de persoon zelf.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_lid() and (actief or uitgenodigd or id = (select auth.uid()) or public.is_hoofd_admin()));
-- Naam, functie, rol en activering wijzigt alleen het hoofd (beheerroute). Zo kan
-- niemand zich in de houder/toetser-kiezer als een ander voordoen. Namen zijn uniek.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_hoofd_admin())
  with check (public.is_hoofd_admin());
-- Geen insert/delete-policy: profielen ontstaan via uitnodiging (trigger op auth.users).

-- ---------- monteurs (beheerroute: alleen hoofd schrijft) ----------
drop policy if exists monteurs_select on public.monteurs;
create policy monteurs_select on public.monteurs for select to authenticated
  using (public.is_lid());
drop policy if exists monteurs_insert on public.monteurs;
create policy monteurs_insert on public.monteurs for insert to authenticated
  with check (public.is_hoofd_admin());
drop policy if exists monteurs_update on public.monteurs;
create policy monteurs_update on public.monteurs for update to authenticated
  using (public.is_hoofd_admin()) with check (public.is_hoofd_admin());
drop policy if exists monteurs_delete on public.monteurs;
create policy monteurs_delete on public.monteurs for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- instellingen (beheerroute: alleen hoofd schrijft) ----------
drop policy if exists instellingen_select on public.instellingen;
create policy instellingen_select on public.instellingen for select to authenticated
  using (public.is_lid());
drop policy if exists instellingen_insert on public.instellingen;
create policy instellingen_insert on public.instellingen for insert to authenticated
  with check (public.is_hoofd_admin());
drop policy if exists instellingen_update on public.instellingen;
create policy instellingen_update on public.instellingen for update to authenticated
  using (public.is_hoofd_admin()) with check (public.is_hoofd_admin());
drop policy if exists instellingen_delete on public.instellingen;
create policy instellingen_delete on public.instellingen for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- inspecties ----------
-- Lezen: eigen; staf en QHSE alles. Schrijven: alleen de eigen inspectie
-- (niemand wijzigt de waarneming of het oordeel van een andere inspecteur).
drop policy if exists inspecties_select on public.inspecties;
create policy inspecties_select on public.inspecties for select to authenticated
  using (public.is_lid() and (inspecteur_id = (select auth.uid()) or public.mag_alles_lezen()));
drop policy if exists inspecties_insert on public.inspecties;
create policy inspecties_insert on public.inspecties for insert to authenticated
  with check (public.is_lid() and inspecteur_id = (select auth.uid()));
drop policy if exists inspecties_update on public.inspecties;
create policy inspecties_update on public.inspecties for update to authenticated
  using (public.is_lid() and inspecteur_id = (select auth.uid()))
  with check (public.is_lid() and inspecteur_id = (select auth.uid()));
drop policy if exists inspecties_delete on public.inspecties;
create policy inspecties_delete on public.inspecties for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- planning ----------
-- Zien: toegewezen of zelf gemaakt; staf/QHSE alles. Inplannen: iedereen, ook voor een
-- ander (zoals de app). Wie wat mag wijzigen/verwijderen bewaken planning_valideer en
-- planning_verwijder, met een duidelijke fout bij een rij die je kunt zien. Een rij die je
-- niet kunt zien raakt een UPDATE/DELETE niet ("0 rijen", zoals altijd bij RLS).
drop policy if exists planning_select on public.planning;
create policy planning_select on public.planning for select to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.mag_alles_lezen()));
drop policy if exists planning_insert on public.planning;
create policy planning_insert on public.planning for insert to authenticated
  with check (public.is_lid());
drop policy if exists planning_update on public.planning;
create policy planning_update on public.planning for update to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.is_staf()))
  with check (public.is_lid());
drop policy if exists planning_delete on public.planning;
create policy planning_delete on public.planning for delete to authenticated
  using (public.is_lid() and (inspecteur = (select auth.uid()) or gemaakt_door = (select auth.uid())
                              or public.is_staf()));

-- ---------- acties ----------
-- Zien (actie_zichtbaar): houder, toetser, aanmaker, wie instelde of liet vervallen,
-- inspecteur van de bron-inspectie,
-- staf/QHSE alles, en voor iedereen: alle voorstellen ("iedereen mag instellen") en
-- alle acties over de plandatum ("te laat: hele team").
-- Aanmaken: iedereen die is ingelogd; een actie aan een inspectie koppelen alleen de
-- eigen inspecteur (acties_valideer/acties_controle_nieuw; ook bij upsert correct).
-- Wijzigen: wie bij de actie hoort (ook wie instelde of liet vervallen, zodat een
-- herhaalde upload van dezelfde rij na een netwerkfout niet stukloopt), staf, en
-- iedereen bij een voorstel (instellen/laten vervallen); wat precies mag, bewaakt
-- acties_valideer (na het instellen alleen staf inhoudelijk; Vervallen ligt vast).
drop policy if exists acties_select on public.acties;
create policy acties_select on public.acties for select to authenticated
  using (public.actie_zichtbaar(houder, toetser, aangemaakt_door, ingesteld_door, vervallen_door,
                                inspectie_id, status, plandatum));
drop policy if exists acties_insert on public.acties;
create policy acties_insert on public.acties for insert to authenticated
  with check (public.is_lid());
drop policy if exists acties_update on public.acties;
create policy acties_update on public.acties for update to authenticated
  using (public.is_lid() and (
    public.is_staf()
    or houder = (select auth.uid()) or toetser = (select auth.uid())
    or aangemaakt_door = (select auth.uid())
    or ingesteld_door = (select auth.uid()) or vervallen_door = (select auth.uid())
    or public.is_eigen_inspectie(inspectie_id)
    or status = 'Voorstel'))
  with check (public.is_lid());
drop policy if exists acties_delete on public.acties;
create policy acties_delete on public.acties for delete to authenticated
  using (public.is_hoofd_admin());

-- ---------- actie_log (append-only) ----------
-- Lezen: bij acties die je mag zien (subquery valt onder RLS van acties), en alleen
-- regels vanaf het aanmaken van DIE actie. Het verloop blijft na het verwijderen van
-- een actie bewaard; wie later een actie met hetzelfde id aanmaakt, ziet het oude
-- verloop (met namen en opmerkingen) dus niet.
-- Aanvullen: alleen wie bij de actie betrokken is (actie_betrokken), niet elk teamlid
-- dat een voorstel of een te late actie kan zien.
drop policy if exists actie_log_select on public.actie_log;
create policy actie_log_select on public.actie_log for select to authenticated
  using (public.is_lid() and exists (select 1 from public.acties a
                                     where a.id = actie_log.actie_id and actie_log.t >= a.created_at));
drop policy if exists actie_log_insert on public.actie_log;
create policy actie_log_insert on public.actie_log for insert to authenticated
  with check (public.is_lid() and wie = (select auth.uid())
              and public.actie_betrokken(actie_id));
-- bewust geen update/delete-policy

-- ---------- audit_log en security_events: alleen hoofd leest ----------
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_hoofd_admin());
drop policy if exists security_events_select on public.security_events;
create policy security_events_select on public.security_events for select to authenticated
  using (public.is_hoofd_admin());
-- bewust geen insert/update/delete-policy: invoegen alleen via SECURITY DEFINER

-- ---------- Opruimen na een update van het schema ----------
-- Oude versie van actie_zichtbaar (zonder vervallen_door); de policies hierboven en
-- foto_via_actie gebruiken de nieuwe. Op een verse database bestaat hij niet.
drop function if exists public.actie_zichtbaar(uuid, uuid, uuid, uuid, text, public.actie_status, date);
