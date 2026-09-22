#!/usr/bin/env bash
#
# PD-sim — netns integration harness for the Pi-router PREFIX-DELEGATION route path.
#
# Proves the netdevice PD route-installation chain (the previously untested-against-a-
# real-delegation part) end to end against a REAL kernel, rootless, WITHOUT the Pi:
#
#   router-ns (the datapath)              downstream-ns (a PD-requesting router)
#   ┌───────────────────────────┐  lan0  ┌──────────────────────────────────────┐
#   │ lan0: fd00:50::1/64 + fe80::1      │  ds0: fe80::dead:beef, mac 02:aa:..    │
#   │ kea IA_PD lease (CSV) ─► parse ─►  │◄──────► (its link-local is the PD      │
#   │ neigh-correlate ─► native route   │         next-hop the router must find) │
#   └───────────────────────────┘        └──────────────────────────────────────┘
#
# The delegated-prefix lease is a Kea memfile6 CSV (kea-dhcp6 is not installable
# rootless; the CSV format is pinned by the KeaDhcp6Config unit tests). Everything
# after the lease line — pool match, `ip -6 neigh` correlation by MAC and the native
# rtnetlink route write — is the REAL production code (pd-route.mjs = KeaRunner path).
#
# Usage:   ./run-pd.sh          Exit 0 = all assertions passed.
# Requires: ip (iproute2), node, and the built netfilternft addon (*.node + index.js).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- outer: re-exec inside a rootless user+net+mount namespace ----------------
if [ "${FF_SIM_INNER:-}" != "1" ]; then
    for bin in ip node unshare; do
        command -v "$bin" >/dev/null 2>&1 || { echo "missing required tool: $bin" >&2; exit 3; }
    done
    if [ ! -f "$HERE/../../../netfilternft/index.js" ] || ! compgen -G "$HERE/../../../netfilternft/"*.node >/dev/null; then
        echo "netfilternft addon not built (run 'npm run build' in netfilternft/)" >&2
        exit 3
    fi
    if [ ! -f "$HERE/../../../core/dist/src/index.js" ]; then
        echo "core not built (run 'npm run build' in core/)" >&2
        exit 3
    fi
    exec env FF_SIM_INNER=1 unshare --user --map-root-user --mount --net --propagation private \
        -- "${BASH_SOURCE[0]}"
fi

# --- inner: mapped root in our own userns/netns/mountns -----------------------
# shellcheck source=lib.sh  (only the generic primitives: log/step/assert/nse + /run tmpfs)
source "$HERE/lib.sh"

# pd-sim topology constants
DS_MAC="02:aa:bb:cc:dd:ee"       # deterministic downstream MAC (the PD requester)
DS_LL="fe80::dead:beef"          # deterministic downstream link-local (the PD next-hop)
LAN_ULA="fd00:50::1/64"          # router LAN ULA (as ensureLanIpv6 sets it)
DELEG_PREFIX="fd00:50:1:a00::"   # a /60 carved from the pool deriveKeaPdLan(fd00:50::1) gives (fd00:50:1::/48)
DELEG_LEN="60"

pd_cleanup() {
    [ -n "${RT:-}" ] && pkill -f "$RT" 2>/dev/null || true
    for ns in router downstream; do ip netns del "$ns" 2>/dev/null || true; done
}

pd_build_topology() {
    for ns in router downstream; do ip netns add "$ns"; done

    ip link add lan0 type veth peer name ds0
    ip link set lan0 netns router
    ip link set ds0  netns downstream

    nse router ip link set lo up
    nse downstream ip link set lo up

    # downstream: fixed MAC + a deterministic link-local (its LL is what the router
    # must discover from the neighbour table and route the delegated prefix via).
    # Suppress the kernel's EUI-64 auto link-local so only our explicit one exists
    # (else the ping may source from the auto LL and the router learns that instead).
    nse downstream ip link set ds0 address "$DS_MAC"
    nse downstream ip link set ds0 addrgenmode none 2>/dev/null || true
    nse downstream ip link set ds0 up
    nse downstream ip -6 addr add "$DS_LL/64" dev ds0 scope link nodad

    # router LAN: the ULA + link-local the netdevice ensureLanIpv6 assigns for a
    # pd-server / nat66 LAN (RA is sourced from fe80::1; the ULA is the on-link /64).
    nse router ip link set lan0 up
    nse router ip -6 addr add "${LAN_ULA}" dev lan0 nodad
    nse router ip -6 addr add "fe80::1/64" dev lan0 scope link nodad

    log "topology up (router lan0 ${LAN_ULA} + fe80::1, downstream ds0 ${DS_LL} mac ${DS_MAC})"
}

