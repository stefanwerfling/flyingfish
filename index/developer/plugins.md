---
description: Plugins can be loaded to services.
---

# Plugins

{% hint style="info" %}
Since version v1.0.24 we already support plugins in selected areas.
{% endhint %}

## Introduction

The plugins for FlyingFish are intended to expand functionality and create connections to third-party services. The function can be expanded by anyone. Since this is a critical service structure, a plugin cannot simply be loaded (e.g. from the front end). Installation only takes place in the backend (if desired by hand). If the plugin code is disclosed, and we work together (in consultation with me), the plugin can also be included as a standard in the FlyingFish Docker image (write me an [Issue](https://github.com/stefanwerfling/flyingfish/issues) in GitHub/[Discussions](https://github.com/stefanwerfling/flyingfish/discussions)).

#### Examples of plugins:

| Name                                                                                       | Description                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Demo](https://github.com/stefanwerfling/flyingfish/tree/main/plugins/demoplugin)          | A demo plugin that shows what the implementation interfaces look like.                                                                                                           |
| [Lets Encrypt](https://github.com/stefanwerfling/flyingfish/tree/main/plugins/letsencrypt) | The creation for the certificates has been removed from core and moved to the plugin. There may be more providers later. This is a standard plugin included in the Docker image. |

## Setup

To install a plugin, enter the corresponding FlyingFish container, for example 'flyingfish\_service'.

```shell
docker exec -it flyingfish_service /bin/bash
```

Now go to the backend folder where the plugin should be installed.

```sh
cd /opt/flyingfish/backend
```

You can now install the plugin there using npm.

```sh
npm install git+https://github.com/PluginUrl/Plugin.git
```

Now drop the container and restart the Docker container.

```sh
exit
```

```sh
docker restart flyingfish_service
```

{% hint style="warning" %}
If there is an update, you will have to reinstall the plugins. If the plugins are important, it is recommended to create a new image with the expansion of the plugin installation.
{% endhint %}

