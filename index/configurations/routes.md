---
description: Setting a route from the listen to the target.
---

# Routes

A route is a path from the input ([Listen](listen/)) to the destination. The destination can be of different types, stream, HTTP/HTTPS, SSH, use.

With the help of the [graphic from Listen](listen/#listen-flow) I would like to show the area controlled by the route again:

<figure><img src="../../.gitbook/assets/routes_listenflow.png" alt=""><figcaption><p>Listen and Routes</p></figcaption></figure>

## Routes List

<figure><img src="../../.gitbook/assets/routes_list.png" alt=""><figcaption></figcaption></figure>

1. The new creation and loading of the configuration of the nginx (all Listen, Routes, etc.) can be triggered again manually at any time.

{% hint style="info" %}
Existing connections are kept as if running the command: nginx -s reload
{% endhint %}

2. The first thing to see in the Routes list are the default routes. If no route is specified, the default routes always apply.

{% hint style="info" %}
The default routes cannot be edited or deleted.
{% endhint %}

3. Each domain entered in [Domains](domains/) is displayed under Routes. One or more routes from one or more [Listen](listen/) to a destination can now be entered.



## Default Routes

