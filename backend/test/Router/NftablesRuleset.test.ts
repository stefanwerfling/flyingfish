/**
 * Tests for the router nftables ruleset generator (Pi-router epic; per-LAN NAT for UI v2):
 * NAT is per LAN, so each LAN emits its own scoped masquerade rule and two LANs can differ
 * (one nat66, one pd). Also covers the forward filter, forwarding sysctls, missing WAN, and
 * the resolver building per-LAN config from interface rows. Pure/data-level, network-free.
 */
import {buildNftablesRuleset, NftablesRouterConfig, resolveNftablesRouterConfig, resolvePortForwards} from 'flyingfish_core';

const base: NftablesRouterConfig = {
    wanInterface: 'eth0',
    lans: [{name: 'eth1', nat44: true, ipv6Mode: 'nat66'}],
    forward: true
};

const sysctlMap = (result: ReturnType<typeof buildNftablesRuleset>): Record<string, string> =>
    Object.fromEntries(result.sysctls.map((sysctl) => [sysctl.key, sysctl.value]));

describe('buildNftablesRuleset', () => {
    test('full dual-stack NAT router: forward filter + ip + ip6 per-LAN masquerade + both sysctls', () => {
        const result = buildNftablesRuleset(base);

        expect(result.ruleset).toContain('table inet filter');
        // Routing ON: the forward chain has no scoped LAN→WAN drop rule (accept policy).
        expect(result.ruleset).toContain('policy accept;');
        expect(result.ruleset).not.toContain(`oifname "${base.wanInterface}" drop`);
        expect(result.ruleset).toContain('table ip nat');
        expect(result.ruleset).toContain('table ip6 nat');
        expect(result.ruleset).toContain('iifname "eth1" oifname "eth0" masquerade');

        expect(sysctlMap(result)).toEqual({
            'net.ipv4.ip_forward': '1',
            'net.ipv6.conf.all.forwarding': '1'
        });
    });

    test('DHCPv6-PD mode routes IPv6 with NO nat66 table, but forwarding stays on', () => {
        const result = buildNftablesRuleset({...base, lans: [{name: 'eth1', nat44: true, ipv6Mode: 'pd'}]});

        expect(result.ruleset).toContain('table ip nat');
        expect(result.ruleset).not.toContain('table ip6 nat');
        // IPv6 forwarding still needed to route the delegated prefix
        expect(sysctlMap(result)['net.ipv6.conf.all.forwarding']).toBe('1');
    });

    test('ipv6 off: no ip6 nat table and no ipv6 forwarding sysctl', () => {
        const result = buildNftablesRuleset({...base, lans: [{name: 'eth1', nat44: true, ipv6Mode: 'off'}]});

        expect(result.ruleset).not.toContain('table ip6 nat');
        expect(sysctlMap(result)['net.ipv6.conf.all.forwarding']).toBeUndefined();
        expect(sysctlMap(result)['net.ipv4.ip_forward']).toBe('1');
    });

    test('nat44 off: no ip nat table', () => {
        const result = buildNftablesRuleset({...base, lans: [{name: 'eth1', nat44: false, ipv6Mode: 'off'}]});

        expect(result.ruleset).not.toContain('table ip nat');
        expect(result.ruleset).toContain('table inet filter');
    });

    test('forwarding off: filter chain with scoped LAN→WAN drop, no sysctls', () => {
        const result = buildNftablesRuleset({...base, forward: false});

        // The chain is still installed (accept policy) but blocks LAN→WAN specifically,
        // so Docker/foreign forwarding is untouched while routing is genuinely off.
        expect(result.ruleset).toContain('policy accept;');
        expect(result.ruleset).toContain('iifname "eth1" oifname "eth0" drop');
        expect(result.sysctls).toEqual([]);
        // NAT tables still emitted (they do not depend on the forward chain)
        expect(result.ruleset).toContain('table ip nat');
    });

    test('no WAN interface: NAT tables are skipped even when enabled', () => {
        const result = buildNftablesRuleset({...base, wanInterface: ''});

        expect(result.ruleset).not.toContain('table ip nat');
        expect(result.ruleset).not.toContain('table ip6 nat');
        // forward chain still present but without a LAN→WAN accept rule
        expect(result.ruleset).toContain('table inet filter');
        expect(result.ruleset).not.toContain('oifname');
    });

    test('input firewall: WAN unsolicited TCP+UDP dropped, DHCP-client + established + lo allowed', () => {
        const result = buildNftablesRuleset(base);

        expect(result.ruleset).toContain('chain input {');
        expect(result.ruleset).toContain('type filter hook input priority 0; policy accept;');
        expect(result.ruleset).toContain('ct state established,related accept');
        expect(result.ruleset).toContain('iifname "lo" accept');
        // WAN's own DHCP client kept working, then unsolicited TCP+UDP dropped on the WAN.
        expect(result.ruleset).toContain('iifname "eth0" udp dport { 68, 546 } accept');
        expect(result.ruleset).toContain('iifname "eth0" meta l4proto tcp drop');
        expect(result.ruleset).toContain('iifname "eth0" meta l4proto udp drop');
    });

    test('input firewall with no WAN: chain present but no WAN drops', () => {
        const result = buildNftablesRuleset({...base, wanInterface: ''});

        expect(result.ruleset).toContain('chain input {');
        expect(result.ruleset).toContain('iifname "lo" accept');
        expect(result.ruleset).not.toContain('l4proto tcp drop');
    });

    test('routing off with multiple LANs: each LAN gets its own scoped drop rule', () => {
        const result = buildNftablesRuleset({
            ...base,
            forward: false,
            lans: [{name: 'eth1', nat44: true, ipv6Mode: 'nat66'}, {name: 'eth2', nat44: true, ipv6Mode: 'nat66'}]
        });

        expect(result.ruleset).toContain('iifname "eth1" oifname "eth0" drop');
        expect(result.ruleset).toContain('iifname "eth2" oifname "eth0" drop');
    });

    test('per-LAN NAT differs: only the nat66 LAN gets an ip6 masquerade; ip nat covers both', () => {
        const result = buildNftablesRuleset({
            wanInterface: 'eth0',
            lans: [{name: 'eth1', nat44: true, ipv6Mode: 'nat66'}, {name: 'wlan0', nat44: true, ipv6Mode: 'pd'}],
            forward: true
        });

        const ip4 = result.ruleset.slice(result.ruleset.indexOf('table ip nat'), result.ruleset.indexOf('table ip6 nat'));
        const ip6 = result.ruleset.slice(result.ruleset.indexOf('table ip6 nat'));

        // IPv4 masquerades BOTH LANs
        expect(ip4).toContain('iifname "eth1" oifname "eth0" masquerade');
        expect(ip4).toContain('iifname "wlan0" oifname "eth0" masquerade');
        // IPv6 masquerades only the nat66 LAN, not the pd one
        expect(ip6).toContain('iifname "eth1" oifname "eth0" masquerade');
        expect(ip6).not.toContain('wlan0');
    });
});

