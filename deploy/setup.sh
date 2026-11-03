#!/usr/bin/env bash
# One-time setup on the VPS:  cd /opt/spinex && bash deploy/setup.sh spinexitsolutions.com
# Asks for the admin email and password, makes the secret keys, starts everything, and adds two
# scheduled jobs: the hourly website scheduler and a check every 5 minutes for new code on GitHub.
set -euo pipefail
cd "$(dirname "$0")/.."
DOMAIN="${1:-spinexitsolutions.com}"

if [ ! -f .env ]; then
  echo "== Admin login for https://$DOMAIN/admin =="
  read -rp "Admin email: " ADMIN_EMAIL
  while :; do
    read -rsp "Admin password (12+ characters, hidden): " ADMIN_PASSWORD; echo
    [ "${#ADMIN_PASSWORD}" -ge 12 ] && break
    echo "Too short, try again."
  done
  umask 077
  cat > .env <<ENV
DOMAIN=$DOMAIN
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
AUTH_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 24)
NODE_ENV=production
ENV
  echo "Saved settings to $(pwd)/.env"
fi

docker compose up -d --build

CRON=$(grep '^CRON_SECRET=' .env | cut -d= -f2)
cat > /etc/cron.d/spinex <<CRONTAB
SHELL=/bin/bash
# Website scheduler: follow-up emails, reminders, backups, recurring invoices.
7 * * * * root curl -s -m 120 -H "Authorization: Bearer $CRON" https://$DOMAIN/api/cron > /dev/null 2>&1
# New code on GitHub goes live by itself.
*/5 * * * * root bash $(pwd)/deploy/update.sh >> /var/log/spinex-update.log 2>&1
CRONTAB
chmod 644 /etc/cron.d/spinex

echo
echo "Started. The first build takes 3 to 6 minutes. Watch it with:  docker compose logs -f app"
echo "Then open https://$DOMAIN"
