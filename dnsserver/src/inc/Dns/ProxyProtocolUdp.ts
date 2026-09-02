import {RemoteInfo} from 'dgram';
import {
    ProxyProtocolV1,
    ProxyProtocolV2,
    ServerPreRequest,
    ServerPreRequestResult
} from 'dns2ts';

/**
 * DnsProxyProtocolUdp
 *
 * Lenient UDP PROXY-protocol pre-request processor: if a datagram carries a
 * PROXY v1/v2 envelope, strip it and surface the real source as the client;
 * otherwise pass the datagram through unchanged so plain DNS queries (which
 * carry no envelope, e.g. when nginx does not add one for UDP) keep working.
 */
export class DnsProxyProtocolUdp implements ServerPreRequest<RemoteInfo> {

    /**
     * PROXY v1 parser.
     * @protected
     */
    protected _v1: ProxyProtocolV1 = new ProxyProtocolV1();

    /**
     * PROXY v2 parser.
     * @protected
     */
    protected _v2: ProxyProtocolV2 = new ProxyProtocolV2();

    /**
     * process
     * @param {Buffer} data
     * @param {RemoteInfo} client
     * @returns {Promise<ServerPreRequestResult<RemoteInfo>>}
     */
    public async process(data: Buffer, client: RemoteInfo): Promise<ServerPreRequestResult<RemoteInfo>> {
        if (ProxyProtocolV2.detect(data)) {
            return this._v2.process(data, client);
        }

        if (ProxyProtocolV1.detect(data)) {
            return this._v1.process(data, client);
        }

        return {
            data: data
        };
    }

}