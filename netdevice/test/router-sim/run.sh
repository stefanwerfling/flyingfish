#!/usr/bin/env bash
#
# Router-sim — netns integration harness for the Pi-router datapath.
#
# Stands up a rootless three-namespace router topology (client / router / wan)
# and drives it through the REAL FlyingFish config builders + real udhcpc /
# dnsmasq / nftables, so the WAN-DHCP-client, LAN-DHCP-server, NAT44 and forward
# paths can be verified WITHOUT the physical Raspberry Pi and WITHOUT sudo.
#
# Usage:   ./run.sh [scenario.json]        (default: scenarios/nat44-basic.json)
#
# It self-re-execs into a `unshare --user --map-root-user --mount --net` user
# namespace (mapped root => CAP_NET_ADMIN over its own netns; no privileges on
# the host). Requires: ip (iproute2), nft, dnsmasq, busybox (udhcpc applet),
# nc, node. Exit code 0 = all assertions passed.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-$HERE/scenarios/nat44-basic.json}"

# --- outer: re-exec inside a rootless user+net+mount namespace ----------------
if [ "${FF_SIM_INNER:-}" != "1" ]; then
    for bin in ip nft dnsmasq busybox nc node unshare; do
        command -v "$bin" >/dev/null 2>&1 || { echo "missing required tool: $bin" >&2; exit 3; }
    done
    busybox udhcpc --help >/dev/null 2>&1 || busybox 2>&1 | tr ',' '\n' | grep -qw udhcpc \
        || { echo "busybox has no udhcpc applet" >&2; exit 3; }
    exec env FF_SIM_INNER=1 unshare --user --map-root-user --mount --net --propagation private \
        -- "${BASH_SOURCE[0]}" "$SCENARIO"
fi

# --- inner: mapped root in our own userns/netns/mountns -----------------------
# shellcheck source=lib.sh
source "$HERE/lib.sh"

main() {
    log "scenario: $SCENARIO"
    sim_prepare_runtime
    trap sim_cleanup EXIT

    step "Generate config via the real core builders"
    local summary
    summary="$(node "$HERE/gen-config.mjs" "$SCENARIO" "$RT")"
    log "generated: $summary"
    sim_write_udhcpc_script

    step "Build netns topology"
    sim_build_topology

    step "WAN DHCP client path (busybox udhcpc -> ISP dnsmasq)"
    sim_start_wan_side
    sleep 0.5
    sim_router_wan_udhcpc && rc=0 || rc=1
    assert "router acquired a WAN DHCP lease (udhcpc)" "$rc"
    local wanip
    wanip="$(nse router ip -4 -o addr show wan0 | grep -oE '10\.10\.0\.[0-9]+' | head -1 || true)"
    [ -n "$wanip" ]; assert "router wan0 configured from lease ($wanip)" "$?"
    grep -q '^BOUND ' "$RT/wan-udhcpc.log" 2>/dev/null; assert "udhcpc BOUND event recorded" "$?"

    step "Apply generated nftables ruleset + sysctls (real buildNftablesRuleset)"
    sim_router_apply_netfilter
    nse router nft list ruleset > "$RT/applied.nft" 2>/dev/null || true
    grep -q 'masquerade' "$RT/applied.nft"; assert "NAT44 masquerade rule installed" "$?"
    grep -q 'chain forward' "$RT/applied.nft"; assert "forward filter chain installed" "$?"
    [ "$(nse router cat /proc/sys/net/ipv4/ip_forward)" = "1" ]; assert "net.ipv4.ip_forward=1 applied" "$?"

    step "LAN DHCP server path (real buildDnsmasqConfig -> dnsmasq -> client udhcpc)"
    sim_router_start_lan_dnsmasq
    sleep 0.5
    sim_client_udhcpc && rc=0 || rc=1
    assert "client acquired a LAN DHCP lease (udhcpc)" "$rc"
    local lanip
    lanip="$(nse client ip -4 -o addr show cl0 | grep -oE '10\.20\.0\.1[0-9][0-9]' | head -1 || true)"
    [ -n "$lanip" ]; assert "client cl0 configured from lease ($lanip)" "$?"
    nse router test -s /run/ff-lan-lan0.leases; assert "dnsmasq wrote a lease record" "$?"

    step "End-to-end NAT44: client -> WAN service through masquerade"
    # wan-ns has NO route back to the LAN subnet, so a round-trip only succeeds if
    # the router rewrote the source (masquerade). This is the NAT proof.
    nse wan bash -c "while true; do echo -n PONG-WAN | timeout 3 nc -l -p $WAN_SVC_PORT -q1; done" &
    local svc=$!
    sleep 0.3
    nse client ping -c1 -W2 "$WAN_SRV_ADDR" >/dev/null 2>&1; assert "client can ping WAN host through router" "$?"
    local resp
    resp="$(nse client bash -c "timeout 4 nc -w2 $WAN_SRV_ADDR $WAN_SVC_PORT" 2>/dev/null || true)"
    kill "$svc" 2>/dev/null || true
    [ "$resp" = "PONG-WAN" ]; assert "client reached WAN TCP service via NAT44 (got: '${resp:-<none>}')" "$?"

    step "Result"
    log "PASS=$PASS FAIL=$FAIL"
    [ "$FAIL" -eq 0 ]
}

main
