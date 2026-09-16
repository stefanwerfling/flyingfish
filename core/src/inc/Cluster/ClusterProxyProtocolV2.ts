import {isIPv4, isIPv6} from 'node:net';

/**
 * An endpoint (address + port) of a proxied connection.
 */
export type ClusterProxyEndpoint = {
    host: string;
    port: number;
};

/**
 * A decoded PROXY protocol v2 header.
 */
export type ClusterProxyProtocolV2Header = {
    source: ClusterProxyEndpoint;
    destination: ClusterProxyEndpoint;
    tcp: boolean;
    ipv6: boolean;
};

// The 12-byte PROXY protocol v2 signature.
const SIGNATURE = Uint8Array.from([0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a]);
const SIGNATURE_BYTES = SIGNATURE.length;
// byte 12: protocol version 2 (high nibble 0x2) + command PROXY (low nibble 0x1)
const VERSION_COMMAND_PROXY = 0x21;
// byte 13 transport+family
const FAM_TCP4 = 0x11;
const FAM_TCP6 = 0x21;
const FIXED_HEADER_BYTES = 16;
const IPV4_ADDR_BYTES = 4;
const IPV6_ADDR_BYTES = 16;
// src(4)+dst(4)+sport(2)+dport(2)
const IPV4_BLOCK_BYTES = 12;
// src(16)+dst(16)+sport(2)+dport(2)
const IPV6_BLOCK_BYTES = 36;
const IPV6_GROUPS = 8;

/**
 * Encodes and decodes the PROXY protocol v2 header (Cluster/Mesh epic 9.5.3). When
 * the L4 tunnel forwards a connection, the egress node dials the backend from its
 * own address, so the backend would see the egress IP rather than the real client.
 * Prepending this header to the backend connection conveys the original client's
 * source and the original destination end to end, exactly as HAProxy/nginx expect
 * (`proxy_protocol`). This codec covers the binary v2 header for TCP over IPv4 and
 * IPv6; pure byte manipulation, no I/O.
 *
 * Layout: 12-byte signature, version+command (0x21), transport+family (TCP4 0x11 /
 * TCP6 0x21), a 2-byte big-endian address-block length, then src+dst addresses and
 * src+dst ports.
 */
export class ClusterProxyProtocolV2 {

    /**
     * Build a PROXY protocol v2 header for a TCP connection.
     * @param source - the original client endpoint (IPv4 or IPv6 literal)
     * @param destination - the original destination endpoint (same family as source)
     */
    public static encodeTcp(source: ClusterProxyEndpoint, destination: ClusterProxyEndpoint): Uint8Array {
        const sourceHost = ClusterProxyProtocolV2._normalize(source.host);
        const destHost = ClusterProxyProtocolV2._normalize(destination.host);

        const ipv6 = isIPv6(sourceHost);

        if (!ipv6 && !isIPv4(sourceHost)) {
            throw new Error(`ClusterProxyProtocolV2: source is not an IP literal: ${source.host}`);
        }

        const addrBytes = ipv6 ? IPV6_ADDR_BYTES : IPV4_ADDR_BYTES;
        const blockBytes = ipv6 ? IPV6_BLOCK_BYTES : IPV4_BLOCK_BYTES;
        const header = new Uint8Array(FIXED_HEADER_BYTES + blockBytes);

        header.set(SIGNATURE, 0);
        header[12] = VERSION_COMMAND_PROXY;
        header[13] = ipv6 ? FAM_TCP6 : FAM_TCP4;

        const view = new DataView(header.buffer);
        view.setUint16(14, blockBytes, false);

        let offset = FIXED_HEADER_BYTES;
        header.set(ClusterProxyProtocolV2._addressBytes(sourceHost, ipv6), offset);
        offset += addrBytes;
        header.set(ClusterProxyProtocolV2._addressBytes(destHost, ipv6), offset);
        offset += addrBytes;
        view.setUint16(offset, source.port, false);
        offset += 2;
        view.setUint16(offset, destination.port, false);

        return header;
    }

