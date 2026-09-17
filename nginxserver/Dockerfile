# Multi-stage build for the nginxserver part. The build stage compiles nginx from
# source (with njs + headers-more modules) and builds schemas/core/nginxserver;
# the runtime stage ships the compiled nginx binary + modules, its runtime shared
# libraries, certbot, and the built dist + production node_modules on a clean node
# base — none of the nginx build toolchain (build-essential, *-dev, mercurial)
# ends up in the final image. See dnsserver/Dockerfile for the general rationale.

# ---- build stage -----------------------------------------------------------
FROM node:22-bookworm-slim AS build

ENV DEBIAN_FRONTEND=noninteractive
ARG NPM_REGISTRY="https://registry.npmjs.org/"
# Mirrors the root Dockerfile's nginx build (kept in lockstep: same nginx/njs/
# headers-more versions) - see there for the CVE/version rationale.
ARG NGINX_VERSION="1.30.4"
ARG HEADERS_MORE_VERSION="v0.40"
ARG NJS_BRANCH="0.9.9"

RUN apt-get update -y \
    && apt-get install -y curl wget gnupg2 ca-certificates lsb-release debian-archive-keyring git \
       build-essential libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev libxslt-dev mercurial \
    && rm -rf /var/lib/apt/lists/*

# Build nginx from source (same flags as the root Dockerfile).
RUN cd ~ && wget https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz && tar -zxvf nginx-$NGINX_VERSION.tar.gz
RUN cd ~ \
    && git clone --depth 1 --branch $NJS_BRANCH https://github.com/nginx/njs.git \
    && cd ~/njs && ./configure && make
RUN cd ~ \
    && git clone --depth 1 -b $HEADERS_MORE_VERSION --single-branch https://github.com/openresty/headers-more-nginx-module.git \
    && cd ~/headers-more-nginx-module && git submodule update --init
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
    --modules-path=/usr/lib/nginx/modules/ && \
    make && make install

RUN npm install -g npm@11

WORKDIR /opt/flyingfish
COPY ./package.json ./
COPY ./schemas/ ./schemas/
COPY ./core/ ./core/
COPY ./nginxserver/ ./nginxserver/
COPY ./nginx/ ./nginx/

RUN rm -rf schemas/node_modules schemas/dist schemas/tsconfig.tsbuildinfo schemas/package-lock.json \
           core/node_modules core/dist core/tsconfig.tsbuildinfo core/package-lock.json \
           nginxserver/node_modules nginxserver/dist nginxserver/tsconfig.tsbuildinfo nginxserver/package-lock.json nginxserver/Dockerfile \
           nginx/node_modules nginx/dist nginx/logs nginx/body nginx/sample nginx/servers \
           nginx/package-lock.json nginx/nginx.pid nginx/dhparam.pem nginx/nginx.conf

RUN npm install --registry=$NPM_REGISTRY --maxsockets 1

RUN cd schemas && npm run build \
    && cd ../core && npm run build \
    && cd ../nginxserver && npm run build

RUN mkdir -p nginx/servers/proxy_temp nginx/logs \
    && chmod 700 nginx/servers/proxy_temp \
    && chmod 755 nginx/logs \
    && cd nginx && npm install

RUN npm prune --omit=dev --ignore-scripts

# ---- runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive

# nginx runtime shared libraries (libpcre/zlib/openssl/xslt — the -dev variants
# are build-only), plus certbot for ACME.
RUN apt-get update -y \
    && apt-get install -y libpcre3 zlib1g libssl3 libxslt1.1 ca-certificates certbot \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /etc/letsencrypt /var/log/nginx /var/lib/flyingfish /usr/lib/nginx/modules

# The compiled nginx: binary + config tree. All modules are compiled statically
# into the binary (no --with-*=dynamic / dynamic --add-module), so there is no
# /usr/lib/nginx/modules payload to copy — the empty dir above is enough.
COPY --from=build /usr/bin/nginx /usr/bin/nginx
COPY --from=build /etc/nginx /etc/nginx

WORKDIR /opt/flyingfish
COPY --from=build /opt/flyingfish /opt/flyingfish

EXPOSE 80
EXPOSE 443
EXPOSE 3000

CMD [ "node", "nginxserver/dist/main.js", "--envargs=1" ]
