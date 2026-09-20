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
     * → WAN) or `pd` (route the delegated prefix — forwarding only, no NAT).
     */
    ipv6Mode: 'off' | 'nat66' | 'pd';
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
 *   foreign routing, so `forward` is expressed by SCOPING: when routing is OFF, explicit
 *   `iifname <lan> oifname <wan> drop` rules block LAN→WAN while leaving other traffic
 *   alone; when ON, the chain is a permissive no-op. Mirrors the native applier.
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
    const blocks: string[] = [];

    {
        const forwardRules = ['\t\ttype filter hook forward priority 0; policy accept;'];

        // Routing OFF: drop new LAN→WAN specifically (Docker/foreign traffic untouched).
        if (!config.forward && hasWan) {
            for (const lan of config.lans) {
                forwardRules.push(`\t\tiifname "${lan.name}" oifname "${config.wanInterface}" drop`);
            }
        }

        blocks.push(`table inet filter {\n\tchain forward {\n${forwardRules.join('\n')}\n\t}\n}`);
    }

    const natTable = (family: string, lanNames: string[]): void => {
        if (!hasWan || lanNames.length === 0) {
            return;
        }

        const rules = lanNames
            .map((lan) => `\t\tiifname "${lan}" oifname "${config.wanInterface}" masquerade`)
            .join('\n');

        blocks.push(`table ${family} nat {\n\tchain postrouting {\n\t\ttype nat hook postrouting priority 100;\n${rules}\n\t}\n}`);
    };

    natTable('ip', config.lans.filter((lan) => lan.nat44).map((lan) => lan.name));
    natTable('ip6', config.lans.filter((lan) => lan.ipv6Mode === 'nat66').map((lan) => lan.name));

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
const IPV6_MODES = new Set(['off', 'nat66', 'pd']);

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
    policy: NftablesPolicyInput | null
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
        forward: policy?.forward_enabled ?? true
    };
};