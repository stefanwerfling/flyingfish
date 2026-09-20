#!/usr/bin/env bash
#
# Router-sim Tier 3 — run the REAL netdevice reconcile loop against a fake backend.
#
# Boots netdevice/dist/main.js (PKI-less) inside the router netns pointed at a fake
# Hub (fake-backend.mjs), so the actual part code drives the datapath: Hub
# registration, interface discovery, WAN udhcpc, LAN ensureLanAddress + dnsmasq, and
# the native netfilter apply — plus the report POSTs back to the Hub. Asserts on what
# the netdevice reported to the stub. No Pi, no sudo, no real backend/DB.
#
# Usage:  ./run-netdevice.sh [scenario.json]
#
# Requires the same tools as run.sh, a built core/dist + netdevice/dist, and the built
# netfilternft addon (npm run build in netfilternft/) for the netfilter step.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-$HERE/scenarios/nat44-basic.json}"
REPO="$(cd "$HERE/../../.." && pwd)"
PORT=18080

if [ "${FF_SIM_INNER:-}" != "1" ]; then
    for bin in ip nft dnsmasq busybox nc node unshare cc; do
        command -v "$bin" >/dev/null 2>&1 || { echo "missing required tool: $bin" >&2; exit 3; }
    done
    [ -f "$REPO/netdevice/dist/main.js" ] || { echo "netdevice/dist not built (run 'npm run build' in netdevice/)" >&2; exit 3; }
    # Tier 3 runs the real dist, so its full dependency graph (git deps like
    # @stefanwerfling/figtree, the native addon) must resolve. Dry-import it (with no
    # env it just loads + returns) so a half-installed workspace fails clearly here.
    if ! timeout 40 node -e "import('file://$REPO/netdevice/dist/main.js').then(()=>process.exit(0)).catch(()=>process.exit(7))" >/dev/null 2>&1; then
        echo "netdevice/dist/main.js does not load — Tier 3 needs a fully-installed workspace." >&2
        echo "Run 'npm install' at the repo root (fetches @stefanwerfling/figtree etc.) and" >&2
        echo "rebuild with 'npm run build' in netdevice/, then retry. (Tiers 1-2 via run.sh" >&2
        echo "need only core/dist + the netfilternft addon.)" >&2
        exit 4
    fi
    exec env FF_SIM_INNER=1 unshare --user --map-root-user --mount --net --propagation private \
        -- "${BASH_SOURCE[0]}" "$SCENARIO"
fi

# shellcheck source=lib.sh
source "$HERE/lib.sh"

NODE_BIN="$(command -v node)"

# PATH shims so the real netdevice runs unmodified under the rootless userns:
#  - udhcpc: the host has no standalone udhcpc, only the busybox applet.
#  - dnsmasq: force --user/--group root so its privilege drop (setgid to dip) is a
#    no-op; the setgroups no-op comes from the LD_PRELOAD shim (inherited from node).
sim_write_netdevice_shims() {
    mkdir -p "$RT/bin"
    cat > "$RT/bin/udhcpc" <<EOF
#!/bin/sh
exec busybox udhcpc "\$@"
EOF
    cat > "$RT/bin/dnsmasq" <<EOF
#!/bin/sh
exec /usr/sbin/dnsmasq "\$@" --user=root --group=root --log-facility=-
EOF
    chmod +x "$RT/bin/udhcpc" "$RT/bin/dnsmasq"
}

NETDEV_PID=""
STUB_PID=""
netdev_cleanup() {
    if [ -n "${FF_SIM_KEEP:-}" ] && [ -n "${RT:-}" ]; then
        cp -f "$RT/netdevice.log" "$RT/stub.log" "$RT/stub-state.json" "$RT/applied.nft" \
            "$RT"/lan0*.conf "${FF_SIM_KEEP}/" 2>/dev/null || true
    fi
    kill "${NETDEV_PID:-}" "${STUB_PID:-}" 2>/dev/null || true
    pkill -f 'netdevice/dist/main.js' 2>/dev/null || true
    # netdevice's child dnsmasq/udhcpc + the stub all reference this run's $RT in their
    # argv (TMPDIR/config/hook/state paths); kill the whole family by that path.
    [ -n "${RT:-}" ] && pkill -f "$RT" 2>/dev/null || true
    sim_cleanup
}

