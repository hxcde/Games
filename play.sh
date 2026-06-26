#!/usr/bin/env bash
# SUNSET BLOCK — lokal starten (mit Auto-Update von GitHub)
cd "$(dirname "$0")" || exit 1
exec python3 launcher.py "$@"