pd_write_kea_csv() {
    # Real Kea 2.x memfile6 header + one valid IA_PD (lease_type=2, state=0) delegated
    # to the downstream's MAC, plus an IA_NA row (lease_type=0) that MUST be ignored.
    cat > "$RT/kea-leases6.csv" <<EOF
address,duid,valid_lifetime,expire,subnet_id,pref_lifetime,lease_type,iaid,prefix_len,fqdn_fwd,fqdn_rev,hostname,hwaddr,state,user_context,pool_id
fd00:50::abcd,00:03:00:01:${DS_MAC},3600,1700000000,1,1800,0,7,128,0,0,,${DS_MAC},0,,0
${DELEG_PREFIX},00:03:00:01:${DS_MAC},3600,1700000000,1,1800,2,42,${DELEG_LEN},0,0,,${DS_MAC},0,,0
EOF
}

main() {
    sim_prepare_runtime
    trap pd_cleanup EXIT

    step "Build netns topology (router + downstream)"
    pd_build_topology
    sleep 0.5   # let DAD settle

    step "Populate the router neighbour table (downstream sends to the router LL)"
    # The downstream pinging the router's fe80::1 makes the router learn ds0's
    # link-local + MAC — the exact neigh state KeaRunner correlates against.
    nse downstream ping -6 -c2 -W2 "fe80::1%ds0" >/dev/null 2>&1 || true
    nse router ip -6 neigh show dev lan0 > "$RT/neigh.txt" 2>/dev/null || true
    grep -qi "$DS_MAC" "$RT/neigh.txt"; assert "router learned the downstream link-local by MAC" "$?"

    step "Run the REAL PD route path (parseKeaPdLeases -> neigh-correlate -> native routeReplaceV6)"
    pd_write_kea_csv
    nse router env \
        FF_PD_CSV="$RT/kea-leases6.csv" FF_PD_IFACE=lan0 FF_PD_ULA="$LAN_ULA" \
        node "$HERE/pd-route.mjs" > "$RT/pd-route.log" 2>&1 && rc=0 || rc=1
    log "pd-route: $(cat "$RT/pd-route.log")"
    assert "pd-route.mjs ran the real core+addon PD path" "$rc"
    # Extract the next-hop the real correlation actually resolved (a link-local), rather
    # than hard-coding it — the assertions below verify the kernel uses exactly that.
    local via
    via="$(grep -oE "routed ${DELEG_PREFIX}/${DELEG_LEN} via fe80:[0-9a-f:]+ dev lan0" "$RT/pd-route.log" \
        | grep -oE 'fe80:[0-9a-f:]+' | head -1 || true)"
    [ -n "$via" ]; assert "correlated the IA_PD prefix to a link-local next-hop ($via)" "$?"
    grep -q "done: 1 route(s) installed" "$RT/pd-route.log"
    assert "only the IA_PD lease was routed (IA_NA row ignored)" "$?"

    step "Verify the delegated-prefix route in the kernel (native rtnetlink write)"
    nse router ip -6 route show > "$RT/routes.txt" 2>/dev/null || true
    grep -qE "^${DELEG_PREFIX}/${DELEG_LEN} via ${via} dev lan0" "$RT/routes.txt"
    assert "route ${DELEG_PREFIX}/${DELEG_LEN} via ${via} dev lan0 installed" "$?"

    step "Functional: the kernel routes a delegated-prefix address via the downstream"
    local got
    got="$(nse router ip -6 route get "${DELEG_PREFIX}5" 2>/dev/null | head -1 || true)"
    log "route get: $got"
    echo "$got" | grep -q "via ${via} dev lan0"
    assert "kernel forwards ${DELEG_PREFIX}5 via ${via} dev lan0" "$?"

    step "Result"
    log "PASS=$PASS FAIL=$FAIL"
    [ "$FAIL" -eq 0 ]
}

main
