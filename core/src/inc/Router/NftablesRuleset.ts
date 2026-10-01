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