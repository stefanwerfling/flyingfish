#!/usr/bin/env bash
#
# pi-image/flash.sh — write `dist/flyingfish-pi.img.xz` to an SD card.
#
# Safety features:
#  - Refuses to write to non-removable devices unless `--force` is passed.
#  - Refuses to write to a device with a partition mounted at `/`.
#  - Refuses to write to /dev/sda, /dev/nvme0n1, /dev/vda outright; `--force`
#    opts out for unusual setups.
#  - Prints size / model / mountpoints / partitions and waits for a `yes`.
#  - xzcat | dd ... conv=fsync oflag=direct + sync so the write is really on
#    the card before the script exits.

set -euo pipefail

IMAGE=""
DEVICE=""
FORCE="0"

usage() {
    cat >&2 <<EOF
Usage: $0 --image <path.img.xz> [--device /dev/sdX] [--force]

Without --device the script lists removable devices interactively.
Pass --force to bypass the "non-removable / system disk" guard rails.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --image)  IMAGE="$2"; shift 2;;
        --device) DEVICE="$2"; shift 2;;
        --force)  FORCE="1"; shift;;
        -h|--help) usage; exit 0;;
        *) echo "Unknown argument: $1" >&2; usage; exit 2;;
    esac
done

[[ -z "$IMAGE" ]] && { usage; exit 2; }
[[ ! -s "$IMAGE" ]] && { echo "Image not found or empty: $IMAGE" >&2; exit 1; }

# --- discover or validate target -------------------------------------------

list_candidates() {
    lsblk -d -n -o NAME,SIZE,TRAN,RM,MODEL \
        | awk '$4=="1" {printf "  /dev/%-7s  %-7s  %-5s  %s\n", $1, $2, $3, substr($0, index($0,$5))}'
}

if [[ -z "$DEVICE" ]]; then
    echo "Removable block devices on this host:"
    candidates="$(list_candidates)"
    if [[ -z "$candidates" ]]; then
        echo "  (none)" >&2
        echo "Plug in your SD card / USB writer and try again." >&2
        exit 1
    fi
    printf '%s\n' "$candidates"
    echo
    read -r -p "Enter the target device (e.g. /dev/sdc): " DEVICE
fi

[[ -b "$DEVICE" ]] || { echo "Not a block device: $DEVICE" >&2; exit 1; }

if [[ "$FORCE" != "1" ]]; then
    case "$DEVICE" in
        /dev/sda|/dev/nvme0n1|/dev/vda)
            echo "Refusing to write to $DEVICE — looks like a system disk." >&2
            echo "Re-run with --force if you really mean it." >&2
            exit 1;;
    esac
fi

mapfile -t parts < <(lsblk -n -o NAME "$DEVICE" | tail -n +2)
for p in "${parts[@]}"; do
    mp="$(lsblk -n -o MOUNTPOINT "/dev/$p" 2>/dev/null || true)"
    if [[ "$mp" == "/" ]]; then
        echo "ABORT: $DEVICE has a partition (/dev/$p) mounted at /." >&2
        exit 1
    fi
done

rm_bit="$(lsblk -d -n -o RM "$DEVICE")"
if [[ "$rm_bit" != "1" && "$FORCE" != "1" ]]; then
    echo "ABORT: $DEVICE is not flagged as removable." >&2
    echo "Re-run with --force if you really mean it." >&2
    exit 1
fi

# --- confirm ----------------------------------------------------------------

echo
echo "─────────────────────────────────────────────────────────"
echo " Target: $DEVICE"
echo "─────────────────────────────────────────────────────────"
lsblk -o NAME,SIZE,TRAN,RM,MODEL,MOUNTPOINTS "$DEVICE" || true
echo "─────────────────────────────────────────────────────────"
echo " Image:  $IMAGE"
echo "         $(du -h "$IMAGE" | cut -f1) compressed"
echo "─────────────────────────────────────────────────────────"
echo " EVERYTHING on $DEVICE will be erased."
read -r -p " Type 'yes' to proceed: " confirm
[[ "$confirm" == "yes" ]] || { echo "Aborted."; exit 1; }

# --- unmount any mounted partitions on the target ---------------------------

echo "Unmounting any partitions on $DEVICE ..."
for p in "${parts[@]}"; do
    if findmnt -n "/dev/$p" >/dev/null 2>&1; then
        sudo umount "/dev/$p" || { echo "Failed to umount /dev/$p" >&2; exit 1; }
    fi
done

# --- write ------------------------------------------------------------------

echo "Writing image (this can take several minutes) ..."
xzcat -- "$IMAGE" \
    | sudo dd of="$DEVICE" bs=4M status=progress conv=fsync oflag=direct

echo "Syncing kernel buffers ..."
sudo sync
sudo partprobe "$DEVICE" || true

echo
echo "✓ Done. You can pull the SD card now."
echo "  Insert it into the Pi, wire WAN to the built-in ethernet and LAN to the"
echo "  USB ethernet, plug in power, and wait a few minutes for first boot"
echo "  (docker load of the baked images + stack start)."
echo
echo "  Web UI:   https://flyingfish.local:3000/   (or the Pi's LAN IP)"
echo "  SSH:      ssh root@flyingfish.local        (default root password 'flyingfish')"
echo "  Change the root password after first login."
