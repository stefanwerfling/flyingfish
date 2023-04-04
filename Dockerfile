FROM node:18-bullseye

ENV FLYINGFISH_NGINX_MODULE_MODE_DYN "1"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y dublin-traceroute
RUN apt-get install -y iputils-ping
RUN apt-get install -y openssl
RUN apt-get install -y curl gnupg2 ca-certificates lsb-release debian-archive-keyring
#RUN apk add --upgrade paris-traceroute

RUN curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
        | tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

RUN echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/debian `lsb_release -cs` nginx" \
        | tee /etc/apt/sources.list.d/nginx.list

RUN apt update -y
RUN apt-get upgrade -y
RUN apt install -y nginx nginx-module-njs nginx-module-njs-dbg

RUN apt install -y python3-pip python3-dev
RUN apt install -y git
RUN pip3 install pip --upgrade
RUN pip3 install certbot-nginx
RUN mkdir /etc/letsencrypt

RUN mkdir -p /opt/app
RUN mkdir -p /opt/app/frontend
RUN mkdir -p /opt/app/nginx
RUN mkdir -p /opt/app/nginx/body
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
COPY frontend/index.html ./frontend/index.html
COPY frontend/login.html ./frontend/login.html
COPY frontend/manifest.json ./frontend/manifest.json
COPY frontend/package.json ./frontend/package.json

COPY nginx/dist ./nginx/dist
COPY nginx/node_modules ./nginx/node_modules
COPY nginx/pages ./nginx/pages
COPY nginx/htpasswd ./nginx/htpasswd
COPY nginx/package.json ./nginx/package.json

RUN npm install supervisor -g

EXPOSE 80
EXPOSE 443
EXPOSE 3000

CMD [ "node",  "dist/main.js", "--envargs=1"]