# Quick setup

The instructions assume that Docker is installed in the current version.

First create a project folder on Debian, example:

```sh
sudo su
```

```sh
mkdir /opt/flyingfish
```

Now download the env and docker compose file:

```sh
cd /opt/flyingfish
```

```sh
curl https://raw.githubusercontent.com/stefanwerfling/flyingfish/main/setup/.env -o .env
```

```sh
curl https://raw.githubusercontent.com/stefanwerfling/flyingfish/main/setup/docker-compose.yml -o docker-compose.yml
```

Now edit the .env file and set all important variables.

```sh
nano .env
```

Now start docker compose.

```sh
docker compose up -d
```

You can log in via the web interface with the standard root user. Please change the password immediately.

* **URL:** https://\<ip>:3000/
* **Username:** admin@flyingfish.org
* **Password:** changeMyPassword

<figure><img src="../../.gitbook/assets/docker-i-see (1).jpg" alt="" width="450"><figcaption><p>little joke from me :)</p></figcaption></figure>
