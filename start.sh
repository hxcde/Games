#!/usr/bin/env bash
# Startet einen lokalen Webserver für NEON DRIFT.
set -e
PORT="${1:-8000}"
cd "$(dirname "$0")"
echo "NEON DRIFT läuft auf  ->  http://localhost:${PORT}"
echo "(Strg+C zum Beenden)"
exec python3 -m http.server "$PORT"
