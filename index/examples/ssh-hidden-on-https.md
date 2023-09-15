---
description: How to hide SSH on HTTPS port 443.
---

# SSH hidden on HTTPS

## Start

We have several Servers in the network and a router. 2 Server have an SSH server installed. Now it's obvious to open port 22 on the router for one of the servers. A port like 20022 is also usually chosen for the second server. You quickly notice that strangers are trying to access the SSH server using Brut force.

SSH is already a secure story. With IP auto ban and certificates for the ssh client you are on the safe side.

<figure><img src="../../.gitbook/assets/ssh_hidden_https1.png" alt=""><figcaption><p>Share SSH server directly.</p></figcaption></figure>

## Problem

But a further step would be that strangers wouldn't know where the SSH ports are.

If we don't know the door, we can't break down a door!

## Solution

Now let's get to the magic. We have an opportunity! We have nginx, and it can split domains from the SSL protocol! SSH uses SSL as the transmission protocol.

Now let’s dig further into our bag of tricks! We need SSH port forwarding. The FlyingFish has an SSH Jump Server integrated. This cannot command any commands, only forward the ports.

So we have the HTTPS port with 443. If a client comes with a special domain, it will be directed to the SSH jump server. This person then knows the appropriate destination in our network using the access data.

<figure><img src="../../.gitbook/assets/ssh_hidden_https2.png" alt=""><figcaption><p>SSH server hidden behind HTTPS.</p></figcaption></figure>

TODO





<figure><img src="../../.gitbook/assets/3kvnwz.jpg" alt=""><figcaption><p>Meme from imgflip.com</p></figcaption></figure>
