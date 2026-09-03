FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

ARG NPM_REGISTRY="https://registry.npmjs.org/"
# Mirrors the root Dockerfile's nginx build (kept in lockstep: same nginx/njs/
# headers-more versions) - see there for the CVE/version rationale.
ARG NGINX_VERSION="1.30.4"
ARG HEADERS_MORE_VERSION="v0.40"
ARG NJS_BRANCH="0.9.9"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y curl wget gnupg2 ca-certificates lsb-release debian-archive-keyring
RUN apt-get install -y git

RUN apt-get remove -y nginx nginx-common
RUN cd ~ && wget https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz && tar -zxvf nginx-$NGINX_VERSION.tar.gz
RUN apt-get install -y build-essential
RUN apt-get install -y libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev libxslt-dev
RUN apt-get install -y mercurial

RUN cd ~ && \
    git clone --depth 1 --branch $NJS_BRANCH https://github.com/nginx/njs.git && \
    cd ~/njs && \
    ./configure && \
    make

RUN cd ~ && \
     git clone --depth 1 -b $HEADERS_MORE_VERSION --single-branch https://github.com/openresty/headers-more-nginx-module.git \
     && cd ~/headers-more-nginx-module \
     && git submodule update --init

RUN cd ~/nginx-$NGINX_VERSION && \
    ./configure \
    --sbin-path=/usr/bin/nginx \
    --conf-path=/etc/nginx/nginx.conf \
    --error-log-path=/var/log/nginx/error.log \
    --http-log-path=/var/log/nginx/access.log \
    --with-pcre \
    --pid-path=/var/run/nginx.pid \
    --with-compat \
    --with-file-aio \
    --with-threads \
    --with-http_addition_module \
    --with-http_auth_request_module \
    --with-http_dav_module \
    --with-http_flv_module \
    --with-http_gunzip_module \
    --with-http_gzip_static_module \
    --with-http_mp4_module \
    --with-http_random_index_module \
    --with-http_realip_module \
    --with-http_slice_module \
    --with-http_ssl_module \
    --with-http_sub_module \
    --with-http_stub_status_module \
    --with-http_v2_module \
    --with-http_v3_module \
    --with-http_secure_link_module \
    --add-module=../njs/nginx \
    --add-module=../headers-more-nginx-module/ \
    --with-mail \
    --with-mail_ssl_module \
    --with-stream \
    --with-stream_realip_module \
    --with-stream_ssl_module \
    --with-stream_ssl_preread_module \
    --with-cc-opt="-I../quictls/build/include" \
    --with-ld-opt="-L../quictls/build/lib" \
    --modules-path=/usr/lib/nginx/modules/ &&\
     make && \
     make install

RUN apt-get update && apt-get install -y certbot
RUN mkdir /etc/letsencrypt | true

# Init App dirs --------------------------------------------------------------------------------------------------------

RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/nginxserver
RUN mkdir -p /opt/flyingfish/nginx
RUN mkdir -p /opt/flyingfish/nginx/html
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

# Copy nginxserver -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/nginxserver
COPY ./nginxserver ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm -R tsconfig.tsbuildinfo | true
RUN rm package-lock.json | true

# Install All ----------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish
COPY ./package.json ./
RUN npm install --registry=$NPM_REGISTRY --maxsockets 1 --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

WORKDIR /opt/flyingfish/nginxserver
RUN npm run build

# Copy/Install nginx (njs assets, same as the backend build) -----------------------------------------------------------

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

EXPOSE 80
EXPOSE 443
EXPOSE 3000

# start main app -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

CMD [ "node", "nginxserver/dist/main.js", "--envargs=1"]
