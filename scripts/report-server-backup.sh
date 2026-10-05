#!/usr/bin/env bash
# Pročita najnoviji /var/backups/server/server-*.tar.gz i javi vreme
# Home Assistant-u. Dashboard već prikazuje sensor.server_backup_last_success.
# Token se čita iz ~/dashboard/html/config.js i nigde se ne ispisuje.
set -euo pipefail

DEST=/var/backups/server
CONFIG="${DASHBOARD_HTML_DIR:-$HOME/dashboard/html}/config.js"

if [ ! -f "$CONFIG" ]; then
  echo "Nema $CONFIG"
  exit 1
fi

if [ ! -d "$DEST" ]; then
  echo "Nema foldera $DEST"
  exit 1
fi

line=$(find "$DEST" -maxdepth 1 -type f -name 'server-*.tar.gz' -printf '%T@ %p\n' | sort -n | tail -1)
if [ -z "$line" ]; then
  echo "Nema fajla server-*.tar.gz u $DEST"
  exit 1
fi

epoch=${line%% *}
epoch=${epoch%.*}
path=${line#* }
stamp=$(date -d "@${epoch}" +"%Y-%m-%d %H:%M:%S")

token=$(sed -n 's/.*token:[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG" | head -1)
host=$(sed -n 's/.*haHost:[[:space:]]*"\([^"]*\)".*/\1/p' "$CONFIG" | head -1)
if [ -z "$token" ] || [ -z "$host" ]; then
  echo "config.js nema token ili haHost"
  exit 1
fi

curl -fsS -X POST "http://${host}/api/services/input_datetime/set_datetime" \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  -d "{\"entity_id\":\"input_datetime.server_backup_last\",\"datetime\":\"${stamp}\"}" \
  >/dev/null

curl -fsS -X POST "http://${host}/api/services/input_boolean/turn_on" \
  -H "Authorization: Bearer ${token}" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"input_boolean.server_backup_known"}' \
  >/dev/null

echo "Server backup: ${stamp} ($(basename "$path"))"
