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
-- Het profiel ontstaat automatisch (trigger on_auth_user_created) met rol
-- 'inspecteur' en wordt actief zodra de uitnodiging is verstuurd. Het dialoogvenster
-- "Invite user" kent geen user metadata: het profiel heet dan eerst naar het deel
-- vóór de @ (bv. "bjorn.sloos"). Dit blok zet daarom ook de volledige naam.
--
-- Alles wordt gekoppeld op E-MAILADRES (uniek, door Supabase Auth bevestigd) en
-- alleen voor UITGENODIGDE accounts (invited_at, dat zet alleen Supabase Auth).
-- NOOIT op naam: een naam kan iemand bij een aanmelding zelf kiezen. Vervang de drie
-- e-mailadressen hieronder door de echte adressen (precies zoals in Authentication ›
-- Users). Zolang de voorbeeldadressen op ".invalid" er staan, doet dit blok niets
-- (dat domein bestaat niet). Opnieuw draaien is veilig: de rol wordt alleen gezet
-- zolang het profiel nog de beginrol 'inspecteur' heeft, de naam alleen zolang die nog
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
   and p.role = 'inspecteur';   -- alleen de eerste inrichting; latere keuzes van het hoofd blijven staan

-- ---------- 2. Monteurs ----------
-- Bewust GEEN voorbeeldnamen: voorbeelddata hoort nooit op de server (zie de CHECKs
-- *_geen_demo). Het hoofd voert de echte monteurs in via Beheer; inspecteurs voegen
-- tijdens een inspectie een ontbrekende naam toe (rpc/monteur_aanmelden).
-- (De vijf fictieve testnamen staan in tests/testdata.sql en worden alleen lokaal geladen.)

-- ---------- 3. Instellingen ----------
-- doel_conform wordt NIET vooraf gezet: geen doel = geen doellijn in het dashboard
-- en de kwartaalrapportage. Het hoofd stelt het in via Beheer (geheel getal 1..100).
-- mfa_verplicht_hoofd: op true zetten zodra het hoofd TOTP heeft ingesteld.
insert into public.instellingen (sleutel, waarde) values
  ('mfa_verplicht_hoofd', 'false'::jsonb)
on conflict (sleutel) do nothing;