poll() {
    # poll "<jq-ish node expr on state>" <timeout-s>; returns 0 when node prints "1"
    local expr="$1" timeout="$2" i=0
    while [ "$i" -lt "$((timeout * 2))" ]; do
        if [ -f "$RT/stub-state.json" ] && \
           [ "$("$NODE_BIN" -e "const s=require('$RT/stub-state.json'); process.stdout.write(($expr)?'1':'0')" 2>/dev/null)" = "1" ]; then
            return 0
        fi
        sleep 0.5; i=$((i + 1))
    done
    return 1
}

main() {
    set +e   # assert tracks failures explicitly; a failed poll/grep must not abort
    log "scenario: $SCENARIO (Tier 3 — real netdevice against fake backend)"
    sim_prepare_runtime
    trap netdev_cleanup EXIT

    # figtree's Logger writes DailyRotateFile logs under /var/log/{flyingfish,app};
    # give it a writable tmpfs so its init doesn't EACCES (sim-only, rootless).
    mount -t tmpfs tmpfs /var/log 2>/dev/null || true
    mkdir -p /var/log/flyingfish /var/log/app 2>/dev/null || true
    sim_write_udhcpc_script
    sim_write_netdevice_shims

    step "Build netns topology + WAN ISP (LAN IP left to netdevice)"
    SIM_SKIP_LAN_ADDR=1 sim_build_topology
    sim_start_wan_side
    sleep 0.5

    step "Start fake backend (Hub) in the router netns"
    nse router env TMPDIR="$RT" "$NODE_BIN" "$HERE/fake-backend.mjs" "$SCENARIO" "$RT/stub-state.json" "$PORT" \
        >"$RT/stub.log" 2>&1 &
    STUB_PID=$!
    sleep 0.5
    grep -q 'listening' "$RT/stub.log"; assert "fake backend is listening" "$?"

    step "Launch the REAL netdevice reconcile loop (PKI-less, env config)"
    nse router env \
        PATH="$RT/bin:/usr/sbin:/usr/bin:/bin" \
        LD_PRELOAD="$SIM_PRELOAD" \
        TMPDIR="$RT" \
        HOME=/root \
        FLYINGFISH_REGISTRY_URL="http://127.0.0.1:$PORT" \
        FLYINGFISH_REGISTRY_SECRET="simsecret" \
        FLYINGFISH_NETDEVICE_RECONCILE_INTERVAL_MS="2500" \
        FLYINGFISH_LOGGING_LEVEL="info" \
        "$NODE_BIN" "$REPO/netdevice/dist/main.js" --envargs=1 \
        >"$RT/netdevice.log" 2>&1 &
    NETDEV_PID=$!

    poll "s.registered===true" 15; assert "netdevice registered with the Hub" "$?"
    poll "Array.isArray(s.availableInterfaces)&&s.availableInterfaces.length>0" 15
    assert "netdevice reported discovered interfaces" "$?"
    poll "s.wanLease&&/^10\\.10\\.0\\./.test(s.wanLease.ipv4_address||'')" 15
    assert "netdevice reported a WAN DHCP lease (real udhcpc)" "$?"

    step "Verify netdevice applied the datapath in the router netns"
    nse router nft list ruleset > "$RT/applied.nft" 2>/dev/null || true
    grep -q 'flyingfish-nat4' "$RT/applied.nft"; assert "netdevice programmed nftables via the real addon" "$?"
    local lanip
    lanip="$(nse router ip -4 -o addr show lan0 2>/dev/null | grep -oE '10\.20\.0\.1\b' | head -1 || true)"
    [ -n "$lanip" ]; assert "netdevice assigned the LAN static IP (ensureLanAddress)" "$?"

    step "LAN client pulls a lease from netdevice's dnsmasq"
    sim_client_udhcpc && rc=0 || rc=1
    assert "client acquired a LAN DHCP lease" "$rc"
    poll "Array.isArray(s.dhcpLeases)&&s.dhcpLeases.length>0" 12
    assert "netdevice reported the LAN lease back to the Hub" "$?"

    step "Result"
    kill -0 "$NETDEV_PID" 2>/dev/null; assert "netdevice process still alive (kept up by its children)" "$?"
    log "netdevice log (tail):"; tail -6 "$RT/netdevice.log" >&2 || true
    log "PASS=$PASS FAIL=$FAIL"
    [ "$FAIL" -eq 0 ]
}

main
