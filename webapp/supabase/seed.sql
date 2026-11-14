-- =====================================================================
-- Werkplekinspectie — seed (v1). Draaien als postgres in de SQL-editor,
-- NA schema.sql. Idempotent en veilig om opnieuw te draaien. Bevat GEEN
-- wachtwoorden en GEEN voorbeelddata (ook geen fictieve monteurs).
-- Dit is het inrichtingsbestand voor de ECHTE omgeving en bevat daarom de echte namen
-- van de vaste gebruikers. Het wordt nooit gepubliceerd (supabase/ staat niet in de
-- deploymap; tests/exposed.js controleert dat). De voorbeeldmodus van de app (js/kern.js)
-- gebruikt bewust fictieve namen en spiegelt dit bestand dus NIET meer.
-- =====================================================================

-- ---------- 1. Gebruikers: uitnodigen, nooit wachtwoorden in SQL ----------
-- Signups staan uit (invite-only). Nodig de vaste gebruikers uit via
-- Supabase Dashboard › Authentication › Users › "Invite user" (alleen e-mailadres):
--
--   Björn Sloos     -> hoofd        (Hoofd Service & Montage)
--   Winfred Loerts  -> coordinator  (Montage Coördinator)
--   Douwe de Boer   -> coordinator  (Montage Coördinator)
--
-- De overige vaste gebruikers (het tweede hoofd met functie "Manager Projects", de QHSE-manager en de
-- beheerder) nodig je op dezelfde manier uit; hun rol en functie kies je daarna in de app (Beheer ›
-- Gebruikers). Zo staan er niet meer echte namen in dit bestand dan nodig.
--
-- Het profiel ontstaat automatisch (trigger on_auth_user_created) ZONDER rol (nog geen
-- toegang; migratie 0008) en wordt actief zodra de uitnodiging is verstuurd. Een hoofd, de
-- QHSE-manager of de beheerder kiest daarna de rol in de app (Beheer › Gebruikers); voor
-- de eerste inrichting doet dit bestand dat voor de vaste gebruikers hieronder. Het dialoogvenster
-- "Invite user" kent geen user metadata: het profiel heet dan eerst naar het deel
-- vóór de @ (bv. "bjorn.sloos"). Dit blok zet daarom ook de volledige naam.
--
-- Alles wordt gekoppeld op E-MAILADRES (uniek, door Supabase Auth bevestigd) en
-- alleen voor UITGENODIGDE accounts (invited_at, dat zet alleen Supabase Auth).
-- NOOIT op naam: een naam kan iemand bij een aanmelding zelf kiezen. Vervang de drie
-- e-mailadressen hieronder door de echte adressen (precies zoals in Authentication ›
-- Users). Zolang de voorbeeldadressen op ".invalid" er staan, doet dit blok niets
-- (dat domein bestaat niet). Opnieuw draaien is veilig: de rol wordt alleen gezet
-- zolang het profiel nog geen rol heeft (of de oude beginrol 'inspecteur'), de naam alleen zolang die nog
-- de beginnaam (deel vóór de @) is, en 'actief' wordt nooit gewijzigd. Latere keuzes
-- van het hoofd blijven dus staan.

-- 1a. volledige naam (alleen als het profiel nog de beginnaam uit het e-mailadres heeft)
update public.profiles p
   set full_name = v.naam
  from (values
          ('bjorn.sloos@VUL-IN.invalid',    'Björn Sloos'),
          ('winfred.loerts@VUL-IN.invalid', 'Winfred Loerts'),
          ('douwe.deboer@VUL-IN.invalid',   'Douwe de Boer')
       ) as v (email, naam),
       auth.users u
 where u.id = p.id
   and lower(u.email) = lower(v.email)
   and u.invited_at is not null
   and p.actief
   and public.naam_sleutel(p.full_name) = public.naam_sleutel(split_part(u.email, '@', 1));

-- 1b. rol en functie (alleen de eerste inrichting)
update public.profiles p
   set role = v.rol, functie = v.functie
  from (values
          ('bjorn.sloos@VUL-IN.invalid',    'hoofd'::public.user_role,       'Hoofd Service & Montage'),
          ('winfred.loerts@VUL-IN.invalid', 'coordinator'::public.user_role, 'Montage Coördinator'),
          ('douwe.deboer@VUL-IN.invalid',   'coordinator'::public.user_role, 'Montage Coördinator')
       ) as v (email, rol, functie),
       auth.users u
 where u.id = p.id
   and lower(u.email) = lower(v.email)
   and u.invited_at is not null
   and p.actief
   and (p.role is null or p.role = 'inspecteur');   -- alleen de eerste inrichting; latere keuzes blijven staan

-- ---------- 2. Monteurs ----------
-- Bewust GEEN voorbeeldnamen: voorbeelddata hoort nooit op de server (zie de CHECKs
-- *_geen_demo). Het hoofd voert de echte monteurs in via Beheer; inspecteurs voegen
-- tijdens een inspectie een ontbrekende naam toe (rpc/monteur_aanmelden).
-- (De vijf fictieve testnamen staan in tests/testdata.sql en worden alleen lokaal geladen.)

-- ---------- 3. Instellingen ----------
-- doel_conform: 85 (besluit producteigenaar; ook de standaard van de app en van dashboard_cijfers als er geen
-- rij is). Wijzigen via Beheer (geheel getal 1..100); "geen doel" = JSON null. Een bestaande keuze blijft staan.
-- mfa_verplicht_hoofd: geldt voor alle beheerrollen (hoofd, QHSE-manager, beheerder; migratie 0008). Op true
-- zetten zodra die drie TOTP hebben ingesteld (de app vraagt het hen al bij elke login).
insert into public.instellingen (sleutel, waarde) values
  ('mfa_verplicht_hoofd', 'false'::jsonb),
  ('doel_conform', '85'::jsonb)
on conflict (sleutel) do nothing;

-- rapport_ontvanger (migratie 0009): wie de rapporten (PDF) per mail krijgt zodra de mailbox is ingericht. Standaard
-- de QHSE-manager: alleen als er precies één actief profiel met die rol is (draai dit bestand dus opnieuw nadat de
-- QHSE-manager een rol heeft). Wijzigen in de app: Beheer › "Rapporten mailen naar". Een bestaande keuze blijft staan.
insert into public.instellingen (sleutel, waarde)
select 'rapport_ontvanger', to_jsonb(q.id::text)
  from (select (array_agg(p.id))[1] as id from public.profiles p
         where p.role::text = 'qhse' and p.actief having count(*) = 1) q
on conflict (sleutel) do nothing;
