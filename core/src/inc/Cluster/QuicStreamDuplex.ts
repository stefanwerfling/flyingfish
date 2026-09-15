import {ClusterByteDuplex} from './ClusterByteDuplex.js';
import {QuicNativePeer} from './ClusterQuicNativeBinding.js';

/**
 * {@link ClusterByteDuplex} adapter over a native QUIC peer (the QUIC transport,
 * Cluster/Mesh epic 9.5.1). A QUIC bi-stream is a reliable ordered byte pipe like
 * TLS, so the same {@link ClusterPeerChannel} length framing runs over it: writes
 * go to the native `send`, and a read pump turns the native `recv` chunks into
 * `onData` calls until the stream ends (then `onClose`). This keeps the channel —
 * and everything above it — identical across the TCP-TLS, WSS and QUIC transports.
 */
export class QuicStreamDuplex implements ClusterByteDuplex {

    private readonly _peer: QuicNativePeer;

    private _dataHandler: ((chunk: Buffer) => void) | null = null;

    private _closeHandler: (() => void) | null = null;

    private _errorHandler: ((error: Error) => void) | null = null;

    private _closed = false;

    /**
     * @param peer - the authenticated native QUIC peer
     */
    public constructor(peer: QuicNativePeer) {
        this._peer = peer;
        this._pump().catch((): void => undefined);
    }

    /**
     * @inheritDoc
     */
    public write(data: Buffer): void {
        this._peer.send(Buffer.from(data)).catch((error: unknown): void => {
            this._fail(error);
        });
    }

    /**
     * @inheritDoc
     */
    public end(): void {
        this._peer.close();
    }

    /**
     * @inheritDoc
     */
    public destroy(): void {
        this._peer.close();
    }

    /**
     * @inheritDoc
     */
    public onData(handler: (chunk: Buffer) => void): void {
        this._dataHandler = handler;
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
    public onError(handler: (error: Error) => void): void {
        this._errorHandler = handler;
    }

    /**
     * Drain the peer's inbound chunks into the data handler until the stream ends
     * or errors, then fire close exactly once.
     */
    private async _pump(): Promise<void> {
        try {
            for (;;) {
                // eslint-disable-next-line no-await-in-loop -- sequential stream read
                const chunk = await this._peer.recv();

                if (chunk === null) {
                    break;
                }

                if (this._dataHandler !== null) {
                    this._dataHandler(Buffer.from(chunk));
                }
            }
        } catch (error) {
            this._fail(error);
        } finally {
            this._fireClose();
        }
    }

    /**
     * Report a transport error, then tear the connection down.
     * @param error - the error
     */
    private _fail(error: unknown): void {
        if (this._errorHandler !== null) {
            this._errorHandler(error instanceof Error ? error : new Error(String(error)));
        }

        this._peer.close();
    }

    /**
     * Fire the close handler at most once.
     */
    private _fireClose(): void {
        if (!this._closed) {
            this._closed = true;

            if (this._closeHandler !== null) {
                this._closeHandler();
            }
        }
    }

}