# Multi-stage build. The build stage carries git (to fetch the figtree git
# dependency), the full dev dependencies (typescript/eslint/...) and npm@11 to
# compile schemas + core + this part. The runtime stage starts from a clean
# node base and receives only the compiled dist + the pruned (production-only)
# node_modules — none of the ~900 MB of build tooling ships in the final image.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# npm 10 (bundled with node:22) crashes while preparing the figtree git
# dependency (arborist "edgesOut" TypeError on its git peer dependencies);
# npm 11 fixes this. npm 12 is not an option yet: it refuses git dependencies
# (allow-git defaults to "none") and blocks install scripts.
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./dnsserver/ ./dnsserver/

# Drop anything copied in from the host that would confuse the install/build.
RUN rm -rf schemas/node_modules schemas/dist schemas/package-lock.json \
           core/node_modules core/dist core/package-lock.json \
           dnsserver/node_modules dnsserver/dist dnsserver/package-lock.json dnsserver/Dockerfile

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build \
    && cd ../dnsserver && npm run build

# Strip dev dependencies from the install tree so only runtime deps are copied
# into the runtime stage. Local workspace packages (schemas, core) are regular
# dependencies and stay; their built dist/ is untouched (prune only edits
# node_modules).
RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

EXPOSE 5333/tcp
EXPOSE 5333/udp

CMD [ "node", "dnsserver/dist/main.js", "--envargs=1" ]
