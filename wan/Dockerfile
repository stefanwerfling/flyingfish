FROM node:22-bookworm-slim

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
# git for the figtree git dependency; udhcpc is the WAN DHCP client; iproute2 for
# interface diagnostics.
RUN apt-get install -y git udhcpc iproute2

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/wan
RUN mkdir -p /opt/flyingfish/wan/dist
RUN mkdir -p /opt/flyingfish/wan/node_modules
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

# Copy wan -------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/wan
COPY ./wan ./

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

WORKDIR /opt/flyingfish/wan
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

CMD [ "node",  "wan/dist/main.js", "--envargs=1"]
