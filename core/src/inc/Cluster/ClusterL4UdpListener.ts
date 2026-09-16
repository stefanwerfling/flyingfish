import {createSocket, RemoteInfo, Socket} from 'node:dgram';
import {isIPv6} from 'node:net';
import {ClusterL4AcceptedEndpoints} from './ClusterL4TcpListener.js';
import {IClusterL4Stream} from './ClusterL4Stream.js';
import {CLUSTER_L4_UDP_IDLE_MS} from './ClusterL4UdpStream.js';

/**
 * Per-client-flow state inside the listener.
 */
type ClusterL4UdpFlow = {
    clientHost: string;
    clientPort: number;
    onData: ((data: Uint8Array) => void) | null;
    onClose: (() => void) | null;
    pending: Uint8Array[];
    closed: boolean;
    timer: ReturnType<typeof setTimeout> | null;
};

/**
 * A UDP ingress listener (Cluster/Mesh epic 9.5.2, UDP tunneling): binds one
 * datagram socket and turns each distinct client address into a flow — a
 * pseudo-connection surfaced as an {@link IClusterL4Stream} — so the very same
 * tunnel machinery that carries TCP connections carries UDP. A client's first
 * datagram opens a flow (handed to the wiring with its client/local endpoints);
 * further datagrams from that client feed the flow's onData; the flow's write sends
 * a datagram back to the client. Flows have no FIN, so each is torn down by an idle
 * timer reset on any traffic. Mirrors {@link ClusterL4TcpListener} for the wiring.
 */
export class ClusterL4UdpListener {

    private readonly _onConnection: (stream: IClusterL4Stream, endpoints: ClusterL4AcceptedEndpoints | undefined) => void;

    private readonly _idleMs: number;

    private readonly _flows: Map<string, ClusterL4UdpFlow> = new Map();

    private _socket: Socket | null = null;

    private _boundHost = '';

    private _boundPort = 0;

    /**
     * @param onConnection - called with each new client flow as a stream plus its
     *                       client/local endpoints
     * @param idleMs - idle timeout before a flow is closed
     */
    public constructor(
        onConnection: (stream: IClusterL4Stream, endpoints: ClusterL4AcceptedEndpoints | undefined) => void,
        idleMs: number = CLUSTER_L4_UDP_IDLE_MS
    ) {
        this._onConnection = onConnection;
        this._idleMs = idleMs;
    }

    /**
     * Bind and start receiving. Resolves with the bound port (pass 0 for an
     * OS-assigned one).
     * @param port - the port to bind (0 = OS-assigned)
     * @param host - the address to bind (default all interfaces)
     */
    public async listen(port: number, host?: string): Promise<number> {
        const socket = createSocket(host !== undefined && isIPv6(host) ? 'udp6' : 'udp4');
        this._socket = socket;

        socket.on('message', (message: Buffer, rinfo: RemoteInfo): void => this._onMessage(message, rinfo));

        return new Promise<number>((resolve, reject): void => {
            socket.once('error', reject);
            socket.bind(port, host, (): void => {
                socket.removeListener('error', reject);

                const address = socket.address();
                this._boundHost = address.address;
                this._boundPort = address.port;

                resolve(address.port);
            });
        });
    }

    /**
     * Stop receiving and close every flow and the socket.
     */
    public async close(): Promise<void> {
        for (const key of Array.from(this._flows.keys())) {
            this._closeFlow(key);
        }

        return new Promise<void>((resolve): void => {
            if (this._socket === null) {
                resolve();

                return;
            }

            this._socket.close((): void => resolve());
        });
    }

    /**
     * Route one inbound datagram to its flow, opening a new flow (and surfacing it)
     * for a client seen for the first time.
     * @param message - the datagram bytes
     * @param rinfo - the sender's address
     */
    private _onMessage(message: Buffer, rinfo: RemoteInfo): void {
        const key = `${rinfo.address}:${rinfo.port}`;
        let flow = this._flows.get(key);

        if (flow === undefined) {
            flow = {
                clientHost: rinfo.address,
                clientPort: rinfo.port,
                onData: null,
                onClose: null,
                pending: [],
                closed: false,
                timer: null
            };
            this._flows.set(key, flow);

            const endpoints: ClusterL4AcceptedEndpoints = {
                source: {host: rinfo.address, port: rinfo.port},
                destination: {host: this._boundHost, port: this._boundPort}
            };

            this._onConnection(this._streamFor(key, flow), endpoints);
        }

        this._resetIdle(key, flow);

        const data = new Uint8Array(message);

        if (flow.onData === null) {
            flow.pending.push(data);

            return;
        }

        flow.onData(data);
    }

    /**
     * Build the {@link IClusterL4Stream} surfaced for a flow.
     * @param key - the flow key
     * @param flow - the flow state
     */
    private _streamFor(key: string, flow: ClusterL4UdpFlow): IClusterL4Stream {
        return {
            write: (data: Uint8Array): void => {
                if (flow.closed || this._socket === null) {
                    return;
                }

                this._resetIdle(key, flow);
                this._socket.send(Buffer.from(data), flow.clientPort, flow.clientHost);
            },
            onData: (handler: (data: Uint8Array) => void): void => {
                flow.onData = handler;

                const buffered = flow.pending;
                flow.pending = [];

                for (const chunk of buffered) {
                    handler(chunk);
                }
            },
            onClose: (handler: () => void): void => {
                flow.onClose = handler;
            },
            close: (): void => this._closeFlow(key)
        };
    }

    /**
     * Close a flow: fire its close handler once, drop it, stop its idle timer.
     * @param key - the flow key
     */
    private _closeFlow(key: string): void {
        const flow = this._flows.get(key);

        if (flow === undefined || flow.closed) {
            return;
        }

        flow.closed = true;

        if (flow.timer !== null) {
            clearTimeout(flow.timer);
            flow.timer = null;
        }

        this._flows.delete(key);

        if (flow.onClose !== null) {
            flow.onClose();
        }
    }

    /**
     * (Re)arm a flow's idle timer.
     * @param key - the flow key
     * @param flow - the flow state
     */
    private _resetIdle(key: string, flow: ClusterL4UdpFlow): void {
        if (flow.timer !== null) {
            clearTimeout(flow.timer);
        }

        flow.timer = setTimeout((): void => this._closeFlow(key), this._idleMs);
        flow.timer.unref();
    }

}