describe('buildNftablesRuleset — port forwarding & pinholes (Phase 2)', () => {
    test('host DNAT (ipv4): prerouting dnat in the ip nat table, ip6 untouched', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 8080, targetType: 'host', host: '10.103.0.50', hostPort: 80}
            ]
        });

        const ip4 = result.ruleset.slice(result.ruleset.indexOf('table ip nat'), result.ruleset.indexOf('table ip6 nat'));

        expect(ip4).toContain('chain prerouting {');
        expect(ip4).toContain('type nat hook prerouting priority -100;');
        expect(ip4).toContain('iifname "eth0" tcp dport 8080 dnat to 10.103.0.50:80');
        // the ip6 table carries no dnat for an ipv4 rule
        expect(result.ruleset.slice(result.ruleset.indexOf('table ip6 nat'))).not.toContain('dnat to');
    });

    test('host DNAT (ipv6): bracketed dnat destination in the ip6 nat table', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv6', wanPort: 443, targetType: 'host', host: 'fd00:50:1::10', hostPort: 443}
            ]
        });

        const ip6 = result.ruleset.slice(result.ruleset.indexOf('table ip6 nat'));

        expect(ip6).toContain('chain prerouting {');
        expect(ip6).toContain('iifname "eth0" tcp dport 443 dnat to [fd00:50:1::10]:443');
    });

    test('host DNAT (udp, single port): dnat to the resolved host port', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'udp', family: 'ipv4', wanPort: 51820, wanPortEnd: 0, targetType: 'host', host: '10.103.0.7', hostPort: 51820}
            ]
        });

        expect(result.ruleset).toContain('iifname "eth0" udp dport 51820 dnat to 10.103.0.7:51820');
    });

    test('host DNAT range: portless 1:1 dnat + range dport match in prerouting and forward', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 8000, wanPortEnd: 8010, targetType: 'host', host: '10.103.0.60', hostPort: 0}
            ]
        });

        // prerouting: match the range, DNAT portless so each WAN port maps 1:1 to the host
        expect(result.ruleset).toContain('iifname "eth0" tcp dport 8000-8010 dnat to 10.103.0.60');
        expect(result.ruleset).not.toContain('dnat to 10.103.0.60:');
        // forward: accept the range to the host (dport unchanged by a portless dnat)
        const forward = result.ruleset.slice(0, result.ruleset.indexOf('chain input {'));
        expect(forward).toContain('iifname "eth0" ip daddr 10.103.0.60 tcp dport 8000-8010 accept');
    });

    test('router pinhole range: input accept for the whole range', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'udp', family: 'ipv4', wanPort: 27000, wanPortEnd: 27100, targetType: 'router', host: '', hostPort: 0}
            ]
        });

        expect(result.ruleset).toContain('iifname "eth0" udp dport 27000-27100 accept');
    });

    test('router pinhole: dual-stack input accept BEFORE the WAN drops, no DNAT table', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 22, targetType: 'router', host: '', hostPort: 0}
            ]
        });

        const input = result.ruleset.slice(result.ruleset.indexOf('chain input {'));
        const acceptIdx = input.indexOf('iifname "eth0" tcp dport 22 accept');
        const dropIdx = input.indexOf('meta l4proto tcp drop');

        expect(acceptIdx).toBeGreaterThan(-1);
        // the pinhole must precede the blanket TCP drop, else it never matches
        expect(acceptIdx).toBeLessThan(dropIdx);
        // a router pinhole is dual-stack: no nfproto scoping
        expect(input).not.toContain('meta nfproto');
    });

    test('a port forward needs a WAN: no WAN → no dnat table', () => {
        const result = buildNftablesRuleset({
            ...base,
            wanInterface: '',
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 8080, targetType: 'host', host: '10.103.0.50', hostPort: 80}
            ]
        });

        expect(result.ruleset).not.toContain('dnat to');
    });

    test('WAN→LAN firewall: stateful accept + per-LAN drop present even with routing ON', () => {
        const result = buildNftablesRuleset(base);
        const forward = result.ruleset.slice(0, result.ruleset.indexOf('chain input {'));

        // return traffic accepted (scoped to the WAN ingress so LAN→WAN stays governed by
        // the routing toggle), and new WAN→LAN dropped per LAN so hosts aren't exposed.
        expect(forward).toContain('iifname "eth0" ct state established,related accept');
        expect(forward).toContain('iifname "eth0" oifname "eth1" drop');
    });

    test('host forward: a scoped daddr accept precedes the WAN→LAN drop (else it never matches)', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 8080, targetType: 'host', host: '10.103.0.50', hostPort: 80}
            ]
        });
        const forward = result.ruleset.slice(0, result.ruleset.indexOf('chain input {'));

        const acceptIdx = forward.indexOf('iifname "eth0" ip daddr 10.103.0.50 tcp dport 80 accept');
        const dropIdx = forward.indexOf('iifname "eth0" oifname "eth1" drop');

        expect(acceptIdx).toBeGreaterThan(-1);
        expect(acceptIdx).toBeLessThan(dropIdx);
    });

    test('a router pinhole gets NO forward accept (it is input, not forwarded)', () => {
        const result = buildNftablesRuleset({
            ...base,
            forwards: [
                {proto: 'tcp', family: 'ipv4', wanPort: 22, targetType: 'router', host: '', hostPort: 0}
            ]
        });
        const forward = result.ruleset.slice(0, result.ruleset.indexOf('chain input {'));

        expect(forward).not.toContain('daddr');
    });
});

