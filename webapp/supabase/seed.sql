-- Werkplekinspectie — seed (v0.1)
-- Accounts worden aangemaakt via Supabase Auth (uitnodiging per e-mail of
-- dashboard). Deze seed zet daarna de ROL per gebruiker. AVG: alleen naam +
-- rol van de app-gebruikers; geen gegevens van geïnspecteerde medewerkers.

-- Rollen voor de vaste gebruikers (match op full_name, ingevuld bij signup):
--   Björn Sloos        -> hoofd        (Hoofd Service & Montage)
--   Winfred Loerts     -> coordinator  (Montage Coördinator)
--   Douwe de Boer      -> coordinator  (Montage Coördinator)

update public.profiles set role = 'hoofd'       where full_name = 'Björn Sloos';
update public.profiles set role = 'coordinator' where full_name = 'Winfred Loerts';
update public.profiles set role = 'coordinator' where full_name = 'Douwe de Boer';

-- Alternatief (direct op e-mail, als je die als identiteit gebruikt):
-- update public.profiles p set role='hoofd'
--   from auth.users u where u.id=p.id and u.email='bjorn.sloos@noardling.nl';

-- Referentiedata (producten/regels/projecten) wordt geladen uit de
-- bestaande JSON met het laadscript, niet hier met de hand:
--   node of python import van webapp/data/kennisbank.json -> producten/regels
--   (zie webapp/docs/backend-onderzoek.md en het nog te schrijven importscript)
