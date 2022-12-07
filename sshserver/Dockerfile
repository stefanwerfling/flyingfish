FROM node:19-alpine

RUN apk update
RUN apk add --no-cache openssh-keygen

RUN mkdir -p /opt/app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules
RUN mkdir -p /opt/app/ssh

WORKDIR /opt/app

COPY dist/ ./dist
COPY node_modules/ ./node_modules

COPY package.json ./package.json

RUN npm install
RUN npm install supervisor -g

EXPOSE 22

CMD [ "node",  "dist/main.js", "--config=/opt/app/config.json"]