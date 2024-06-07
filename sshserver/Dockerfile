FROM node:20-bullseye

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y openssh-client

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/sshserver
RUN mkdir -p /opt/flyingfish/sshserver/dist
RUN mkdir -p /opt/flyingfish/sshserver/node_modules
RUN mkdir -p /var/lib/flyingfish
RUN mkdir -p /var/lib/flyingfish/ssh

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

# Copy sshserver -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/sshserver
COPY ./sshserver ./

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

WORKDIR /opt/flyingfish/sshserver
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

RUN npm install supervisor -g

EXPOSE 22

WORKDIR /opt/flyingfish

CMD [ "node",  "sshserver/dist/main.js", "--envargs=1"]