FROM node:16-alpine
RUN apk update
RUN apk add openssl curl ca-certificates
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
RUN pip3 install pip --upgrade
RUN pip3 install certbot-nginx
RUN mkdir /etc/letsencrypt

RUN mkdir -p /opt/app

#RUN adduser -S app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules
RUN mkdir -p /opt/app/frontend
RUN mkdir -p /opt/app/nginx
RUN mkdir -p /opt/app/nginx/logs
RUN mkdir -p /opt/app/nginx/servers
RUN mkdir -p /opt/app/nginx/servers/logs
RUN mkdir -p /opt/app/nginx/html

WORKDIR /opt/app

COPY backend/dist ./dist
COPY backend/node_modules ./node_modules

COPY frontend/assets ./frontend/assets
COPY frontend/images ./frontend/images
COPY frontend/dist ./frontend/dist
COPY frontend/src ./frontend/src
COPY frontend/index.html ./frontend/index.html
COPY frontend/login.html ./frontend/login.html
COPY frontend/manifest.json ./frontend/manifest.json

COPY nginx/ ./nginx

COPY  backend/package.json ./package.json

RUN npm install

#RUN chown -R app /opt/app
#RUN chown -R app /var/lib/nginx

#USER app

EXPOSE 80
EXPOSE 443
EXPOSE 3000

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]