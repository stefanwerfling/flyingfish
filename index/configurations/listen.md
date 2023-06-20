---
description: >-
  At the beginning of the installation there are standard ports that listen for
  a connection.
---

# Listen

<figure><img src="../../.gitbook/assets/7a5efz_nginx.jpg" alt="" width="333"><figcaption></figcaption></figure>

The ports specified here come from the web interface and are used by nginx intern docker container.

| Port         | Description               |
| ------------ | ------------------------- |
| 80 (TCP)     | HTTP Protocol             |
| 443 (TCP)    | HTTPS/SSH/SSL Protocols\* |
| 53 (TCP/UDP) | DNS                       |

These ports are internal to nginx of type "Stream".

<figure><img src="../../.gitbook/assets/listen_ports.png" alt=""><figcaption><p>Standard listen ports by setup</p></figcaption></figure>

If you only use the standard ports for your services, you do not need to enter any additional ports here.
