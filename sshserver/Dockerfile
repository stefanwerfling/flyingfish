FROM node:18-bullseye

RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install -y openssh-client

RUN mkdir -p /opt/app

RUN mkdir -p /opt/app/dist
RUN mkdir -p /opt/app/node_modules
RUN mkdir -p /var/lib/flyingfish
RUN mkdir -p /var/lib/flyingfish/ssh

WORKDIR /opt/app

COPY ./ ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

RUN npm install
RUN npm run build
RUN npm install supervisor -g

EXPOSE 22

CMD [ "node",  "dist/main.js", "--envargs=1"]