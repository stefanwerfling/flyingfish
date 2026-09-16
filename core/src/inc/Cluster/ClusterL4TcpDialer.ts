import {createConnection, Socket} from 'node:net';
import {ClusterL4ClientInfo, ClusterL4Proto, ClusterL4Target} from './ClusterL4Frame.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';
import {ClusterL4TcpStream} from './ClusterL4TcpStream.js';
import {ClusterProxyProtocolV2} from './ClusterProxyProtocolV2.js';

/**
 * Dials the egress-side target over TCP (Cluster/Mesh epic 9.5.2). UDP targets are
 * not yet supported and reject, so the session answers OpenAck(fail) cleanly.
 *
 * When the Open carried a client endpoint (9.5.3), the dialer prepends a PROXY
 * protocol v2 header as the very first bytes on the backend connection so the
 * backend sees the original client IP rather than this egress node's — matching
 * nginx/HAProxy `proxy_protocol`. A header that cannot be built (e.g. a non-IP
 * client address) is simply skipped so the connection still succeeds.
 */
export class ClusterL4TcpDialer implements IClusterL4Dialer {

    /**
     * @inheritDoc
     */
    public async dial(target: ClusterL4Target, clientInfo?: ClusterL4ClientInfo): Promise<IClusterL4Stream> {
        if (target.proto !== ClusterL4Proto.Tcp) {
            throw new Error('ClusterL4TcpDialer: only TCP targets are supported');
        }

        return new Promise<IClusterL4Stream>((resolve, reject): void => {
            const socket = createConnection({host: target.host, port: target.port});

            const onError = (error: Error): void => {
                socket.destroy();
                reject(error);
            };

            socket.once('connect', (): void => {
                socket.removeListener('error', onError);
                ClusterL4TcpDialer._writeProxyHeader(socket, clientInfo);
                resolve(new ClusterL4TcpStream(socket));
            });
            socket.once('error', onError);
        });
    }

    /**
     * Prepend a PROXY protocol v2 header (built from the client endpoint) as the
     * first bytes to the backend, before any tunnelled payload. No-op when there is
     * no client endpoint or the header cannot be built.
     * @param socket - the connected backend socket
     * @param clientInfo - the original client endpoint, optional
     */
    private static _writeProxyHeader(socket: Socket, clientInfo?: ClusterL4ClientInfo): void {
        if (clientInfo === undefined) {
            return;
        }

        try {
            const header = ClusterProxyProtocolV2.encodeTcp(
                {host: clientInfo.sourceHost, port: clientInfo.sourcePort},
                {host: clientInfo.destHost, port: clientInfo.destPort}
            );

            socket.write(Buffer.from(header));
        } catch {
            // a non-IP client address cannot be encoded; forward without the header
        }
    }

}