describe('resolvePortForwards', () => {
    test('expands proto=both into tcp+udp; family is DERIVED from the target address', () => {
        // a v4 host → both entries are ipv4 (family=both is ignored; a host is one family)
        const v4 = resolvePortForwards([
            {proto: 'both', wan_port: 80, wan_port_end: 0, family: 'both', target_type: 'host', target_host: '10.0.0.5', target_port: 8080, enabled: true}
        ]);

        expect(v4).toHaveLength(2);
        expect(v4).toContainEqual({proto: 'tcp', family: 'ipv4', wanPort: 80, wanPortEnd: 0, targetType: 'host', host: '10.0.0.5', hostPort: 8080});
        expect(v4).toContainEqual({proto: 'udp', family: 'ipv4', wanPort: 80, wanPortEnd: 0, targetType: 'host', host: '10.0.0.5', hostPort: 8080});
    });

    test('a v6 target address yields family ipv6 even if the row says ipv4', () => {
        const out = resolvePortForwards([
            {proto: 'tcp', wan_port: 443, wan_port_end: 0, family: 'ipv4', target_type: 'host', target_host: 'fd00:50:1::10', target_port: 443, enabled: true}
        ]);

        expect(out).toHaveLength(1);
        expect(out[0].family).toBe('ipv6');
    });

    test('a valid WAN range is carried through; an invalid one collapses to a single port', () => {
        const out = resolvePortForwards([
            {proto: 'tcp', wan_port: 8000, wan_port_end: 8010, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 0, enabled: true},
            {proto: 'tcp', wan_port: 9000, wan_port_end: 8000, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 0, enabled: true}
        ]);

        expect(out[0].wanPortEnd).toBe(8010);
        expect(out[1].wanPortEnd).toBe(0);
    });

    test('a router rule is emitted once per proto (family collapsed, dual-stack)', () => {
        const out = resolvePortForwards([
            {proto: 'both', wan_port: 22, family: 'both', target_type: 'router', target_host: '', target_port: 0, enabled: true}
        ]);

        expect(out).toHaveLength(2);
        expect(out.every((entry) => entry.targetType === 'router' && entry.host === '' && entry.hostPort === 0)).toBe(true);
    });

    test('resolves target_port 0 to the WAN port (the "0 = same port" default)', () => {
        const out = resolvePortForwards([
            {proto: 'tcp', wan_port: 51820, family: 'ipv4', target_type: 'host', target_host: '10.0.0.7', target_port: 0, enabled: true}
        ]);

        expect(out).toHaveLength(1);
        expect(out[0].hostPort).toBe(51820);
    });

    test('keeps an explicit target_port distinct from the WAN port', () => {
        const out = resolvePortForwards([
            {proto: 'tcp', wan_port: 8080, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 80, enabled: true}
        ]);

        expect(out[0].hostPort).toBe(80);
    });

    test('skips disabled rules, out-of-range ports and host rules with no target host', () => {
        const out = resolvePortForwards([
            {proto: 'tcp', wan_port: 80, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 80, enabled: false},
            {proto: 'tcp', wan_port: 0, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 80, enabled: true},
            {proto: 'tcp', wan_port: 70000, family: 'ipv4', target_type: 'host', target_host: '10.0.0.5', target_port: 80, enabled: true},
            {proto: 'tcp', wan_port: 80, family: 'ipv4', target_type: 'host', target_host: '', target_port: 80, enabled: true}
        ]);

        expect(out).toEqual([]);
    });
});

