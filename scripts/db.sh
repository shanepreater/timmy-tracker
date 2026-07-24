#!/usr/bin/env bash
# Start/stop/check the local Postgres used for dev + tests (see
# README.md#getting-your-keys for one-time setup).
set -euo pipefail

PG_SERVICE="postgresql@16"

usage() {
  echo "Usage: $(basename "$0") {start|stop|status}" >&2
  exit 1
}

[ $# -eq 1 ] || usage

if ! command -v brew >/dev/null 2>&1; then
  echo "error: Homebrew not found — this script only supports the brew-installed $PG_SERVICE." >&2
  exit 1
fi

case "$1" in
  start)
    brew services start "$PG_SERVICE"
    ;;
  stop)
    brew services stop "$PG_SERVICE"
    ;;
  status)
    brew services info "$PG_SERVICE"
    ;;
  *)
    usage
    ;;
esac
