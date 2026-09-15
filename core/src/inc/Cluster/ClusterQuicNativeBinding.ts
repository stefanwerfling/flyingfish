/**
 * The shape of the native QUIC addon (`flyingfish_clusterquic`) as the JS
 * {@link ClusterQuicPeerTransport} consumes it (Cluster/Mesh epic 9.5.1). Declared
 * here — and injected into the transport — so `core` never hard-depends on the
 * native package: the part that owns the addon loads it and passes it in, and
 * tests pass a fake. Mirrors the addon's `QuicTransport` / `QuicPeer` classes.
 */

/**
 * One authenticated native QUIC peer: a reliable ordered byte pipe plus the peer's
 * leaf certificate (PEM) for the JS-side identity check.
 */
export interface QuicNativePeer {

    /**
     * The peer's leaf certificate, PEM-encoded.
     */
    readonly peerCertPem: string;

    /**
     * Read the next chunk of bytes from the peer, or null once the stream ends.
     */
    recv(): Promise<Buffer | null>;

    /**
     * Write a chunk of bytes to the peer.
     * @param data - the bytes to send
     */
    send(data: Buffer): Promise<void>;

    /**
     * Close the connection to the peer.
     */
    close(): void;
}

/**
 * A native QUIC transport instance: listens (server endpoint) and dials (client
 * endpoint), yielding mutually-authenticated {@link QuicNativePeer}s.
 */
export interface QuicNativeTransport {

    /**
     * Start the server endpoint on the given port (0 = OS-assigned); resolves the
     * bound port.
     * @param port - the port to bind
     */
    listen(port: number): Promise<number>;

    /**
     * Await the next inbound authenticated peer. Rejects once the endpoint closes.
     */
    acceptPeer(): Promise<QuicNativePeer>;

    /**
     * Dial a peer and open the authenticated channel.
     * @param host - the peer host
     * @param port - the peer port
     */
    connect(host: string, port: number): Promise<QuicNativePeer>;

    /**
     * Close both endpoints.
     */
    close(): Promise<void>;
}

/**
 * The native addon module: its `QuicTransport` constructor takes this node's
 * cluster identity (certificate + private key, PEM).
 */
export interface QuicNativeBinding {
    QuicTransport: new (certPem: string, keyPem: string) => QuicNativeTransport;
}