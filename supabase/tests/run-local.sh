#!/usr/bin/env bash
# Roda a suíte pgTAP num PostgreSQL local (sem Docker/Supabase CLI).
# Requisitos: postgresql-16, postgresql-16-pgtap, pg_prove.
# Uso: supabase/tests/run-local.sh   (variáveis PG* padrão do libpq são respeitadas)
# No Supabase CLI, o equivalente é simplesmente: supabase test db
set -euo pipefail
cd "$(dirname "$0")"
DB="${TEST_DB:-acervo_test}"

dropdb --if-exists "$DB" >/dev/null
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -v DBNAME="$DB" -d "$DB" -f local-stub.sql >/dev/null
for f in ../migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done
pg_prove -d "$DB" --ext .sql database/
