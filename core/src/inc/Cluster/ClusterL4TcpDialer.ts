import {createConnection} from 'node:net';
import {ClusterL4Proto, ClusterL4Target} from './ClusterL4Frame.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';
import {ClusterL4TcpStream} from './ClusterL4TcpStream.js';

/**
 * Dials the egress-side target over TCP (Cluster/Mesh epic 9.5.2). UDP targets are
 * not yet supported and reject, so the session answers OpenAck(fail) cleanly.
 */
export class ClusterL4TcpDialer implements IClusterL4Dialer {

    /**
     * @inheritDoc
     */
    public async dial(target: ClusterL4Target): Promise<IClusterL4Stream> {
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
                resolve(new ClusterL4TcpStream(socket));
            });
            socket.once('error', onError);
        });
    }

}