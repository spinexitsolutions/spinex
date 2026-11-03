#!/usr/bin/env bash
# Pulls new code from GitHub and rebuilds the website if anything changed (runs every 5 minutes).
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/spinex-update.lock
flock -n 9 || exit 0
git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "$(date -Is) updating to $(git rev-parse --short origin/main)"
  git reset -q --hard origin/main
  docker compose up -d --build
  docker image prune -f > /dev/null
fi
