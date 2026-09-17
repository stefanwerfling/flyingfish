# Multi-stage build. The build stage carries git + the Rust toolchain (rustup)
# + clang/libclang-dev to compile the native nftables addon (rustables/netlink);
# the runtime stage ships only the compiled dist + .node + production
# node_modules on a clean node base — none of the ~2 GB of Rust/clang tooling
# ends up in the final image. See dnsserver/Dockerfile for the general rationale.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ARG NPM_REGISTRY="https://registry.npmjs.org/"

# git for the figtree git dependency; curl + build-essential for the Rust
# toolchain (rustup). clang + libclang-dev: rustables' build script runs
# `bindgen` over kernel headers (linux/netfilter/nf_tables.h etc.), which needs
# libclang.so at build time. Kernel headers come from linux-libc-dev (pulled by
# build-essential); no libnftnl/libmnl needed (pure netlink).
RUN apt-get update -y \
    && apt-get install -y git curl build-essential clang libclang-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./netfilternft/ ./netfilternft/
COPY ./netfilter/ ./netfilter/

RUN rm -rf schemas/node_modules schemas/dist schemas/package-lock.json \
           core/node_modules core/dist core/package-lock.json \
           netfilternft/node_modules netfilternft/target netfilternft/package-lock.json \
           netfilternft/*.node netfilternft/index.js netfilternft/index.d.ts \
           netfilter/node_modules netfilter/dist netfilter/package-lock.json netfilter/Dockerfile

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build

# Build the native nftables addon for THIS image's platform (napi targets the
# host triple, so `docker buildx --platform` produces the right .node per arch).
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && (cd /opt/flyingfish/netfilternft && npm run build && rm -rf target)

RUN cd netfilter && npm run build

RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

CMD [ "node", "netfilter/dist/main.js", "--envargs=1" ]
