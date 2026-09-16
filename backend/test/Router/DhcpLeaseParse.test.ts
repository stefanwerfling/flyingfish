/**
 * Tests for the udhcpc WAN lease parser (Pi-router epic, Phase 3): netmask→CIDR
 * conversion and parsing a udhcpc hook environment into the WAN lease fields (gateway =
 * first router, dns space→comma, lease coerced, defensive on a partial env). Pure.
 */
import {netmaskToPrefix, parseUdhcpcLease} from 'flyingfish_core';

describe('netmaskToPrefix', () => {
    test('converts common dotted netmasks to CIDR prefixes', () => {
        expect(netmaskToPrefix('255.255.255.0')).toBe(24);
        expect(netmaskToPrefix('255.255.255.128')).toBe(25);
        expect(netmaskToPrefix('255.255.0.0')).toBe(16);
        expect(netmaskToPrefix('0.0.0.0')).toBe(0);
    });

    test('returns 0 on a malformed netmask', () => {
        expect(netmaskToPrefix('')).toBe(0);
        expect(netmaskToPrefix('255.255.255')).toBe(0);
        expect(netmaskToPrefix('255.255.255.256')).toBe(0);
        expect(netmaskToPrefix('nope')).toBe(0);
    });
});

describe('parseUdhcpcLease', () => {
    test('parses a full udhcpc bound environment', () => {
        const lease = parseUdhcpcLease({
            interface: 'eth0',
            ip: '203.0.113.10',
            subnet: '255.255.255.0',
            router: '203.0.113.1 203.0.113.2',
            dns: '203.0.113.1 8.8.8.8',
            lease: '86400'
        });

        expect(lease).toEqual({
            interface: 'eth0',
            ipv4_address: '203.0.113.10',
            ipv4_prefix: 24,
            gateway: '203.0.113.1',
            dns_servers: '203.0.113.1,8.8.8.8',
            ipv6_prefix: '',
            lease_seconds: 86400
        });
    });

    test('carries a DHCPv6-PD prefix through when present', () => {
        const lease = parseUdhcpcLease({interface: 'eth0', ip: '203.0.113.10', ipv6_prefix: '2003:dead:beef::/64'});
        expect(lease.ipv6_prefix).toBe('2003:dead:beef::/64');
    });

    test('is defensive on a partial / empty environment', () => {
        const lease = parseUdhcpcLease({});

        expect(lease).toEqual({
            interface: '',
            ipv4_address: '',
            ipv4_prefix: 0,
            gateway: '',
            dns_servers: '',
            ipv6_prefix: '',
            lease_seconds: 0
        });
    });
});