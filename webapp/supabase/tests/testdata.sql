-- =====================================================================
-- ALLEEN VOOR LOKAAL TESTEN — niet in een echt Supabase-project draaien.
-- Vijf fictieve monteurs voor de tests (dezelfde namen als MONTEURS_DEMO in de app).
-- Voorbeelddata hoort nooit op de server; daarom staan ze niet (meer) in seed.sql.
-- Stonden ze door een eerdere seed.sql toch in een echt project, verwijder ze dan als
-- hoofd/postgres (zie README §1.5).
-- =====================================================================
insert into public.monteurs (naam)
select n from (values
  ('Henk Voorbeeld'),
  ('Pieter Proef'),
  ('Sander Test'),
  ('Kees Demo'),
  ('Ruben Fictief')) as v (n)
where not exists (select 1 from public.monteurs m where public.naam_sleutel(m.naam) = public.naam_sleutel(v.n));
