# router-sim — netns datapath simulation (Pi-router epic)

Verifies the FlyingFish router datapath **without the physical Raspberry Pi and
without sudo**, by standing up the WAN/LAN/NAT/DHCP topology inside a rootless
Linux network namespace and driving it through the *real* FlyingFish config
builders plus real `udhcpc` / `dnsmasq` / `nftables`.

It exists so the Pi-router work (epic 11) can keep moving while the hardware is
unavailable: the only remaining Pi-bound step is the final live acceptance
(11.7.7 "Live-Verify"). Everything the netdevice reconciler *computes and applies*
— WAN DHCP client, per-LAN dnsmasq, NAT44/forward — is exercised here on the dev
machine, so regressions are caught before they reach the Pi.

## Topology

```
  client-ns            router-ns (the datapath)              wan-ns (the "ISP")
  ┌────────┐   lan0   ┌───────────────────────────┐  wan0  ┌──────────────────┐
  │ udhcpc │◄────────►│ lan0: dnsmasq DHCP server  │◄──────►│ dnsmasq DHCP srv │
  │ client │ 10.20/24 │ wan0: udhcpc DHCP client   │10.10/24│ + TCP echo svc   │
  └────────┘          │ nft:  NAT44 + forward      │        └──────────────────┘
                      └───────────────────────────┘
```

The WAN side has **no route back to the LAN subnet**, so a client→WAN round-trip
only succeeds if the router masqueraded the source — that is the NAT44 proof.

## What is *real* vs simulated

Real (the code under test):
- **`resolveNftablesRouterConfig` + `buildNftablesRuleset`** (`core`) generate the
  `nft -f` ruleset + forwarding sysctls from DB-shaped interface rows — the exact
  path the backend serves to the netdevice part. Loaded with real `nft`.
- **`buildDnsmasqConfig`** (`core`) generates the LAN `dnsmasq.conf`. Run with real
  `dnsmasq`.
- Real **busybox `udhcpc`** on WAN (router) and LAN (client); real **`dnsmasq`**
  DHCP servers; real kernel nftables NAT/forward.

Simulated / stubbed:
- The "ISP" (`wan-ns` dnsmasq + echo service) — stands in for the upstream.
- The physical NICs — veth pairs named `wan0`/`lan0` inside `router-ns`.
- The Rust nft addon (`flyingfish_netfilternft.applyRouter`) is **not** used yet;
  the sim installs the equivalent ruleset from `buildNftablesRuleset` (the addon
  programs the same masquerade/forward rules via netlink). See "Fidelity tiers".

Two sim-only shims (needed only because we run rootless, never in production):
- `user=root`/`group=root` appended to each `dnsmasq.conf` (the real config path is
  left untouched — the shim is appended to a copy).
- `setgroups-shim.c` `LD_PRELOAD`ed into `dnsmasq` — neutralises the `setgroups()`
  call the kernel denies inside an unprivileged user namespace.

## Run

```bash
./run.sh                          # default scenario: scenarios/nat44-basic.json
./run.sh scenarios/nat44-basic.json
```

Exit code `0` = all assertions passed. The harness self-re-execs into a
`unshare --user --map-root-user --mount --net` namespace, so it needs no root; all
namespaces/veths live inside that userns and vanish when the process exits (the
`EXIT` trap cleanup is belt-and-suspenders — nothing is created on the host).

Requires: `iproute2` (`ip`), `nft`, `dnsmasq`, `busybox` (udhcpc applet), `nc`,
`node`, a C compiler (`cc`/`gcc`/`clang`), and a built `core/dist` (`npm run build`
in `core/`). Unprivileged user namespaces must be enabled
(`kernel.unprivileged_userns_clone=1`, the default on most distros).

## Fidelity tiers

1. **Tier 1 (this harness):** real core builders + real udhcpc/dnsmasq/nft. Covers
   config generation and the live datapath end-to-end.
2. **Tier 2 (follow-up):** load the real `flyingfish_netfilternft` addon and call
   `applyRouter()` so the Rust/netlink netfilter code installs the rules. The addon
   is not built on this host (its `libmnl`/`libnftnl` dev headers are missing and
   `apt` needs root); build the `.node` inside the netdevice Docker build stage and
   drop it in, then swap `sim_router_apply_netfilter` to call it.
3. **Tier 3 (follow-up):** run the real `netdevice/dist/main.js` reconcile loop
   against a fake backend HTTP stub serving the `/json/router/*` DTOs, so the
   reconcile/report loop itself is exercised, not just the builders it calls.

## Files

- `run.sh` — orchestrator: re-exec, generate config, build topology, assert, report.
- `lib.sh` — topology + WAN/LAN/NAT helpers (sourced).
- `gen-config.mjs` — calls the real `core` builders to emit `router.nft` + `*.conf`.
- `scenarios/*.json` — DB-shaped interfaces + NAT policy + DHCP config + sim addressing.
- `setgroups-shim.c` — sim-only `LD_PRELOAD` no-op for `dnsmasq` under the userns.
