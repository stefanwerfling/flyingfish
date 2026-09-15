import {WebSocket} from 'ws';
import {ClusterByteDuplex} from './ClusterByteDuplex.js';

/**
 * {@link ClusterByteDuplex} adapter over a WebSocket (the WSS/443 peer transport,
 * Cluster/Mesh epic 9.5.1). A WebSocket preserves message boundaries, so each
 * {@link ClusterPeerChannel} frame arrives as one binary message; the channel's
 * length framing still parses it, keeping the channel identical across transports.
 */
export class WebSocketByteDuplex implements ClusterByteDuplex {

    private readonly _ws: WebSocket;

    /**
     * @param ws - the open WebSocket to the peer
     */
    public constructor(ws: WebSocket) {
        this._ws = ws;
    }

    /**
     * @inheritDoc
     */
    public write(data: Buffer): void {
        this._ws.send(data);
    }

    /**
     * @inheritDoc
     */
    public end(): void {
        this._ws.close();
    }

    /**
     * @inheritDoc
     */
    public destroy(): void {
        this._ws.terminate();
    }

    /**
     * @inheritDoc
     */
    public onData(handler: (chunk: Buffer) => void): void {
        this._ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]): void => {
            handler(WebSocketByteDuplex._toBuffer(data));
        });
    }

    /**
     * @inheritDoc
     */
    public onClose(handler: () => void): void {
        this._ws.on('close', handler);
    }

    /**
     * @inheritDoc
     */
    public onError(handler: (error: Error) => void): void {
        this._ws.on('error', handler);
    }

    /**
     * Normalise the several shapes `ws` may hand a binary message in into one Buffer.
     * @param data - the raw message payload
     */
    private static _toBuffer(data: Buffer | ArrayBuffer | Buffer[]): Buffer {
        if (Array.isArray(data)) {
            return Buffer.concat(data);
        }

        if (data instanceof ArrayBuffer) {
            return Buffer.from(data);
        }

        return data;
    }

}