    /**
     * Decode a PROXY protocol v2 TCP header, or null if the bytes are not a complete,
     * well-formed v2 TCP header (used mainly to verify emission in tests).
     * @param frame - the header bytes (may be followed by payload, which is ignored)
     */
    public static decode(frame: Uint8Array): ClusterProxyProtocolV2Header | null {
        if (frame.length < FIXED_HEADER_BYTES) {
            return null;
        }

        for (let index = 0; index < SIGNATURE_BYTES; index++) {
            if (frame[index] !== SIGNATURE[index]) {
                return null;
            }
        }

        if (frame[12] !== VERSION_COMMAND_PROXY) {
            return null;
        }

        const family = frame[13];

        if (family !== FAM_TCP4 && family !== FAM_TCP6) {
            return null;
        }

        const ipv6 = family === FAM_TCP6;
        const addrBytes = ipv6 ? IPV6_ADDR_BYTES : IPV4_ADDR_BYTES;
        const blockBytes = ipv6 ? IPV6_BLOCK_BYTES : IPV4_BLOCK_BYTES;
        const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);

        if (view.getUint16(14, false) !== blockBytes || frame.length < FIXED_HEADER_BYTES + blockBytes) {
            return null;
        }

        let offset = FIXED_HEADER_BYTES;
        const sourceHost = ClusterProxyProtocolV2._addressString(frame.subarray(offset, offset + addrBytes), ipv6);
        offset += addrBytes;
        const destHost = ClusterProxyProtocolV2._addressString(frame.subarray(offset, offset + addrBytes), ipv6);
        offset += addrBytes;
        const sourcePort = view.getUint16(offset, false);
        offset += 2;
        const destPort = view.getUint16(offset, false);

        return {
            source: {host: sourceHost, port: sourcePort},
            destination: {host: destHost, port: destPort},
            tcp: true,
            ipv6: ipv6
        };
    }

    /**
     * Strip an IPv4-mapped IPv6 prefix (`::ffff:a.b.c.d`) that Node reports on
     * dual-stack sockets, so such an address encodes as native IPv4.
     * @param host - the address literal
     */
    private static _normalize(host: string): string {
        const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/iu.exec(host);

        return mapped === null ? host : mapped[1];
    }

    /**
     * Pack an IP literal into its raw address bytes.
     * @param host - the IP literal
     * @param ipv6 - whether it is IPv6
     */
    private static _addressBytes(host: string, ipv6: boolean): Uint8Array {
        if (ipv6) {
            return ClusterProxyProtocolV2._ipv6Bytes(host);
        }

        return Uint8Array.from(host.split('.').map((part) => parseInt(part, 10)));
    }

    /**
     * Render raw address bytes back to an IP literal.
     * @param bytes - the raw address bytes
     * @param ipv6 - whether it is IPv6
     */
    private static _addressString(bytes: Uint8Array, ipv6: boolean): string {
        if (ipv6) {
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            const groups: string[] = [];

            for (let index = 0; index < IPV6_ADDR_BYTES; index += 2) {
                groups.push(view.getUint16(index, false).toString(16));
            }

            return groups.join(':');
        }

        return Array.from(bytes).join('.');
    }

    /**
     * Expand an IPv6 literal (including `::` compression) to 16 bytes.
     * @param host - the IPv6 literal
     */
    private static _ipv6Bytes(host: string): Uint8Array {
        const [head, tail] = host.split('::');
        const headGroups = head.length > 0 ? head.split(':') : [];
        const compressed = tail !== undefined;
        const tailGroups = compressed && tail.length > 0 ? tail.split(':') : [];
        const missing = IPV6_GROUPS - headGroups.length - tailGroups.length;
        const filler = new Array<string>(compressed ? missing : 0).fill('0');
        const full = [...headGroups, ...filler, ...tailGroups];

        const bytes = new Uint8Array(IPV6_ADDR_BYTES);
        const view = new DataView(bytes.buffer);

        full.forEach((group, index) => {
            view.setUint16(index * 2, parseInt(group, 16) || 0, false);
        });

        return bytes;
    }

}