/**
 * Tests for CIDR membership (Pi-router epic, Phase 5), which gates the dnsserver caching
 * resolver to internal source addresses only. Covers IPv4 + IPv6 (incl. `::` and
 * IPv4-mapped), prefix boundaries, family mismatch and malformed input. Pure.
 */
import {ipInCidr, ipInCidrRanges, ipToBytes} from 'flyingfish_core';

describe('ipToBytes', () => {
    test('parses IPv4 and IPv6 (with :: expansion + mapped v4)', () => {
        expect(ipToBytes('192.168.1.1')).toEqual([192, 168, 1, 1]);
        expect(ipToBytes('::1')).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
        expect(ipToBytes('fd00::')?.slice(0, 2)).toEqual([0xfd, 0x00]);
        expect(ipToBytes('::ffff:192.168.0.1')?.slice(12)).toEqual([192, 168, 0, 1]);
    });

    test('rejects malformed addresses', () => {
        expect(ipToBytes('192.168.1')).toBeNull();
        expect(ipToBytes('192.168.1.256')).toBeNull();
        expect(ipToBytes('1::2::3')).toBeNull();
        expect(ipToBytes('nope')).toBeNull();
    });
});

describe('ipInCidr', () => {
    test('IPv4 membership + prefix boundaries', () => {
        expect(ipInCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
        expect(ipInCidr('192.168.2.50', '192.168.1.0/24')).toBe(false);
        expect(ipInCidr('10.9.8.7', '10.0.0.0/8')).toBe(true);
        expect(ipInCidr('192.168.1.130', '192.168.1.128/25')).toBe(true);
        expect(ipInCidr('192.168.1.126', '192.168.1.128/25')).toBe(false);
        expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
    });

    test('IPv6 membership (ULA)', () => {
        expect(ipInCidr('fd12:3456::1', 'fd00::/8')).toBe(true);
        expect(ipInCidr('fc00::1', 'fd00::/8')).toBe(false);
        expect(ipInCidr('2003:dead:beef::5', '2003:dead:beef::/48')).toBe(true);
    });

    test('family mismatch and malformed cidr are false', () => {
        expect(ipInCidr('192.168.1.1', 'fd00::/8')).toBe(false);
        expect(ipInCidr('fd00::1', '192.168.1.0/24')).toBe(false);
        expect(ipInCidr('192.168.1.1', '192.168.1.0')).toBe(false);
        expect(ipInCidr('192.168.1.1', '192.168.1.0/33')).toBe(false);
    });
});

describe('ipInCidrRanges', () => {
    test('true if the ip is in any range', () => {
        const ranges = ['192.168.0.0/16', 'fd00::/8'];

        expect(ipInCidrRanges('192.168.5.5', ranges)).toBe(true);
        expect(ipInCidrRanges('fd00::abcd', ranges)).toBe(true);
        expect(ipInCidrRanges('8.8.8.8', ranges)).toBe(false);
        expect(ipInCidrRanges('8.8.8.8', [])).toBe(false);
    });
});