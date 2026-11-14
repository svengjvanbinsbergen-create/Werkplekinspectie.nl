-- =====================================================================
-- Werkplekinspectie — migratie 0009: gebruikersbeheer, rapporten per mail (wachtrij), tekenregels en bewaartermijn
-- (november 2026, besluit van de producteigenaar; Supabase FREE-plan)
--
--   1. TEKENREGEL VRIJE TEKST: de hele Unicode-eigenschap Default_Ignorable_Code_Point wordt geweigerd (in
--      tekst_tekens_ok, record_tekens_ok en dus ook het verloop), behalve de twee die in emoji horen: U+200D
--      (zero-width joiner) en U+FE00–FE0F (variatiekiezers; in het verloop gelden daarvoor de strengere regels
--      van 0008). Nieuw geweigerd: U+180B–180F (Mongoolse variatiekiezers, ook buiten het verloop), U+FFF0–FFF8
--      en U+E0080–E0FFF (gereserveerd, onzichtbaar), en U+16FE4 (Khitan-opvuller: geen Default_Ignorable, maar
--      0 px breed). Eerder kwamen 3737 onzichtbare codepunten door verloop_tekens_ok. js/sync.js (ONZICHTBAAR)
--      haalt precies dezelfde tekens weg; supabase/tests/tekens_check.sh vergelijkt elk codepunt.
--   2. NAGEMAAKTE SERVERREGELS IN HET VERLOOP: het skelet (0008) liet een teken weg dat niet in de lijst met
--      lookalikes stond (Armeense Տ, ∪, ⊤, ᗅ), zodat "Տtatus: …" er als "tatus…" doorkwam. Nu wordt elk teken dat
--      na NFKD, kleine letters en de lookalike-lijst geen a–z is (en geen ASCII-spatie of -leesteken) een
--      JOKER ('?'), en de vergelijking is een kleine automaat (verloop_begint_als): een joker mag een letter
--      vervangen OF overgeslagen worden, een gewone letter moet precies kloppen. Dus elke combinatie van
--      vervangen en invoegen met tekens buiten a–z valt op. Daarnaast ook zonder NFKD (verloop_skelet_ruw), zodat
--      een teken dat de database (oudere Unicode) niet kent hetzelfde uitvalt als in de app. Prijs: een regel die
--      met minstens zes niet-Latijnse tekens begint, telt als nagemaakt; de app zet er dan "Toelichting: " voor
--      (js/sync.js logTekst; de app begint haar eigen regels altijd met een Nederlands woord).
--   3. BEWAARTERMIJN OP EEN VAST MOMENT: een afgesloten actie telde vanaf updated_at, en een UPDATE zonder
--      wijziging (door houder, toetser, maker …) zette die klok op nu: zo bleef een actie eindeloos staan.
--      Nu: acties.afgesloten_op (alleen de server zet het, bij Afgerond of Vervallen, en daarna nooit meer
--      anders) en een UPDATE die een afgesloten actie niet wijzigt, laat ook updated_at staan.
--      bewaartermijn_opschonen telt vanaf afgesloten_op (oude rijen: afgerond_server, dan updated_at), en zet
--      ook de rapport-PDF's van verwijderde inspecties klaar (public.bewaartermijn_rapporten).
--   4. GEBRUIKERSBEHEER via Edge Functions (supabase/functions/uitnodigen en gebruikers; de service_role-sleutel
--      staat alleen in de omgeving van de functie). Hier de databasekant:
--      - mag_gebruikers_beheren(): hoofd, QHSE-manager of beheerder, actief, met een sessie op aal2 (altijd,
--        ook als mfa_verplicht_hoofd nog uit staat). De functies vragen dit met de JWT van de aanroeper.
--      - gebruikers_overzicht(): de lijst voor het scherm Gebruikers (naam, functie, rol, actief, laatst
--        ingelogd, geblokkeerd), alleen met mag_gebruikers_beheren().
--      - gebruiker_bestaat(e-mail) en beheer_gebeurtenis(…): alleen voor service_role (de functies).
--        beheer_gebeurtenis schrijft een security_event "beheer_…" met de aanroeper als "wie"; een client kan
--        geen "beheer_…"-gebeurtenis nabootsen (trigger op security_events).
--      Rol, functie, naam en activering wijzigen de functies met de JWT van de AANROEPER via PostgREST, dus met
--      alle bestaande regels (profiles_bewaak: geen rol "inspecteur", niemand wijzigt zijn eigen rol of
--      activering, minstens één actief hoofd, QHSE-manager/beheerder nooit actiehouder …) en de audittrail.
--   5. RAPPORT PER MAIL (wachtrij): bij het definitief afronden zet de inspecteur het rapport (PDF) in de
--      privébucket "rapporten" (<eigen uid>/<inspectie-id>.pdf, één keer: overschrijven of verwijderen kan niet,
--      de momentopname blijft onveranderlijk) en roept rpc/rapport_in_wachtrij aan. Die zet een rij in
--      public.mail_wachtrij (status wacht → verstuurd/fout). De Edge Function "mail-versturen" verstuurt via
--      Microsoft Graph zodra die is ingericht; tot dan blijft alles wachten. Ontvanger: instelling
--      rapport_ontvanger (profiel-id; Beheer › "Rapporten mailen naar"), standaard de QHSE-manager (zijn er meer: de
--      eerste die in het team kwam). Een rapport dat nog wacht, volgt de huidige ontvanger (sectie 10b).
--   6. NA DE KRITIEKRONDE (sectie 10): naam, functie, rol en activering wijzigen vraagt ALTIJD aal2, ook rechtstreeks
--      via PostgREST (profiles_bewaak_mfa), wachtende rapporten gaan nooit naar een oud-collega (mail_wachtrij_volg),
--      en een tweede QHSE-manager verandert niet wie de rapporten krijgt (rapport_ontvanger_vastleggen).
--   7. NA DE TWEEDE KRITIEKRONDE (sectie 11): de ontvanger van de rapporten kiezen vraagt ALTIJD aal2 (ook via
--      PostgREST), alleen rollen van nu ontvangen rapporten (niet de oude rol "inspecteur"), en een account dat ooit
--      een rapport kreeg, kan weer worden verwijderd (ON DELETE SET NULL van de ontvanger).
-- Idempotent: opnieuw draaien mag. Tests: supabase/tests/rls_test.sql, sectie 27; tekens_check.sh.
-- =====================================================================

