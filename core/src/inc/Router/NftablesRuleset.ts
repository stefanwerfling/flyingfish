/**
 * The router state the nftables ruleset is generated from (Pi-router epic, Phase 2):
 * the resolved WAN/LAN interface names + the NAT/routing policy. Pure input — resolved
 * by the caller from NetworkInterface roles + NatPolicy.
 */
export type NftablesLan = {
    /**
     * The LAN (downlink) interface name.
     */
    name: string;

    /**
     * Masquerade this LAN's IPv4 traffic → WAN (NAT44).
     */
    nat44: boolean;

    /**
     * This LAN's IPv6 mode: `off` (no IPv6 routing), `nat66` (masquerade this LAN's IPv6
     * → WAN), `pd` (route an upstream-delegated prefix — forwarding only, no NAT) or
     * `pd-server` (delegate ULA sub-prefixes downstream via DHCPv6-PD; the delegated ULA
     * still masquerades to the WAN GUA, so it is treated like `nat66` at the WAN).
     */
    ipv6Mode: 'off' | 'nat66' | 'pd' | 'pd-server';
};

export type NftablesRouterConfig = {
    /**
     * The WAN (uplink) interface name; empty disables all NAT (no masquerade target).
     */
    wanInterface: string;

    /**
     * The LAN (downlink) interfaces, each with its own NAT settings (Pi-router UI v2 —
     * NAT is per interface so each LAN can differ).
     */
    lans: NftablesLan[];

    /**
     * Enable routing (forward chain + IP forwarding sysctls) between LAN and WAN.
     */
    forward: boolean;

    /**
     * Inbound firewall / port-forwarding rules (Pi-router Phase 2). CONCRETE — each entry is
     * a single proto × family; `both` is expanded by {@link resolvePortForwards} so the
     * ruleset generator and native applier stay simple. Optional: absent = no inbound
     * openings (the WAN firewall stays fully closed).
     */
    forwards?: NftablesForward[];
};

/**
 * One resolved inbound rule: open a WAN port to a LAN host (DNAT) or to the router itself.
 */
export type NftablesForward = {
    /**
     * `tcp` or `udp` (concrete — `both` is expanded upstream).
     */
    proto: 'tcp' | 'udp';

    /**
     * `ipv4` or `ipv6` (concrete — `both` is expanded upstream).
     */
    family: 'ipv4' | 'ipv6';

    /**
     * The WAN (incoming) port (range start when `wanPortEnd` is set).
     */
    wanPort: number;

    /**
     * End of the WAN port range (inclusive); 0 = a single port. A range forwards 1:1
     * (each WAN port → the same port on the host), so `hostPort` is ignored for a range.
     */
    wanPortEnd: number;

    /**
     * `host` (DNAT to a LAN host) or `router` (accept to a service on the Pi itself).
     */
    targetType: 'host' | 'router';

    /**
     * The destination host IP (host mode); empty for a router rule.
     */
    host: string;

    /**
     * The destination port on the host (host mode); 0 = same as `wanPort`.
     */
    hostPort: number;
};

/**
 * One sysctl key→value the netfilter part must set for the policy to take effect.
 */
export type NftablesSysctl = {key: string; value: string;};

/**
 * The generated netfilter configuration: the `nft -f`-loadable ruleset text and the
 * sysctls to apply alongside it.
 */
export type NftablesRuleset = {
    ruleset: string;
    sysctls: NftablesSysctl[];
};

/**
 * Build the router's nftables ruleset + forwarding sysctls from its config (Pi-router
 * epic, Phase 2). Pure and deterministic so it is fully unit-testable; the netfilter
 * part loads the `ruleset` with `nft -f -` and applies the `sysctls`.
 *
 * - A `table inet filter` forward chain (covers IPv4+IPv6) with an ACCEPT policy — a
 *   blanket DROP on the forward hook would also catch Docker's bridge forwarding and any
 *   foreign routing, so the rules are SCOPED. WAN→LAN is a stateful inbound firewall
 *   (accept established/related + the explicitly forwarded ports, drop the rest of new
 *   WAN→LAN per LAN) so LAN hosts aren't exposed; when routing is OFF, extra
 *   `iifname <lan> oifname <wan> drop` rules also block new LAN→WAN. Mirrors the applier.
 * - `table ip nat` postrouting with one `iifname <lan> oifname <wan> masquerade` rule per
 *   LAN that has `nat44` on (scoped per LAN so each LAN can differ).
 * - `table ip6 nat` postrouting with one masquerade rule per LAN in `nat66` mode
 *   (`pd` routes the delegated prefix with no NAT; `off` emits neither).
 * - NAT tables need a WAN interface; with none, the NAT tables are skipped.
 * - sysctls: `net.ipv4.ip_forward=1` when forwarding; `net.ipv6.conf.all.forwarding=1`
 *   when forwarding and any LAN's IPv6 mode is not `off`.
 * @param config - the resolved router config
 */
