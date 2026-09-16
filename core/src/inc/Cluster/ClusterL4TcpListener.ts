import {createServer, Server, Socket} from 'node:net';
import {IClusterL4Stream} from './ClusterL4Stream.js';
import {ClusterL4TcpStream} from './ClusterL4TcpStream.js';

/**
 * A TCP ingress listener (Cluster/Mesh epic 9.5.2): binds a local host:port and
 * wraps each accepted connection as a {@link ClusterL4TcpStream}, handing it to the
 * wiring that opens a tunnelled stream to the configured egress peer. Kept free of
 * any session/peer knowledge so the node wiring decides which egress a listener maps
 * to.
 */
export class ClusterL4TcpListener {

    private readonly _server: Server;

    private readonly _onConnection: (stream: IClusterL4Stream) => void;

    /**
     * @param onConnection - called with each accepted connection as a stream
     */
    public constructor(onConnection: (stream: IClusterL4Stream) => void) {
        this._onConnection = onConnection;
        this._server = createServer((socket: Socket): void => this._onConnection(new ClusterL4TcpStream(socket)));
    }

    /**
     * Bind and start accepting. Resolves with the bound port (pass 0 for an
     * OS-assigned one).
     * @param port - the port to bind (0 = OS-assigned)
     * @param host - the address to bind (default all interfaces)
     */
    public async listen(port: number, host?: string): Promise<number> {
        return new Promise<number>((resolve, reject): void => {
            this._server.once('error', reject);
            this._server.listen(port, host, (): void => {
                this._server.removeListener('error', reject);

                const address = this._server.address();

                if (address === null || typeof address === 'string') {
                    reject(new Error('ClusterL4TcpListener: no TCP address after listen'));

                    return;
                }

                resolve(address.port);
            });
        });
    }

    /**
     * Stop accepting new connections and close the listener.
     */
    public async close(): Promise<void> {
        return new Promise<void>((resolve): void => {
            this._server.close((): void => resolve());
        });
    }

}