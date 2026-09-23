import {ClusterPeerChannel} from './ClusterPeerChannel.js';

/**
 * Options shared by every cluster peer transport: this node's own cluster identity
 * (certificate + private key) and the trusted cluster CA chain used to verify
 * peers. Every transport authenticates the same way — mutual TLS with a cluster
 * node-cert — regardless of the wire it runs over.
 */
export type ClusterPeerTransportOptions = {
    certificate: string;
    privateKey: string;
    // This node's own CA chain — the TLS handshake `ca` hint and the fallback trust
    // anchor set (used when no dynamic provider is given).
    caChain: string[];
    // Optional live trust anchor set, evaluated at each peer verification (Cluster/Mesh
    // epic 9.5.12.2, model (b) cross-trust): returns the current union of all member
    // CAs from the converged gossip so a newly-joined node's peers become trusted
    // without a restart. When absent, `caChain` is used (static single-CA behaviour).
    trustProvider?: () => string[];
    // Optional accept-side bootstrap context (model (b) "one-port" join): lets the
    // transport admit a not-yet-trusted inbound peer just far enough to run the
    // bootstrap CA/token exchange over the same connection.
    bootstrap?: ClusterBootstrapAcceptContext;
};

/**
 * Accept-side bootstrap context (Cluster/Mesh epic 9.5.12.2, model (b) one-port
 * join). When an inbound peer fails the normal trust check, the transport runs the
 * bootstrap exchange over that connection, validates the presented join token and —
 * only if valid — hands the peer's CA chain up via {@link onAcceptedCa} to be added
 * to the bootstrap trust set, then closes. The peer's next (normal) connection then
 * authenticates against the updated trust set.
 */
export type ClusterBootstrapAcceptContext = {
    ownCaChain: string[];
    validateToken: (token: string) => boolean | Promise<boolean>;
    onAcceptedCa: (caChain: string[]) => void;
};

/**
 * Dial-side bootstrap params (Cluster/Mesh epic 9.5.12.2), passed per seed to
 * {@link IClusterPeerTransport.bootstrap}: the join token to present and the CA
 * fingerprint to pin the accepting node's CA against before trusting it.
 */
export type ClusterDialBootstrap = {
    token: string;
    pinFingerprint: string;
    ownCaChain: string[];
    onAcceptedCa: (caChain: string[]) => void;
};

/**
 * Called with each newly-accepted, authenticated inbound peer channel.
 */
export type ClusterPeerHandler = (channel: ClusterPeerChannel) => void;

/**
 * The transport contract the cluster mesh (Cluster/Mesh epic 9.5.1) builds on: a
 * way to listen for and dial mutually-authenticated peer channels. Implemented by
 * the TCP-TLS transport ({@link ClusterTlsPeerTransport}) and the WSS/443 fallback
 * ({@link ClusterWssPeerTransport}); a future QUIC transport plugs in behind the
 * same shape once a stable Node QUIC (or a native binding) is available. Because
 * every transport yields the same {@link ClusterPeerChannel}, {@link ClusterMembership}
 * and the datapath above are transport-agnostic.
 */
export interface IClusterPeerTransport {

    /**
     * Listen for inbound peer connections, authenticating each before handing up a
     * channel. Returns the bound port (pass 0 to get an OS-assigned one).
     * @param port - the port to bind (0 = OS-assigned)
     * @param onPeer - called with each authenticated inbound peer channel
     */
    listen(port: number, onPeer: ClusterPeerHandler): Promise<number>;

    /**
     * Connect to a peer, authenticating it before returning the channel.
     * @param host - the peer host
     * @param port - the peer port
     */
    connect(host: string, port: number): Promise<ClusterPeerChannel>;

    /**
     * Run the one-port bootstrap pre-flight against a not-yet-trusted peer (model (b)
     * cross-Hub join): dial it, exchange CA chains + the join token over that
     * connection, pin the peer's CA against the expected fingerprint, hand the pinned
     * CA up via the dial context, then close. Returns true if mutual trust material
     * was exchanged (the caller then re-dials normally to form the mesh channel).
     * Optional — a transport without it cannot bootstrap (the seed just never trusts).
     * @param host - the peer host
     * @param port - the peer port
     * @param dial - the dial-side bootstrap params (token, pin, own CA, sink)
     */
    bootstrap?(host: string, port: number, dial: ClusterDialBootstrap): Promise<boolean>;

    /**
     * Stop listening.
     */
    close(): Promise<void>;

}