import {createServer, Server, Socket} from 'node:net';
import {ClusterProxyEndpoint} from './ClusterProxyProtocolV2.js';
import {IClusterL4Stream} from './ClusterL4Stream.js';
import {ClusterL4TcpStream} from './ClusterL4TcpStream.js';

/**
 * The endpoints of an accepted ingress connection: `source` is the client, and
 * `destination` is the local address:port the client connected to (Cluster/Mesh epic
 * 9.5.3). undefined when the socket did not report an address.
 */
export type ClusterL4AcceptedEndpoints = {
    source: ClusterProxyEndpoint;
    destination: ClusterProxyEndpoint;
};

/**
 * A TCP ingress listener (Cluster/Mesh epic 9.5.2): binds a local host:port and
 * wraps each accepted connection as a {@link ClusterL4TcpStream}, handing it — with
 * the connection's client/local endpoints (9.5.3, for client-IP preservation) — to
 * the wiring that opens a tunnelled stream to the configured egress peer. Kept free
 * of any session/peer knowledge so the node wiring decides which egress a listener
 * maps to.
 */
export class ClusterL4TcpListener {

    private readonly _server: Server;

    private readonly _onConnection: (stream: IClusterL4Stream, endpoints: ClusterL4AcceptedEndpoints | undefined) => void;

    /**
     * @param onConnection - called with each accepted connection as a stream plus its
     *                       client/local endpoints (undefined if the socket reported none)
     */
    public constructor(onConnection: (stream: IClusterL4Stream, endpoints: ClusterL4AcceptedEndpoints | undefined) => void) {
        this._onConnection = onConnection;
        this._server = createServer((socket: Socket): void => {
            this._onConnection(new ClusterL4TcpStream(socket), ClusterL4TcpListener._endpoints(socket));
        });
    }

    /**
     * Read the client (remote) and local endpoints from an accepted socket, or
     * undefined if the socket did not report them.
     * @param socket - the accepted socket
     */
    private static _endpoints(socket: Socket): ClusterL4AcceptedEndpoints | undefined {
        if (socket.remoteAddress === undefined || socket.localAddress === undefined) {
            return undefined;
        }

        return {
            source: {host: socket.remoteAddress, port: socket.remotePort ?? 0},
            destination: {host: socket.localAddress, port: socket.localPort ?? 0}
        };
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