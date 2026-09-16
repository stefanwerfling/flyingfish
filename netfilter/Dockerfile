FROM node:22-bookworm-slim

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
# git for the figtree git dependency; curl + build-essential for the Rust toolchain
# (rustup) that builds the native nftables addon (rustables/netlink — no nft binary).
RUN apt-get install -y git curl build-essential

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/netfilternft
RUN mkdir -p /opt/flyingfish/netfilter
RUN mkdir -p /opt/flyingfish/netfilter/dist
RUN mkdir -p /opt/flyingfish/netfilter/node_modules
RUN mkdir -p /var/lib/flyingfish

# Copy Schemas ---------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/schemas
COPY ./schemas/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy Core ------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/core
COPY ./core/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy netfilternft (native nftables addon) ----------------------------------------------------------------------------

WORKDIR /opt/flyingfish/netfilternft
COPY ./netfilternft/ ./

RUN rm -R node_modules | true
RUN rm -R target | true
RUN rm -f ./*.node index.js index.d.ts | true
RUN rm package-lock.json | true

# Copy netfilter -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/netfilter
COPY ./netfilter ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Install --------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish
COPY ./package.json ./
# npm 10 (bundled with node:22) crashes while preparing the figtree git
# dependency; npm 11 fixes this.
RUN npm install -g npm@11
RUN npm install --registry=$NPM_REGISTRY --maxsockets 1 --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

# Build the native nftables addon for THIS image's platform. Install the Rust
# toolchain, build it (napi build targets the host triple, so a multi-arch
# `docker buildx` produces the right .node per arch), then remove the toolchain +
# Cargo cache in the SAME layer so ~1GB of Rust does not bloat the final image.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && (cd /opt/flyingfish/netfilternft && npm run build && rm -rf target) \
    && rm -rf /root/.rustup /root/.cargo

WORKDIR /opt/flyingfish/netfilter
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

CMD [ "node",  "netfilter/dist/main.js", "--envargs=1"]
