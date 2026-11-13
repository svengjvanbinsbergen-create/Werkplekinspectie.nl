#!/bin/sh
# Gelijktijdigheidstest: een coördinator maakt iemand actiehouder terwijl het hoofd
# diezelfde persoon tegelijk QHSE-manager (en daarna: beheerder) maakt. Verwacht (beide volgordes en
# beide rollen): nooit een QHSE-manager of beheerder als actiehouder van een lopende actie; precies één
# van de twee lukt (migratie 0008: beide rollen zijn nooit actiehouder).
#   Gebruik: sh supabase/tests/race_qhse.sh [basisnaam]   (PGHOST/PGPORT/PGUSER zoals run.sh)
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB="${1:-wpi_rls_test}_raceq"
dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"
P="psql -X -q -v ON_ERROR_STOP=1 -d $DB"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/tests/supabase_emulatie.sql"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql" >/dev/null
$P <<'SQL'
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('b0000000-0000-4000-a000-0000000000a1', 'h@test.invalid', '{"full_name":"Hoofd"}'),
  ('b0000000-0000-4000-a000-0000000000a2', 'c@test.invalid', '{"full_name":"Coordinator"}'),
  ('b0000000-0000-4000-a000-0000000000a3', 'i@test.invalid', '{"full_name":"Inspecteur"}'),
  ('b0000000-0000-4000-a000-0000000000a4', 'd@test.invalid', '{"full_name":"Toetser"}');
update auth.users set invited_at = now();
commit;
update public.profiles set role = 'hoofd' where id = 'b0000000-0000-4000-a000-0000000000a1';
update public.profiles set role = 'coordinator' where id in ('b0000000-0000-4000-a000-0000000000a2', 'b0000000-0000-4000-a000-0000000000a3', 'b0000000-0000-4000-a000-0000000000a4');
SQL

toewijzen() {   # $1 = actie-id, $2 = wachttijd binnen de transactie
  psql -X -q -d "$DB" -v ON_ERROR_STOP=1 2>&1 <<SQL
begin;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-0000000000a2","role":"authenticated"}', true) is null;
set local role authenticated;
insert into public.acties (id, tekst, oordeel, status, handmatig, houder, toetser, plandatum)
values ('$1', 'Hek repareren', '–', 'Open', true, 'b0000000-0000-4000-a000-0000000000a3',
        'b0000000-0000-4000-a000-0000000000a4', current_date + 3);
select pg_sleep($2);
commit;
SQL
}
qhse() {   # $1 = wachttijd binnen de transactie (rol: $ROL)
  psql -X -q -d "$DB" -v ON_ERROR_STOP=1 2>&1 <<SQL
begin;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-a000-0000000000a1","role":"authenticated"}', true) is null;
set local role authenticated;
update public.profiles set role = '$ROL' where id = 'b0000000-0000-4000-a000-0000000000a3';
select pg_sleep($1);
commit;
SQL
}
terug() {
  $P -c "update public.profiles set role = 'coordinator' where id = 'b0000000-0000-4000-a000-0000000000a3'" >/dev/null
  $P -c "set session_replication_role = replica; delete from public.acties" >/dev/null
}
OUT=$(mktemp)
GOED=0
for ROL in qhse beheerder; do
# volgorde 1: eerst de toewijzing (houdt de rol vast), dan de rolwijziging
toewijzen ACT-r1-$ROL 2 > "$OUT.1" & P1=$!
sleep 0.5
qhse 0 > "$OUT.2" & P2=$!
wait $P1 || true; wait $P2 || true
FOUT=$(cat "$OUT.1" "$OUT.2" | grep -c "ERROR" || true)
SLECHT=$(psql -X -At -d "$DB" -c "select count(*) from public.acties a join public.profiles p on p.id = a.houder where p.role::text in ('qhse', 'beheerder')")
[ "$FOUT" = "1" ] && [ "$SLECHT" = "0" ] && GOED=$((GOED + 1))
echo "  $ROL, volgorde 1: fouten=$FOUT, qhse/beheerder-houders=$SLECHT ($(grep -ho 'ERROR: .*' "$OUT.1" "$OUT.2" | head -1))"
terug
# volgorde 2: eerst de rolwijziging (nog niet vastgelegd), dan de toewijzing
qhse 2 > "$OUT.1" & P1=$!
sleep 0.5
toewijzen ACT-r2-$ROL 0 > "$OUT.2" & P2=$!
wait $P1 || true; wait $P2 || true
FOUT=$(cat "$OUT.1" "$OUT.2" | grep -c "ERROR" || true)
SLECHT=$(psql -X -At -d "$DB" -c "select count(*) from public.acties a join public.profiles p on p.id = a.houder where p.role::text in ('qhse', 'beheerder')")
[ "$FOUT" = "1" ] && [ "$SLECHT" = "0" ] && GOED=$((GOED + 1))
echo "  $ROL, volgorde 2: fouten=$FOUT, qhse/beheerder-houders=$SLECHT ($(grep -ho 'ERROR: .*' "$OUT.1" "$OUT.2" | head -1))"
terug
done
rm -f "$OUT" "$OUT.1" "$OUT.2"
dropdb --if-exists "$DB"
if [ "$GOED" = "4" ]; then
  echo "race QHSE-/beheerdersrol: OK (in beide volgordes nooit een QHSE-manager of beheerder als actiehouder)"
else
  echo "race QHSE-/beheerdersrol: FOUT"
  exit 1
fi
