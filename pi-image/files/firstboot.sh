#!/usr/bin/env bash
#
# /opt/flyingfish/firstboot.sh — runs once on the very first boot of a freshly
# flashed Pi card. Two jobs:
#
#   1. `docker load` the pre-baked multi-image tarball (all FlyingFish service
#      images + mariadb for arm64) into the local Docker daemon.
#   2. Generate /opt/flyingfish/.env with fresh random secrets (so every flashed
#      card gets unique DB / registry / nginx credentials — nothing shared).
#
# Then it self-disables so subsequent boots skip straight to flyingfish.service.
#
# Re-run manually with:   sudo systemctl start flyingfish-firstboot.service
# (works because the unit is conditioned on /opt/flyingfish/flyingfish.tar
# existing — but this script no longer deletes the tar, see below.)

set -euo pipefail

APP_DIR="/opt/flyingfish"
TAR="$APP_DIR/flyingfish.tar"
ENV_FILE="$APP_DIR/.env"
STAMP="$APP_DIR/.firstboot.done"

log() { printf '[flyingfish-firstboot] %s\n' "$*"; }

if [[ -e "$STAMP" ]]; then
    log "Already ran; nothing to do."
    exit 0
fi

if [[ ! -s "$TAR" ]]; then
    log "ERROR: $TAR is missing or empty — image build is broken." >&2
    exit 1
fi

# --- 1. load the baked images ----------------------------------------------

log "Loading bundled Docker images (this takes a few minutes on a Pi) ..."
/usr/bin/docker load -i "$TAR"

# --- 2. generate .env with fresh random secrets -----------------------------
#
# Only generate once. If an operator pre-seeded /opt/flyingfish/.env (e.g. by
# editing the boot partition), respect it and don't clobber.
gen() { openssl rand -base64 "${1:-24}" | tr -d '/+=' | cut -c1-"${2:-32}"; }

if [[ -s "$ENV_FILE" ]]; then
    log ".env already present — keeping existing secrets."
else
    log "Generating $ENV_FILE with fresh random secrets ..."
    MARIADB_ROOT_PASSWORD="$(gen 32 40)"
    REGISTRY_SECRET="$(gen 32 40)"
    NGINX_SECRET="$(gen 32 40)"

    umask 077
    cat > "$ENV_FILE" <<EOF
# FlyingFish Pi stack environment — generated on first boot with unique secrets.
# Safe to edit; changing DB credentials after first boot requires wiping the
# corresponding data volume.

# --- MariaDB ---
MARIADB_ROOT_USERNAME=root
MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}
MARIADB_DATABASE=flyingfish

# --- Backend / registry / nginx ---
HTTPSERVER_PORT=3000
REGISTRY_SECRET=${REGISTRY_SECRET}
REGISTRY_URL=https://flyingfish:3000
REGISTRY_URL_HOST=https://127.0.0.1:3000
NGINX_SECRET=${NGINX_SECRET}
NGINX_REMOTE_URL=http://10.103.0.9:3000
LOGGING_LEVEL=info
DYNDNSSERVER_ENABLE=1
EOF
    chmod 600 "$ENV_FILE"
fi

# NOTE: unlike a single-image project we do NOT delete the tarball here. The Pi
# stack is many gigabytes to re-download; keeping the tar lets `docker load`
# recover the exact images offline after a `docker system prune`. Delete it
# manually (rm /opt/flyingfish/flyingfish.tar) if you need the SD-card space.

touch "$STAMP"
log "First-boot setup complete."
