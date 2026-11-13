#!/bin/sh
# Gelijktijdigheidstest: twee hoofden degraderen elkaar op hetzelfde moment.
# Verwacht: precies één lukt, de ander krijgt "minstens één actief hoofd", en er
# blijft één actief hoofd over. Draait in een eigen, verse database.
#   Gebruik: sh supabase/tests/race_hoofd.sh [basisnaam]   (PGHOST/PGPORT/PGUSER zoals run.sh)
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB="${1:-wpi_rls_test}_race"
dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"
P="psql -X -q -v ON_ERROR_STOP=1 -d $DB"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/tests/supabase_emulatie.sql"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql" >/dev/null
$P <<'SQL'
insert into auth.users (id, email, raw_user_meta_data, invited_at) values
  ('b0000000-0000-4000-a000-0000000000a1', 'h1@test.invalid', '{"full_name":"Hoofd Een"}', now()),
  ('b0000000-0000-4000-a000-0000000000a2', 'h2@test.invalid', '{"full_name":"Hoofd Twee"}', now());
update public.profiles set role = 'hoofd';
SQL

degradeer() {   # $1 = wie (uid-suffix), $2 = wie wordt gedegradeerd
  psql -X -q -d "$DB" -v ON_ERROR_STOP=1 2>&1 <<SQL
begin;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-0000000000$1","role":"authenticated"}', true) is null;
set local role authenticated;
update public.profiles set role = 'coordinator' where id = 'b0000000-0000-4000-a000-0000000000$2';
select pg_sleep(2);
commit;
SQL
}
OUT=$(mktemp)
degradeer a1 a2 > "$OUT.1" &
P1=$!
sleep 0.5
degradeer a2 a1 > "$OUT.2" &
P2=$!
wait $P1 || true
wait $P2 || true
FOUT=$(cat "$OUT.1" "$OUT.2" | grep -c "minstens één actief hoofd" || true)
HOOFD=$(psql -X -At -d "$DB" -c "select count(*) from public.profiles where role = 'hoofd' and actief")
rm -f "$OUT" "$OUT.1" "$OUT.2"
dropdb --if-exists "$DB"
if [ "$FOUT" = "1" ] && [ "$HOOFD" = "1" ]; then
  echo "race laatste hoofd: OK (één degradatie geweigerd, 1 actief hoofd over)"
else
  echo "race laatste hoofd: FOUT (weigeringen=$FOUT, actieve hoofden=$HOOFD)"
  exit 1
fi
