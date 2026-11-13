#!/bin/sh
# Bouwt supabase/schema.sql (volledige, gecombineerde versie) uit migrations/*.sql.
# Gebruik: sh supabase/bouw-schema.sh   (vanuit webapp/ of vanuit supabase/)
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
OUT="$DIR/schema.sql"
{
  echo "-- ====================================================================="
  echo "-- Werkplekinspectie (Noardling B.V.) — volledig Supabase-schema (v1)"
  echo "-- GEGENEREERD door supabase/bouw-schema.sh uit supabase/migrations/."
  echo "-- Niet met de hand wijzigen: pas de migratie aan en bouw opnieuw."
  echo "-- Toepassen: zie supabase/README.md. Idempotent (opnieuw draaien mag)."
  echo "-- ====================================================================="
  for f in "$DIR"/migrations/[0-9]*.sql; do
    echo
    echo "-- >>>>> $(basename "$f")"
    cat "$f"
  done
} > "$OUT"
echo "schema.sql gebouwd uit $(ls "$DIR"/migrations/[0-9]*.sql | wc -l) migraties"
