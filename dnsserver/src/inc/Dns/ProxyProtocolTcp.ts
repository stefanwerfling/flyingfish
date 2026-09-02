import {Socket} from 'net';
import {
    ProxyProtocolTcpReader,
    ProxyProtocolV1,
    ProxyProtocolV2,
    ProxyProtocolV2Tcp,
    ServerPreConnection,
    ServerPreConnectionResult
} from 'dns2ts';

/**
 * DnsProxyProtocolTcp
 *
 * TCP PROXY-protocol pre-connection processor for a connection fronted by a
 * proxy that prepends a PROXY v1/v2 header (e.g. nginx `proxy_protocol on`).
 * Reads the header, applies the real source to the socket (remoteAddress/Port),
 * and hands the remaining bytes back for the DNS parser. Only wire this in when
 * the server is actually behind such a proxy.
 */
export class DnsProxyProtocolTcp implements ServerPreConnection<Socket> {

    /**
     * process
     * @param {Socket} client
     * @returns {Promise<ServerPreConnectionResult<Socket>>}
     */
    public async process(client: Socket): Promise<ServerPreConnectionResult<Socket>> {
        const read = await ProxyProtocolTcpReader.readHeader(client, DnsProxyProtocolTcp._bytesNeeded);

        const info = ProxyProtocolV2.detect(read.header)
            ? ProxyProtocolV2.parse(read.header).info
            : ProxyProtocolV1.parse(read.header).info;

        ProxyProtocolV2Tcp.applyClientOverride(client, info);

        return {
            client: client,
            initialBuffer: read.remainder
        };
    }

    /**
     * How many bytes the PROXY header needs, detecting v2 (binary) then v1 (text).
     * Returns null while there are not yet enough bytes to decide.
     * @param {Buffer} data
     * @returns {number | null}
     * @protected
     */
    protected static _bytesNeeded(data: Buffer): number | null {
        if (ProxyProtocolV2.detect(data)) {
            return ProxyProtocolV2.bytesNeeded(data);
        }

        if (ProxyProtocolV1.detect(data)) {
            return ProxyProtocolV1.bytesNeeded(data);
        }

        return null;
    }

}