#!/usr/bin/env bash
# ====================================================================
# apply-package.sh — primeni novi paket koji ti Claude pošalje (zip),
# snimi ga u git (GitHub) kao novu verziju, i odmah ga deploy-uj.
#
# Upotreba:
#   ~/dashboard-repo/scripts/apply-package.sh ~/putanja/do/dashboard-vN.zip
#
# (Isto radi i ako prosledis vec raspakovan folder umesto .zip-a.)
#
# Šta radi:
#   1. Raspakuje zip (ako treba) i proveri da ima izvor/ i dashboard/
#   2. Prepiše te foldere preko postojećih u ovom repo-u
#   3. git commit + git push (nova verzija ide na GitHub, čuva istoriju)
#   4. Pozove update.sh koji deploy-uje na nginx (bez diranja config.js)
# ====================================================================
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Upotreba: $0 <putanja-do-zip-ili-foldera>"
  exit 1
fi

SRC="$1"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP=""

cleanup() { [ -n "$TMP" ] && rm -rf "$TMP"; }
trap cleanup EXIT

if [[ "$SRC" == *.zip ]]; then
  echo "==> Raspakujem $SRC ..."
  TMP="$(mktemp -d)"
  unzip -q "$SRC" -d "$TMP"
  # zip obično ima jedan folder unutra (npr. dashboard-package7/) - nadji ga
  if [ -d "$TMP/izvor" ]; then
    SRC="$TMP"
  else
    SRC="$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -1)"
  fi
fi

if [ ! -d "$SRC/izvor" ] || [ ! -d "$SRC/dashboard" ]; then
  echo "GREŠKA: '$SRC' ne sadrži 'izvor/' i 'dashboard/' foldere — proveri paket."
  exit 1
fi

echo "==> Primenjujem novu verziju iz: $SRC"
# Bez rsync-a (ne postoji svuda) - cp/rm su uvek dostupni. Paket koji
# Claude šalje već ne sadrži node_modules/dist, pa je čisto brisanje +
# kopiranje dovoljno i jednostavno.
rm -rf "$REPO_DIR/izvor" "$REPO_DIR/dashboard"
cp -r "$SRC/izvor" "$REPO_DIR/izvor"
cp -r "$SRC/dashboard" "$REPO_DIR/dashboard"
rm -rf "$REPO_DIR/izvor/node_modules" "$REPO_DIR/izvor/dist"

cd "$REPO_DIR"
git add -A

if git diff --cached --quiet; then
  echo "==> Nema izmena u odnosu na trenutnu verziju u repo-u."
else
  git commit -m "Update $(date '+%Y-%m-%d %H:%M')"
  echo "==> Šaljem na GitHub..."
  git push
fi

echo "==> Pokrećem deploy..."
"$REPO_DIR/scripts/update.sh"
