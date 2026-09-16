/**
 * Tests for the router nftables ruleset generator (Pi-router epic, Phase 2): a full
 * dual-stack NAT router emits the forward filter + ip/ip6 masquerade + both forwarding
 * sysctls; DHCPv6-PD mode routes IPv6 without a nat66 table; ipv6 `off` emits no IPv6
 * forwarding; forwarding off emits no forward chain/sysctls; a missing WAN skips NAT;
 * and each LAN interface gets its own forward rule. Pure/data-level, network-free.
 */
import {buildNftablesRuleset, NftablesRouterConfig, resolveNftablesRouterConfig} from 'flyingfish_core';

const base: NftablesRouterConfig = {
    wanInterface: 'eth0',
    lanInterfaces: ['eth1'],
    nat44: true,
    ipv6Mode: 'nat66',
    forward: true
};

const sysctlMap = (result: ReturnType<typeof buildNftablesRuleset>): Record<string, string> =>
    Object.fromEntries(result.sysctls.map((sysctl) => [sysctl.key, sysctl.value]));

describe('buildNftablesRuleset', () => {
    test('full dual-stack NAT router: forward filter + ip + ip6 masquerade + both sysctls', () => {
        const result = buildNftablesRuleset(base);

        expect(result.ruleset).toContain('table inet filter');
        expect(result.ruleset).toContain('iifname "eth1" oifname "eth0" accept');
        expect(result.ruleset).toContain('ct state established,related accept');
        expect(result.ruleset).toContain('policy drop;');
        expect(result.ruleset).toContain('table ip nat');
        expect(result.ruleset).toContain('table ip6 nat');
        expect(result.ruleset).toContain('oifname "eth0" masquerade');

        expect(sysctlMap(result)).toEqual({
            'net.ipv4.ip_forward': '1',
            'net.ipv6.conf.all.forwarding': '1'
        });
    });

    test('DHCPv6-PD mode routes IPv6 with NO nat66 table, but forwarding stays on', () => {
        const result = buildNftablesRuleset({...base, ipv6Mode: 'pd'});

        expect(result.ruleset).toContain('table ip nat');
        expect(result.ruleset).not.toContain('table ip6 nat');
        // IPv6 forwarding still needed to route the delegated prefix
        expect(sysctlMap(result)['net.ipv6.conf.all.forwarding']).toBe('1');
    });

    test('ipv6 off: no ip6 nat table and no ipv6 forwarding sysctl', () => {
        const result = buildNftablesRuleset({...base, ipv6Mode: 'off'});

        expect(result.ruleset).not.toContain('table ip6 nat');
        expect(sysctlMap(result)['net.ipv6.conf.all.forwarding']).toBeUndefined();
        expect(sysctlMap(result)['net.ipv4.ip_forward']).toBe('1');
    });

    test('nat44 off: no ip nat table', () => {
        const result = buildNftablesRuleset({...base, nat44: false, ipv6Mode: 'off'});

        expect(result.ruleset).not.toContain('table ip nat');
        expect(result.ruleset).toContain('table inet filter');
    });

    test('forwarding off: no forward chain and no sysctls', () => {
        const result = buildNftablesRuleset({...base, forward: false});

        expect(result.ruleset).not.toContain('table inet filter');
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

    test('multiple LAN interfaces each get a forward rule', () => {
        const result = buildNftablesRuleset({...base, lanInterfaces: ['eth1', 'eth2']});

        expect(result.ruleset).toContain('iifname "eth1" oifname "eth0" accept');
        expect(result.ruleset).toContain('iifname "eth2" oifname "eth0" accept');
    });
});

describe('resolveNftablesRouterConfig', () => {
    test('resolves WAN/LAN from roles + policy flags, skipping disabled interfaces', () => {
        const config = resolveNftablesRouterConfig(
            [
                {name: 'eth0', role: 'wan', disable: false},
                {name: 'eth1', role: 'lan', disable: false},
                {name: 'eth2', role: 'lan', disable: true},
                {name: 'eth3', role: 'unassigned', disable: false}
            ],
            {nat44_enabled: true, ipv6_mode: 'pd', forward_enabled: true}
        );

        expect(config).toEqual({
            wanInterface: 'eth0',
            lanInterfaces: ['eth1'],
            nat44: true,
            ipv6Mode: 'pd',
            forward: true
        });
    });

    test('a null policy resolves to a safe all-off config', () => {
        const config = resolveNftablesRouterConfig([{name: 'eth0', role: 'wan', disable: false}], null);

        expect(config).toEqual({wanInterface: 'eth0', lanInterfaces: [], nat44: false, ipv6Mode: 'off', forward: false});
    });

    test('an unknown ipv6 mode falls back to off; no WAN role → empty wanInterface', () => {
        const config = resolveNftablesRouterConfig(
            [{name: 'eth1', role: 'lan', disable: false}],
            {nat44_enabled: false, ipv6_mode: 'bogus', forward_enabled: true}
        );

        expect(config.ipv6Mode).toBe('off');
        expect(config.wanInterface).toBe('');
        expect(config.lanInterfaces).toEqual(['eth1']);
    });
});