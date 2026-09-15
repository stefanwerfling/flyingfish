import {PkiVerifiedIdentity} from '../Pki/PkiClientCertVerifier.js';
import {ClusterByteDuplex} from './ClusterByteDuplex.js';

const LENGTH_PREFIX_BYTES = 4;

/**
 * Called with each complete inbound message.
 */
export type ClusterPeerMessageHandler = (message: Uint8Array) => void;

/**
 * Called once when the channel closes.
 */
export type ClusterPeerCloseHandler = () => void;

/**
 * A bidirectional, length-framed message channel to one authenticated cluster
 * peer (Cluster/Mesh epic 9.5.1). It rides on a {@link ClusterByteDuplex} — the
 * mutually-authenticated TLS socket of the TCP transport or the WebSocket of the
 * WSS/443 transport — and carries the peer's verified cluster identity. Messages
 * are framed with a 4-byte big-endian length prefix so the byte stream is split
 * back into discrete messages regardless of TCP segmentation (the framing is
 * harmless over an already message-framed WebSocket, keeping the channel identical
 * across transports).
 */
export class ClusterPeerChannel {

    private readonly _duplex: ClusterByteDuplex;

    private readonly _identity: PkiVerifiedIdentity;

    private _buffer: Buffer = Buffer.alloc(0);

    private _messageHandler: ClusterPeerMessageHandler | null = null;

    private _closeHandler: ClusterPeerCloseHandler | null = null;

    /**
     * @param duplex - the authenticated byte duplex to the peer
     * @param identity - the peer's verified cluster identity
     */
    public constructor(duplex: ClusterByteDuplex, identity: PkiVerifiedIdentity) {
        this._duplex = duplex;
        this._identity = identity;

        this._duplex.onData((chunk: Buffer): void => this._onData(chunk));
        this._duplex.onClose((): void => {
            if (this._closeHandler !== null) {
                this._closeHandler();
            }
        });
        this._duplex.onError((): void => {
            this._duplex.destroy();
        });
    }

    /**
     * The peer's verified cluster identity (nodeUid + purpose).
     */
    public get identity(): PkiVerifiedIdentity {
        return this._identity;
    }

    /**
     * Send one message to the peer (length-framed).
     * @param message - the message bytes
     */
    public send(message: Uint8Array): void {
        const header = Buffer.alloc(LENGTH_PREFIX_BYTES);
        header.writeUInt32BE(message.length, 0);

        this._duplex.write(Buffer.concat([header, Buffer.from(message)]));
    }

    /**
     * Register the inbound-message handler.
     * @param handler - called with each complete message
     */
    public onMessage(handler: ClusterPeerMessageHandler): void {
        this._messageHandler = handler;
    }

    /**
     * Register the close handler.
     * @param handler - called once when the channel closes
     */
    public onClose(handler: ClusterPeerCloseHandler): void {
        this._closeHandler = handler;
    }

    /**
     * Close the channel.
     */
    public close(): void {
        this._duplex.end();
    }

    /**
     * Accumulate inbound bytes and emit each complete length-framed message.
     * @param chunk - the received bytes
     */
    private _onData(chunk: Buffer): void {
        this._buffer = Buffer.concat([this._buffer, chunk]);

        while (this._buffer.length >= LENGTH_PREFIX_BYTES) {
            const length = this._buffer.readUInt32BE(0);

            if (this._buffer.length < LENGTH_PREFIX_BYTES + length) {
                break;
            }

            const message = this._buffer.subarray(LENGTH_PREFIX_BYTES, LENGTH_PREFIX_BYTES + length);
            this._buffer = this._buffer.subarray(LENGTH_PREFIX_BYTES + length);

            if (this._messageHandler !== null) {
                this._messageHandler(new Uint8Array(message));
            }
        }
    }

}