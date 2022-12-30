## Quick Setup

#### 1. Install Docker and Docker-Compose
- [Docker Install documentation](https://docs.docker.com/install/)
- [Docker-Compose Install documentation](https://docs.docker.com/compose/install/)

#### 2. Create files:


2.1 File: '.env'
```
# DB
## MARIADB
MARIADB_ROOT_PASSWORD=mypassword
MARIADB_DATABASE=flyingfish

# Service
## HIMHIP
HIMHIP_SECURE_TOKEN=secredtkeys
```

2.2 Create a docker-compose.yml file similar to this:
```yml
version: '3.1'

services:
  mariadb:
    image: mariadb:latest
    container_name: flyingfish_db
    environment:
      MARIADB_AUTO_UPGRADE: '1'
      MARIADB_INITDB_SKIP_TZINFO: '1'
      MYSQL_ROOT_PASSWORD: "${MARIADB_ROOT_PASSWORD}"
      MYSQL_ROOT_HOST: '%'
      MYSQL_DATABASE: "${MARIADB_DATABASE}"
    volumes:
      - flyingfishDbData:/var/lib/mysql
    ports:
      - 127.0.0.1:3306:3306
    networks:
      flyingfishNet:
          ipv4_address: 10.103.0.2
    logging:
      driver: "json-file"
      options:
        max-size: "500k"
        max-file: "50"

  flyingfish:
    image: stefanwerfling/flingfish:v1.0.0-alpha
    container_name: flyingfish_service
    volumes:
      - ./config.json:/opt/app/config.json
      - flyingfishLetsencrypt:/etc/letsencrypt:rw
      - flyingfish:/var/lib/flyingfish:rw
    ports:
      - "443:443"
      - "80:80"
      - "5333:53/udp"
      - "5333:53/tcp"
      - "3000:3000"
      - "1900:1900"
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

  himhip:
    image: stefanwerfling/flyingfish_himip:v1.0.0-alpha
    container_name: flyingfish_himhip
    command:
      - node
      - "dist/main.js"
      - "--reciverurl=https://10.103.0.3:3000/himhip/update"
      - "--secure=${HIMHIP_SECURE_TOKEN}"
    network_mode: host
    cap_add:
      - ALL
    logging:
      driver: "json-file"
      options:
        max-size: "500k"
        max-file: "50"
    depends_on:
      - flyingfish

  sshremote:
    image: stefanwerfling/flyingfish_ssh:v1.0.0-alpha
    container_name: flyingfish_ssh
    volumes:
      - ./config.json:/opt/app/config.json
      - flyingfishSsh:/opt/app/ssh:rw
    ports:
      - "2222:22"
    networks:
      flyingfishNet:
        ipv4_address: 10.103.0.4
    logging:
      driver: "json-file"
      options:
        max-size: "500k"
        max-file: "50"
    depends_on:
      - mariadb

volumes:
  flyingfishDbData:
    driver: local
  flyingfish:
    driver: local
  flyingfishLetsencrypt:
    driver: local
  flyingfishSsh:
    driver: local
    
networks:
  flyingfishNet:
    driver: bridge
    ipam:
      config:
        -  subnet: 10.103.0.0/16
```

2.3 Create a ```config.json``` similar to this:
```json
{
  "db": {
    "mysql": {
      "host": "10.103.0.2",
      "port": 3306,
      "username": "root",
      "password": "mypassword",
      "database": "flyingfish"
    },
    "influx": {
      "url": "",
      "token": "",
      "org": "",
      "bucket": "",
      "username": "",
      "password": ""
    }
  },
  "httpserver": {
    "port": 3000,
    "publicdir": "frontend"
  },
  "dnsserver": {
    "port": 5333
  },
  "nginx": {
    "config": "/opt/app/nginx/nginx.conf",
    "prefix": "/opt/app/nginx"
  },
  "sshserver": {
    "ip": "10.103.0.4"
  },
  "docker": {
    "inside": true,
    "gateway": "10.103.0.1"
  },
  "logging": {
    "level": "silly"
  },
  "himhip": {
    "use": true,
    "secure": "secredtkeys"
  }
}
```

#### 3. Bring up your stack by running

```bash
docker-compose up -d
```

#### 4. Log in to the Admin UI by the first start is the admin user create by the backend:

   [https://127.0.0.1:3000](https://127.0.0.1:3000)

Default Admin User:
* EMail: ```admin@flyingfish.org```
* Password: ```changeMyPassword```

#### 5. Test your DNS-Flyingfish Server
```shell
dig @127.0.0.1 -p5333 <mydomain>
```
