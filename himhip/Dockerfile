FROM node:18-bullseye

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y iproute2
RUN apt-get install -y net-tools

# ----------------------------------------------------------------------------------------------------------------------

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/himhip
RUN mkdir -p /opt/flyingfish/himhip/dist
RUN mkdir -p /opt/flyingfish/himhip/node_modules

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

# Copy HimHip ----------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/himhip
COPY ./himhip ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Install --------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish
COPY ./package.json ./
RUN npm install --registry=$NPM_REGISTRY --maxsockets 1 --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

WORKDIR /opt/flyingfish/himhip
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

RUN npm install supervisor -g

WORKDIR /opt/flyingfish

CMD [ "node",  "himhip/dist/main.js", "--envargs=1"]