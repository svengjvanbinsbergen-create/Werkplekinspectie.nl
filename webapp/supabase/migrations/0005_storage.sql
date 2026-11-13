-- =====================================================================
-- Werkplekinspectie — migratie 0005: Storage-bucket "fotos" (privé)
-- Padconventie: <auth.uid()>/<sha256 van de inhoud>.jpg|jpeg|png|webp
--   bv. 3f0c…-…/9b74c9897bac770ffc029102a200c5de….jpg   (zonder "fotos/" ervoor)
-- MIME (image/jpeg, image/png, image/webp) en max 5 MB dwingt de Storage-API
-- af via de bucketconfiguratie; de policies controleren pad en extensie.
-- De bucket is privé (nooit publiek). De app haalt een foto met de sessie op via
-- GET /storage/v1/object/authenticated/fotos/<pad> en toont hem als data-URL.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Uploaden: alleen actieve leden, alleen in de eigen map, één niveau diep, een veilige
-- bestandsnaam (geen "..", geen submappen) en alleen beeldextensies.
drop policy if exists "fotos: uploaden in eigen map" on storage.objects;
create policy "fotos: uploaden in eigen map" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
  );

-- Bekijken: eigen foto's, staf/QHSE alles, en foto's die echt bij een actie horen
-- die je mag zien (foto van de aanmaker/inspecteur, na-foto van wie hem toevoegde).
drop policy if exists "fotos: bekijken eigen, staf of via actie" on storage.objects;
create policy "fotos: bekijken eigen, staf of via actie" on storage.objects for select to authenticated
  using (
    bucket_id = 'fotos'
    and public.is_lid()
    and (split_part(name, '/', 1) = (select auth.uid())::text
         or public.mag_alles_lezen()
         or public.foto_via_actie(name))
  );

-- Overschrijven (upload met x-upsert: true, zoals de app): alleen de uploader, in de eigen
-- map, en alleen zolang de foto nergens als bewijs wordt gebruikt (zelfde regel als
-- verwijderen). Namen zijn inhoud-hashes (<uid>/<sha256>.<ext>), dus een herhaalde upload
-- (antwoord kwijt door netwerkfout) is dezelfde foto en lukt. Een foto in een actie of in
-- een eigen inspectie (bewijs, ook na toetsing) kan zo nooit worden vervangen; zo'n
-- herhaalde upload geeft een RLS-fout (de app hoeft hem dan niet opnieuw te sturen).
-- Storage voert een upsert uit als INSERT … ON CONFLICT DO UPDATE: zonder conflict telt
-- alleen de insert-policy, bij een conflict ook deze update-policy (en select).
drop policy if exists "fotos: bijwerken eigen" on storage.objects;
drop policy if exists "fotos: opnieuw uploaden eigen, ongebruikt" on storage.objects;
create policy "fotos: opnieuw uploaden eigen, ongebruikt" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.is_lid()
         and split_part(name, '/', 1) = (select auth.uid())::text
         and not public.foto_in_gebruik(name))
  with check (
    bucket_id = 'fotos'
    and public.is_lid()
    and split_part(name, '/', 1) = (select auth.uid())::text
    and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
    and position('..' in name) = 0
  );

-- Verwijderen: het hoofd (bewaartermijn / AVG-verzoek), of de uploader zolang de
-- foto nergens als bewijs wordt gebruikt (niet in een actie, niet in een inspectie).
drop policy if exists "fotos: verwijderen eigen of hoofd" on storage.objects;
create policy "fotos: verwijderen eigen of hoofd" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_lid()
         and (public.is_hoofd_admin()
              or (split_part(name, '/', 1) = (select auth.uid())::text
                  and not public.foto_in_gebruik(name))));
