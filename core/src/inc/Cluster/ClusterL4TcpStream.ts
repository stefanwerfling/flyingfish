import {Socket} from 'node:net';
import {IClusterL4Stream} from './ClusterL4Stream.js';

/**
 * A {@link IClusterL4Stream} over a Node TCP socket (Cluster/Mesh epic 9.5.2): the
 * real endpoint adapter used by the ingress listener and the egress dialer. Wraps
 * the socket's data/close/error events into the transport-agnostic stream interface
 * the {@link ClusterL4Session} pumps through; a socket error is folded into a single
 * close so the session sees one lifecycle.
 */
export class ClusterL4TcpStream implements IClusterL4Stream {

    private readonly _socket: Socket;

    private _closed = false;

    private _closeHandler: (() => void) | null = null;

    /**
     * @param socket - the underlying TCP socket
     */
    public constructor(socket: Socket) {
        this._socket = socket;

        this._socket.on('close', (): void => this._onClose());
        this._socket.on('error', (): void => this._onClose());
    }

    /**
     * @inheritDoc
     */
    public write(data: Uint8Array): void {
        if (!this._closed) {
            this._socket.write(Buffer.from(data));
        }
    }

    /**
     * @inheritDoc
     */
    public onData(handler: (data: Uint8Array) => void): void {
        this._socket.on('data', (chunk: Buffer): void => handler(new Uint8Array(chunk)));
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
            this._socket.destroy();
        }
    }

    /**
     * Fire the close handler exactly once (socket 'error' is followed by 'close', and
     * an explicit close() also emits 'close').
     */
    private _onClose(): void {
        if (this._closed) {
            return;
        }

        this._closed = true;

        if (this._closeHandler !== null) {
            this._closeHandler();
        }
    }

}