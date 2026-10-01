/**
 * Tests for the router netfilter config RESOLVER (Pi-router epic; per-LAN NAT for UI v2):
 * resolvePortForwards expands/validates inbound rules, and resolveNftablesRouterConfig
 * builds the per-LAN config from interface rows + NAT policy. The ruleset itself is
 * programmed by the native netfilter binding (flyingfish_netfilternft), not generated as
 * text here. Pure/data-level, network-free.
 */
import {resolveNftablesRouterConfig, resolvePortForwards} from 'flyingfish_core';

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
