import {Socket} from 'node:dgram';
import {IClusterL4Stream} from './ClusterL4Stream.js';

/**
 * A tunnelled UDP flow has no FIN, so a stream with no traffic for this long is
 * closed and its datagram socket released.
 */
export const CLUSTER_L4_UDP_IDLE_MS = 60000;

/**
 * A {@link IClusterL4Stream} over a Node datagram socket (Cluster/Mesh epic 9.5.2,
 * UDP tunneling): the egress endpoint adapter. Each tunnelled Data frame is one
 * datagram — `write` sends it to the connected target, and each datagram the target
 * replies with becomes an onData chunk. UDP is connectionless, so the flow is torn
 * down by an idle timer (reset on any traffic) rather than a peer FIN. Datagrams
 * that arrive before the session wires onData are buffered and flushed, so none is
 * lost in the gap between connect and wiring.
 */
export class ClusterL4UdpStream implements IClusterL4Stream {

    private readonly _socket: Socket;

    private readonly _idleMs: number;

    private _closed = false;

    private _dataHandler: ((data: Uint8Array) => void) | null = null;

    private _closeHandler: (() => void) | null = null;

    private _pending: Uint8Array[] = [];

    private _idleTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * @param socket - a datagram socket already connected to the target
     * @param idleMs - idle timeout before the flow is closed
     */
    public constructor(socket: Socket, idleMs: number = CLUSTER_L4_UDP_IDLE_MS) {
        this._socket = socket;
        this._idleMs = idleMs;

        this._socket.on('message', (message: Buffer): void => this._onMessage(message));
        this._socket.on('close', (): void => this._onClose());
        this._socket.on('error', (): void => this.close());

        this._resetIdle();
    }

    /**
     * @inheritDoc
     */
    public write(data: Uint8Array): void {
        if (this._closed) {
            return;
        }

        this._resetIdle();
        this._socket.send(Buffer.from(data));
    }

    /**
     * @inheritDoc
     */
    public onData(handler: (data: Uint8Array) => void): void {
        this._dataHandler = handler;

        const buffered = this._pending;
        this._pending = [];

        for (const chunk of buffered) {
            handler(chunk);
        }
    }

    /**
     * @inheritDoc
     */
    public onClose(handler: () => void): void {
        this._closeHandler = handler;
    }

    /**
     * @inheritDoc
     */
    public close(): void {
        if (!this._closed) {
            this._socket.close();
        }
    }

    /**
     * Deliver an inbound datagram (buffering until onData is wired) and reset the
     * idle timer.
     * @param message - the datagram bytes
     */
    private _onMessage(message: Buffer): void {
        this._resetIdle();

        const data = new Uint8Array(message);

        if (this._dataHandler === null) {
            this._pending.push(data);

            return;
        }

        this._dataHandler(data);
    }

    /**
     * Fire the close handler exactly once and stop the idle timer.
     */
    private _onClose(): void {
        if (this._closed) {
            return;
        }

        this._closed = true;

        if (this._idleTimer !== null) {
            clearTimeout(this._idleTimer);
            this._idleTimer = null;
        }

        if (this._closeHandler !== null) {
            this._closeHandler();
        }
    }

    /**
     * (Re)arm the idle timer; on expiry the flow is closed.
     */
    private _resetIdle(): void {
        if (this._idleTimer !== null) {
            clearTimeout(this._idleTimer);
        }

        this._idleTimer = setTimeout((): void => this.close(), this._idleMs);
        this._idleTimer.unref();
    }

}