/**
 * Unit tests for the PROXY protocol v2 codec (Cluster/Mesh epic 9.5.3). Covers the
 * exact binary layout (signature, version+command, family, block length), a TCP4
 * and TCP6 round-trip, IPv4-mapped-IPv6 normalisation, and rejection of malformed
 * headers. Pure byte manipulation, network-free.
 */
import {ClusterProxyProtocolV2} from 'flyingfish_core';

const SIGNATURE = [0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a];

/**
 * Read a big-endian uint16 at an offset (without bitwise ops).
 * @param bytes - the buffer
 * @param offset - the byte offset
 */
const u16 = (bytes: Uint8Array, offset: number): number =>
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, false);

describe('ClusterProxyProtocolV2', () => {
    test('encodes a TCP4 header with the correct signature, family and layout', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '203.0.113.7', port: 51234}, {host: '10.0.0.5', port: 443});

        // signature + version/command + family + block length
        expect(Array.from(header.subarray(0, 12))).toEqual(SIGNATURE);
        expect(header[12]).toBe(0x21);
        expect(header[13]).toBe(0x11);
        expect(u16(header, 14)).toBe(12);
        // total = 16 fixed + 12 block
        expect(header.length).toBe(28);
        // src addr, dst addr, src port, dst port
        expect(Array.from(header.subarray(16, 20))).toEqual([203, 0, 113, 7]);
        expect(Array.from(header.subarray(20, 24))).toEqual([10, 0, 0, 5]);
        expect(u16(header, 24)).toBe(51234);
        expect(u16(header, 26)).toBe(443);
    });

    test('round-trips a TCP4 header through decode', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '198.51.100.23', port: 40000}, {host: '172.16.0.1', port: 8080});

        expect(ClusterProxyProtocolV2.decode(header)).toEqual({
            source: {host: '198.51.100.23', port: 40000},
            destination: {host: '172.16.0.1', port: 8080},
            tcp: true,
            ipv6: false
        });
    });

    test('round-trips a TCP6 header (36-byte block) through decode', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '2001:db8::1', port: 12345}, {host: '2001:db8::abcd', port: 443});

        expect(header[13]).toBe(0x21);
        expect(u16(header, 14)).toBe(36);
        expect(header.length).toBe(52);

        const decoded = ClusterProxyProtocolV2.decode(header);
        expect(decoded!.ipv6).toBe(true);
        expect(decoded!.source.port).toBe(12345);
        expect(decoded!.destination.port).toBe(443);
        // the compressed forms expand to the same 16 bytes and re-render equal
        expect(ClusterProxyProtocolV2.decode(
            ClusterProxyProtocolV2.encodeTcp({host: decoded!.source.host, port: 1}, {host: decoded!.destination.host, port: 2})
        )!.source.host).toBe(decoded!.source.host);
    });

    test('normalises an IPv4-mapped IPv6 source to native IPv4', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '::ffff:192.0.2.10', port: 5000}, {host: '10.0.0.1', port: 80});

        expect(header[13]).toBe(0x11);
        expect(ClusterProxyProtocolV2.decode(header)!.source.host).toBe('192.0.2.10');
    });

    test('decode rejects a header with a broken signature', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '10.0.0.1', port: 1}, {host: '10.0.0.2', port: 2});
        const broken = Uint8Array.from(header);
        broken[0] = 0x00;

        expect(ClusterProxyProtocolV2.decode(broken)).toBeNull();
    });

    test('decode rejects a truncated header', () => {
        const header = ClusterProxyProtocolV2.encodeTcp({host: '10.0.0.1', port: 1}, {host: '10.0.0.2', port: 2});

        expect(ClusterProxyProtocolV2.decode(header.subarray(0, 20))).toBeNull();
    });

    test('encodeTcp rejects a non-IP source host', () => {
        expect(() => ClusterProxyProtocolV2.encodeTcp({host: 'example.test', port: 1}, {host: '10.0.0.2', port: 2}))
        .toThrow(/not an IP literal/u);
    });
});