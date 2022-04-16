# FlyingFish

<p>
<img src="doc/logo.png" alt="Logo" height="128px" width="128px">
</p><br>

[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/stefanwerfling/flyingfish?style=for-the-badge)](https://lgtm.com/projects/g/stefanwerfling/flyingfish/)
[![LGTM Alerts](https://img.shields.io/lgtm/alerts/github/stefanwerfling/flyingfish?style=for-the-badge)](https://lgtm.com/projects/g/stefanwerfling/flyingfish/)

On the "fly fish", a ngnix proxy connection manager and more.

## Motivation
I only got to know the Nginx server after Apache. And was pleasantly surprised by the configuration. 
Some time ago I dealt with the topic of splitting several domains with destinations via the VPN via a bundled server.
I found a domain mapping/splitting in the Nginx newer version. 
From another widely used project ([Nginx proxy manager](https://nginxproxymanager.com/), which is a very good project) I use a lot the creation of certificates (Letsencrypt).
I started the project and have a lot to learn myself, to incorporate my own ideas and extensions. It is another building block for other projects that I am making available to others.

#### Important point:

1. Creation of certificates
2. Proxy web calls
3. Domain splits
4. Remote port forwarding
5. Settings via a frontend
6. API certificate query for internal web servers in the internal network
7. and more ...

#### Idea integration
In addition to the classic problem of providing HTTPS connections with Letsencrypt certificates, URI with a proxy to direct to internal web servers. Was the idea to use "SSH Remote Port forwarding" to forward a local web server via SSH (via the internet or internal network) so that it can be reached via Nginx with a valid HTTPs certificate.

#### Flow diagram idea


<img src="doc/flow.png" alt="Flow">


## Project-Parts
* Main Nginx Manager
* SSH-Server
* 
# Main Nginx Manager
### Docker Image
* Image: Alpine

# SSH-Server
### Docker Image
* Image: Alpine

### Connection
Create over ssh a remote port forwarding:
```shell
ssh -R 3000:localhost:3000 ffadmin@192.168.0.115 -p 2222
//ssh -R myPort:myIP:remotePort sshUser@ipSSHServer -p portSSH
```


