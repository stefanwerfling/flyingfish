# FlyingFish — Raspberry Pi router image

Build a flashable arm64 SD-card image that boots straight into the full
FlyingFish stack configured as a home **router** (NAT44 + NAT66, WAN DHCP
client, LAN DHCP/RA server). Modelled on the finedge `pi-image` pipeline, but
adapted for FlyingFish's multi-container reality.

## What you get

A single `dist/flyingfish-pi.img.xz` that, on first boot:

1. `docker load`s every FlyingFish service image **and** mariadb / influxdb /
   redis (all arm64), pre-baked offline — the Pi never builds or pulls.
2. Generates `/opt/flyingfish/.env` with fresh random secrets (DB, influx,
   redis, registry, nginx) so every flashed card is unique.
3. Brings the whole stack up via `docker compose up -d` (systemd unit).
4. Has IPv4 + IPv6 forwarding enabled, ready for the netfilter/netdevice router
   parts to program NAT and run DHCP.

## Requirements

- A Linux host with **Docker 24+ including buildx** (the build cross-compiles
  for arm64 via qemu). ~10–25 min and several GB of disk.
- A **Raspberry Pi 4 or 5** (>= 4 GB RAM recommended) and a **>= 16 GB** SD card
  — the full FlyingFish stack is heavy; a Pi 3 / 1 GB will struggle.
- A **second ethernet NIC** (USB) on the Pi: built-in eth = WAN, USB eth = LAN.

## Build

```bash
cd pi-image
make image
# optional private npm proxy for the netfilter/netdevice builds:
make image NPM_REGISTRY_INTERN=http://host:8081/repository/npm-proxy/
```

## Flash

```bash
make flash                 # interactively pick the SD card
make flash DEV=/dev/sdX     # or name it directly
```

`flash.sh` refuses system/non-removable disks unless `--force`, and asks for a
typed `yes`.

## First boot — init phase (both ports on DHCP)

On first boot **every wired NIC (built-in + USB ethernet) comes up as its own
DHCP client** (baked NetworkManager drop-in, see design notes). So:

1. Plug **both** eth ports into your existing network (any DHCP server, e.g.
   your current router), power on, wait a few minutes (image load + stack start
   happen only on the first boot).
2. Reach the Pi on whichever port got an address:
   - Web UI: `https://flyingfish.local:3000/` (or the Pi's IP)
   - SSH: `ssh root@flyingfish.local` — default root password `flyingfish`
     (**change it after first login**).
3. In the Web UI under **Listens → Router**, assign the interface roles (mark
   one NIC `wan`, one `lan` — matched by **MAC address**, so it doesn't matter
   which socket the cable is in), configure NAT (NAT66 or DHCPv6-PD for IPv6),
   and the LAN DHCP/RA range.
4. **Then re-plug**: WAN → your uplink/modem, LAN → your switch/clients. Only
   now does `netdevice` take the NICs over — udhcpc on the WAN, dnsmasq (DHCP +
   RA only; DNS is served by the FlyingFish dnsserver) on the LAN — and
   `netfilter` programs the nftables NAT/filter ruleset.

Because roles are keyed by MAC, the netdevice part is completely hands-off until
step 3, so the dual-DHCP state above persists through the whole configure step.
After re-plugging, reach the web UI again from a client on the **LAN** side (the
Pi is the LAN gateway).

## Design notes

- **Offline bake, not pull.** All images are `docker save`d into one tarball
  (`flyingfish-arm64.tar`) baked into the image, mirroring finedge. First boot
  needs no internet and no registry. The tarball is *kept* on the card (unlike
  finedge's single small image) so `docker load` can recover the exact images
  after a `docker system prune`; delete `/opt/flyingfish/flyingfish.tar` to
  reclaim the space.
- **Image tags** (`flyingfish:v1.1.13`, `flyingfish_*:v1.1.13`) must match
  `files/docker-compose.yml` and the repo's root `docker-compose.yml`. When the
  version bumps, update the `OWN_IMAGES` list in `build.sh` and the tags in
  `files/docker-compose.yml` together.
- **Full stack.** The Pi runs the complete stack (incl. influxdb) — same
  services as `setup/docker-compose.yml` plus the two router parts. Drop
  services you don't need by editing `files/docker-compose.yml` before building.

## Files

| File | Role |
|------|------|
| `build.sh` | Host orchestrator: cross-build all images, save tar, run builder |
| `customize.sh` | Runs in the privileged builder: image surgery + bake |
| `Dockerfile.builder` | The privileged builder container (parted/kpartx/qemu) |
| `Makefile` | `make image` / `make flash` / `make clean` entry points |
| `flash.sh` | Safety-checked SD-card writer |
| `files/docker-compose.yml` | The Pi stack (local image tags, `.env`-driven) |
| `files/firstboot.sh` | First-boot: `docker load` + generate `.env` secrets |
| `files/flyingfish.service` | systemd unit: `docker compose up -d` |
| `files/flyingfish-firstboot.service` | systemd one-shot wrapping firstboot.sh |