-- ---------- 1. tekenregel: de hele Default_Ignorable_Code_Point-set (behalve ZWJ en U+FE00–FE0F) ----------
-- Gelijk te houden met js/sync.js (ONZICHTBAAR) en record_tekens_ok hieronder.
create or replace function public.tekst_tekens_ok(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or p !~ '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFFF0-\uFFFB\U000110BD\U000110CD\U00013430-\U0001343F\U00016FE4\U0001BCA0-\U0001BCA3\U0001D173-\U0001D17A\U000E0000-\U000E0FFF]'
$$;

create or replace function public.record_tekens_ok(p jsonb)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is null or (
    p::text !~ '[\u007F-\u009F\u00AD\u034F\u061C\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B\u200C\u200E\u200F\u2028-\u202E\u2060-\u206F\u3164\uFEFF\uFFA0\uFFF0-\uFFFB\U000110BD\U000110CD\U00013430-\U0001343F\U00016FE4\U0001BCA0-\U0001BCA3\U0001D173-\U0001D17A\U000E0000-\U000E0FFF]'
    and p::text !~ '(^|[^\\])(\\\\)*\\(b|f|u00(0[1-8bBeEfF]|1[0-9a-fA-F]))')
$$;

-- ---------- 2. nagemaakte serverregels: skelet met jokers en een automaat ----------
-- Skelet: (NFKD,) kleine letters, lookalikes → Latijn (zelfde paren als 0008), ASCII-spaties/-leestekens weg,
-- en elk ander teken dat geen a–z is wordt '?'. js/sync.js (skelet, skeletRuw) doet precies hetzelfde.
create or replace function public.verloop_skelet_kern(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select regexp_replace(regexp_replace(translate(p,
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
    || U&'\03C5\03A5\057D\1D1C\A4F4\028B\0443\0423\AB4E\028A'       -- u
    || U&'\051D\051C\1D21\A4EA\13B3\AB83'                           -- w
    || U&'\1D22\A4DC\03B6\0396\13C3\AB93',                          -- z
    'aaeiiosst' || 'aaaaaaaaa' || 'cccccccc' || 'ddddd' || 'eeeeeeeee' || 'f' || 'gggggg' || 'hhhhhhhhhh'
    || 'iiiiiiiii' || 'jjjjjj' || 'kkkkkkkk' || 'llllll' || 'mmmmmmmm' || 'nnnnn' || 'ooooooooo' || 'pppppppp'
    || 'rrrr' || 'ssssss' || 'tttttttt' || 'uuuuuuuuuu' || 'wwwwww' || 'zzzzzz'),
    '[\u0009-\u000D\u0020-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]', '', 'g'),
    '[^a-z]', '?', 'g')
$$;

create or replace function public.verloop_skelet(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select public.verloop_skelet_kern(lower(normalize(p, NFKD)))
$$;

-- zonder NFKD: een teken dat deze database (Unicode-versie) niet kent, is hier net zo goed een joker als in de app
create or replace function public.verloop_skelet_ruw(p text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select public.verloop_skelet_kern(lower(p))
$$;

-- Begint het skelet als p_woord? Een letter moet precies kloppen; een joker '?' mag een letter van p_woord
-- vervangen of worden overgeslagen. Automaat met de bereikbare posities als bits (p_woord ≤ 62 tekens);
-- lineair in de lengte (geen backtracking zoals een reguliere expressie met jokers zou doen).
create or replace function public.verloop_begint_als(p_skelet text, p_woord text)
returns boolean
language plpgsql immutable parallel safe set search_path = ''
as $$
declare
  v_m integer := char_length(coalesce(p_woord, ''));
  v_p bigint := 1;
  v_q bigint;
  v_c text;
begin
  if p_skelet is null or v_m = 0 or v_m > 62 then
    return false;
  end if;
  for k in 1 .. char_length(p_skelet) loop
    v_c := substr(p_skelet, k, 1);
    if v_c = '?' then
      v_q := v_p | (v_p << 1);
    else
      v_q := 0;
      for i in 0 .. v_m - 1 loop
        if (v_p >> i) & 1 = 1 and substr(p_woord, i + 1, 1) = v_c then
          v_q := v_q | (1::bigint << (i + 1));
        end if;
      end loop;
    end if;
    if (v_q >> v_m) & 1 = 1 then
      return true;
    end if;
    if v_q = 0 then
      return false;
    end if;
    v_p := v_q;
  end loop;
  return false;
end $$;

create or replace function public.verloop_lijkt_serverregel(p text)
returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select p is not null and exists (
    select 1 from unnest(array['status', 'aangemaaktmetstatus', 'actiehoudertoetserofplandatumgewijzigd']) w
     where public.verloop_begint_als(public.verloop_skelet(p), w)
        or public.verloop_begint_als(public.verloop_skelet_ruw(p), w))
$$;

-- ---------- 3. bewaartermijn: een vast moment van afsluiten ----------
alter table public.acties add column if not exists afgesloten_op timestamptz;

-- Na acties_valideer en zet_updated_at (triggers lopen op naam): afgesloten_op zet alleen de server, op het moment
-- dat de actie Afgerond of Vervallen wordt; daarna verandert het nooit meer. Beheer via SQL (auth.uid() leeg) mag
-- een ontbrekende waarde aanvullen (de migratie hieronder). En een UPDATE die een afgesloten actie niet wijzigt
-- (alles gelijk behalve updated_at, of bij aanvullen ook afgesloten_op), houdt de oude updated_at.
create or replace function public.acties_afgesloten()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.afgesloten_op := case when new.status in ('Afgerond', 'Vervallen') then now() end;
    return new;
  end if;
  if old.afgesloten_op is not null then
    new.afgesloten_op := old.afgesloten_op;
  elsif new.status in ('Afgerond', 'Vervallen') and old.status not in ('Afgerond', 'Vervallen') then
    new.afgesloten_op := now();
  elsif auth.uid() is not null then
    new.afgesloten_op := old.afgesloten_op;
  end if;
  if old.status in ('Afgerond', 'Vervallen')
     and (to_jsonb(new) - 'updated_at' - 'afgesloten_op') = (to_jsonb(old) - 'updated_at' - 'afgesloten_op') then
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;
drop trigger if exists zz_acties_afgesloten on public.acties;
create trigger zz_acties_afgesloten before insert or update on public.acties
  for each row execute function public.acties_afgesloten();

-- bestaande afgesloten acties: het beste bekende moment (akkoord op de server, anders de statuswijziging in de
-- auditlog, anders de laatste wijziging). Daarna ligt het vast.
update public.acties a
   set afgesloten_op = coalesce(a.afgerond_server,
         (select min(l.t) from public.audit_log l
           where l.tabel = 'acties' and l.record_id = a.id and l.nieuw ->> 'status' in ('Afgerond', 'Vervallen')),
         a.updated_at)
 where a.status in ('Afgerond', 'Vervallen') and a.afgesloten_op is null;

-- rapport-PDF's van verwijderde inspecties (zoals bewaartermijn_fotos: verwijderen via de Storage-API)
create table if not exists public.bewaartermijn_rapporten (
  pad   text primary key,
  sinds timestamptz not null default now(),
  constraint bewaartermijn_rapporten_pad_vorm check (
    pad ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.pdf$')
);
alter table public.bewaartermijn_rapporten enable row level security;
revoke all on public.bewaartermijn_rapporten from public, anon, authenticated, service_role;

-- Zelfde functie als in 0008, met twee verschillen: afgesloten acties tellen vanaf afgesloten_op (een vast
-- moment), en de rapporten van verwijderde inspecties komen in public.bewaartermijn_rapporten.
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
  v_rap   text[];
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
   where a.status::text in ('Afgerond', 'Vervallen')
     and coalesce(a.afgesloten_op, a.afgerond_server, a.updated_at) < v_grens;
  select coalesce(array_agg(p.id), '{}') into v_pl from public.planning p
   where p.datum < (v_grens at time zone 'Europe/Amsterdam')::date;
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
  -- rapporten: <uid>/<inspectie-id>.pdf in de bucket "rapporten" (en wat de wachtrij noemt)
  select coalesce(array_agg(distinct r.pad order by r.pad), '{}') into v_rap from (
    select o.name as pad from storage.objects o
     where o.bucket_id = 'rapporten' and regexp_replace(split_part(o.name, '/', 2), '\.pdf$', '') = any(v_ins)
    union
    select m.bestand from public.mail_wachtrij m where m.inspectie_id = any(v_ins)
  ) r where r.pad ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.pdf$';
  if not p_proef then
    perform set_config('wpi.onderhoud', 'aan', true);
    delete from public.planning p where p.id = any(v_pl);
    delete from public.acties a where a.id = any(v_act);
    delete from public.inspecties i where i.id = any(v_ins);   -- mail_wachtrij gaat mee (ON DELETE CASCADE)
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
    insert into public.bewaartermijn_rapporten (pad) select unnest(v_rap) on conflict (pad) do nothing;
    perform set_config('wpi.onderhoud', '', true);
  end if;
  return jsonb_build_object('proef', p_proef, 'grens', v_grens,
    'inspecties', cardinality(v_ins), 'acties', cardinality(v_act), 'planning', cardinality(v_pl),
    'actie_log', n_log, 'audit_log', n_audit, 'security_events', n_sec,
    'fotos', to_jsonb(v_fotos), 'rapporten', to_jsonb(v_rap));
end $$;

-- ---------- 4. instelling rapport_ontvanger ----------
-- waarde: JSON-tekst met het profiel-id van een actieve collega met een rol, of JSON null (= standaard: de enige
-- actieve QHSE-manager). De CHECK toetst de vorm, de trigger het profiel.
-- Wie mag rapporten ontvangen? Een actieve collega met een rol van NU: hoofd, coördinator, QHSE-manager of beheerder.
-- De oude rol "inspecteur" (0008: blijft in de enum, niemand krijgt hem nog) telt niet. Overal dezelfde regel:
-- instelling, standaard, wachtrij en de functie mail-versturen (supabase/functions/_shared/mail.ts, ONTVANGER_ROLLEN).
create or replace function public.mag_rapport_ontvangen(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles p
                  where p.id = p_id and p.actief and p.role::text in ('hoofd', 'coordinator', 'qhse', 'beheerder'))
$$;
alter table public.instellingen drop constraint if exists instellingen_waarde_geldig;
alter table public.instellingen add constraint instellingen_waarde_geldig check (case sleutel
  when 'doel_conform' then case
    when jsonb_typeof(waarde) = 'null' then true
    when jsonb_typeof(waarde) = 'number' and waarde::text ~ '^[0-9]{1,3}$' then (waarde::text)::int between 1 and 100
    else false end
  when 'mfa_verplicht_hoofd' then jsonb_typeof(waarde) = 'boolean'
  when 'rapport_ontvanger' then jsonb_typeof(waarde) = 'null'
    or (jsonb_typeof(waarde) = 'string'
        and (waarde #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
  else false end);

-- "geen waarde" (JSON null in de body wordt bij PostgREST SQL NULL): voor doel_conform en rapport_ontvanger JSON null
create or replace function public.instellingen_doel_null()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.waarde is null and new.sleutel in ('doel_conform', 'rapport_ontvanger') then
    new.waarde := 'null'::jsonb;
  end if;
  return new;
end $$;

create or replace function public.instellingen_ontvanger_ok()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.sleutel = 'rapport_ontvanger' and jsonb_typeof(new.waarde) = 'string'
     and (new.waarde #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'   -- (anders weigert de CHECK)
     and not public.mag_rapport_ontvangen((new.waarde #>> '{}')::uuid) then
    raise exception 'Kies een actieve collega als ontvanger van de rapporten' using errcode = '23503';
  end if;
  return new;
end $$;
drop trigger if exists instellingen_ontvanger_ok on public.instellingen;
create trigger instellingen_ontvanger_ok before insert or update on public.instellingen
  for each row execute function public.instellingen_ontvanger_ok();

-- wie krijgt de rapporten nu? De gekozen collega (instelling, als die nog actief is en een rol heeft), anders de
-- QHSE-manager; zijn er meer, dan de eerste die in het team kwam (created_at, dan id: vast en voorspelbaar, nooit
-- "niemand" omdat er een tweede QHSE-manager bij kwam). Geen QHSE-manager en niemand gekozen: niemand (null).
-- js/sync.js (rapportOntvanger) en js/beheer.js (kaart "Rapporten mailen naar") rekenen hetzelfde.
create or replace function public.rapport_ontvanger_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.id from public.instellingen s
       join public.profiles p
         on p.id = case when jsonb_typeof(s.waarde) = 'string' then (s.waarde #>> '{}')::uuid end
      where s.sleutel = 'rapport_ontvanger' and public.mag_rapport_ontvangen(p.id)),
    (select p.id from public.profiles p
      where p.role::text = 'qhse' and p.actief
      order by p.created_at, p.id limit 1))
$$;

-- voor de app (iedereen in het team): {id, naam, keuze} van de ontvanger. id en naam zijn null als er niemand is; keuze
-- is het profiel-id dat in Beheer is gekozen (instelling rapport_ontvanger, ook als die collega intussen niet meer
-- actief is) of null (= standaard). Met keuze kan Beheer vooraf waarschuwen wie de rapporten krijgt na een wijziging.
create or replace function public.rapport_ontvanger()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_keuze text;
begin
  if auth.uid() is null or not public.is_lid() then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;
  v_id := public.rapport_ontvanger_id();
  select case when jsonb_typeof(s.waarde) = 'string' then s.waarde #>> '{}' end into v_keuze
    from public.instellingen s where s.sleutel = 'rapport_ontvanger';
  return jsonb_build_object('id', v_id, 'naam', (select p.full_name from public.profiles p where p.id = v_id), 'keuze', v_keuze);
end $$;

-- ---------- 5. mail-wachtrij ----------
create table if not exists public.mail_wachtrij (
  id              bigserial primary key,
  soort           text not null default 'rapport',
  inspectie_id    text not null references public.inspecties (id) on delete cascade,
  ontvanger       uuid references public.profiles (id) on delete set null,
  bestand         text not null,
  status          text not null default 'wacht',
  pogingen        integer not null default 0,
  laatste_fout    text,
  aangemaakt      timestamptz not null default now(),
  verstuurd_op    timestamptz,
  aangemaakt_door uuid references public.profiles (id),
  constraint mail_wachtrij_soort_geldig  check (soort = 'rapport'),
  constraint mail_wachtrij_status_geldig check (status in ('wacht', 'verstuurd', 'fout')),
  constraint mail_wachtrij_pogingen      check (pogingen between 0 and 1000),
  constraint mail_wachtrij_fout_lengte   check (laatste_fout is null or char_length(laatste_fout) <= 1000),
  constraint mail_wachtrij_bestand_vorm  check (
    bestand ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.pdf$'),
  constraint mail_wachtrij_een_per_inspectie unique (soort, inspectie_id)
);
create index if not exists mail_wachtrij_status_idx on public.mail_wachtrij (status, aangemaakt);
alter table public.mail_wachtrij enable row level security;

-- lezen: wie alles mag lezen (coördinatoren; hoofden, QHSE-manager en beheerder met MFA indien verplicht)
drop policy if exists mail_wachtrij_select on public.mail_wachtrij;
create policy mail_wachtrij_select on public.mail_wachtrij for select to authenticated
  using (public.is_lid() and public.mag_alles_lezen());
-- schrijven: niemand via de API, behalve service_role (de functie mail-versturen) die status en pogingen bijwerkt.
-- Nieuwe rijen alleen via rpc/rapport_in_wachtrij (security definer); verwijderen alleen de eigenaar (bewaartermijn)
-- of met de inspectie mee.
revoke all on table public.mail_wachtrij from public, anon, authenticated, service_role;
grant select on table public.mail_wachtrij to authenticated;
grant select, update (status, pogingen, laatste_fout, verstuurd_op, ontvanger) on table public.mail_wachtrij to service_role;
revoke all on sequence public.mail_wachtrij_id_seq from public, anon, authenticated, service_role;

-- statusmodel en vaste kolommen (ook voor service_role): wacht → verstuurd | fout | wacht, fout → wacht | verstuurd | fout;
-- verstuurd blijft verstuurd. verstuurd_op zet de server. De ontvanger van een rapport dat nog NIET verstuurd is, volgt
-- de huidige ontvanger (mail_wachtrij_volg, sectie 10: wie op non-actief gaat of een andere rol krijgt, krijgt de
-- wachtende rapporten niet meer); na verstuurd ligt hij vast. Een nieuwe ontvanger is altijd een actieve collega.
create or replace function public.mail_wachtrij_bewaak()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (new.id, new.soort, new.inspectie_id, new.bestand, new.aangemaakt, new.aangemaakt_door)
     is distinct from (old.id, old.soort, old.inspectie_id, old.bestand, old.aangemaakt, old.aangemaakt_door) then
    raise exception 'Een rij in de mail-wachtrij ligt vast; alleen status en pogingen veranderen' using errcode = '42501';
  end if;
  if new.ontvanger is distinct from old.ontvanger then
    -- het profiel van de ontvanger wordt verwijderd (account weg, AVG): de FK zet ontvanger op null (ON DELETE SET
    -- NULL). Dat mag altijd, ook na verstuurd; anders kan een account dat ooit een rapport kreeg nooit meer weg.
    if new.ontvanger is null and old.ontvanger is not null
       and not exists (select 1 from public.profiles p where p.id = old.ontvanger) then
      null;
    elsif old.status = 'verstuurd' then
      raise exception 'De ontvanger van een verstuurd rapport ligt vast' using errcode = '42501';
    end if;
    if new.ontvanger is not null and not public.mag_rapport_ontvangen(new.ontvanger) then
      raise exception 'Een rapport gaat alleen naar een actieve collega' using errcode = '23514';
    end if;
  end if;
  if old.status = 'verstuurd' and new.status <> 'verstuurd' then
    raise exception 'Een verstuurd rapport blijft verstuurd' using errcode = '23514';
  end if;
  if new.pogingen < old.pogingen then
    raise exception 'Het aantal pogingen loopt alleen op' using errcode = '23514';
  end if;
  new.verstuurd_op := case when new.status = 'verstuurd' then coalesce(old.verstuurd_op, now()) end;
  return new;
end $$;
drop trigger if exists mail_wachtrij_bewaak on public.mail_wachtrij;
create trigger mail_wachtrij_bewaak before update on public.mail_wachtrij
  for each row execute function public.mail_wachtrij_bewaak();

-- ---------- 6. Storage-bucket "rapporten" (privé, alleen PDF, één keer per inspectie) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rapporten', 'rapporten', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- uploaden: alleen wie inspecteert, in de eigen map, als <inspectie-id>.pdf van een EIGEN inspectie die al op
-- de server staat (dus vastgelegd). Geen update- en geen delete-policy: een rapport wordt nooit overschreven
-- (upsert faalt) of verwijderd (alleen de eigenaar via de Storage-API bij de bewaartermijn).
drop policy if exists "rapporten: uploaden eigen inspectie" on storage.objects;
create policy "rapporten: uploaden eigen inspectie" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'rapporten'
    and public.is_lid()
    and public.mag_inspecteren()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9][A-Za-z0-9_-]{0,63}\.pdf$'
    and public.is_eigen_inspectie(regexp_replace(split_part(name, '/', 2), '\.pdf$', ''))
  );
drop policy if exists "rapporten: bekijken eigen of alles-lezen" on storage.objects;
create policy "rapporten: bekijken eigen of alles-lezen" on storage.objects for select to authenticated
  using (
    bucket_id = 'rapporten'
    and public.is_lid()
    and (split_part(name, '/', 1) = (select auth.uid())::text or public.mag_alles_lezen())
  );

-- ---------- 7. rapport in de wachtrij zetten (bij definitief afronden, door de eigen inspecteur) ----------
-- Idempotent: nogmaals aanroepen (antwoord kwijt door een netwerkfout) geeft dezelfde rij terug.
create or replace function public.rapport_in_wachtrij(p_inspectie_id text, p_bestand text)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_eig uuid;
  v_rij public.mail_wachtrij%rowtype;
begin
  if v_uid is null or not public.is_lid() then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;
  select i.inspecteur_id into v_eig from public.inspecties i where i.id = p_inspectie_id;
  -- zelfde melding of de inspectie nu niet bestaat of van een ander is (geen bestaanstest)
  if v_eig is null or v_eig <> v_uid then
    raise exception 'Alleen de inspecteur van deze inspectie zet het rapport klaar' using errcode = '42501';
  end if;
  if p_bestand is distinct from v_uid::text || '/' || p_inspectie_id || '.pdf' then
    raise exception 'Het rapport hoort in de eigen map als <inspectie>.pdf' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'rapporten' and o.name = p_bestand) then
    raise exception 'Het rapport is nog niet geüpload' using errcode = '22023';
  end if;
  insert into public.mail_wachtrij (soort, inspectie_id, ontvanger, bestand, aangemaakt_door)
  values ('rapport', p_inspectie_id, public.rapport_ontvanger_id(), p_bestand, v_uid)
  on conflict (soort, inspectie_id) do nothing;
  select * into v_rij from public.mail_wachtrij m where m.soort = 'rapport' and m.inspectie_id = p_inspectie_id;
  return jsonb_build_object('id', v_rij.id, 'status', v_rij.status, 'ontvanger', v_rij.ontvanger,
    'ontvanger_naam', (select p.full_name from public.profiles p where p.id = v_rij.ontvanger));
end $$;

-- ---------- 8. gebruikersbeheer (voor de Edge Functions uitnodigen en gebruikers) ----------
-- Mag de aanroeper gebruikers beheren? Hoofd, QHSE-manager of beheerder, actief, en ALTIJD met aal2.
create or replace function public.mag_gebruikers_beheren()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_beheer_rol() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- (aangemaakt sinds de kritiekronde: de volgorde waarin collega's in het team kwamen = wie de "eerste" QHSE-manager
-- is; een andere uitvoer vraagt drop + create, zie sectie 10)
drop function if exists public.gebruikers_overzicht();
create function public.gebruikers_overzicht()
returns table (id uuid, full_name text, functie text, role text, actief boolean, uitgenodigd boolean,
               laatst_ingelogd timestamptz, geblokkeerd boolean, aangemaakt timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.mag_gebruikers_beheren() then
    raise exception 'Alleen een hoofd, de QHSE-manager of de beheerder, ingelogd met tweestapsverificatie' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, p.functie, p.role::text, p.actief, p.uitgenodigd, u.last_sign_in_at,
           coalesce(u.banned_until > now(), false), p.created_at
      from public.profiles p left join auth.users u on u.id = p.id
     order by p.full_name;
end $$;

-- bestaat er al een account met dit e-mailadres? (alleen service_role: de functie uitnodigen; zo wordt nooit een
-- bestaand, misschien vooraf aangemaakt account "uitgenodigd" en daarmee geactiveerd, zie README §1.4)
create or replace function public.gebruiker_bestaat(p_email text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, ''))))
$$;

-- gebeurtenis van gebruikersbeheer (uitgenodigd, geblokkeerd, gedeblokkeerd …) met de aanroeper als "wie"
create or replace function public.beheer_gebeurtenis(p_wie uuid, p_soort text, p_profiel uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_soort is null or p_soort !~ '^beheer_[a-z_]{3,40}$' then
    raise exception 'Ongeldige soort' using errcode = '22023';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' or octet_length(p_details::text) > 2048 then
    raise exception 'details moet een object van max 2 KB zijn' using errcode = '22023';
  end if;
  insert into public.security_events (wie, soort, details)
  values (p_wie, p_soort, p_details || jsonb_build_object('profiel', p_profiel));
end $$;

-- "beheer_…"-gebeurtenissen schrijft alleen de server (beheer_gebeurtenis als service_role, auth.uid() leeg);
-- report_security_event (een ingelogde client) kan ze niet nabootsen
create or replace function public.security_events_soort()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.soort like 'beheer\_%' and auth.uid() is not null then
    raise exception 'Ongeldige soort' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists security_events_soort on public.security_events;
create trigger security_events_soort before insert on public.security_events
  for each row execute function public.security_events_soort();

-- ---------- 9. planning van de functie mail-versturen (NIET aangezet) ----------
-- Pas na het inrichten van Microsoft Graph (README §10). Met pg_cron + pg_net, als postgres in de SQL Editor; de
-- sleutel komt uit Vault (nooit in SQL of git):
--   select cron.schedule('wpi-mail-versturen', '*/10 * * * *', $cron$
--     select net.http_post(
--       url := 'https://<project-ref>.supabase.co/functions/v1/mail-versturen',
--       headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
--                  'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'wpi_mail_cron')),
--       body := '{}'::jsonb)
--   $cron$);
--   -- uitzetten: select cron.unschedule('wpi-mail-versturen');

-- ---------- 10. na de kritiekronde (november 2026) ----------
-- 10a. GEBRUIKERSBEHEER ALTIJD MET aal2, ook via PostgREST. Eerder bewaakte profiles_bewaak alleen is_beheer_admin()
--      (= beheerrol en mfa_ok()), en mfa_ok() is waar zolang mfa_verplicht_hoofd uit staat (zo staat de seed). Dan kon
--      een sessie met alleen een wachtwoord (aal1) van een hoofd, de QHSE-manager of de beheerder rechtstreeks
--      (PATCH /rest/v1/profiles) iemand hoofd maken of collega's op non-actief zetten, buiten de Edge Functions om.
--      Nu: wie ingelogd is (auth.uid() gezet) en naam, functie, rol of activering wijzigt, moet
--      mag_gebruikers_beheren() hebben: beheerrol, actief, en de sessie op aal2. Altijd, los van de instelling.
--      De Edge Functions wijzigen het profiel met de JWT van de aanroeper (aal2), dus zij werken gewoon. Server-
--      onderhoud (SQL Editor, service_role: auth.uid() leeg) valt hier buiten. De trigger draait NA profiles_bewaak
--      (alfabetisch), dus vergelijkt de al opgeschoonde naam.
create or replace function public.profiles_bewaak_mfa()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null
     and (new.role, new.actief, new.full_name, new.functie) is distinct from (old.role, old.actief, old.full_name, old.functie)
     and not public.mag_gebruikers_beheren() then
    raise exception 'Namen, functies, rollen en activering wijzigt alleen een hoofd, de QHSE-manager of de beheerder, ingelogd met tweestapsverificatie (Beheer › Gebruikers)'
      using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists profiles_bewaak_mfa on public.profiles;
create trigger profiles_bewaak_mfa before update on public.profiles
  for each row execute function public.profiles_bewaak_mfa();

-- 10b. WACHTENDE RAPPORTEN VOLGEN DE HUIDIGE ONTVANGER. Eerder lag mail_wachtrij.ontvanger vast op het moment van
--      afronden: zette een beheerder die collega daarna op non-actief, dan ging elk wachtend rapport (zodra Graph is
--      ingericht) toch naar de mailbox van de oud-collega, en niemand kon dat nog veranderen. Nu krijgt elke rij die
--      nog niet verstuurd is (wacht of fout) de ontvanger die rapport_ontvanger_id() NU geeft, zodra er iets
--      verandert dat die keuze raakt: een profiel gaat op (non-)actief of krijgt een andere rol, of de instelling
--      rapport_ontvanger wijzigt. Verstuurde rijen blijven zoals ze zijn. De functie mail-versturen controleert
--      vlak voor het versturen nog een keer (actief, niet geblokkeerd; supabase/functions/_shared/mail.ts).
create or replace function public.mail_wachtrij_volg()
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_id uuid := public.rapport_ontvanger_id();
  n integer;
begin
  update public.mail_wachtrij m set ontvanger = v_id
   where m.status in ('wacht', 'fout') and m.ontvanger is distinct from v_id;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.mail_wachtrij_volg_trg()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.mail_wachtrij_volg();
  return null;
end $$;
drop trigger if exists mail_wachtrij_volg_profiel on public.profiles;
create trigger mail_wachtrij_volg_profiel after update of role, actief on public.profiles
  for each row when (old.role is distinct from new.role or old.actief is distinct from new.actief)
  execute function public.mail_wachtrij_volg_trg();
drop trigger if exists mail_wachtrij_volg_instelling on public.instellingen;
create trigger mail_wachtrij_volg_instelling after insert or update on public.instellingen
  for each row when (new.sleutel = 'rapport_ontvanger')
  execute function public.mail_wachtrij_volg_trg();

-- 10c. EEN TWEEDE QHSE-MANAGER VERANDERT NIET WIE DE RAPPORTEN KRIJGT. Zonder keuze in Beheer is de standaard de
--      QHSE-manager die het eerst in het team kwam. Wordt iemand (weer) QHSE-manager terwijl er al een actieve is en er
--      niets is gekozen, dan legt de server de huidige ontvanger vast als keuze (instelling rapport_ontvanger). Zo gaan
--      de rapporten niet ongemerkt naar een ander omdat er een collega bij kwam; Beheer › "Rapporten mailen naar" toont
--      die keuze en kan hem wijzigen. js/beheer.js (_ontvangerNa) rekent hetzelfde voor de waarschuwing vooraf.
create or replace function public.rapport_ontvanger_vastleggen()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_huidig uuid;
begin
  if new.role::text = 'qhse' and new.actief and not (old.role::text = 'qhse' and old.actief)
     and not exists (select 1 from public.instellingen s
                      where s.sleutel = 'rapport_ontvanger' and jsonb_typeof(s.waarde) = 'string') then
    select p.id into v_huidig from public.profiles p
     where p.role::text = 'qhse' and p.actief and p.id <> new.id
     order by p.created_at, p.id limit 1;
    if v_huidig is not null then
      insert into public.instellingen (sleutel, waarde) values ('rapport_ontvanger', to_jsonb(v_huidig::text))
      on conflict (sleutel) do update set waarde = excluded.waarde;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists rapport_ontvanger_vastleggen on public.profiles;
create trigger rapport_ontvanger_vastleggen after update of role, actief on public.profiles
  for each row when (new.role is distinct from old.role or new.actief is distinct from old.actief)
  execute function public.rapport_ontvanger_vastleggen();

-- ---------- 11. na de tweede kritiekronde (november 2026) ----------
-- 11a. WIE DE RAPPORTEN KRIJGT, KIEST ALLEEN EEN BEHEERROL MET aal2. De policies op instellingen vragen
--      is_beheer_admin() (= beheerrol en mfa_ok()), en mfa_ok() is waar zolang mfa_verplicht_hoofd uit staat (zo
--      staat de seed). Dan kon een sessie met alleen een wachtwoord (aal1) van een hoofd, de QHSE-manager of de
--      beheerder via PostgREST de ontvanger wijzigen of de instelling wissen, en volgden de wachtende rapporten meteen
--      (mail_wachtrij_volg). Zelfde soort gat als bij de profielen (10a). Nu: wie ingelogd is (auth.uid() gezet) en
--      rapport_ontvanger toevoegt, wijzigt of verwijdert, moet mag_gebruikers_beheren() hebben (beheerrol, actief,
--      aal2), altijd, los van mfa_verplicht_hoofd. Serveronderhoud (SQL Editor, service_role: auth.uid() leeg) valt
--      erbuiten. rapport_ontvanger_vastleggen (10c) draait binnen een profielwijziging, die al aal2 vraagt (10a).
--      Andere instellingen (doel % conform, mfa_verplicht_hoofd) houden de regel van 0008.
create or replace function public.instellingen_ontvanger_recht()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sleutel text := case when tg_op = 'DELETE' then old.sleutel else new.sleutel end;
begin
  if (v_sleutel = 'rapport_ontvanger' or (tg_op = 'UPDATE' and old.sleutel = 'rapport_ontvanger'))
     and auth.uid() is not null and not public.mag_gebruikers_beheren() then
    raise exception 'Wie de rapporten krijgt, kiest alleen een hoofd, de QHSE-manager of de beheerder, ingelogd met tweestapsverificatie'
      using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists instellingen_ontvanger_recht on public.instellingen;
create trigger instellingen_ontvanger_recht before insert or update or delete on public.instellingen
  for each row execute function public.instellingen_ontvanger_recht();
-- 11b. ALLEEN ROLLEN VAN NU ONTVANGEN RAPPORTEN (mag_rapport_ontvangen, sectie 4): de oude rol "inspecteur" kon als
--      ontvanger worden gekozen. 11c. VERWIJDEREN VAN EEN ACCOUNT dat ooit een rapport kreeg, liep vast op
--      mail_wachtrij_bewaak (ON DELETE SET NULL wijzigt de ontvanger van een verstuurde rij); dat mag nu (sectie 5).

-- ---------- rechten ----------
revoke execute on function public.verloop_skelet_kern(text), public.verloop_skelet_ruw(text),
  public.verloop_begint_als(text, text) from public, anon;
grant execute on function public.verloop_skelet_kern(text), public.verloop_skelet_ruw(text),
  public.verloop_begint_als(text, text) to authenticated, service_role;
revoke execute on function public.acties_afgesloten(), public.instellingen_ontvanger_ok(), public.mail_wachtrij_bewaak(),
  public.security_events_soort(), public.profiles_bewaak_mfa(), public.mail_wachtrij_volg_trg(),
  public.rapport_ontvanger_vastleggen(), public.instellingen_ontvanger_recht() from public, anon, authenticated;
revoke execute on function public.mag_rapport_ontvangen(uuid) from public, anon, authenticated;
grant execute on function public.mag_rapport_ontvangen(uuid) to service_role;
revoke execute on function public.mail_wachtrij_volg() from public, anon, authenticated;
grant execute on function public.mail_wachtrij_volg() to service_role;
revoke execute on function public.rapport_ontvanger_id() from public, anon, authenticated;
grant execute on function public.rapport_ontvanger_id() to service_role;   -- de functie mail-versturen (rij zonder ontvanger)
revoke execute on function public.rapport_ontvanger(), public.rapport_in_wachtrij(text, text),
  public.mag_gebruikers_beheren(), public.gebruikers_overzicht() from public, anon;
grant execute on function public.rapport_ontvanger(), public.rapport_in_wachtrij(text, text),
  public.mag_gebruikers_beheren(), public.gebruikers_overzicht() to authenticated;
revoke execute on function public.gebruiker_bestaat(text), public.beheer_gebeurtenis(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.gebruiker_bestaat(text), public.beheer_gebeurtenis(uuid, text, uuid, jsonb) to service_role;
revoke execute on function public.bewaartermijn_opschonen(integer, boolean, integer)
  from public, anon, authenticated, service_role;
