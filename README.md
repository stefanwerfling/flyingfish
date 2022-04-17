# FlyingFish

<p style="text-align: center">
<img src="doc/logo.png" alt="Logo" height="128px" width="128px"><br>
On the "fly fish", a ngnix proxy connection manager and more.
</p><br>

[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/stefanwerfling/flyingfish?style=for-the-badge)](https://lgtm.com/projects/g/stefanwerfling/flyingfish/)
[![LGTM Alerts](https://img.shields.io/lgtm/alerts/github/stefanwerfling/flyingfish?style=for-the-badge)](https://lgtm.com/projects/g/stefanwerfling/flyingfish/)

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


I see an advantage in testing projects that require an API connection or for rolling out a user-defined configuration that can be delivered securely using HTTPs.

#### Flow diagram idea

<img src="doc/flow.png" alt="Flow">

#### Process/development

Currently I will first generate simple configuration files for Nginx and feel the database by hand. A frontend will be developed step by step. I'm hoping for suggestions and other ideas. Write to me!

#### Projectname

The name of the project is an allusion to the fish that is "air" in an atypical environment for it. Nevertheless, the fish copes perfectly here. This is how I see the project with the Nginx server and the interacting components. The name also goes well with "Docker" a whale.

## Project-Parts
* Main Nginx Manager
* SSH-Server

# Main Nginx Manager
### Docker Image
* Image: Alpine

#### Screenshots
<table>
  <tr>
    <td> 
      <img src="doc/screenshots/login.png" alt="1" width="360px" >
    </td>
  </tr>
</table>

# SSH-Server
### Docker Image
* Image: Alpine

### Connection
Create over ssh a remote port forwarding:
```shell
ssh -R 3000:localhost:3000 ffadmin@192.168.0.115 -p 2222
//ssh -R myPort:myIP:remotePort sshUser@ipSSHServer -p portSSH
```


