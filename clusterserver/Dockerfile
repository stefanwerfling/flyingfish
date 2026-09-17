# Multi-stage build. The build stage carries git + the Rust toolchain to compile
# the native QUIC addon (clusterquic); the runtime stage ships only the compiled
# dist + .node + production node_modules on a clean node base — none of the
# ~1 GB of Rust tooling ends up in the final image. See dnsserver/Dockerfile.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ARG NPM_REGISTRY="https://registry.npmjs.org/"

# git for the git npm deps; curl + build-essential for building the native QUIC
# addon (rustup installer + a C toolchain for the ring crypto crate).
RUN apt-get update -y && apt-get install -y git curl build-essential && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./clusterquic/ ./clusterquic/
COPY ./clusterserver/ ./clusterserver/

RUN rm -rf schemas/node_modules schemas/dist schemas/package-lock.json \
           core/node_modules core/dist core/package-lock.json \
           clusterquic/node_modules clusterquic/target clusterquic/package-lock.json \
           clusterquic/*.node clusterquic/index.js clusterquic/index.d.ts \
           clusterserver/node_modules clusterserver/dist clusterserver/package-lock.json clusterserver/Dockerfile

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build

# Build the native QUIC addon for THIS image's platform.
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && (cd /opt/flyingfish/clusterquic && npm run build && rm -rf target)

RUN cd clusterserver && npm run build

RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

EXPOSE 5335/tcp

CMD [ "node", "clusterserver/dist/main.js", "--envargs=1" ]
