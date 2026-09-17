# Multi-stage build for the FlyingFish backend. The build stage compiles schemas,
# core, the letsencrypt plugin, the backend, and the frontend (gulp/webpack); the
# runtime stage ships only the built dist + production node_modules + the backend's
# runtime tooling (openssl/certbot/traceroute/ping) on a clean node base. The
# frontend's build-only node_modules (webpack/babel) is dropped after the bundle
# is built. See dnsserver/Dockerfile for the general rationale.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ENV DEBIAN_FRONTEND=noninteractive
ARG NPM_REGISTRY="https://registry.npmjs.org/"

# git for the figtree git dependency; build-essential + python3 cover any
# node-gyp native module builds during npm install.
RUN apt-get update -y \
    && apt-get install -y git build-essential python3-pip python3-dev \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./plugins/package.json ./plugins/package.json
COPY ./plugins/letsencrypt/ ./plugins/letsencrypt/
COPY ./backend/ ./backend/
COPY ./frontend/ ./frontend/
COPY ./nginx/ ./nginx/

RUN rm -rf schemas/node_modules schemas/dist schemas/tsconfig.tsbuildinfo schemas/package-lock.json \
           core/node_modules core/dist core/tsconfig.tsbuildinfo core/package-lock.json \
           plugins/node_modules plugins/letsencrypt/node_modules plugins/letsencrypt/dist plugins/letsencrypt/package-lock.json \
           backend/node_modules backend/dist backend/tsconfig.tsbuildinfo backend/package-lock.json \
           frontend/node_modules frontend/dist frontend/package-lock.json \
           nginx/node_modules nginx/dist nginx/logs nginx/body nginx/sample nginx/servers \
           nginx/package-lock.json nginx/nginx.pid nginx/dhparam.pem nginx/nginx.conf

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build \
    && cd ../plugins/letsencrypt && npm run build \
    && cd ../../backend && npm run build

# Frontend: own install tree (webpack/babel), then build the static bundle.
RUN cd frontend \
    && npm install --registry=$NPM_REGISTRY --force --maxsockets 1 \
    && npm run gulp-copy-data \
    && npm run gulp-build-webpack

# nginx config-gen helper (node package used by the backend in remote mode).
RUN mkdir -p nginx/servers/proxy_temp nginx/logs \
    && chmod 700 nginx/servers/proxy_temp \
    && chmod 755 nginx/logs \
    && cd nginx && npm install

# Drop build-only trees: prune the root install to production deps, and remove
# the frontend's build-only node_modules (the static bundle in frontend/dist is
# all the runtime needs).
RUN npm prune --omit=dev --ignore-scripts \
    && rm -rf frontend/node_modules

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV FLYINGFISH_NGINX_MODULE_MODE_DYN="0"
ENV DEBIAN_FRONTEND=noninteractive

# Runtime tooling: openssl (OpenSSL.ts spawns it for CSR/CRT/dhparam), certbot
# (letsencrypt plugin spawns it), ca-certificates, plus traceroute/ping features.
# python3 is certbot's runtime dependency.
RUN apt-get update -y \
    && apt-get install -y dublin-traceroute iputils-ping openssl ca-certificates python3-pip certbot \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /etc/letsencrypt /var/log/flyingfish /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

EXPOSE 3000

CMD [ "node", "backend/dist/main.js", "--envargs=1" ]
