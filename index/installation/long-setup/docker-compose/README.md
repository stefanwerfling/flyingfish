# Docker compose

The current docker compose file is maintained in the [GitHub under the "setup" ](https://github.com/stefanwerfling/flyingfish/tree/main/setup)folder for productive use.&#x20;

{% hint style="info" %}
Please do not use the docker compose file from the main folder. As this is used for the development of FlyingFish.
{% endhint %}

### Parts container

FlyingFish is divided into several services, thus into containers. The containers have different rights to the system.

| Container            | Description                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flyingfish\_db       | Contains the MariaDB and is accessible for various containers from FlyingFish in Docker's own network.                                                                                    |
| flyingfish\_influxdb | Contains the Influxdb and is accessible for various containers from FlyingFish in Docker's own network.                                                                                   |
| flyingfish\_service  | Contains the Nginx and backend with frontend.                                                                                                                                             |
| flyingfish\_himhip   | Contains the service for reading out the host IP and gateway. The task is limited because this container runs with special privileges. The information is sent to the FlyingFish backend. |
| flyingfish\_ssh      | A custom implemented SSH jump server that only accepts port forwarding with L and R.                                                                                                      |

### Production template

The compose file should be optimally prepared. For more customization, you can read more below.

{% @github-files/github-code-block url="https://github.com/stefanwerfling/flyingfish/blob/main/setup/docker-compose.yml" %}



