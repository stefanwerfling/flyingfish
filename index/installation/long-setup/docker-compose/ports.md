---
description: How the following ports are forwarded from the host to the containers.
---

# Ports

#### Container flyingfish\_db

<table><thead><tr><th width="158">Port</th><th>Description</th></tr></thead><tbody><tr><td>3306</td><td>The port to MariaDB is addressed to the FlyingFish Services internally via the Docker network. In the Docker Compose file, this port is also listed on the localhost ip, which means that an SQL client can be connected to the database via ssh port forwarding. For checks, backups or manual interventions. This type of data processing is actually only necessary in the development environment.</td></tr></tbody></table>

#### Container flyingfish\_influxdb

<table><thead><tr><th width="163">Port</th><th>Description</th></tr></thead><tbody><tr><td>8086</td><td>The port to Influxdb is addressed to the FlyingFish Services internally via the Docker network. In the Docker Compose file, this port is also listed on the localhost ip. The web interface can be accessed locally or via ssh port forwarding.</td></tr></tbody></table>

#### Container flyingfish\_service



