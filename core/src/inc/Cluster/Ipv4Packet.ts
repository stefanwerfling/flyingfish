/**
 * The fields of an IPv4 packet the L3 datapath needs to route it (Cluster/Mesh
 * epic 9.5.1, TUN datapath).
 */
export type Ipv4Header = {
    version: number;
    source: string;
    destination: string;
};

const MIN_HEADER_BYTES = 20;
const SOURCE_OFFSET = 12;
const DESTINATION_OFFSET = 16;

/**
 * A minimal, read-only IPv4 header parser (Cluster/Mesh epic 9.5.1). The datapath
 * only needs the source and destination addresses to route a packet to the right
 * peer, so this deliberately parses just enough of the fixed 20-byte header and
 * ignores options/payload. Anything that is not a well-formed IPv4 packet (too
 * short, wrong version — e.g. IPv6 or ARP) is rejected so the datapath drops it.
 */
export class Ipv4Packet {

    /**
     * The minimum length of an IPv4 header.
     */
    public static readonly MIN_HEADER_BYTES = MIN_HEADER_BYTES;

    /**
     * Parse the routing-relevant fields of an IPv4 packet, or null if it is not a
     * well-formed IPv4 packet.
     * @param packet - the raw packet bytes as read from the TUN device
     */
    public static parse(packet: Uint8Array): Ipv4Header | null {
        if (packet.length < MIN_HEADER_BYTES) {
            return null;
        }

        // eslint-disable-next-line no-bitwise
        const version = (packet[0] & 0xf0) >> 4;

        if (version !== 4) {
            return null;
        }

        return {
            version: version,
            source: Ipv4Packet._address(packet, SOURCE_OFFSET),
            destination: Ipv4Packet._address(packet, DESTINATION_OFFSET)
        };
    }

    /**
     * Read a 4-byte IPv4 address at an offset as a dotted-quad string.
     * @param packet - the raw packet bytes
     * @param offset - the byte offset of the address
     */
    private static _address(packet: Uint8Array, offset: number): string {
        return `${packet[offset]}.${packet[offset + 1]}.${packet[offset + 2]}.${packet[offset + 3]}`;
    }

}