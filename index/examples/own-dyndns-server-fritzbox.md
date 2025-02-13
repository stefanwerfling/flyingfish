# Own DynDNS Server - Fritzbox

Flyingfish offers its own DynDNS server to update the record entries in the DNS server.

## Steps:

1. First create an account for a DynDNS Client, in my Example Fritzbox. \
   [You can read how you can do this here](../configurations/domains/dyndns-server.md)
2. Set an [HTTPS route](../configurations/routes.md#add-http-https) to the DynDNS server. In the location you can set the destination type as the target.

<figure><img src="../../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>

3. Set the settings for the Fritzbox.

<figure><img src="../../.gitbook/assets/fritzbox-dyndns.png" alt=""><figcaption><p>Settings for a Fritzbox</p></figcaption></figure>

<table><thead><tr><th width="97"></th><th>Description</th><th>Example Value</th></tr></thead><tbody><tr><td><mark style="color:red;">1</mark></td><td>URL to the DynDN server</td><td>https://mydyndn-server.org/nic/update</td></tr><tr><td><mark style="color:red;">2</mark></td><td>Domain</td><td>my-domain.org</td></tr><tr><td><mark style="color:red;">3</mark></td><td>Username</td><td>MyUser</td></tr><tr><td><mark style="color:red;">4</mark></td><td>Password</td><td>YourPAssword</td></tr></tbody></table>

