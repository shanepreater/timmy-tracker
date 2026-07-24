#!/usr/bin/env bash
# Shared nvm bootstrap for scripts/*.sh — source this, don't run it directly.
# Sets up NVM_DIR and loads nvm.sh so `nvm` is available as a function.

load_nvm() {
  local nvm_sh
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    nvm_sh="$HOME/.nvm/nvm.sh"
  elif [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    nvm_sh="/opt/homebrew/opt/nvm/nvm.sh"
  else
    echo "error: nvm not found. Install it first: https://github.com/nvm-sh/nvm" >&2
    exit 1
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1090
  source "$nvm_sh"
}
