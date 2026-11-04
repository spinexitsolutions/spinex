#!/usr/bin/env bash
# Builds the new version while the current one keeps serving visitors, then swaps them in a few seconds.
# Called by deploy/update.sh after the code is updated. If the build fails, the live site is not touched.
set -euo pipefail
cd "$(dirname "$0")/.."

TMP=spinex-prebuild
docker rm -f "$TMP" > /dev/null 2>&1 || true

# 1. New image with the new code and packages (the live container keeps running the old one).
docker compose build -q app

# 2. Production build in a temporary container next to the database (pages are built from the live content).
#    It runs at low priority (nice) so the live site stays fast while it builds.
if ! docker compose run -T --no-deps --name "$TMP" app nice -n 19 npm run build; then
  docker rm -f "$TMP" > /dev/null 2>&1 || true
  echo "$(date -Is) build failed: the live site was not changed"
  exit 1
fi

# 2b. Keep the previous version's page files (JS/CSS chunks) for two weeks, so a visitor who opened the site
#     before this update can still use it (send a form, open a page) without a "failed to load" error.
OLD=$(docker compose ps -q app 2>/dev/null || true)
PREV=$(mktemp -d)
if [ -n "$OLD" ] && docker cp "$OLD":/app/.next/static/. "$PREV" > /dev/null 2>&1; then
  find "$PREV" -type f -mtime +14 -delete 2>/dev/null || true
  docker cp "$PREV"/. "$TMP":/app/.next/static > /dev/null 2>&1 || true
fi
rm -rf "$PREV"

# 3. Save the built app as the image. Settings from .env are blanked in the image; the container gets them
#    from .env when it starts, so no secrets are kept in the image.
changes=(--change 'CMD ["sh", "-c", "[ -f .next/BUILD_ID ] || npm run build; exec npx next start -p 3000"]')
while IFS='=' read -r key _; do
  [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && changes+=(--change "ENV $key=")
done < <(grep -v '^\s*#' .env)
docker commit "${changes[@]}" "$TMP" spinex-app:latest > /dev/null
docker rm "$TMP" > /dev/null

# 4. Swap: the new container starts in a few seconds (already built). Caddy holds requests meanwhile.
docker compose up -d --no-build app
# Caddy reads its settings file when it starts; restart it only if deploy/Caddyfile changed.
if ! docker compose exec -T caddy cat /etc/caddy/Caddyfile 2>/dev/null | cmp -s - deploy/Caddyfile; then
  docker compose up -d --force-recreate --no-deps caddy
fi
docker image prune -f > /dev/null
