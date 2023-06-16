# Long setup

Here is a detailed description of the settings that can be made for the installation.

## Construction

FlyingFish is divided into containers by Docker. The advantage here is that updates can be imported quickly and that each service is separated and therefore secured.

You can find the [Docker installation here](https://docs.docker.com/engine/install/debian/).

Run the installation like [quick setup](quick-setup.md).

## Env

The Env file contains the environment variables for the individual containers and is the most important file for starting FlyingFish. After installation, save the file well and remove it from the system if the system is not owned by only one user.

{% @github-files/github-code-block url="https://github.com/stefanwerfling/flyingfish/blob/main/setup/.env" %}

| Env-Name                | Description                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| MARIADB\_ROOT\_USERNAME | The main user of mariadb, by default `root` is used.                                                                              |
| MARIADB\_ROOT\_PASSWORD | The password user of mariadb, enter a sufficiently secure one here.                                                               |
| MARIADB\_DATABASE       | Default database name is `flyingfish`.                                                                                            |
| INFLUXDB\_URL           | Address to influxdb, this can be a separate installation. With the standard installation, the address is `http://10.103.0.5:8086` |
| INFLUXDB\_USERNAME      | Influxdb username.                                                                                                                |
| INFLUXDB\_PASSWORD      | The password user of influxdb, enter a sufficiently secure one here.                                                              |
| INFLUXDB\_ORG           |                                                                                                                                   |
| INFLUXDB\_BUCKET        |                                                                                                                                   |
| INFLUXDB\_ADMIN\_TOKEN  |                                                                                                                                   |
| HTTPSERVER\_PORT        |                                                                                                                                   |
| LOGGING\_LEVEL          |                                                                                                                                   |
| HIMHIP\_USE             |                                                                                                                                   |
| HIMHIP\_SECRET          |                                                                                                                                   |

## Docker compose



{% @github-files/github-code-block url="https://github.com/stefanwerfling/flyingfish/blob/main/setup/docker-compose.yml" %}

## Ports overview
