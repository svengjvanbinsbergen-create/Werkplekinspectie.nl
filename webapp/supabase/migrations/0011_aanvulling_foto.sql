-- =====================================================================
-- Werkplekinspectie — migratie 0011: een nagekomen foto bij een aanvulling
-- (november 2026, kritiek op het afronden: "Afwijking bij … heeft geen foto" kon na afronden alleen met woorden
-- worden beantwoord; een ontbrekende foto is de meest voorkomende correctie.)
--
-- Een aanvulling (0010) mag nu één foto hebben: het pad in Storage-bucket "fotos" (eerst geüpload door de app, in de
-- EIGEN map van wie de aanvulling schrijft, <uid>/<sha256>.<ext>, zoals elke foto). Verder verandert er niets:
-- append-only, tijd en auteur van de server, dezelfde rechten (mag_aanvullen).
--   * foto: null, of een pad in de eigen map van de schrijver (wie), met dezelfde vorm als de upload-policy (0007).
--   * Een foto bij een aanvulling is bewijs: foto_in_gebruik telt hem mee, dus de uploader kan hem daarna niet meer
--     overschrijven of verwijderen (alleen het hoofd, voor de bewaartermijn of een AVG-verzoek).
--   * Lezen: dezelfde regel als elke foto ("fotos: bekijken eigen, staf of via actie", 0005; mag_alles_lezen geldt
--     voor alle rollen van het team).
-- js/sync.js: App.aanvullingToevoegen({ …, foto }) / App.aanvullingenVan. Idempotent (opnieuw draaien mag).
-- =====================================================================

alter table public.inspectie_aanvullingen add column if not exists foto text;
alter table public.inspectie_aanvullingen drop constraint if exists aanvulling_foto_vorm;
alter table public.inspectie_aanvullingen add constraint aanvulling_foto_vorm check (
  foto is null
  or (foto ~* '^[0-9a-f-]{36}/[A-Za-z0-9_-][A-Za-z0-9._-]{0,199}\.(jpg|jpeg|png|webp)$'
      and position('..' in foto) = 0
      and split_part(foto, '/', 1) = wie::text));
create index if not exists inspectie_aanvullingen_foto_idx on public.inspectie_aanvullingen (foto) where foto is not null;

-- de server zet "wie" (aanvulling_stempel); een pad met "fotos/" ervoor wordt het kale pad
create or replace function public.aanvulling_foto_schoon()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.foto is not null then
    new.foto := nullif(regexp_replace(btrim(new.foto), '^fotos/', ''), '');
  end if;
  return new;
end $$;
drop trigger if exists aanvulling_foto_schoon on public.inspectie_aanvullingen;
create trigger aanvulling_foto_schoon before insert on public.inspectie_aanvullingen
  for each row execute function public.aanvulling_foto_schoon();

grant insert (inspectie_id, over, tekst, t_client, foto) on table public.inspectie_aanvullingen to authenticated;

-- Wordt dit object gebruikt als bewijs? Zoals 0002, plus: een foto bij een aanvulling.
create or replace function public.foto_in_gebruik(p_naam text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.foto_eigenaar(p_naam) is distinct from auth.uid()::text
      or exists (select 1 from public.acties a
                 where a.foto_pad in (p_naam, 'fotos/' || p_naam)
                    or a.nafoto_pad in (p_naam, 'fotos/' || p_naam))
      or exists (select 1 from public.inspecties i
                 where i.inspecteur_id = auth.uid()
                   and strpos(i.record::text, p_naam) > 0)
      or exists (select 1 from public.inspectie_aanvullingen v
                 where v.foto in (p_naam, regexp_replace(p_naam, '^fotos/', '')))
$$;
