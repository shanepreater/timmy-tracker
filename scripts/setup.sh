#!/usr/bin/env bash
# Bootstraps a local dev environment: correct Node version, dependencies,
# and a starter .env.local. Safe to re-run.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  NVM_SH="$HOME/.nvm/nvm.sh"
elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
  NVM_SH="/opt/homebrew/opt/nvm/nvm.sh"
else
  echo "error: nvm not found. Install it first: https://github.com/nvm-sh/nvm" >&2
  exit 1
fi

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1090
source "$NVM_SH"

nvm install
nvm use

npm install

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from .env.example — fill in real values before running the app."
fi

echo "Setup complete. Run 'npm run dev' to start the app."
