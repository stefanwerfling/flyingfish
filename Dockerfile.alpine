FROM node:19-alpine
RUN apk update
RUN apk add openssl curl ca-certificates
RUN apk add --upgrade paris-traceroute
RUN printf "%s%s%s%s\n" \
        "@nginx " \
        "http://nginx.org/packages/alpine/v" \
        `egrep -o '^[0-9]+\.[0-9]+' /etc/alpine-release` \
        "/main" \
        | tee -a /etc/apk/repositories

RUN curl -o /tmp/nginx_signing.rsa.pub https://nginx.org/keys/nginx_signing.rsa.pub
RUN mv /tmp/nginx_signing.rsa.pub /etc/apk/keys/

RUN apk add nginx@nginx
RUN apk add nginx-mod-stream@nginx
RUN apk add nginx-module-njs@nginx

RUN apk add python3 python3-dev py3-pip build-base libressl-dev musl-dev libffi-dev rust cargo
RUN apk add git
RUN pip3 install pip --upgrade
RUN pip3 install certbot-nginx
RUN mkdir /etc/letsencrypt

RUN mkdir -p /opt/app
RUN mkdir -p /opt/app/frontend
RUN mkdir -p /opt/app/nginx
RUN mkdir -p /opt/app/nginx/logs
RUN mkdir -p /opt/app/nginx/servers
RUN mkdir -p /opt/app/nginx/servers/logs
RUN mkdir -p /opt/app/nginx/html
RUN mkdir -p /var/log/flyingfish/
RUN mkdir -p /var/lib/flyingfish

WORKDIR /opt/app

COPY backend/dist ./dist
COPY backend/node_modules ./node_modules
COPY backend/package.json ./package.json

COPY frontend/assets ./frontend/assets
COPY frontend/images ./frontend/images
COPY frontend/dist ./frontend/dist
COPY frontend/src ./frontend/src
RUN rm -r /opt/app/frontend/src/inc/Bambooo
COPY frontend/node_modules/bambooo/src ./frontend/src/inc/Bambooo
COPY frontend/index.html ./frontend/index.html
COPY frontend/login.html ./frontend/login.html
COPY frontend/manifest.json ./frontend/manifest.json
COPY frontend/package.json ./frontend/package.json

COPY nginx/dist ./nginx/dist
COPY nginx/node_modules ./nginx/node_modules
COPY nginx/pages ./nginx/pages
COPY nginx/htpasswd ./nginx/htpasswd
COPY nginx/package.json ./nginx/package.json

RUN npm install --force --prefix ./
RUN npm install --force --prefix ./frontend
RUN npm install --force --prefix ./nginx

EXPOSE 80
EXPOSE 443
EXPOSE 3000

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]