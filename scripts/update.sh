#!/usr/bin/env bash
# ====================================================================
# update.sh — povuci najnoviju verziju dashboard-a sa GitHub-a i
# primeni je na server (nginx) koji ga servira.
#
# Pokreni sa Raspberry Pi-ja, iz foldera gde je ovaj repo isklonran:
#   ~/dashboard-repo/scripts/update.sh
#
# Šta radi:
#   1. git pull — povuče najnoviju verziju repo-a
#   2. Kopira dashboard/ (gotove, već izgrađene fajlove) u folder koji
#      nginx stvarno servira (~/dashboard/html/), BEZ diranja config.js
#      (tvoj pravi token tamo ostaje netaknut, pošto se nikad ne čuva
#      u ovom repo-u).
#
# Ne treba Node/npm na Raspberry Pi-ju — fajlovi u dashboard/ su već
# izgrađeni (build se radi na drugom računaru), ovo samo kopira.
# ====================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_DIR="${DASHBOARD_HTML_DIR:-$HOME/dashboard/html}"

echo "==> Repo: $REPO_DIR"
echo "==> Deploy folder: $DEPLOY_DIR"

cd "$REPO_DIR"

echo "==> Povlačim najnoviju verziju sa GitHub-a..."
git pull --ff-only

if [ ! -d "$DEPLOY_DIR" ]; then
  echo "GREŠKA: Deploy folder '$DEPLOY_DIR' ne postoji. Napravi ga prvo"
  echo "(ili podesi DASHBOARD_HTML_DIR da pokazuje na pravi folder)."
  exit 1
fi

echo "==> Kopiram nove fajlove (config.js se NE dira)..."
# Namerno bez rsync-a (ne postoji na svakoj minimalnoj Raspberry Pi OS
# instalaciji) - cp/rm su uvek tu. config.js nikad ne diramo jer ne
# postoji u $REPO_DIR/dashboard/assets, samo u $DEPLOY_DIR direktno.
rm -rf "$DEPLOY_DIR/assets"
cp -r "$REPO_DIR/dashboard/assets" "$DEPLOY_DIR/assets"
cp "$REPO_DIR/dashboard/index.html" "$DEPLOY_DIR/index.html"

REPORT="$REPO_DIR/scripts/report-server-backup.sh"
if [ -f "$REPORT" ]; then
  chmod +x "$REPORT"
  echo "==> Javljam poslednji server backup Home Assistant-u..."
  "$REPORT" || echo "Upozorenje: vreme server backupa nije javljeno (pogledaj /var/backups/server)."
  cron_line="10 4 * * * $REPORT >/dev/null 2>&1"
  current=$(crontab -l 2>/dev/null || true)
  if ! printf '%s\n' "$current" | grep -F "report-server-backup.sh" >/dev/null; then
    printf '%s\n%s\n' "$current" "$cron_line" | crontab -
    echo "==> Svako jutro u 04:10 ponovo se čita najnoviji server backup."
  fi
fi

echo ""
echo "✅ Gotovo! Dashboard je ažuriran na: $DEPLOY_DIR"
echo "   Osveži stranicu u browseru (Ctrl+Shift+R) da vidiš izmene."