export const buildNftablesRuleset = (config: NftablesRouterConfig): NftablesRuleset => {
    const hasWan = config.wanInterface !== '';
    const forwards = config.forwards ?? [];
    const blocks: string[] = [];

    {
        const forwardRules = ['\t\ttype filter hook forward priority 0; policy accept;'];

        // WAN→LAN inbound firewall (stateful). Accept policy on the hook (a blanket forward
        // drop also kills Docker's published-port forwarding), so the firewall is SCOPED:
        // accept return traffic (established/related on the WAN ingress) + the explicitly
        // forwarded ports (matched by their post-DNAT dest host), then drop the rest of new
        // WAN→LAN per LAN — so LAN hosts (esp. globally-routable IPv6 in pd mode) aren't
        // exposed. Scoped `iifname <wan> oifname <lan>`, so Docker bridge forwarding is
        // untouched. Mirrors the native applier.
        if (hasWan) {
            forwardRules.push(`\t\tiifname "${config.wanInterface}" ct state established,related accept`);

            for (const fwd of forwards.filter((entry) => entry.targetType === 'host')) {
                const daddr = fwd.family === 'ipv6' ? 'ip6 daddr' : 'ip daddr';
                // After DNAT the dport is the WAN range (1:1) or the single rewritten host port.
                const dportSpec = fwd.wanPortEnd > fwd.wanPort ? `${fwd.wanPort}-${fwd.wanPortEnd}` : `${fwd.hostPort}`;
                forwardRules.push(`\t\tiifname "${config.wanInterface}" ${daddr} ${fwd.host} ${fwd.proto} dport ${dportSpec} accept`);
            }

            for (const lan of config.lans) {
                forwardRules.push(`\t\tiifname "${config.wanInterface}" oifname "${lan.name}" drop`);
            }
        }

        // Routing OFF: additionally drop new LAN→WAN (Docker/foreign traffic untouched).
        if (!config.forward && hasWan) {
            for (const lan of config.lans) {
                forwardRules.push(`\t\tiifname "${lan.name}" oifname "${config.wanInterface}" drop`);
            }
        }

        // Input firewall: protect the router's OWN services from the WAN. Accept policy
        // (never lock out LAN/management); drop only unsolicited TCP+UDP inbound on the WAN,
        // after accepting established/related, loopback and the WAN's DHCP-client ports.
        // ICMPv6 (NDP/RA/PMTUD) is left to the accept policy so IPv6/WAN keep working.
        const inputRules = [
            '\t\ttype filter hook input priority 0; policy accept;',
            '\t\tct state established,related accept',
            '\t\tiifname "lo" accept'
        ];

        if (hasWan) {
            inputRules.push(`\t\tiifname "${config.wanInterface}" udp dport { 68, 546 } accept`);

            // Phase 2: pinholes for ports opened to the router itself — BEFORE the drops.
            // A router pinhole is dual-stack (the family is irrelevant when the target is the
            // box itself), matching the addon's input accept, so no `meta nfproto` scoping.
            for (const fwd of forwards.filter((entry) => entry.targetType === 'router')) {
                const dportSpec = fwd.wanPortEnd > fwd.wanPort ? `${fwd.wanPort}-${fwd.wanPortEnd}` : `${fwd.wanPort}`;
                inputRules.push(`\t\tiifname "${config.wanInterface}" ${fwd.proto} dport ${dportSpec} accept`);
            }

            inputRules.push(`\t\tiifname "${config.wanInterface}" meta l4proto tcp drop`);
            inputRules.push(`\t\tiifname "${config.wanInterface}" meta l4proto udp drop`);
        }

        blocks.push(
            `table inet filter {\n\tchain forward {\n${forwardRules.join('\n')}\n\t}\n` +
            `\tchain input {\n${inputRules.join('\n')}\n\t}\n}`
        );
    }

    // One nat table per family carrying a prerouting DNAT chain (port forwards to LAN hosts)
    // and/or a postrouting masquerade chain (NAT44 / NAT66). The table is emitted when either
    // is needed, so a port-forward works even if masquerade is off for that family.
    const natTable = (family: 'ip' | 'ip6', ipFamily: 'ipv4' | 'ipv6', masqLans: string[]): void => {
        const dnats = forwards.filter((fwd) => fwd.targetType === 'host' && fwd.family === ipFamily);

        if (!hasWan || (masqLans.length === 0 && dnats.length === 0)) {
            return;
        }

        const chains: string[] = [];

        if (dnats.length > 0) {
            const rules = dnats
                .map((fwd) => {
                    const dportSpec = fwd.wanPortEnd > fwd.wanPort ? `${fwd.wanPort}-${fwd.wanPortEnd}` : `${fwd.wanPort}`;
                    // A range DNATs 1:1 (portless dnat preserves each port); a single port
                    // DNATs to the resolved host port.
                    const dest = fwd.wanPortEnd > fwd.wanPort
                        ? fwd.host
                        : (family === 'ip6' ? `[${fwd.host}]:${fwd.hostPort}` : `${fwd.host}:${fwd.hostPort}`);

                    return `\t\tiifname "${config.wanInterface}" ${fwd.proto} dport ${dportSpec} dnat to ${dest}`;
                })
                .join('\n');

            chains.push(`\tchain prerouting {\n\t\ttype nat hook prerouting priority -100;\n${rules}\n\t}`);
        }

        if (masqLans.length > 0) {
            const rules = masqLans
                .map((lan) => `\t\tiifname "${lan}" oifname "${config.wanInterface}" masquerade`)
                .join('\n');

            chains.push(`\tchain postrouting {\n\t\ttype nat hook postrouting priority 100;\n${rules}\n\t}`);
        }

        blocks.push(`table ${family} nat {\n${chains.join('\n')}\n}`);
    };

    natTable('ip', 'ipv4', config.lans.filter((lan) => lan.nat44).map((lan) => lan.name));
    // nat66 AND pd-server masquerade to the WAN (both hand out ULA, which needs NAT to
    // reach the internet); `pd` routes an upstream GUA prefix with no NAT.
    natTable('ip6', 'ipv6', config.lans.filter((lan) => lan.ipv6Mode === 'nat66' || lan.ipv6Mode === 'pd-server').map((lan) => lan.name));

    const sysctls: NftablesSysctl[] = [];

    if (config.forward) {
        sysctls.push({key: 'net.ipv4.ip_forward', value: '1'});

        if (config.lans.some((lan) => lan.ipv6Mode !== 'off')) {
            sysctls.push({key: 'net.ipv6.conf.all.forwarding', value: '1'});
        }
    }

    return {ruleset: blocks.join('\n\n'), sysctls: sysctls};
};

