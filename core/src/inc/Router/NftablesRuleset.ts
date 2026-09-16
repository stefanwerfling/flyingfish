/**
 * The router state the nftables ruleset is generated from (Pi-router epic, Phase 2):
 * the resolved WAN/LAN interface names + the NAT/routing policy. Pure input — resolved
 * by the caller from NetworkInterface roles + NatPolicy.
 */
export type NftablesRouterConfig = {
    /**
     * The WAN (uplink) interface name; empty disables all NAT (no masquerade target).
     */
    wanInterface: string;

    /**
     * The LAN (downlink) interface names.
     */
    lanInterfaces: string[];

    /**
     * Masquerade IPv4 LAN → WAN (NAT44).
     */
    nat44: boolean;

    /**
     * IPv6 mode: `off` (no IPv6 routing), `nat66` (masquerade IPv6 LAN → WAN) or `pd`
     * (route the delegated prefix — forwarding only, no NAT).
     */
    ipv6Mode: 'off' | 'nat66' | 'pd';

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
 * - A `table inet filter` forward chain (covers IPv4+IPv6) with a default DROP policy,
 *   accepting established/related and each LAN→WAN direction — only emitted when
 *   `forward` is on (otherwise routing is off and no forward chain is installed).
 * - `table ip nat` postrouting masquerade on the WAN when `nat44` is on.
 * - `table ip6 nat` postrouting masquerade on the WAN when `ipv6Mode === 'nat66'`
 *   (`pd` routes the delegated prefix with no NAT; `off` emits neither).
 * - NAT tables need a WAN interface; with none, the NAT tables are skipped.
 * - sysctls: `net.ipv4.ip_forward=1` when forwarding; `net.ipv6.conf.all.forwarding=1`
 *   when forwarding and IPv6 is not `off`.
 * @param config - the resolved router config
 */
export const buildNftablesRuleset = (config: NftablesRouterConfig): NftablesRuleset => {
    const hasWan = config.wanInterface !== '';
    const blocks: string[] = [];

    if (config.forward) {
        const forwardRules = ['\t\ttype filter hook forward priority 0; policy drop;', '\t\tct state established,related accept'];

        if (hasWan) {
            for (const lan of config.lanInterfaces) {
                forwardRules.push(`\t\tiifname "${lan}" oifname "${config.wanInterface}" accept`);
            }
        }

        blocks.push(`table inet filter {\n\tchain forward {\n${forwardRules.join('\n')}\n\t}\n}`);
    }

    if (hasWan && config.nat44) {
        blocks.push(`table ip nat {\n\tchain postrouting {\n\t\ttype nat hook postrouting priority 100;\n\t\toifname "${config.wanInterface}" masquerade\n\t}\n}`);
    }

    if (hasWan && config.ipv6Mode === 'nat66') {
        blocks.push(`table ip6 nat {\n\tchain postrouting {\n\t\ttype nat hook postrouting priority 100;\n\t\toifname "${config.wanInterface}" masquerade\n\t}\n}`);
    }

    const sysctls: NftablesSysctl[] = [];

    if (config.forward) {
        sysctls.push({key: 'net.ipv4.ip_forward', value: '1'});

        if (config.ipv6Mode !== 'off') {
            sysctls.push({key: 'net.ipv6.conf.all.forwarding', value: '1'});
        }
    }

    return {ruleset: blocks.join('\n\n'), sysctls: sysctls};
};