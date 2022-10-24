FROM node:19-alpine
RUN apk update

RUN mkdir -p /opt/app
RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules

WORKDIR /opt/app

COPY ./dist ./dist
COPY ./node_modules ./node_modules
COPY ./package.json ./package.json

RUN npm install --force


CMD [ "node",  "dist/main.js"]