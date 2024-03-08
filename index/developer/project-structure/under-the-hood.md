---
description: Short description of what dependencies there are.
---

# Under the hood

## Main Application

The main application consists of Node.js (backend) and for the Browser (frontend).

Packet management is controlled by npm.

## Nginx

The [nginx version](http://nginx.org/en/download.html) is the “**Legacy versions**”. The reason for this is dependencies on other modules. I would have liked to experiment with another image version with the "**Stable version**".

### Nginx - Modules

* [NJS](http://nginx.org/en/docs/njs/changes.html)
* [Headers-More](../../installation/long-setup/)

## Certbot

The Certbot helps with Lets Encrypt certificate creation.

## Apps

* iputils-ping
* dublin-traceroute
* openssl

