FROM node:18-bullseye
RUN apt-get update -y
RUN apt-get upgrade -y

RUN mkdir -p /opt/app
RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app

COPY ./dist ./dist
COPY ./package.json ./package.json

RUN npm install -g node-gyp
RUN npm install
RUN npm install supervisor -g

CMD [ "node",  "dist/main.js"]