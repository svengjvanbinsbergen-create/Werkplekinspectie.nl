#!/bin/sh
# Draait de database-tests tegen een LOKALE PostgreSQL (16+).
#   PGHOST/PGPORT/PGUSER naar een lokale testserver (superuser). Met een standaard Debian/Ubuntu-PostgreSQL
#   (peer-authenticatie: alleen de OS-gebruiker postgres mag als postgres inloggen) en schrijfrechten voor
#   postgres (het script bouwt schema.sql opnieuw en leest ../js/beheer.js), vanuit de map webapp/:
#     rm -rf /tmp/wpi-db && mkdir /tmp/wpi-db && cp -r supabase js /tmp/wpi-db/ && chmod -R a+rwX /tmp/wpi-db
#     sudo -u postgres sh /tmp/wpi-db/supabase/tests/run.sh        (als root: runuser -u postgres -- sh …)
#   Of met een eigen superuser-rol via TCP: PGHOST=localhost PGUSER=<rol> PGPASSWORD=… sh supabase/tests/run.sh
# Stappen: schema.sql actueel? -> verse database -> Supabase-emulatie ->
# schema.sql 2x (idempotent) -> rls_test.sql (incl. seed.sql 2x) -> races -> naamsleutel.
set -eu
DIR=$(cd "$(dirname "$0")/.." && pwd)
DB=${WPI_TEST_DB:-wpi_rls_test}

# 1. schema.sql moet gelijk zijn aan de migraties
TMP=$(mktemp)
cp "$DIR/schema.sql" "$TMP"
sh "$DIR/bouw-schema.sh" >/dev/null
if ! cmp -s "$TMP" "$DIR/schema.sql"; then
  echo "LET OP: schema.sql was niet actueel en is opnieuw gebouwd uit migrations/."
fi
rm -f "$TMP"

# 2. verse database
dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"
P="psql -X -q -v ON_ERROR_STOP=1 -d $DB"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/tests/supabase_emulatie.sql"

# 3. schema twee keer laden (idempotentie) en seed twee keer
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql"
echo "schema.sql 2x geladen: OK (idempotent)"
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/seed.sql"
echo "seed.sql geladen: OK"

# 4. tests (laadt seed.sql nogmaals, nadat de testgebruikers bestaan). De
#    voorbeeld-e-mailadressen in seed.sql worden voor de test vervangen door die
#    van de testgebruikers (precies wat de beheerder in het echt doet).
SEED=$(mktemp --suffix=.sql)
sed -e 's/bjorn\.sloos@VUL-IN\.invalid/hoofd@test.invalid/' \
    -e 's/winfred\.loerts@VUL-IN\.invalid/coord1@test.invalid/' \
    -e 's/douwe\.deboer@VUL-IN\.invalid/coord2@test.invalid/' "$DIR/seed.sql" > "$SEED"
cd "$DIR/tests"
PGOPTIONS='-c client_min_messages=warning' $P -v seed="$SEED" -f rls_test.sql
rm -f "$SEED"
# 4a. aanvullingen op een vastgelegde inspectie (0010; gebruikt de testgebruikers van rls_test.sql)
PGOPTIONS='-c client_min_messages=warning' $P -f aanvulling_test.sql

# 4b. bijwerken over een gevulde database: schema.sql nogmaals laden mag niets breken
PGOPTIONS='-c client_min_messages=warning' $P -f "$DIR/schema.sql"
echo "schema.sql opnieuw geladen over de gevulde testdatabase: OK"

# 5. gelijktijdigheid: twee hoofden degraderen elkaar tegelijk; iemand wordt tegelijk
#    actiehouder en QHSE-manager; en parallelle verzoeken tegen de limieten per gebruiker
sh "$DIR/tests/race_hoofd.sh" "$DB"
sh "$DIR/tests/race_qhse.sh" "$DB"
sh "$DIR/tests/race_quotum.sh" "$DB"

# 6. naamsleutel/naam opschonen gelijk aan beheer.js, en de tekenregel voor vrije tekst gelijk aan sync.js
#    (alle Unicode-codepunten; vraagt node)
if command -v node >/dev/null 2>&1; then
  sh "$DIR/tests/naamsleutel_check.sh" "$DB"
  sh "$DIR/tests/tekens_check.sh" "$DB"
else
  echo "naamsleutel en tekens: OVERGESLAGEN (node niet gevonden)"
fi
