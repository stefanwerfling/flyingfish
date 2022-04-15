# FlyingFish

<img src="doc/logo.png" alt="Logo" height="128px" width="128px">

On the fly fish, a ngnix proxy connection manager.


## Project-Parts
* Main Nginx Manager
* SSH-Server

<img src="doc/flow.png" alt="Flow">

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


