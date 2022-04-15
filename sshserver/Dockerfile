FROM node:16-alpine

RUN mkdir -p /opt/app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules
RUN mkdir -p /opt/app/ssh

WORKDIR /opt/app

COPY dist/ ./dist
COPY node_modules/ ./node_modules

COPY package.json ./package.json

RUN npm install

EXPOSE 22

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]