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
    caChain: string[];
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
     * Stop listening.
     */
    close(): Promise<void>;

}