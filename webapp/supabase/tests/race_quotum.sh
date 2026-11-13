#!/bin/sh
# Gelijktijdigheidstest voor de limieten per gebruiker (aanvalstest, november 2026):
#   a. monteur_aanmelden: max 20 nieuwe namen per dag   (19 gedaan, dan 15 tegelijk)
#   b. acties: max 300 nieuwe per uur                    (295 gedaan, dan 12 tegelijk)
#   c. Storage "fotos": max 120 uploads per uur          (115 gedaan, dan 12 tegelijk)
# Elke parallelle sessie houdt haar transactie 1 s open (pg_sleep) voordat ze vastlegt. Zonder lock per
# gebruiker telde elke sessie de andere niet mee (34 / 307 / 127). Verwacht nu: nooit boven de grens.
#   Gebruik: sh supabase/tests/race_quotum.sh [basisnaam]   (PGHOST/PGPORT/PGUSER zoals run.sh)
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB="${1:-wpi_rls_test}_raceqt"
dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"
P="psql -X -q -v ON_ERROR_STOP=1 -d $DB"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/tests/supabase_emulatie.sql"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql" >/dev/null
U=c0000000-0000-4000-a000-0000000000f1
$P <<SQL
insert into auth.users (id, email, raw_user_meta_data, invited_at) values
  ('$U', 'race@test.invalid', '{"full_name":"Inspecteur Race"}', now());
-- een nieuw profiel heeft sinds 0008 nog geen rol: een coördinator (inspecteert, geen beheerrol)
update public.profiles set role = 'coordinator' where id = '$U';
SQL
ALS="select set_config('request.jwt.claims', '{\"sub\":\"$U\",\"role\":\"authenticated\"}', true) is null; set local role authenticated;"

# voorwerk: tot net onder de grens, gewoon na elkaar
$P >/dev/null <<SQL
begin; $ALS
select public.monteur_aanmelden('Voorwerk Naam ' || chr(64 + g)) from generate_series(1, 19) g;
commit;
begin; $ALS
insert into public.acties (id, tekst, status) select 'ACT-v' || g, 'x', 'Voorstel' from generate_series(1, 295) g;
commit;
begin; $ALS
insert into storage.objects (bucket_id, name, owner) select 'fotos', '$U/v' || g || '.jpg', '$U' from generate_series(1, 115) g;
commit;
SQL

parallel() {   # $1 = aantal, $2 = SQL met N als volgnummer
  i=1
  while [ "$i" -le "$1" ]; do
    q=$(printf '%s' "$2" | sed "s/N/$i/g")
    psql -X -q -d "$DB" >/dev/null 2>&1 <<SQL &
begin; $ALS
$q;
select pg_sleep(1);
commit;
SQL
    i=$((i + 1))
  done
  wait
}
parallel 15 "select public.monteur_aanmelden('Parallel Spam ' || chr(64 + N))"
parallel 12 "insert into public.acties (id, tekst, status) values ('ACT-parN', 'x', 'Voorstel')"
parallel 12 "insert into storage.objects (bucket_id, name, owner) values ('fotos', '$U/parN.jpg', '$U')"

M=$(psql -X -At -d "$DB" -c "select count(*) from public.monteurs")
A=$(psql -X -At -d "$DB" -c "select count(*) from public.acties where aangemaakt_door = '$U'")
F=$(psql -X -At -d "$DB" -c "select count(*) from storage.objects where name like '$U/%'")
echo "  monteurs: $M (max 20), acties: $A (max 300), foto's: $F (max 120)"
dropdb --if-exists "$DB"
if [ "$M" -le 20 ] && [ "$A" -le 300 ] && [ "$F" -le 120 ] && [ "$M" -ge 19 ] && [ "$A" -ge 295 ] && [ "$F" -ge 115 ]; then
  echo "race quotum: OK (gelijktijdige verzoeken komen niet boven de limiet per gebruiker)"
else
  echo "race quotum: FOUT"
  exit 1
fi
