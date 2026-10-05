#!/usr/bin/env bash
# Baixa os binários oficiais usados pela pilha de testes (uma vez).
set -euo pipefail
BIN="${E2E_BIN_DIR:-$(cd "$(dirname "$0")/.." && pwd)/.bin}"
POSTGREST_VERSION="${POSTGREST_VERSION:-v16.4}"
AUTH_VERSION="${AUTH_VERSION:-v2.197.0}"
mkdir -p "$BIN"
cd "$BIN"
if [ ! -x postgrest ]; then
  echo "baixando PostgREST $POSTGREST_VERSION"
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/$POSTGREST_VERSION/postgrest-$POSTGREST_VERSION-linux-static-x86-64.tar.xz" | tar xJ
fi
if [ ! -x auth ]; then
  echo "baixando Supabase Auth (GoTrue) $AUTH_VERSION"
  curl -fsSL "https://github.com/supabase/auth/releases/download/$AUTH_VERSION/auth-$AUTH_VERSION-amd64.tar.xz" | tar xJ
fi
