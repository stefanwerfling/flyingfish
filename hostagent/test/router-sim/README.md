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

- **The real native addon** `flyingfish_netfilternft.applyRouter` (Rust/rustables,
  programs the `flyingfish-filter`/`flyingfish-nat4`/`flyingfish-nat6` tables over
  netlink) — used when built (the default, `FF_SIM_NETFILTER=native`). This is the
  exact code the netdevice part runs in production. See `FF_SIM_NETFILTER` below.

Simulated / stubbed:
- The "ISP" (`wan-ns` dnsmasq + echo service) — stands in for the upstream.
- The physical NICs — veth pairs named `wan0`/`lan0` inside `router-ns`.

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

`FF_SIM_NETFILTER` selects how the router netfilter config is applied:
- `auto` (default) — use the real addon if built, else fall back to `ruleset` (logged).
- `native` — force the real `flyingfish_netfilternft.applyRouter` (Rust/netlink); errors
  if the addon is not built.
- `ruleset` — force the `buildNftablesRuleset` text via `nft -f` (no addon needed).

Build the addon for `native` mode (x86_64 host, ~20 s):

```bash
cd netfilternft && npm install && LIBCLANG_PATH=/lib/x86_64-linux-gnu npm run build
```

It needs `clang` + `libclang-dev` + kernel uapi headers (`linux-libc-dev`); no
`libmnl`/`libnftnl`. The built `netfilternft/*.node` + `index.js` are gitignored. If
those deps aren't installable on the host, build the `.node` in the netdevice Docker
build stage instead (`docker build -f netdevice/Dockerfile --target build .`, then
copy `/opt/flyingfish/netfilternft/*.node` + `index.js` out) — note the Docker build
targets the image's arch, so build for the host arch you run the sim on.

Exit code `0` = all assertions passed. The harness self-re-execs into a
`unshare --user --map-root-user --mount --net` namespace, so it needs no root; all
namespaces/veths live inside that userns and vanish when the process exits (the
`EXIT` trap cleanup is belt-and-suspenders — nothing is created on the host).

Requires: `iproute2` (`ip`), `nft`, `dnsmasq`, `busybox` (udhcpc applet), `nc`,
`node`, a C compiler (`cc`/`gcc`/`clang`), and a built `core/dist` (`npm run build`
in `core/`). Unprivileged user namespaces must be enabled
(`kernel.unprivileged_userns_clone=1`, the default on most distros).

## Fidelity tiers

1. **Tier 1:** real core builders + real udhcpc/dnsmasq/nft. Covers config generation
   and the live datapath end-to-end. (`FF_SIM_NETFILTER=ruleset`)
2. **Tier 2 (done):** load the real `flyingfish_netfilternft` addon and call
   `applyRouter()` so the Rust/rustables/netlink netfilter code installs the rules —
   the exact production netfilter path. Enabled by default when the addon is built
   (`FF_SIM_NETFILTER=native`, via `apply-native.mjs`).
3. **Tier 3 (done):** run the real `netdevice/dist/main.js` reconcile loop against a
   fake backend HTTP stub, so the whole part — Hub registration, interface discovery,
   WAN udhcpc, LAN `ensureLanAddress` + dnsmasq, native netfilter apply, and the report
   POSTs — is exercised, not just the builders it calls. Run via `./run-netdevice.sh`.
4. **PD tier (done):** the IPv6 prefix-delegation route path (ULA-PD server). A
   router + a downstream (PD-requesting router) netns; the real KeaRunner chain
   `parseKeaPdLeases` → `ip -6 neigh` correlation by MAC (`parseNeighborLinkLocal`)
   → native `routeReplaceV6` (Rust rtnetlink) installs the delegated /60 route, verified
   in the kernel + `ip -6 route get`. Run via `./run-pd.sh`. `kea-dhcp6` itself is not
   run (not installable rootless); the IA_PD lease is a Kea memfile6 CSV in the real
   format (pinned by the `KeaDhcp6Config` unit tests). Everything after the lease line —
   pool match, neighbour correlation, native route write — is the real production code.

## Files

- `run.sh` — orchestrator: re-exec, generate config, build topology, assert, report.
- `lib.sh` — topology + WAN/LAN/NAT helpers (sourced).
- `gen-config.mjs` — calls the real `core` builders to emit `router.nft` + `*.conf`.
- `apply-native.mjs` — Tier 2: loads the real `flyingfish_netfilternft` addon and
  calls `applyRouter()` inside the router netns.
- `run-netdevice.sh` — Tier 3 orchestrator: runs the real netdevice reconcile loop.
- `fake-backend.mjs` — Tier 3 Hub stub: serves `/json/router/*` + `/json/registry/*`
  and records the netdevice's report POSTs for the assertions.
- `run-pd.sh` — PD tier orchestrator: router + downstream netns, delegated-prefix route.
- `pd-route.mjs` — PD tier: the real `parseKeaPdLeases` → neigh-correlate →
  native `routeReplaceV6` chain (the KeaRunner route path) inside the router netns.
- `scenarios/*.json` — DB-shaped interfaces + NAT policy + DHCP config + sim addressing.
- `setgroups-shim.c` — sim-only `LD_PRELOAD` no-op for `dnsmasq` under the userns.

## Tier 3 — real netdevice reconcile loop

```bash
./run-netdevice.sh                # default scenario
```

Boots `netdevice/dist/main.js` (PKI disabled — no `FLYINGFISH_PKI_URL`) inside the
router netns, pointed at `fake-backend.mjs` as the Hub. The real part registers, then
reconciles: discovers + reports interfaces, runs udhcpc on WAN (reports the lease),
`ensureLanAddress` + dnsmasq on LAN, and programs nftables via the native addon; the
harness asserts on what it reported back to the stub, and that a LAN client gets a
lease from the netdevice's own dnsmasq (9 assertions).

Extra requirements beyond Tiers 1-2:
- A **fully-installed workspace** so the real dist's dependency graph resolves — its git
  deps (`@stefanwerfling/figtree`, …) must be present (`npm install` at the repo root).
  The runner dry-imports the dist first and fails with clear guidance if not.
- A **current** `netdevice/dist` (`npm run build` in `netdevice/` — the committed dist
  can lag the source).
- Two things the harness sets up itself (sim-only, rootless): a writable tmpfs over
  `/var/log` (figtree's file logger target), and PATH shims so netdevice's `udhcpc`
  resolves to the busybox applet and its `dnsmasq` gets `--user/--group root`.

Note: netdevice's WAN udhcpc hook only *reports* the lease (it does not assign the WAN
address), so Tier 3 does not complete a WAN→LAN NAT round-trip — that end-to-end proof
lives in Tiers 1-2. Tier 3's job is the reconcile/report loop.
