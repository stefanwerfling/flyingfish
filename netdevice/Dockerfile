# Multi-stage build for the netdevice "host-network agent" part. It manages the host
# NICs (udhcpc on WAN, dnsmasq DHCP/RA on the LAN NICs), reports discovered interfaces,
# AND programs the host nftables ruleset (netfilter subsystem, absorbed from the former
# ff-netfilter part) via the native netfilternft addon (rustables/netlink).
#
# The build stage carries git + the Rust toolchain + clang to compile the addon; the
# runtime stage ships only the compiled dist + .node + production node_modules on a clean
# node base, plus the runtime packages udhcpc/dnsmasq/iproute2.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ARG NPM_REGISTRY="https://registry.npmjs.org/"

# git for the figtree git dependency; curl + build-essential for the Rust toolchain;
# clang + libclang-dev for rustables' bindgen (kernel-header bindings). Kernel headers
# come from linux-libc-dev (via build-essential); no libnftnl/libmnl needed.
RUN apt-get update -y \
    && apt-get install -y git curl build-essential clang libclang-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./netfilternft/ ./netfilternft/
COPY ./netdevice/ ./netdevice/

RUN rm -rf schemas/node_modules schemas/dist schemas/package-lock.json \
           core/node_modules core/dist core/package-lock.json \
           netfilternft/node_modules netfilternft/target netfilternft/package-lock.json \
           netfilternft/*.node netfilternft/index.js netfilternft/index.d.ts \
           netdevice/node_modules netdevice/dist netdevice/package-lock.json netdevice/Dockerfile

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build

# Build the native nftables addon for THIS image's platform (napi targets the host
# triple, so `docker buildx --platform` produces the right .node per arch).
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && (cd /opt/flyingfish/netfilternft && npm run build && rm -rf target)

RUN cd netdevice && npm run build

RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

# udhcpc + dnsmasq + iproute2: WAN DHCP client, LAN DHCP/RA server, address management.
# kea-dhcp6-server: DHCPv6 prefix delegation (PD server) for pd-server LANs — dnsmasq
# can't delegate prefixes from a local pool, so Kea runs alongside it (dnsmasq keeps
# DHCPv4 + RA/SLAAC). Kea only DELEGATES; the netdevice part installs the routes to the
# delegated prefixes itself (watching Kea's lease file), so there is no shell-out hook.
# (netfilter runs over netlink via the .node addon — needs NET_ADMIN, no extra package.)
RUN apt-get update -y && apt-get install -y udhcpc dnsmasq iproute2 kea-dhcp6-server && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

CMD [ "node", "netdevice/dist/main.js", "--envargs=1" ]
