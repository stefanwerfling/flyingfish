# syntax=docker/dockerfile:1.6
#
# Image-builder for the FlyingFish Raspberry Pi card. Everything that touches
# loop devices, qemu-user-static, and chroots runs inside this container so the
# host stays clean — no qemu-user-static, no kpartx, no binfmt_misc config
# required on the host.
#
# The container is invoked with --privileged so it can `losetup` on /dev/loop*.

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        xz-utils \
        zstd \
        parted \
        kpartx \
        e2fsprogs \
        dosfstools \
        fdisk \
        rsync \
        qemu-user-static \
        binfmt-support \
        file \
        coreutils \
        sudo && \
    rm -rf /var/lib/apt/lists/*

# `customize.sh` is the actual build driver — it is the container ENTRYPOINT so
# `docker run --privileged flyingfish-pi-builder` invokes it directly.
COPY customize.sh /usr/local/bin/customize.sh
RUN chmod +x /usr/local/bin/customize.sh

WORKDIR /work
ENTRYPOINT ["/usr/local/bin/customize.sh"]
