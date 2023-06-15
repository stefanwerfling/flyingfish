# Quick update

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

Now compare the .env file with the one in GitHub to see if there are new variables, but I will point this out explicitly in the [release](https://github.com/stefanwerfling/flyingfish/releases).

{% @github-files/github-code-block url="https://github.com/stefanwerfling/flyingfish/blob/main/setup/.env" %}

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
