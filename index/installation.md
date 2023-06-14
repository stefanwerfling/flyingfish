# Installation

## Info

The [quick installation](installation.md#quick-setup) is enough for easy use. For detailed settings read the documentation for the Docker containers.

<figure><img src="../.gitbook/assets/14e387d8-0acd-4f59-b980-fbcf050667c5.jpeg" alt="" width="384"><figcaption></figcaption></figure>

## Quick setup

The instructions assume that Docker is installed in the current version.

First create a project folder on Debian, example:

```sh
sudo su
```

<pre class="language-sh"><code class="lang-sh"><strong>mkdir /opt/flyingfish
</strong></code></pre>

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

<figure><img src="../.gitbook/assets/docker-i-see (1).jpg" alt="" width="450"><figcaption><p>little joke from me :)</p></figcaption></figure>

## Quick update

First find out what changes have been made (e.g. environment variables), you can find the changes on GitHub under releases. Always make a backup before updating. If possible, backup the whole VM, otherwise backup the config files and the docker volumes.



Now go back to your FlyingFish directory. Stop and delete the docker containers.

```sh
cd /opt/flyingfish
```

```sh
docker compose stop
```

```sh
docker compose rm
```

Now compare the .env file with the one in GitHub to see if there are new variables, but I will point this out explicitly in the release.

{% embed url="https://github.com/stefanwerfling/flyingfish/blob/main/setup/.env" %}
.env file on GitHub.
{% endembed %}

Delete the old docker-compose.yml and re-download it.

```sh
rm docker-compose.yml
```

```sh
curl https://raw.githubusercontent.com/stefanwerfling/flyingfish/main/setup/docker-compose.yml -o docker-compose.yml
```

Now download the new docker images and start the containers.

```sh
docker compose pull
```

```sh
docker compose up -d
```

Finally, let's clean up.

```sh
docker system prune --all
```
