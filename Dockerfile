FROM node:16-alpine

RUN apk update
RUN apk add nginx
RUN apk add nginx-mod-stream
RUN apk add python3 python3-dev py3-pip build-base libressl-dev musl-dev libffi-dev rust cargo
RUN pip3 install pip --upgrade
RUN pip3 install certbot-nginx
RUN mkdir /etc/letsencrypt


RUN mkdir -p /opt/app

#RUN adduser -S app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules
RUN mkdir -p /opt/app/public
RUN mkdir -p /opt/app/nginx
RUN mkdir -p /opt/app/nginx/logs
RUN mkdir -p /opt/app/nginx/servers
RUN mkdir -p /opt/app/nginx/servers/logs

WORKDIR /opt/app

COPY dist/ ./dist
COPY node_modules/ ./node_modules
COPY public/ ./public
COPY nginx/ ./nginx

COPY package.json ./package.json

RUN npm install

#RUN chown -R app /opt/app
#RUN chown -R app /var/lib/nginx

#USER app

EXPOSE 80
EXPOSE 443
EXPOSE 3000

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]