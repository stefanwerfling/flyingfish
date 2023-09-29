# FAQ

#### MariaDB Error

> \[ERROR] Incorrect definition of table mysql.column\_stats: expected column 'histogram' at position 10 to have type longblob, found type varbinary(255)

Repair/Update DB:

```sh
docker exec flyingfish_db mysql_upgrade --user=root --password=<password>
```

#### Nginx NJS Fetch Error

~~In the current version of njs (nginx-module-njs (1.22.1+0.7.8-1\~bullseye)) is a bug. Use the 'Dockerfile.nginxsrc' for the bugfix, it load and compile the source code by github repository.~~

[Fixed on github](https://github.com/stefanwerfling/flyingfish/issues/1).

#### How to check supported nginx modules in docker image?

First you start your docker container. Then go inside:

```sh
docker exec -it flyingfish_service /bin/bash
```

Now you can check the modules with:

```sh
nginx -V
```

the result is:

> nginx version: nginx/1.20.2 built by gcc 10.3.1 20211027 (Alpine 10.3.1\_git20211027) built with OpenSSL 1.1.1l 24 Aug 2021 TLS SNI support enabled configure arguments: --prefix=/etc/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --pid-path=/var/run/nginx.pid --lock-path=/var/run/nginx.lock --http-client-body-temp-path=/var/cache/nginx/client\_temp --http-proxy-temp-path=/var/cache/nginx/proxy\_temp --http-fastcgi-temp-path=/var/cache/nginx/fastcgi\_temp --http-uwsgi-temp-path=/var/cache/nginx/uwsgi\_temp --http-scgi-temp-path=/var/cache/nginx/scgi\_temp --with-perl\_modules\_path=/usr/lib/perl5/vendor\_perl --user=nginx --group=nginx --with-compat --with-file-aio --with-threads --with-http\_addition\_module --with-http\_auth\_request\_module --with-http\_dav\_module --with-http\_flv\_module --with-http\_gunzip\_module --with-http\_gzip\_static\_module --with-http\_mp4\_module --with-http\_random\_index\_module --with-http\_realip\_module --with-http\_secure\_link\_module --with-http\_slice\_module --with-http\_ssl\_module --with-http\_stub\_status\_module --with-http\_sub\_module --with-http\_v2\_module --with-mail --with-mail\_ssl\_module --with-stream --with-stream\_realip\_module --with-stream\_ssl\_module --with-stream\_ssl\_preread\_module --with-cc-opt='-Os -fomit-frame-pointer -g' --with-ld-opt=-Wl,--as-needed,-O1,--sort-common

