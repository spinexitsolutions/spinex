#!/usr/bin/env bash
# Runs every 5 minutes. Puts new code from GitHub live, but only after the GitHub "Build check" for that exact
# commit has passed (its result is on the build-results branch), so a broken build never takes the site down.
set -euo pipefail
cd "$(dirname "$0")/.."
exec 9>/tmp/spinex-update.lock
flock -n 9 || exit 0
git fetch -q origin main build-results 2>/dev/null || git fetch -q origin main
target=$(git rev-parse origin/main)
[ "$(git rev-parse HEAD)" = "$target" ] && exit 0
status=$(git show origin/build-results:status.txt 2>/dev/null || true)
if ! grep -q "commit=$target" <<<"$status"; then
  exit 0 # build check not finished yet; try again in 5 minutes
fi
if ! grep -q "result=success" <<<"$status"; then
  echo "$(date -Is) skipped $(git rev-parse --short "$target"): build check failed"
  exit 0
fi
echo "$(date -Is) updating to $(git rev-parse --short "$target")"
git reset -q --hard "$target"
docker compose up -d --build
docker image prune -f > /dev/null
