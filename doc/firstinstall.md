## Quick Setup

1. Install Docker and Docker-Compose

    - [Docker Install documentation](https://docs.docker.com/install/)
    - [Docker-Compose Install documentation](https://docs.docker.com/compose/install/)


2. Create a docker-compose.yml file similar to this:
```yml
version: '3.1'

services:
  mariadb:
    image: mariadb:latest
    container_name: flyingfish_db
    environment:
      MARIADB_AUTO_UPGRADE: '1'
      MARIADB_INITDB_SKIP_TZINFO: '1'
      MYSQL_ROOT_PASSWORD: '<test>'
      MYSQL_ROOT_HOST: '%'
      MYSQL_DATABASE: '<flyingfish>'
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

  influxdb:
    image: influxdb:latest
    container_name: flyingfish_influxdb
    volumes:
      - flyingfishInfluxdbData:/var/lib/influxdb2
    environment:
      - DOCKER_INFLUXDB_INIT_USERNAME=<flyingfish>
      - DOCKER_INFLUXDB_INIT_PASSWORD=<test>
      - DOCKER_INFLUXDB_INIT_ORG=<flyingfish>
      - DOCKER_INFLUXDB_INIT_BUCKET=<flyingfish>
      - DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=<flyingfish>
    ports:
      - 127.0.0.1:8086:8086
    networks:
      flyingfishNet:
        ipv4_address: 10.103.0.5
    logging:
      driver: "json-file"
      options:
        max-size: "500k"
        max-file: "50"

  flyingfish:
    image: flingfish:v1.0
    build:
      context: ./
    container_name: flyingfish_service
    volumes:
      - ./config.json:/opt/app/config.json
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
    image: flyingfish_himip:v1.0
    build:
      context: ./himhip
    container_name: flyingfish_himhip
    command:
      - node
      - "dist/main.js"
      - "--reciverurl=https://10.103.0.3:3000/himhip/update"
      - "--secure=<mysecure>"
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
    image: flyingfish_ssh:v1.0
    build:
      context: ./sshserver/
    container_name: flyingfish_ssh
    volumes:
      - ./config.json:/opt/app/config.json
      - ./sshserver/ssh:/opt/app/ssh:rw
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
  flyingfishInfluxdbData:
    driver: local
  flyingfish:
    driver: local
    
networks:
  flyingfishNet:
    driver: bridge
    ipam:
      config:
        -  subnet: 10.103.0.0/16
```
Create a ```config.json``` similar to this:
```json
{
  "db": {
    "mysql": {
      "host": "10.103.0.2",
      "port": 3306,
      "username": "root",
      "password": "test",
      "database": "flyingfish"
    },
    "influx": {
      "url": "http://10.103.0.5:8086",
      "token": "",
      "org": "<flyingfish>",
      "bucket": "<flyingfish>",
      "username": "<flyingfish>",
      "password": "<test>"
    }
  },
  "httpserver": {
    "port": 3000,
    "publicdir": "frontend"
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
    "secure": "<mysecure>"
  }
}
```

3. Bring up your stack by running

```bash
docker-compose up -d
```

4. Log in to the Admin UI by the first start is the admin user create by the backend:

   [https://127.0.0.1:3000](https://127.0.0.1:3000)

Default Admin User:
* EMail: ```admin@flyingfish.org```
* Password: ```changeMyPassword```

5. Test your DNS-Flyingfish Server
```shell
dig @127.0.0.1 -p5333 <mydomain>
```