/**
 * A network interface as far as the resolver cares (its OS name, router role and
 * enabled state) — the shape of the relevant {@link NetworkInterface} fields.
 */
export type NftablesInterfaceInput = {
    name: string;
    role: string;
    disable: boolean;
    nat44_enabled: boolean;
    ipv6_mode: string;
};

/**
 * The NAT policy fields the resolver cares about — the shape of {@link NatPolicy}. NAT44
 * + the IPv6 mode are now per-interface; only `forward_enabled` stays router-wide.
 */
export type NftablesPolicyInput = {forward_enabled: boolean;};

/**
 * The valid IPv6 modes; anything else resolves to `off` defensively.
 */
const IPV6_MODES = new Set(['off', 'nat66', 'pd', 'pd-server']);

/**
 * Resolve the persisted router state (network interfaces + NAT policy) into the pure
 * {@link NftablesRouterConfig} the ruleset generator consumes (Pi-router epic). The WAN
 * interface is the first enabled `wan`-role interface (empty if none); each enabled
 * `lan`-role interface becomes a LAN entry carrying its OWN NAT44 + IPv6 mode (an unknown
 * mode resolves to `off` defensively). A null policy resolves forwarding off. Pure — the
 * backend feeds it the DB rows and serves the result to the netdevice part.
 * @param interfaces - the node's network interfaces
 * @param policy - the node's NAT policy (or null if unset)
 */
