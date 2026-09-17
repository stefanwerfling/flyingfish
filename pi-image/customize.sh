#!/usr/bin/env bash
#
# customize.sh — runs inside the Dockerfile.builder container, with
# --privileged + /dev mounted. Drives the actual image surgery:
#
#   1. Download Raspberry Pi OS Lite (arm64) into /work/cache (if not cached).
#   2. Decompress it to /tmp/pi.img.
#   3. Grow the image by EXTRA_MB megabytes (truncate, parted repartition,
#      losetup, e2fsck, resize2fs).
#   4. Mount root + boot partitions.
#   5. Copy qemu-aarch64-static into the rootfs and chroot in.
#   6. Inside the chroot: apt-install docker + ca-certs, enable services, turn
#      on IPv4/IPv6 forwarding (this Pi is a router).
#   7. Drop firstboot.sh, the systemd units, docker-compose.yml, and the baked
#      flyingfish-arm64.tar into the rootfs.
#   8. Unmount, detach the loop device, xz-compress, copy to /work/out.

set -euo pipefail

CACHE_DIR="/work/cache"
FILES_DIR="/work/files"
OUT_DIR="/work/out"

: "${RPI_URL:?RPI_URL is required}"
: "${EXTRA_MB:?EXTRA_MB is required}"
: "${FF_TAR_BASENAME:?FF_TAR_BASENAME is required}"
ONLY_APP="${ONLY_APP:-0}"

RPI_XZ="$CACHE_DIR/raspios-lite-arm64.img.xz"
WORK_IMG="/tmp/pi.img"
OUT_IMG_XZ="$OUT_DIR/flyingfish-pi.img.xz"
FF_TAR="$CACHE_DIR/$FF_TAR_BASENAME"

# Mount points used during customisation.
MNT_ROOT="/mnt/pi-root"
MNT_BOOT="/mnt/pi-boot"

mkdir -p "$MNT_ROOT" "$MNT_BOOT" "$OUT_DIR"

# Helpers --------------------------------------------------------------------

