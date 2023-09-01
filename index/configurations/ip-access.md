---
description: >-
  the nginx has been extended with the nginx js module and can check all
  incoming connections with a white/black list.
---

# IP Access

<figure><img src="../../.gitbook/assets/74698887.jpg" alt="" width="200"><figcaption><p>In what way is your cup full?</p></figcaption></figure>

In my development phase, I noticed that I received many requests on my dynamic IP (from my ISP). After checking what kind of requests were, I wanted to stop them. Many of these requests are bots from giant companies scouring the web. But so many hackers who do not make valid requests but try to break into the server.

## Whitelist

IP addresses from the whitelist are allowed to connect. All other addresses that are not noted will be blocked.

<figure><img src="../../.gitbook/assets/ipaccess_whitelist.png" alt=""><figcaption><p>Whitelist</p></figcaption></figure>

You can switch to the whitelist with a tab. In a list you see all IPs that are whitelisted. In the second column you can see when and how often a query was started from this IP.

{% hint style="info" %}
Only IPs that are whitelisted can make a request. All other IPs are automatically blacklisted.
{% endhint %}

## Blacklist

<figure><img src="../../.gitbook/assets/blacklist_imports.png" alt=""><figcaption><p>Blacklist imports</p></figcaption></figure>

1. **Tab for Blacklist:** There are more tabs under the blacklist.
2. **Tab for Own/Imports:** Here you have two lists. Once the list of self-entered IPs that are blocked. Or the imported list.
3. **Entry of import blacklisting:** Here you can see the information about what is known under the IP and when it last tried to access it. The list is sorted by the last accesses.

{% hint style="info" %}
IP addresses that are in the blacklist will be blocked. What is special about the blacklist is that it is compared with a public blacklist every 24 hours.
{% endhint %}

<figure><img src="../../.gitbook/assets/9cea3f2294accd4964cf49d409b86889.jpg" alt=""><figcaption><p>;)</p></figcaption></figure>

## Add IP to White-/Black-list

<figure><img src="../../.gitbook/assets/ipaccess_add.png" alt=""><figcaption><p>Buttons for add Black/White-Rule.</p></figcaption></figure>

The dialog for the blacklist and whitelist are identical.

<figure><img src="../../.gitbook/assets/ipaccess_adddialog.png" alt=""><figcaption><p>Dialog</p></figcaption></figure>

1. **IP**: IP to block or allow through.
2. **Disable this ip block**: Disables the rule if the rule should not be deleted.
3. **Description**: A description can be given of what is known about the IP.
