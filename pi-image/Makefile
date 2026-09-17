# FlyingFish — Raspberry Pi 4/5 router image build + flash entry points.
#
# Usage:
#   make image          # build dist/flyingfish-pi.img.xz  (needs Docker + buildx)
#   make flash          # interactively pick an SD card and write the image
#   make flash DEV=/dev/sdX
#   make clean          # remove dist/* (keeps cache/ to avoid re-downloading)
#   make distclean      # also clean cache/
#
# Defaults can be overridden on the command line, e.g.
#   make image EXTRA_MB=10240
#   make image NPM_REGISTRY_INTERN=http://host:8081/repository/npm-proxy/
#
# NOTE: FlyingFish is a heavy multi-container stack. Use a Pi 4 or 5 with >= 4 GB
# RAM and a >= 16 GB SD card (the baked image tarball alone is multiple GB).

SHELL          := /bin/bash
HERE           := $(abspath $(dir $(firstword $(MAKEFILE_LIST))))
REPO_ROOT      := $(abspath $(HERE)/..)
DIST_DIR       := $(HERE)/dist
CACHE_DIR      := $(HERE)/cache
IMAGE_OUT      := $(DIST_DIR)/flyingfish-pi.img.xz

# Raspberry Pi OS Lite 64-bit. The `_latest` URL is a stable redirect.
RPI_IMG_URL    ?= https://downloads.raspberrypi.com/raspios_lite_arm64_latest

# Extra rootfs space (MB) for Docker + all baked FlyingFish images.
EXTRA_MB       ?= 8192

# Optional private npm proxy passed to the netfilter/netdevice image builds.
NPM_REGISTRY_INTERN ?=

.PHONY: image flash clean distclean shellcheck

image:
	mkdir -p $(DIST_DIR) $(CACHE_DIR)
	NPM_REGISTRY_INTERN="$(NPM_REGISTRY_INTERN)" bash $(HERE)/build.sh \
		--repo-root $(REPO_ROOT) \
		--cache-dir $(CACHE_DIR) \
		--dist-dir  $(DIST_DIR) \
		--rpi-url   $(RPI_IMG_URL) \
		--extra-mb  $(EXTRA_MB)
	@echo
	@echo "✓ Image ready: $(IMAGE_OUT)"
	@echo "  Flash with:    make flash"
	@echo "  Or manually:   xzcat $(IMAGE_OUT) | sudo dd of=/dev/sdX bs=4M status=progress conv=fsync"

flash:
	bash $(HERE)/flash.sh $(if $(DEV),--device $(DEV),) --image $(IMAGE_OUT)

shellcheck:
	@for f in $(HERE)/*.sh $(HERE)/files/*.sh; do \
		echo "→ shellcheck $$f"; shellcheck -x "$$f" || exit 1; \
	done

clean:
	rm -rf $(DIST_DIR)

distclean: clean
	rm -rf $(CACHE_DIR)
