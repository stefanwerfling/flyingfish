import {createSocket} from 'node:dgram';
import {isIPv6} from 'node:net';
import {ClusterL4Proto, ClusterL4Target} from './ClusterL4Frame.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';
import {ClusterL4UdpStream} from './ClusterL4UdpStream.js';

/**
 * Dials the egress-side target over UDP (Cluster/Mesh epic 9.5.2, UDP tunneling):
 * opens a datagram socket connected to the target and resolves a
 * {@link ClusterL4UdpStream} over it, so tunnelled datagrams flow both ways. The
 * socket family follows the target address (udp6 for an IPv6 literal, else udp4).
 * Non-UDP targets reject — the {@link ClusterL4CompositeDialer} routes by proto.
 * `clientInfo` (client-IP preservation) is not applied to UDP yet.
 */
export class ClusterL4UdpDialer implements IClusterL4Dialer {

    /**
     * @inheritDoc
     */
    public async dial(target: ClusterL4Target): Promise<IClusterL4Stream> {
        if (target.proto !== ClusterL4Proto.Udp) {
            throw new Error('ClusterL4UdpDialer: only UDP targets are supported');
        }

        return new Promise<IClusterL4Stream>((resolve, reject): void => {
            const socket = createSocket(isIPv6(target.host) ? 'udp6' : 'udp4');

            const onError = (error: Error): void => {
                socket.close();
                reject(error);
            };

            socket.once('error', onError);
            socket.connect(target.port, target.host, (): void => {
                socket.removeListener('error', onError);
                resolve(new ClusterL4UdpStream(socket));
            });
        });
    }

}