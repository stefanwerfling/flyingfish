---
description: How the following ports are forwarded from the host to the containers.
---

# Ports

#### Container flyingfish\_db

<table><thead><tr><th width="158">Port</th><th>Description</th></tr></thead><tbody><tr><td>3306</td><td>The port to MariaDB is addressed to the FlyingFish Services internally via the Docker network. In the Docker Compose file, this port is also listed on the localhost ip, which means that an SQL client can be connected to the database via ssh port forwarding. For checks, backups or manual interventions. This type of data processing is actually only necessary in the development environment.</td></tr></tbody></table>

#### Container flyingfish\_influxdb

<table><thead><tr><th width="163">Port</th><th>Description</th></tr></thead><tbody><tr><td>8086</td><td>The port to Influxdb is addressed to the FlyingFish Services internally via the Docker network. In the Docker Compose file, this port is also listed on the localhost ip. The web interface can be accessed locally or via ssh port forwarding.</td></tr></tbody></table>

#### Container flyingfish\_service

<table><thead><tr><th width="166">Port</th><th>Description</th></tr></thead><tbody><tr><td>443</td><td>The HTTPS/SSL port, this is used in the standard installation for the nginx.</td></tr><tr><td>80</td><td>The HTTP port, this is used in the standard installation for the nginx.</td></tr><tr><td>5333</td><td>This sport is actually port 53 (TCP/UDP) for the DNS server. But it is used as an alternative 5333 so that there is no collision from the host system.</td></tr><tr><td>3000</td><td>Flying Fish Server HTTPS port to reach the front end. Can be set on the <a href="../env.md">HTTP_SERVER_PORT</a> variable.</td></tr><tr><td>1900</td><td></td></tr></tbody></table>

