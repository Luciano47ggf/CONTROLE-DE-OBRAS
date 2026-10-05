#!/usr/bin/env bash
RUN="$(cd "$(dirname "$0")/.." && pwd)/.run"
for svc in gateway storage postgrest auth; do
  [ -f "$RUN/$svc.pid" ] && kill "$(cat "$RUN/$svc.pid")" 2>/dev/null && echo "parado: $svc"
  rm -f "$RUN/$svc.pid"
done
exit 0
