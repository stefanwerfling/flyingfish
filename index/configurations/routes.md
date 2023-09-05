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
3. Each domain entered in [Domains](domains/) is displayed under Routes. One or more routes from one or more [Listen](listen/) to a destination can now be entered.

## Default Routes



<figure><img src="../../.gitbook/assets/routes_defaults.png" alt=""><figcaption></figcaption></figure>

The default Routes are installed at the beginning of the [setup](../installation/). These routes are the default path if no domain or protocol split takes effect beforehand.

{% hint style="info" %}
The default routes cannot be edited or deleted.
{% endhint %}

1. The <mark style="background-color:orange;">listen stream on port 53</mark> points to FlyingFish's internal <mark style="background-color:red;">DNS server</mark> (this lists on port 5333 so that nginx can get port 53).&#x20;
2. The <mark style="background-color:orange;">listen stream on port 443</mark> points to the internal <mark style="background-color:green;">HTTPS service</mark> with port 10443. HTTPS connections are handled with certificates.
3. The <mark style="background-color:orange;">listen stream on port 80</mark> points to the internal <mark style="background-color:green;">HTTP service</mark>, no encryption with a certificate is used.&#x20;

{% hint style="info" %}
If set for [listening](listen/), the [IP access blacklist/whitelist](ip-access.md) takes effect.
{% endhint %}

The yellow "<mark style="background-color:yellow;">P</mark>" can also be seen on point <mark style="color:red;">2</mark> and <mark style="color:red;">3</mark>. It indicates that the connection with [Proxy protocol](listen/proxy-protocol.md) is activated. On the target side you can see the "<mark style="background-color:yellow;">P</mark>" with an arrow pointing down. It shows that the [Proxy protocol](listen/proxy-protocol.md) is removed again.

{% hint style="info" %}
If no P with an arrow appears at the destination, the [Proxy protocol](listen/proxy-protocol.md) will be passed on to the remote server! This remote server must expect the [Proxy protocol](listen/proxy-protocol.md), otherwise it will not understand this connection!
{% endhint %}