describe('resolveNftablesRouterConfig', () => {
    test('builds per-LAN NAT from interface fields, skipping disabled interfaces', () => {
        const config = resolveNftablesRouterConfig(
            [
                {name: 'eth0', role: 'wan', disable: false, nat44_enabled: false, ipv6_mode: 'off'},
                {name: 'eth1', role: 'lan', disable: false, nat44_enabled: true, ipv6_mode: 'nat66'},
                {name: 'wlan0', role: 'lan', disable: false, nat44_enabled: true, ipv6_mode: 'pd'},
                {name: 'eth2', role: 'lan', disable: true, nat44_enabled: true, ipv6_mode: 'nat66'},
                {name: 'eth3', role: 'unassigned', disable: false, nat44_enabled: false, ipv6_mode: 'off'}
            ],
            {forward_enabled: true}
        );

        expect(config).toEqual({
            wanInterface: 'eth0',
            lans: [
                {name: 'eth1', nat44: true, ipv6Mode: 'nat66'},
                {name: 'wlan0', nat44: true, ipv6Mode: 'pd'}
            ],
            forward: true,
            forwards: []
        });
    });

    test('a null policy resolves forwarding ON (a router forwards by default)', () => {
        const config = resolveNftablesRouterConfig(
            [{name: 'eth0', role: 'wan', disable: false, nat44_enabled: false, ipv6_mode: 'off'}],
            null
        );

        expect(config).toEqual({wanInterface: 'eth0', lans: [], forward: true, forwards: []});
    });

    test('an unknown ipv6 mode on a LAN falls back to off; no WAN role → empty wanInterface', () => {
        const config = resolveNftablesRouterConfig(
            [{name: 'eth1', role: 'lan', disable: false, nat44_enabled: false, ipv6_mode: 'bogus'}],
            {forward_enabled: true}
        );

        expect(config.wanInterface).toBe('');
        expect(config.lans).toEqual([{name: 'eth1', nat44: false, ipv6Mode: 'off'}]);
    });
});
