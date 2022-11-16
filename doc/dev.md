# Index
1. [Dev Env](#dev-env)
   * 1.1 [Docker Image](#docker-image)
   * 1.2 [Build process](#build-process)
      * 1.2.1 [Build Backend](#build-backend)
      * 1.2.2 [Build Frontend](#build-frontend)
      * 1.2.3 [Build Docker-Images](#build-docker-images)
2. [Nginx Manager](#nginx-manager)
3. [SSH Server]()
4. [HIMHIP]()
5. [How Debug](#how-debug)
5. [TODO](#todo)

# Dev Env
### Install Docker and Docker-Compose

- [Docker Install documentation](https://docs.docker.com/install/)
- [Docker-Compose Install documentation](https://docs.docker.com/compose/install/)

### Build process
The following steps must be carried out to create the Docker image:

Install Typescript:
```shell
sudo apt install node-typescript 
```

Install Gulp:
```shell
npm install --global gulp-cli
```

#### Build Backend
```shell
cd backend && npm install && tsc -p tsconfig.json
```

#### Build Frontend
```shell
cd frontend && npm install && tsc -p tsconfig.json
```

```shell
cd build && npm install && gulp copy-data
```

#### Build Docker-Images
```shell
cd ./ && docker-compose build
```

# Nginx Manager
### Docker Image
* Image: Alpine

# SSH-Server
### Docker Image
* Image: Alpine

### Connection
Create over ssh a remote port forwarding:
```shell
ssh -R 3000:localhost:3000 ffadmin@192.168.0.115 -p 2222
//ssh -R myPort:myIP:remotePort sshUser@ipSSHServer -p portSSH
```

# How Debug
Edit the docker-compose file and add the Port for the NodeJs Debuger ```9229```,
then override the NodeJS ```command``` start with ```--inspect-brk```.

The docker container will wait for Debug connection.
* Remove it again for the production environment!

example:

```yaml
flyingfish:
    image: flyingfish:v1.0
    build:
      context: ./
    container_name: flyingfish_service
    volumes:
      - ./config.json:/opt/app/config.json
      - ./nginx:/opt/app/nginx:rw
      - ./letsencrypt:/etc/letsencrypt:rw
      - flyingfish:/var/lib/flyingfish:rw
    ports:
      - "443:443"
      - "80:80"
      - "5333:53/udp"
      - "5333:53/tcp"
      - "3000:3000"
      - "1900:1900"
      - "9229:9229"
    command:
      - node
      - "--inspect-brk=0.0.0.0:9229"
      - "dist/main.js"
      - "--config=/opt/app/config.json"
    networks:
      flyingfishNet:
        ipv4_address: 10.103.0.3
    logging:
      driver: "json-file"
      options:
        max-size: "500k"
        max-file: "50"
    depends_on:
      - mariadb
```

# Todo
My Todo list:
* [ ] credential cache, for more speed up? (reduce nginx <--> express request time)
* [ ] ip blacklist cache, for more speed up? (reduce nginx <--> express request time)
* [ ] add nginx auth with digest
* [ ] nginx monitoring (traffic, connections and more)?
* [ ] add credential ldap client
* [ ] ip blacklist downloader & importer https://github.com/firehol/blocklist-ipsets