log()  { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m! %s\033[0m\n' "$*"; }

cleanup() {
    set +e
    if mountpoint -q "$MNT_BOOT"; then umount "$MNT_BOOT"; fi
    if mountpoint -q "$MNT_ROOT/proc"; then umount "$MNT_ROOT/proc"; fi
    if mountpoint -q "$MNT_ROOT/sys"; then umount "$MNT_ROOT/sys"; fi
    if mountpoint -q "$MNT_ROOT/dev/pts"; then umount "$MNT_ROOT/dev/pts"; fi
    if mountpoint -q "$MNT_ROOT/dev"; then umount "$MNT_ROOT/dev"; fi
    if mountpoint -q "$MNT_ROOT"; then umount "$MNT_ROOT"; fi
    if [[ -n "${LOOPDEV:-}" ]]; then
        kpartx -d "$LOOPDEV" 2>/dev/null || true
        if losetup "$LOOPDEV" >/dev/null 2>&1; then
            losetup -d "$LOOPDEV" || true
        fi
    fi
}
trap cleanup EXIT

# 1. Download base image -----------------------------------------------------

if [[ ! -s "$RPI_XZ" ]]; then
    log "Downloading $RPI_URL ..."
    curl -fL --retry 3 -o "$RPI_XZ" "$RPI_URL"
fi

# 2. Decompress to working image -------------------------------------------

log "Decompressing base image to $WORK_IMG ..."
rm -f "$WORK_IMG"
xz -d -c -k "$RPI_XZ" > "$WORK_IMG"

# 3. Grow the image ----------------------------------------------------------

log "Growing image by ${EXTRA_MB} MiB ..."
truncate -s "+${EXTRA_MB}M" "$WORK_IMG"

# Re-write partition 2 (rootfs) to span the new size. Raspberry Pi OS images
# have two partitions: 1 = FAT32 boot (~512 MiB), 2 = ext4 rootfs (the rest).
# We delete partition 2 and recreate it at the same start sector with the new
# end — parted script mode can't resize in place, hence the dance.
parted --script "$WORK_IMG" unit s print
ROOT_START="$(parted --script "$WORK_IMG" unit s print | awk '/^ 2 /{print $2}' | tr -d 's')"
if [[ -z "$ROOT_START" ]]; then
    echo "Could not parse start sector of partition 2" >&2
    exit 1
fi
parted --script "$WORK_IMG" \
    rm 2 \
    mkpart primary ext4 "${ROOT_START}s" 100%

# 4. Attach a loop device and resize the filesystem --------------------------

log "Attaching loop device ..."
LOOPDEV="$(losetup --show -fP "$WORK_IMG")"
echo "  loop device: $LOOPDEV"

sleep 1
partprobe "$LOOPDEV" 2>/dev/null || true

# Inside Docker, `losetup -P` is unreliable: the partition device nodes may not
# appear in the container's /dev. Fall back to `kpartx`, whose device-mapper
# entries (/dev/mapper/loopNpM) are always visible.
if [[ -e "${LOOPDEV}p2" ]]; then
    ROOT_PART="${LOOPDEV}p2"
    BOOT_PART="${LOOPDEV}p1"
else
    warn "${LOOPDEV}p2 not present after partprobe — using kpartx fallback"
    kpartx -av "$LOOPDEV"
    LOOP_NAME="$(basename "$LOOPDEV")"
    ROOT_PART="/dev/mapper/${LOOP_NAME}p2"
    BOOT_PART="/dev/mapper/${LOOP_NAME}p1"
    sleep 1
    if [[ ! -e "$ROOT_PART" ]]; then
        echo "Partition mapping failed; tried ${LOOPDEV}p2 and ${ROOT_PART}." >&2
        ls -la /dev/mapper/ "$(dirname "$LOOPDEV")" >&2
        exit 1
    fi
fi
echo "  root partition: $ROOT_PART"
echo "  boot partition: $BOOT_PART"

log "fsck + resize rootfs ..."
e2fsck -fy "$ROOT_PART"
resize2fs "$ROOT_PART"

# 5. Mount root + boot -------------------------------------------------------

log "Mounting partitions ..."
mount "$ROOT_PART" "$MNT_ROOT"
mount "$BOOT_PART" "$MNT_BOOT"

# 6. Prepare chroot ----------------------------------------------------------

log "Preparing chroot (qemu-aarch64-static + bind mounts) ..."
cp /usr/bin/qemu-aarch64-static "$MNT_ROOT/usr/bin/"
mount --bind /dev      "$MNT_ROOT/dev"
mount --bind /dev/pts  "$MNT_ROOT/dev/pts"
mount -t proc proc     "$MNT_ROOT/proc"
mount -t sysfs sys     "$MNT_ROOT/sys"

if [[ -e "$MNT_ROOT/etc/resolv.conf" ]]; then
    mv "$MNT_ROOT/etc/resolv.conf" "$MNT_ROOT/etc/resolv.conf.orig"
fi
cp /etc/resolv.conf "$MNT_ROOT/etc/resolv.conf"

# 7. Install docker inside the rootfs ----------------------------------------

if [[ "$ONLY_APP" != "1" ]]; then
    log "Installing Docker engine inside the rootfs ..."
    chroot "$MNT_ROOT" /bin/bash -eux <<'CHROOT_DOCKER'
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/debian $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y --no-install-recommends \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
groupadd -f docker
if id pi >/dev/null 2>&1; then usermod -aG docker pi; fi
apt-get clean
rm -rf /var/lib/apt/lists/*
CHROOT_DOCKER
fi

# 7b. Router: enable IPv4 + IPv6 forwarding persistently ---------------------
#
# The netfilter part flips these at runtime (sysctl -w), but a persistent
# drop-in guarantees forwarding survives across reboots and is on before the
# stack comes up. This Pi is a router.
log "Enabling IPv4/IPv6 forwarding (router sysctls) ..."
install -d -m 0755 "$MNT_ROOT/etc/sysctl.d"
cat > "$MNT_ROOT/etc/sysctl.d/99-flyingfish-router.conf" <<'SYSCTL'
# --- FlyingFish router forwarding ---
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
SYSCTL

# 7c. Bake FlyingFish into /opt/flyingfish -----------------------------------

log "Baking FlyingFish into /opt/flyingfish ..."
install -d -m 0755 "$MNT_ROOT/opt/flyingfish"
cp "$FF_TAR"                         "$MNT_ROOT/opt/flyingfish/flyingfish.tar"
cp "$FILES_DIR/docker-compose.yml"   "$MNT_ROOT/opt/flyingfish/docker-compose.yml"
cp "$FILES_DIR/firstboot.sh"         "$MNT_ROOT/opt/flyingfish/firstboot.sh"
chmod +x "$MNT_ROOT/opt/flyingfish/firstboot.sh"

# systemd units — main service + first-boot one-shot.
install -d -m 0755 "$MNT_ROOT/etc/systemd/system"
cp "$FILES_DIR/flyingfish.service"           "$MNT_ROOT/etc/systemd/system/flyingfish.service"
cp "$FILES_DIR/flyingfish-firstboot.service" "$MNT_ROOT/etc/systemd/system/flyingfish-firstboot.service"

# 7d. Enable services, hostname, SSH -----------------------------------------

log "Enabling services via systemctl in chroot ..."
chroot "$MNT_ROOT" /bin/bash -eux <<'CHROOT_ENABLE'
systemctl enable flyingfish.service
systemctl enable flyingfish-firstboot.service
echo "flyingfish" > /etc/hostname
sed -i 's/^127\.0\.1\.1.*/127.0.1.1\tflyingfish/' /etc/hosts || \
    printf '127.0.1.1\tflyingfish\n' >> /etc/hosts

# Default root password + SSH access — first-flash convenience. Change the
# root password after first login.
echo 'root:flyingfish' | chpasswd
mkdir -p /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/flyingfish.conf <<'SSHCONF'
# --- FlyingFish SSH defaults ---
# Root login with password is on so a freshly-flashed Pi can be reached without
# a prior key exchange. Change the root password after first login.
PermitRootLogin yes
PasswordAuthentication yes
SSHCONF
systemctl enable ssh
CHROOT_ENABLE

# 8. Tear down ---------------------------------------------------------------

log "Restoring resolv.conf and unmounting ..."
rm -f "$MNT_ROOT/etc/resolv.conf"
if [[ -e "$MNT_ROOT/etc/resolv.conf.orig" ]]; then
    mv "$MNT_ROOT/etc/resolv.conf.orig" "$MNT_ROOT/etc/resolv.conf"
fi
rm -f "$MNT_ROOT/usr/bin/qemu-aarch64-static"

umount "$MNT_ROOT/sys"
umount "$MNT_ROOT/proc"
umount "$MNT_ROOT/dev/pts"
umount "$MNT_ROOT/dev"
umount "$MNT_BOOT"
umount "$MNT_ROOT"
losetup -d "$LOOPDEV"
LOOPDEV=""

# 9. Compress and ship -------------------------------------------------------

log "Compressing image to $OUT_IMG_XZ ..."
# -T0 = all cores; -9e = best compression.
xz -T0 -9e -c "$WORK_IMG" > "$OUT_IMG_XZ"
rm -f "$WORK_IMG"

log "Done. Image size: $(du -h "$OUT_IMG_XZ" | cut -f1)"
