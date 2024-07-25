FROM node:20-bullseye

ARG NPM_REGISTRY="https://registry.npmjs.org/"

RUN apt-get update -y
RUN apt-get upgrade -y
RUN npm install -g node-gyp

# Install Rohc ---------------------------------------------------------------------------------------------------------

RUN apt-get install autotools-dev -y
RUN apt-get install automake -y
RUN apt-get install libtool -y
RUN apt-get install libpcap-dev -y
RUN apt-get install libcmocka-dev -y

WORKDIR /opt/
RUN git clone https://github.com/stefanwerfling/rohc.git
WORKDIR /opt/rohc/
RUN ./autogen.sh --prefix=/usr
RUN make all
RUN make install

# Create dirs ----------------------------------------------------------------------------------------------------------

RUN mkdir -p /opt/flyingfish
RUN mkdir -p /opt/flyingfish/schemas
RUN mkdir -p /opt/flyingfish/core
RUN mkdir -p /opt/flyingfish/vpn
RUN mkdir -p /opt/flyingfish/vpn/dist
RUN mkdir -p /opt/flyingfish/vpn/node_modules
RUN mkdir -p /var/lib/flyingfish

# Copy Schemas ---------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/schemas
COPY ./schemas/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy Core ------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/core
COPY ./core/ ./

RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Copy sshserver -------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish/vpn
COPY ./vpn ./

RUN rm -R Dockerfile | true
RUN rm -R node_modules | true
RUN rm -R dist | true
RUN rm package-lock.json | true

# Install --------------------------------------------------------------------------------------------------------------

WORKDIR /opt/flyingfish
COPY ./package.json ./
RUN npm install --registry=$NPM_REGISTRY --maxsockets 1 --loglevel verbose

WORKDIR /opt/flyingfish/schemas
RUN npm run build

WORKDIR /opt/flyingfish/core
RUN npm run build

WORKDIR /opt/flyingfish/node_modules/tuntap2
RUN npm run build --loglevel verbose

WORKDIR /opt/flyingfish/node_modules/node-rohc
RUN npm run build --loglevel verbose

WORKDIR /opt/flyingfish/vpn
RUN npm run build

# ----------------------------------------------------------------------------------------------------------------------

RUN npm install supervisor -g

EXPOSE 22

WORKDIR /opt/flyingfish

CMD [ "node",  "vpn/dist/main.js", "--envargs=1"]