# FAQ

### how to check supported nginx modules in docker image?
First you start your docker container. Then go inside:
```shell
docker exec -it flyingfish_service /bin/ash
```

Now you can check the modules with:
```shell
nginx -V
```
the result is:
```shell
nginx version: nginx/1.20.2
built by gcc 10.3.1 20211027 (Alpine 10.3.1_git20211027) 
built with OpenSSL 1.1.1l  24 Aug 2021
TLS SNI support enabled
configure arguments: --prefix=/etc/nginx --sbin-path=/usr/sbin/nginx --modules-path=/usr/lib/nginx/modules --conf-path=/etc/nginx/nginx.conf --error-log-path=/var/log/nginx/error.log --http-log-path=/var/log/nginx/access.log --pid-path=/var/run/nginx.pid --lock-path=/var/run/nginx.lock --http-client-body-temp-path=/var/cache/nginx/client_temp --http-proxy-temp-path=/var/cache/nginx/proxy_temp --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp --http-scgi-temp-path=/var/cache/nginx/scgi_temp --with-perl_modules_path=/usr/lib/perl5/vendor_perl --user=nginx --group=nginx --with-compat --with-file-aio --with-threads --with-http_addition_module --with-http_auth_request_module --with-http_dav_module --with-http_flv_module --with-http_gunzip_module --with-http_gzip_static_module --with-http_mp4_module --with-http_random_index_module --with-http_realip_module --with-http_secure_link_module --with-http_slice_module --with-http_ssl_module --with-http_stub_status_module --with-http_sub_module --with-http_v2_module --with-mail --with-mail_ssl_module --with-stream --with-stream_realip_module --with-stream_ssl_module --with-stream_ssl_preread_module --with-cc-opt='-Os -fomit-frame-pointer -g' --with-ld-opt=-Wl,--as-needed,-O1,--sort-common
```

### MariaDB Error
```
[ERROR] Incorrect definition of table mysql.column_stats: expected column 'histogram' at position 10 to have type longblob, found type varbinary(255)
```
Repair/Update DB:
```shell
docker exec flyingfish_db mysql_upgrade --user=root --password=<password>
```

### Nginx NJS Fetch Error
In the current version of njs (nginx-module-njs (1.22.1+0.7.8-1~bullseye)) is a bug. 
Use the 'Dockerfile.nginxsrc' for the bugfix, it load and compile the source code by github repository.