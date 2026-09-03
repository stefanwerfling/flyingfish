FROM node:22-bookworm-slim

ENV FLYINGFISH_NGINX_MODULE_MODE_DYN="0"
ENV DEBIAN_FRONTEND=noninteractive

ARG NPM_REGISTRY="https://registry.npmjs.org/"

# nginx itself no longer builds/runs here (9.2.2 slice 5): it moved into its
# own nginxserver image/container, which builds it (see nginxserver/Dockerfile,
# kept version-locked to that one). This image keeps openssl (OpenSSL.ts spawns
# it directly for CSR/CRT/dhparam) and certbot (the letsencrypt plugin spawns it
# directly) - both are backend-side PKI/ACME tooling, independent of nginx.
RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y dublin-traceroute
RUN apt-get install -y iputils-ping
RUN apt-get install -y openssl
RUN apt-get install -y ca-certificates
RUN apt install -y python3-pip python3-dev
RUN apt install -y git
RUN apt install -y certbot
RUN mkdir /etc/letsencrypt | true

# Init App dirs --------------------------------------------------------------------------------------------------------
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/backend
RUN mkdir -p /opt/flyingfish/frontend
RUN mkdir -p /opt/flyingfish/nginx
RUN mkdir -p /opt/flyingfish/nginx/html
RUN mkdir -p /opt/flyingfish/plugins
RUN mkdir -p /opt/flyingfish
RUN mkdir -p /var/log/flyingfish
RUN mkdir -p /var/lib/flyingfish

# Copy Schemas ---------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/schemas
COPY ./schemas/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

# Copy Core ------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/core
COPY ./core/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

# Copy Plugins ---------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/plugins
COPY ./plugins/package.json ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

WORKDIR /opt/flyingfish/plugins/letsencrypt
COPY ./plugins/letsencrypt/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

# Copy/ Backend --------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/backend
COPY backend ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

# Copy/Install Frontend ------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/frontend
COPY frontend ./

RUN rm -R ./node_modules | true
RUN rm -R ./dist | true
RUN rm ./package-lock.json | true

# Install All ----------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish
COPY ./package.json ./
RUN npm install --registry=$NPM_REGISTRY --maxsockets 1 --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

WORKDIR /opt/flyingfish/plugins/letsencrypt
RUN npm run build

WORKDIR /opt/flyingfish/backend
RUN npm run build

WORKDIR /opt/flyingfish/frontend
RUN npm install --registry=$NPM_REGISTRY --force --maxsockets 1 --loglevel verbose
RUN npm run gulp-copy-data
RUN npm run gulp-build-webpack

# Copy/Install nginx ---------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/nginx

COPY nginx ./
RUN rm -R ./node_modules | true
RUN rm -R ./dist | true
RUN rm -R ./logs | true
RUN rm -R ./body | true
RUN rm -R ./sample | true
RUN rm -R ./servers | true
RUN rm ./package-lock.json | true
RUN rm ./nginx.pid | true
RUN rm ./dhparam.pem | true
RUN rm nginx.conf | true

RUN mkdir /opt/flyingfish/nginx/servers
RUN mkdir /opt/flyingfish/nginx/servers/proxy_temp
RUN chmod 700 /opt/flyingfish/nginx/servers/proxy_temp
RUN mkdir /opt/flyingfish/nginx/logs
RUN chmod 755 /opt/flyingfish/nginx/logs

RUN npm install

# add supervisor -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

RUN npm install supervisor -g

# defaults ports -------------------------------------------------------------------------------------------------------

# 80/443 moved to the nginxserver image (9.2.2 slice 4/5) - this container no
# longer builds/runs nginx by default.
EXPOSE 3000

# start main app -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

CMD [ "node",  "backend/dist/main.js", "--envargs=1"]