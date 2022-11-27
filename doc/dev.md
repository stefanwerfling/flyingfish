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
6. [Docker Image Import/Export](#docker-image-import-export)
5. [TODO](#todo)

# 1. Dev Env
### 1.1 Install Docker and Docker-Compose

- [Docker Install documentation](https://docs.docker.com/install/)
- [Docker-Compose Install documentation](https://docs.docker.com/compose/install/)

### 1.2 Build process
The following steps must be carried out to create the Docker image:

Install Typescript:
```shell
sudo apt install node-typescript 
```

Install Gulp:
```shell
npm install --global gulp-cli
```

#### 1.2.1 Build Backend
```shell
cd backend && npm install && tsc -p tsconfig.json
```

#### 1.2.2 Build Frontend
```shell
cd frontend && npm install && tsc -p tsconfig.json
```

```shell
cd build && npm install && gulp copy-data
```

#### 1.2.3 Build Docker-Images
```shell
cd ./ && docker-compose build
```

# 2. Nginx Manager
### Docker Image
* Image: Alpine

# 3. SSH-Server
### Docker Image
* Image: Alpine

### Connection
Create over ssh a remote port forwarding by schema:
```shell
ssh -R myPort:myIP:remotePort sshUser@ipSSHServer -p portSSH
```

* ```myPort```: is the port on which your server is running, in this example the express server from nodejs on the local computer.
* ```myIP```: The IP of the device on which the "myPort" should be addressed.
* ```remotePort```: is replaced by the ssh server and has no further meaning for us. The SSH server will use the specified free port based on the configuration from the frontend. This is then addressed by the nginx server via "stream" or "proxy_pass".
* ```sshUser```: The username set in the frontend. The user is the distinction for internal port listening.
* ```ipSSHServer```: IP or domain on which the flyingfish ssh server can be reached. The 443 listing of flyingfish nginx server implements a protocol mapping that directs a non-TLS protocol to the ssh server. Thus, a domain that points to the flyingfish can be reached.
* ```portSSH```: Port on which the ssh server can be reached if the server is addressed to the flyingfish via nginx, port 443 is specified here.

example intern:
```shell
ssh -R 3000:localhost:3000 ffadmin@192.168.0.115 -p 2222
```

example extern over internet:
```shell
ssh -R 3000:localhost:3000 ffadmin@ssh.mydomain.org -p 443
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


### Specialty:

A "supervisor" was included for the backend. If you are in a development environment, you can start the backend with "supervisor". This automatically restarts nodejs if the code changes due to the typescript compile. This procedure was implemented so that the docker image and container do not always have to be rebuilt.

Change the following in docker-compose:

```yaml
  flyingfish:
    image: flyingfish:v1.0
    build:
      context: ./
      dockerfile: Dockerfile.nginxsrc
    container_name: flyingfish_service
    volumes:
      - ./config.json:/opt/app/config.json
      - ./nginx:/opt/app/nginx:rw
      - flyingfishLetsencrypt:/etc/letsencrypt:rw
      - flyingfish:/var/lib/flyingfish:rw
      - ./backend/dist:/opt/app/dist
      - ./backend/node_modules:/opt/app/node_modules
      - ./backend/package.json:/opt/app/package.json
      - ./frontend/dist:/opt/app/frontend/dist
      - ./frontend/src:/opt/app/frontend/src
    ports:
      - "443:443"
      - "80:80"
      - "5333:53/udp"
      - "5333:53/tcp"
      - "3000:3000"
      - "1900:1900"
      - "10901:10901"
      - "9229:9229"
    command:
      - "supervisor"
      - "--"
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

# 6. Docker Image Import/Export
For the image distribution you can export a created image, upload it via ssh and import it:

Export:
```shell
docker save -o ff_v1.0.0.tar flyingfish:v1.0
```

Upload over ssh:
```shell
scp -P 22 ff_v1.0.0.tar root@192.168.178.5:/tmp/
```

Import:
```shell
docker load -i ff_v1.0.0.tar
```

# 7. Todo
My Todo list:
* [ ] credential cache, for more speed up? (reduce nginx <--> express request time)
* [ ] ip blacklist cache, for more speed up? (reduce nginx <--> express request time)
* [ ] add nginx auth with digest
* [ ] nginx monitoring (traffic, connections and more)?
* [ ] add credential ldap client
* [ ] ip blacklist downloader & importer https://github.com/firehol/blocklist-ipsets


