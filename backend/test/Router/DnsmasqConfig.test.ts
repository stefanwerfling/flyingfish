/**
 * Tests for the dnsmasq LAN config generator + lease parser (Pi-router epic, Phase 4):
 * the generator disables dnsmasq DNS (port=0), scopes to the LAN interface, emits the
 * DHCPv4 range/router/dns-server and (when enabled) IPv6 RA with a dynamic-/64
 * constructor; disabled/no-interface yields ''. The lease parser reads the dnsmasq
 * lease-file lines (mac/ip/hostname/expiry, `*` hostname = none). Pure.
 */
import {buildDnsmasqConfig, DnsmasqConfig, parseDnsmasqLeases} from 'flyingfish_core';

const base: DnsmasqConfig = {
    lanInterface: 'eth1',
    enable: true,
    rangeStart: '192.168.1.100',
    rangeEnd: '192.168.1.200',
    leaseSeconds: 3600,
    gateway: '192.168.1.1',
    dnsServer: '192.168.1.1',
    domain: 'home.lan',
    raEnable: true,
    raInterval: 60,
    raRouterLifetime: 9000,
    leaseFile: '/var/lib/misc/dnsmasq.leases'
};

describe('buildDnsmasqConfig', () => {
    test('full LAN config: DNS off, DHCPv4 range/router/dns + IPv6 RA', () => {
        const conf = buildDnsmasqConfig(base);

        expect(conf).toContain('port=0');
        expect(conf).toContain('interface=eth1');
        expect(conf).toContain('bind-interfaces');
        expect(conf).toContain('dhcp-range=192.168.1.100,192.168.1.200,3600s');
        expect(conf).toContain('dhcp-option=option:router,192.168.1.1');
        expect(conf).toContain('dhcp-option=option:dns-server,192.168.1.1');
        expect(conf).toContain('domain=home.lan');
        expect(conf).toContain('enable-ra');
        expect(conf).toContain('dhcp-range=::,constructor:eth1,ra-names,slaac,3600s');
        expect(conf).toContain('ra-param=eth1,60,9000');
        expect(conf).toContain('dhcp-leasefile=/var/lib/misc/dnsmasq.leases');
    });

    test('RA off: no IPv6 range / enable-ra / ra-param', () => {
        const conf = buildDnsmasqConfig({...base, raEnable: false});

        expect(conf).not.toContain('enable-ra');
        expect(conf).not.toContain('constructor:');
        expect(conf).not.toContain('ra-param=');
        expect(conf).toContain('dhcp-range=192.168.1.100,192.168.1.200,3600s');
    });

    test('ra-param omitted when interval/lifetime are 0 (dnsmasq defaults)', () => {
        const conf = buildDnsmasqConfig({...base, raInterval: 0, raRouterLifetime: 0});

        expect(conf).toContain('enable-ra');
        expect(conf).not.toContain('ra-param=');
    });

    test('disabled or no LAN interface yields an empty config', () => {
        expect(buildDnsmasqConfig({...base, enable: false})).toBe('');
        expect(buildDnsmasqConfig({...base, lanInterface: ''})).toBe('');
    });

    test('omits optional lines when their values are empty', () => {
        const conf = buildDnsmasqConfig({...base, gateway: '', dnsServer: '', domain: '', rangeStart: '', rangeEnd: '', raEnable: false});

        expect(conf).not.toContain('option:router');
        expect(conf).not.toContain('option:dns-server');
        expect(conf).not.toContain('domain=');
        expect(conf).not.toContain('dhcp-range=');
        // still a valid scoped, DNS-off DHCP server shell
        expect(conf).toContain('port=0');
        expect(conf).toContain('interface=eth1');
    });
});

describe('parseDnsmasqLeases', () => {
    test('parses lease lines, mapping `*` hostname to empty', () => {
        const leases = parseDnsmasqLeases(
            '1700000000 aa:bb:cc:dd:ee:01 192.168.1.100 laptop 01:aa:bb:cc:dd:ee:01\n' +
            '1700000500 aa:bb:cc:dd:ee:02 192.168.1.101 * *\n'
        );

        expect(leases).toEqual([
            {mac_address: 'aa:bb:cc:dd:ee:01', ip_address: '192.168.1.100', hostname: 'laptop', expires: 1700000000},
            {mac_address: 'aa:bb:cc:dd:ee:02', ip_address: '192.168.1.101', hostname: '', expires: 1700000500}
        ]);
    });

    test('skips blank / malformed lines', () => {
        const leases = parseDnsmasqLeases('\n  \nbad line\n1700000000 aa:bb:cc:dd:ee:03 192.168.1.102 pc x\n');

        expect(leases).toHaveLength(1);
        expect(leases[0].ip_address).toBe('192.168.1.102');
    });
});