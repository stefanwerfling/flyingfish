# Image build

**ENV**

For the development environment, the docker-compose file needs an .env file:

```sh
# DB
## MARIADB
MARIADB_ROOT_USERNAME=root
MARIADB_ROOT_PASSWORD=<db password>
MARIADB_DATABASE=flyingfish

## INFLUXDB
INFLUXDB_URL=http://10.103.0.5:8086
INFLUXDB_USERNAME=flyingfish
INFLUXDB_PASSWORD=<user password influxdb>
INFLUXDB_ORG=flyingfish
INFLUXDB_BUCKET=flyingfish
INFLUXDB_RETENTION=4w
INFLUXDB_ADMIN_TOKEN=<a token>

# HTTP Server
HTTPSERVER_PORT=3000

# Logging
LOGGING_LEVEL=silly

# Service
## HIMHIP
HIMHIP_USE=1
HIMHIP_SECRET=<himhip secret>

## Dyn dns server
DYNDNSSERVER_ENABLE=1

```

The .env from the [quick setup](../installation/quick-setup.md) can also be used as a good example.



**NPM-Registry**

The latest (v1.1.12) version can be used to specify the npm registry to build the software in the image. With this information you can specify your own package manager server. This can save traffic or specifically check dependencies.

So that docker knows the registry URL when building the image, simply specify the argument.&#x20;

For the developers [docker-compose-file](https://github.com/stefanwerfling/flyingfish/blob/main/docker-compose.yml), specify the following in the .env file:

```sh
# NPM Registry
NPM_REGISTRY=https://<domain>/repository/<repository name>/
```

For example, for this URL I used Nexus' packet management: [https://www.sonatype.com/products/sonatype-nexus-repository](https://www.sonatype.com/products/sonatype-nexus-repository)