export const resolveNftablesRouterConfig = (
    interfaces: readonly NftablesInterfaceInput[],
    policy: NftablesPolicyInput | null,
    forwards: readonly PortForwardInput[] = []
): NftablesRouterConfig => {
    const enabled = interfaces.filter((iface) => !iface.disable);
    const wan = enabled.find((iface) => iface.role === 'wan');

    return {
        wanInterface: wan?.name ?? '',
        lans: enabled
            .filter((iface) => iface.role === 'lan')
            .map((iface) => ({
                name: iface.name,
                nat44: iface.nat44_enabled,
                ipv6Mode: (IPV6_MODES.has(iface.ipv6_mode) ? iface.ipv6_mode : 'off') as NftablesLan['ipv6Mode']
            })),
        // A router forwards by default: with no policy row yet, routing is ON (the box's
        // whole purpose). An explicit policy row still wins — set forward_enabled=false to
        // deliberately block LAN→WAN. (The netfilter addon expresses "off" as scoped
        // LAN→WAN drops, not a blanket forward DROP, so Docker/foreign traffic is safe.)
        forward: policy?.forward_enabled ?? true,
        forwards: resolvePortForwards(forwards)
    };
};

/**
 * A persisted port-forward rule as the resolver cares about it — the shape of the relevant
 * {@link PortForward} fields.
 */
export type PortForwardInput = {
    proto: string;
    wan_port: number;
    wan_port_end: number;
    family: string;
    target_type: string;
    target_host: string;
    target_port: number;
    enabled: boolean;
};

/**
 * Expand persisted port-forward rows into the CONCRETE {@link NftablesForward} entries the
 * ruleset/native applier consume: skip disabled/invalid rules, expand `both` proto into
 * tcp+udp, DERIVE the family from the target address (a host is one family; router pinholes
 * are dual-stack), and resolve the WAN range + "0 = same port" default. A `host` rule needs
 * a target host. Pure.
 * @param rules - the persisted rules
 */
export const resolvePortForwards = (rules: readonly PortForwardInput[]): NftablesForward[] => {
    const out: NftablesForward[] = [];

    for (const rule of rules) {
        if (!rule.enabled || !Number.isInteger(rule.wan_port) || rule.wan_port <= 0 || rule.wan_port > 65535) {
            continue;
        }

        const targetType = rule.target_type === 'router' ? 'router' : 'host';

        if (targetType === 'host' && rule.target_host === '') {
            continue;
        }

        const protos: ('tcp' | 'udp')[] = rule.proto === 'both' ? ['tcp', 'udp'] : rule.proto === 'udp' ? ['udp'] : ['tcp'];
        // A host DNAT's family is DERIVED from the target address (a host is one family), so
        // a wrongly-stored `family` can never produce an invalid rule. A router pinhole is
        // dual-stack, emitted once with family 'ipv4' as a placeholder the input rule ignores.
        const family: 'ipv4' | 'ipv6' = targetType === 'router'
            ? 'ipv4'
            : (rule.target_host.includes(':') ? 'ipv6' : 'ipv4');

        // Resolve the "0 = same as the WAN port" default HERE so every consumer (preview
        // generator + native applier) gets a concrete port and can't diverge.
        const hostPort = targetType === 'host'
            ? (rule.target_port > 0 ? rule.target_port : rule.wan_port)
            : 0;

        // A valid range needs end > start and end within bounds; otherwise it is a single
        // port (0). A range is forwarded 1:1, so hostPort is irrelevant for it.
        const wanPortEnd = rule.wan_port_end > rule.wan_port && rule.wan_port_end <= 65535
            ? rule.wan_port_end
            : 0;

        for (const proto of protos) {
            out.push({
                proto: proto,
                family: family,
                wanPort: rule.wan_port,
                wanPortEnd: wanPortEnd,
                targetType: targetType,
                host: targetType === 'host' ? rule.target_host : '',
                hostPort: hostPort
            });
        }
    }

    return out;
};