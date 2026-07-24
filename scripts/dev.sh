#!/usr/bin/env bash
# Brings up local Postgres (if installed) and starts the Next.js dev
# server. Run scripts/setup.sh first if you haven't already.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# shellcheck source=scripts/_nvm.sh
source scripts/_nvm.sh
load_nvm
nvm use

if command -v brew >/dev/null 2>&1 && brew list postgresql@16 >/dev/null 2>&1; then
  ./scripts/db.sh start
else
  echo "note: postgresql@16 not found via brew — skipping DB startup." >&2
  echo "      The app still runs with NEXT_PUBLIC_FEATURE_MAP off (the default)." >&2
  echo "      See README.md#getting-your-keys to set up Postgres." >&2
fi

exec npm run dev
