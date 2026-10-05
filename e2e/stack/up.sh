#!/usr/bin/env bash
# Sobe a pilha local de testes: Postgres (banco novo) + GoTrue + PostgREST +
# Storage simulado + gateway. Escreve e2e/.env.e2e com URL e chaves.
# Requisitos: PostgreSQL 16 acessível por senha (variáveis PG* do libpq), Node 20+, curl.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
E2E="$(cd "$HERE/.." && pwd)"
ROOT="$(cd "$E2E/.." && pwd)"
BIN="${E2E_BIN_DIR:-$E2E/.bin}"
RUN="$E2E/.run"; mkdir -p "$RUN"
DB="${E2E_DB:-acervo_e2e}"
export PGHOST="${PGHOST:-localhost}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}" PGPASSWORD="${PGPASSWORD:-postgres}"
DB_URL="postgres://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$DB"

"$HERE/fetch-bins.sh"
"$HERE/down.sh" >/dev/null 2>&1 || true
eval "$(node "$HERE/jwt.mjs")"
JWT_SECRET="$(node -e 'import("'"$HERE"'/jwt.mjs").then(m=>console.log(m.JWT_SECRET))')"

echo "» banco $DB"
dropdb --if-exists "$DB"
createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" <<SQL
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'authenticator'; end if;
end \$\$;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- Schema do Auth (o GoTrue cria as tabelas)
create schema auth;

-- Storage: só as tabelas que as migrations referenciam (a API é simulada)
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as \$f\$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
\$f\$;
SQL

echo "» auth (GoTrue)"
(
  cd "$BIN"
  env GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
      GOTRUE_SITE_URL=http://localhost:3000 GOTRUE_DB_DRIVER=postgres DATABASE_URL="$DB_URL?search_path=auth" \
      GOTRUE_DB_MIGRATIONS_PATH="$BIN/migrations" \
      GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated \
      GOTRUE_JWT_ADMIN_ROLES=service_role GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated \
      GOTRUE_DISABLE_SIGNUP=true GOTRUE_MAILER_AUTOCONFIRM=true GOTRUE_EXTERNAL_EMAIL_ENABLED=true \
      GOTRUE_RATE_LIMIT_TOKEN_REFRESH=10000 GOTRUE_RATE_LIMIT_VERIFY=10000 \
      GOTRUE_LOG_LEVEL=warn \
      setsid nohup ./auth > "$RUN/auth.log" 2>&1 & echo $! > "$RUN/auth.pid"
)
for i in $(seq 1 60); do curl -fs http://127.0.0.1:9999/health >/dev/null && break; sleep 0.5; done
curl -fs http://127.0.0.1:9999/health >/dev/null || { echo "auth não subiu:"; tail -20 "$RUN/auth.log"; exit 1; }
psql -q -d "$DB" -c "grant usage on schema auth to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;"

echo "» migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done

echo "» api (PostgREST)"
cat > "$RUN/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:authenticator@$PGHOST:$PGPORT/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = 3001
CONF
setsid nohup "$BIN/postgrest" "$RUN/postgrest.conf" > "$RUN/postgrest.log" 2>&1 & echo $! > "$RUN/postgrest.pid"

echo "» storage simulado e gateway"
rm -rf /tmp/acervo-e2e-storage
setsid nohup node "$HERE/storage-stub.mjs" > "$RUN/storage.log" 2>&1 & echo $! > "$RUN/storage.pid"
setsid nohup node "$HERE/gateway.mjs" > "$RUN/gateway.log" 2>&1 & echo $! > "$RUN/gateway.pid"

for i in $(seq 1 40); do curl -fs http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY" >/dev/null 2>&1 && break; sleep 0.5; done
curl -fs http://localhost:54321/rest/v1/ -H "apikey: $ANON_KEY" >/dev/null || { echo "API não respondeu:"; tail -20 "$RUN/postgrest.log"; exit 1; }

cat > "$E2E/.env.e2e" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
APP_TIMEZONE=America/Cuiaba
E2E_DATABASE_URL=$DB_URL
ENV
echo "✓ pilha pronta em http://localhost:54321 (variáveis em e2e/.env.e2e)"
