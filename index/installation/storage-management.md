# Storage management

With the new `version v1.1.12` a few more containers have been added. Among other things, Redis and InfluxDB.

This resulted in some problems for the host system because the wrong memory sizes were selected.

## Memory

Choose the appropriate RAM size for your system. At the beginning and also as a goal I set a system with `2 GB`. This depends on what kind of traffic I expect. This means I have now restricted the Redis server and the InfluxDB server. The settings for this can be set in the Docker-Compose file and in the [Env. ](long-setup/env.md)

The limit of the Nginx workers is also set to 4096 by default. These can be set in the web interface under Settings.

## Hard disk space

I have given my VM `60 GB` here. But after 1 year of operation I realized that the logs were too many.

In addition to the Docker image, some logs are written by the containers. In the new `version (1.2.0)` some changes have been made, and the log rotation has been improved. The important data is all located in Docker volumes.

Don't log everything in the productive system! I run my own system with the logs "silly", but only to understand all the processes and to further develop the software. Your system should run with logs of "error", maximum "waring".

<figure><img src="../../.gitbook/assets/image (9).png" alt=""><figcaption><p>Proxmox FlyingFish VM</p></figcaption></figure>

## Summary

Pay attention to how much traffic your system processes and give the VM the resources accordingly.
