FROM node:18-bullseye
RUN apt-get update -y
RUN apt-get upgrade -y

RUN mkdir -p /opt/core
RUN mkdir -p /opt/app
RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules

# Copy/Install Core ----------------------------------------------------------------------------------------------------

WORKDIR /opt/core

COPY ./core/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

RUN npm install
RUN npm run build

# Copy/Install VPN -----------------------------------------------------------------------------------------------------

WORKDIR /opt/app

COPY ./vpn/ ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

RUN npm install -g node-gyp
RUN npm install

WORKDIR /opt/app/node_modules/tuntap2
RUN npm run build

WORKDIR /opt/app

RUN npm run build
RUN npm install supervisor -g

CMD [ "node",  "dist/main.js"]