#!/usr/bin/env bash
#
# pi-image/build.sh — orchestrate the FlyingFish Raspberry Pi image build on the host.
#
# FlyingFish is a MULTI-container stack, so unlike a single-image project this
# script cross-builds every FlyingFish service image for linux/arm64, pulls the
# three registry images (mariadb / influxdb / redis) for arm64 too, and saves
# them all into ONE tarball. `firstboot.sh` on the Pi `docker load`s that tarball
# and brings the stack up fully offline — the Pi never builds from source.
#
# What this script does (in order):
#   1. Parse args (paths, source URL, image-grow size).
#   2. Ensure buildx + arm64 binfmt are available.
#   3. Cross-build each FlyingFish image for linux/arm64 (--load into the daemon).
#   4. Pull the registry images (mariadb/influxdb/redis) for linux/arm64.
#   5. `docker save` all of them into one tarball in the cache directory.
#   6. Build the privileged image-builder container from Dockerfile.builder.
#   7. Run it (privileged, /dev mounted); inside, customize.sh does the surgery.
#   8. Out: <dist>/flyingfish-pi.img.xz
#
# The script is idempotent: the OS image + qemu-static tools are cached under
# <cache>/, and Docker layer caching keeps the per-service builds hot.

set -euo pipefail

# ----------- arg parsing -----------------------------------------------------

REPO_ROOT=""
CACHE_DIR=""
DIST_DIR=""
RPI_URL=""
EXTRA_MB="8192"
ONLY_APP="0"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo-root) REPO_ROOT="$2"; shift 2;;
        --cache-dir) CACHE_DIR="$2"; shift 2;;
        --dist-dir)  DIST_DIR="$2"; shift 2;;
        --rpi-url)   RPI_URL="$2"; shift 2;;
        --extra-mb)  EXTRA_MB="$2"; shift 2;;
        --only-app)  ONLY_APP="1"; shift;;
        *) echo "Unknown argument: $1" >&2; exit 2;;
    esac
done

: "${REPO_ROOT:?--repo-root is required}"
: "${CACHE_DIR:?--cache-dir is required}"
: "${DIST_DIR:?--dist-dir is required}"
: "${RPI_URL:?--rpi-url is required}"

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
mkdir -p "$CACHE_DIR" "$DIST_DIR"

# ----------- image inventory -------------------------------------------------
#
# FlyingFish own images. All build with `context: ./` (the repo root); the
# backend uses the root Dockerfile, every part its own. Tags MUST match what
# files/docker-compose.yml references, so the pre-loaded images are found on
# the Pi with no rebuild. Keep this list in sync with the root docker-compose.yml.
#
# Format: "image-tag|dockerfile-path-relative-to-repo-root"
OWN_IMAGES=(
    "flyingfish:v1.1.13|Dockerfile"
    "flyingfish_nginxserver:v1.1.13|nginxserver/Dockerfile"
    "flyingfish_himip:v1.1.13|himhip/Dockerfile"
    "flyingfish_netfilter:v1.1.13|netfilter/Dockerfile"
    "flyingfish_netdevice:v1.1.13|netdevice/Dockerfile"
    "flyingfish_ssh:v1.1.13|sshserver/Dockerfile"
    "flyingfish_ddns:v1.1.13|ddnsserver/Dockerfile"
    "flyingfish_dns:v1.1.13|dnsserver/Dockerfile"
    "flyingfish_pki:v1.1.13|pkiserver/Dockerfile"
    "flyingfish_cluster:v1.1.13|clusterserver/Dockerfile"
)

# Registry images pulled (not built) for arm64 and baked into the same tarball.
REGISTRY_IMAGES=(
    "mariadb:lts"
    "influxdb:latest"
    "redis:7.2-alpine"
)

# `netfilter`/`netdevice` Dockerfiles take an NPM_REGISTRY build-arg (private
# proxy). Pass it through from the environment if set; empty is fine for the
# public registry.
NPM_REGISTRY_ARG="${NPM_REGISTRY_INTERN:-}"

# ----------- 1. buildx / binfmt ---------------------------------------------

echo "→ Ensuring docker buildx is set up for arm64 ..."
if ! docker buildx inspect --bootstrap >/dev/null 2>&1; then
    echo "  docker buildx is not available. Install Docker 24+ with the buildx plugin." >&2
    exit 1
fi

# binfmt registration so arm64 binaries run on x86_64 during the cross-build.
if ! docker run --rm --privileged tonistiigi/binfmt --install arm64 >/dev/null 2>&1; then
    echo "  Could not register arm64 binfmt — buildx may still work if it was previously configured." >&2
fi

# ----------- 2. cross-build every FlyingFish image for arm64 ----------------

ALL_TAGS=()

for entry in "${OWN_IMAGES[@]}"; do
    tag="${entry%%|*}"
    dockerfile="${entry##*|}"
    echo "→ Cross-building $tag  (from $dockerfile) ..."
    build_args=()
    if [[ -n "$NPM_REGISTRY_ARG" ]]; then
        build_args+=(--build-arg "NPM_REGISTRY=$NPM_REGISTRY_ARG")
    fi
    docker buildx build \
        --platform linux/arm64 \
        --tag "$tag" \
        --load \
        "${build_args[@]}" \
        --file "$REPO_ROOT/$dockerfile" \
        "$REPO_ROOT"
    ALL_TAGS+=("$tag")
done

# ----------- 3. pull the registry images for arm64 --------------------------

for img in "${REGISTRY_IMAGES[@]}"; do
    echo "→ Pulling $img for linux/arm64 ..."
    docker pull --platform linux/arm64 "$img"
    ALL_TAGS+=("$img")
done

# ----------- 4. save everything into one tarball ----------------------------

FF_TAR="$CACHE_DIR/flyingfish-arm64.tar"
echo "→ Saving ${#ALL_TAGS[@]} images → $FF_TAR ..."
echo "   ${ALL_TAGS[*]}"
docker save "${ALL_TAGS[@]}" -o "$FF_TAR"
echo "   size: $(du -h "$FF_TAR" | cut -f1)"

# ----------- 5. build the builder image -------------------------------------

echo "→ Building the privileged image-builder container ..."
docker build -t flyingfish-pi-builder -f "$HERE/Dockerfile.builder" "$HERE"

# ----------- 6. run the builder ---------------------------------------------

# Mounts:
#   /work/cache  ← persistent cache for the raspios .img.xz and our image tar
#   /work/files  ← what gets baked into the image (compose, firstboot, units)
#   /work/out    ← where the final .img / .img.xz lands

echo "→ Running the privileged builder ..."
docker run --rm --privileged \
    -v "$CACHE_DIR":/work/cache \
    -v "$HERE/files":/work/files:ro \
    -v "$DIST_DIR":/work/out \
    -e RPI_URL="$RPI_URL" \
    -e EXTRA_MB="$EXTRA_MB" \
    -e ONLY_APP="$ONLY_APP" \
    -e FF_TAR_BASENAME="$(basename "$FF_TAR")" \
    flyingfish-pi-builder

echo
echo "✓ Build finished — image at $DIST_DIR/flyingfish-pi.img.xz"
ls -lh "$DIST_DIR/flyingfish-pi.img.xz"
