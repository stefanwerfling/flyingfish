/**
 * The minimal byte-oriented duplex a {@link ClusterPeerChannel} rides on
 * (Cluster/Mesh epic 9.5.1). Abstracting the underlying socket lets the very same
 * length-framed channel run over a raw TLS socket (the TCP transport, see
 * {@link TlsSocketDuplex}) or a WebSocket (the WSS/443 transport, see
 * {@link WebSocketByteDuplex}) without duplicating the framing — each transport
 * supplies its own adapter, the channel stays transport-agnostic.
 */
export interface ClusterByteDuplex {

    /**
     * Write a chunk of bytes to the peer.
     * @param data - the bytes to send
     */
    write(data: Buffer): void;

    /**
     * Gracefully close the underlying connection.
     */
    end(): void;

    /**
     * Forcefully tear the underlying connection down.
     */
    destroy(): void;

    /**
     * Register the inbound-bytes handler.
     * @param handler - called with each received chunk
     */
    onData(handler: (chunk: Buffer) => void): void;

    /**
     * Register the close handler.
     * @param handler - called once when the connection closes
     */
    onClose(handler: () => void): void;

    /**
     * Register the error handler.
     * @param handler - called with each transport error
     */
    onError(handler: (error: Error) => void): void;

}