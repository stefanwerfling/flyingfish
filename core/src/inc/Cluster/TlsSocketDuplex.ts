import * as tls from 'tls';
import {ClusterByteDuplex} from './ClusterByteDuplex.js';

/**
 * {@link ClusterByteDuplex} adapter over a Node TLS socket (the TCP peer transport,
 * Cluster/Mesh epic 9.5.1). TLS delivers an arbitrarily-chunked byte stream; the
 * channel's length framing reassembles the messages.
 */
export class TlsSocketDuplex implements ClusterByteDuplex {

    private readonly _socket: tls.TLSSocket;

    /**
     * @param socket - the authenticated TLS socket
     */
    public constructor(socket: tls.TLSSocket) {
        this._socket = socket;
    }

    /**
     * @inheritDoc
     */
    public write(data: Buffer): void {
        this._socket.write(data);
    }

    /**
     * @inheritDoc
     */
    public end(): void {
        this._socket.end();
    }

    /**
     * @inheritDoc
     */
    public destroy(): void {
        this._socket.destroy();
    }

    /**
     * @inheritDoc
     */
    public onData(handler: (chunk: Buffer) => void): void {
        this._socket.on('data', handler);
    }

    /**
     * @inheritDoc
     */
    public onClose(handler: () => void): void {
        this._socket.on('close', handler);
    }

    /**
     * @inheritDoc
     */
    public onError(handler: (error: Error) => void): void {
        this._socket.on('error', handler);
    }

}