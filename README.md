
[![FlyingFish](https://img.shields.io/badge/FlyingFish-v1.0.21-blue?style=for-the-badge)](https://github.com/stefanwerfling/flyingfish)
![Docker Pulls](https://img.shields.io/docker/pulls/stefanwerfling/flyingfish?style=for-the-badge)
[![License: GPL v3.0](https://img.shields.io/badge/License-GPL%20v3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)
![Issues](https://img.shields.io/github/issues/stefanwerfling/flyingfish?style=for-the-badge)
![Forks](https://img.shields.io/github/forks/stefanwerfling/flyingfish?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/stefanwerfling/flyingfish?style=for-the-badge)
[![Liberapay](https://img.shields.io/liberapay/patrons/StefanWerf.svg?logo=liberapay&style=for-the-badge)](https://liberapay.com/StefanWerf/donate)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/6347/badge)](https://bestpractices.coreinfrastructure.org/projects/6347)

<br>

<p align="center">
  <img height="200" src="doc/images/logo.png">
</p>

<br>

# Flyingfish

Flyingfish is a reverse proxy manager with its own DNS server, own SSH server, DynDNS, UPNP support, LetsEncrypt and much more.
With a frontend, it simplifies setup and management. Each route can be edited with extensive settings.

## Make your services available easily, quickly and securely.

In the classic sense, FlyingFish is a nginx manager. But the way the nginx server is combined with other services is different! The FlyingFish is structured in part service, which automates many processes through an internal database or API communication.

[Read the Documentation](https://none-12.gitbook.io/flyingfish/)

## Quick setup
[Read the Documentation quick setup](https://none-12.gitbook.io/flyingfish/index/installation#quick-setup)

## Docker Hub


I utilise the docker manifest for multi-platform awareness. Simply getting "stefanwerfling/flyingfish:latest" should get the correct image for your arch. However, you can also get specific Arch images via tags.

The architectures supported by this image are:

| Architecture | Available | Tag |
| :----: | :----: | ---- |
| x86-64 | ✅ | amd64-\<version tag\> |
| arm64 | ✅ | arm64v8-\<version tag\> |

Other platforms cannot be created as an image, because the restriction comes from the node docker image, but also because "certbot with pip" only supports amd64 and arm64 installation.

But it's better you run the installation with the instructions in Docker-Compose. Because FlyingFish consists of multiple images & containers.

[FlyingFish on hub.docker.com](https://hub.docker.com/r/stefanwerfling/flyingfish)

### Docker images (latest)
* stefanwerfling/flyingfish:latest
* stefanwerfling/flyingfish:v1.0.21
* stefanwerfling/flyingfish_ssh:latest
* stefanwerfling/flyingfish_ssh:v1.0.21
* stefanwerfling/flyingfish_himip:latest
* stefanwerfling/flyingfish_himip:v1.0.21

# Index
1. [Project Description](doc/description.md)
2. [First installation](doc/firstinstall.md)
3. [For devs](doc/dev.md)
4. [FAQ](doc/faq.md)

#### Screenshots
<table>
    <tr>
        <td> 
            <img src="doc/screenshots/login.png" alt="Login page" width="360px" />
        </td>
        <td>
			<img src="doc/screenshots/updates/dashboard_v1.0.21.png" alt="Dashboard" width="360px" />&nbsp;
        </td>
    </tr>
    <tr>
        <td>
			<img src="doc/screenshots/listens.png" alt="Listen list" width="360px" />
        </td>
        <td>
            <img src="doc/screenshots/listens_edit.png" alt="Listen edit" width="360px" />
        </td>
    </tr>
	<tr>
		<td>
			<img src="doc/screenshots/ip_access.png" alt="IP access blacklist" width="360px" />
		</td>
		<td>
			<img src="doc/screenshots/gateway.png" alt="Gatewaylist" width="360px" />
		</td>
	</tr>
	<tr>
		<td>
			<img src="doc/screenshots/upnp-nat.png" alt="Upnpnat list" width="360px" />
		</td>
		<td>
			<img src="doc/screenshots/upnp-nat_edit.png" alt="Upnpnat edit" width="360px" />
		</td>
	</tr>
	<tr>
		<td>
			<img src="doc/screenshots/domains.png" alt="Domain list" width="360px" />
		</td>
		<td>
			<img src="doc/screenshots/domains_record.png" alt="Domain record edit" width="360px" />
		</td>
	</tr>
	<tr>
		<td>
			<img src="doc/screenshots/dyndns_client.png" alt="DynDns client list" width="360px" />
		</td>
		<td>
			<img src="doc/screenshots/proxy_protocol_route_list.png" alt="Route list" width="360px" />
		</td>
	</tr>
	<tr>
		<td>
			<img src="doc/screenshots/routes_stream_edit.png" alt="Route edit" width="360px" />
		</td>
		<td>
			<img src="doc/screenshots/routes_http_edit_ssl.png" alt="Certificate - letsencrypt" width="360px" />
		</td>
	</tr>
</table>

# Contributors

Special thanks to the following contributors:

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
	<tr>
		<td align="center">
			<a href="https://github.com/Choppel">
				<img src="https://avatars.githubusercontent.com/u/14126324?v=4" width="80" alt=""/>
				<br /><sub><b>Choppel</b></sub>
			</a>
		</td>
	</tr>
</table>
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

# License
[![License: GPL v3.0](https://img.shields.io/badge/License-GPL%20v3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
