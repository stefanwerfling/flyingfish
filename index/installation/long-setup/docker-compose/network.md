---
description: Description of FlyingFish's internal network.
---

# Network

Flying Fish is divided into several containers. Specific tasks are performed in each of the containers. A separate internal network is used for communication (data exchange).

**Subnet:** 10.103.0.0/16

<table><thead><tr><th width="201.33333333333331">Container</th><th width="133">IP</th><th>Description</th></tr></thead><tbody><tr><td>flyingfish_db</td><td>10.103.0.2</td><td>-</td></tr><tr><td>flyingfish_influxdb</td><td>10.103.0.5</td><td>-</td></tr><tr><td>flyingfish_service</td><td>10.103.0.3</td><td>-</td></tr><tr><td>flyingfish_himhip</td><td>Host mode</td><td>Runs on the host to be able to query the ARP in the host network (resolution of MAC/IPs and gateway).</td></tr><tr><td>flyingfish_ssh</td><td>10.103.0.4</td><td>-</td></tr><tr><td>flyingfish_ddns</td><td>10.103.0.6</td><td>-</td></tr></tbody></table>
