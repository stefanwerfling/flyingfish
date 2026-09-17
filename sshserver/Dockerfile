# Multi-stage build: compile in a fat build stage, ship only dist + production
# node_modules on a clean runtime base (see dnsserver/Dockerfile for rationale).

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./sshserver/ ./sshserver/

RUN rm -rf schemas/node_modules schemas/dist schemas/package-lock.json \
           core/node_modules core/dist core/package-lock.json \
           sshserver/node_modules sshserver/dist sshserver/package-lock.json sshserver/Dockerfile

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build \
    && cd ../sshserver && npm run build

RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

# openssh-client: required at runtime (this part manages SSH connections).
RUN apt-get update -y && apt-get install -y openssh-client && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

EXPOSE 22

CMD [ "node", "sshserver/dist/main.js", "--envargs=1" ]
