FROM node:22-bookworm-slim

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
# git for the git npm deps; curl + build-essential for building the native QUIC +
# TUN addons (rustup installer + a C toolchain for the ring crypto crate).
RUN apt-get install -y git curl build-essential

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/clusterquic
RUN mkdir -p /opt/flyingfish/clustertun
RUN mkdir -p /opt/flyingfish/clusterdatapath
RUN mkdir -p /opt/flyingfish/clusterdatapath/dist
RUN mkdir -p /opt/flyingfish/clusterdatapath/node_modules
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

# Copy clusterquic (native QUIC addon) ---------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/clusterquic
COPY ./clusterquic/ ./

RUN rm -R node_modules | true
RUN rm -R target | true
RUN rm -f ./*.node index.js index.d.ts | true
RUN rm package-lock.json | true

# Copy clustertun (native TUN addon) ---------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/clustertun
COPY ./clustertun/ ./

RUN rm -R node_modules | true
RUN rm -R target | true
RUN rm -f ./*.node index.js index.d.ts | true
RUN rm package-lock.json | true

# Copy clusterdatapath -------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/clusterdatapath
COPY ./clusterdatapath ./

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

# Build the native QUIC + TUN addons for THIS image's platform. Install the Rust
# toolchain, build both (napi build targets the host triple, so a multi-arch
# `docker buildx` produces the right .node per arch), then remove the toolchain +
# Cargo cache in the SAME layer so ~1GB of Rust does not bloat the final image.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && (cd /opt/flyingfish/clusterquic && npm run build && rm -rf target) \
    && (cd /opt/flyingfish/clustertun && npm run build && rm -rf target) \
    && rm -rf /root/.rustup /root/.cargo

WORKDIR /opt/flyingfish/clusterdatapath
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

RUN npm install supervisor -g

EXPOSE 5337/tcp

WORKDIR /opt/flyingfish

CMD [ "node",  "clusterdatapath/dist/main.js", "--envargs=1"]
