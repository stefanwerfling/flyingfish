FROM node:18-bullseye

ENV FLYINGFISH_NGINX_MODULE_MODE_DYN "0"

ARG NGINX_VERSION="1.25.4"
ARG HEADERS_MORE_VERSION="v0.37"
ARG NJS_BRANCH="0.8.3"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y dublin-traceroute
RUN apt-get install -y iputils-ping
RUN apt-get install -y openssl
RUN apt-get install -y curl gnupg2 ca-certificates lsb-release debian-archive-keyring
RUN apt install -y python3-pip python3-dev
RUN apt install -y git

RUN apt-get remove -y nginx nginx-common
RUN cd ~ && wget http://nginx.org/download/nginx-$NGINX_VERSION.tar.gz && tar -zxvf nginx-$NGINX_VERSION.tar.gz
RUN apt update -y
RUN apt-get upgrade -y
RUN apt-get install -y build-essential
RUN apt-get install -y libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev
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

RUN pip3 install pip --upgrade
RUN pip3 install certbot-nginx
RUN mkdir /etc/letsencrypt

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
RUN rm package-lock.json | true

# Copy Core ------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/core
COPY ./core/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy Plugins ---------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/plugins
COPY ./plugins/package.json ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

WORKDIR /opt/flyingfish/plugins/letsencrypt
COPY ./plugins/letsencrypt/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy/ Backend --------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/backend
COPY backend ./

RUN rm -R node_modules | true
RUN rm -R dist | true
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
RUN npm install --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

WORKDIR /opt/flyingfish/plugins/letsencrypt
RUN npm run build

WORKDIR /opt/flyingfish/backend
RUN npm run build

WORKDIR /opt/flyingfish/frontend
RUN npm install --force
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

EXPOSE 80
EXPOSE 443
EXPOSE 3000

# start main app -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish

CMD [ "node",  "backend/dist/main.js", "--envargs=1"]