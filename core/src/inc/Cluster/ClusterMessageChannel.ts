/**
 * A minimal bidirectional message channel (Cluster/Mesh epic 9.5.2): something the
 * datapath and the L4 tunnel can send discrete messages over and receive them
 * back. A raw {@link ClusterPeerChannel} satisfies it directly (one subsystem per
 * peer), and each sub-channel handed out by {@link ClusterPeerMux} satisfies it too
 * (many subsystems multiplexed over one peer). Keeping the datapath and tunnel
 * bound to this interface — rather than to a concrete channel — is what lets L3
 * packets and L4 connection streams share the single authenticated peer link.
 */
export interface IClusterMessageChannel {

    /**
     * Send one message to the peer.
     * @param message - the message bytes
     */
    send(message: Uint8Array): void;

    /**
     * Register the inbound-message handler (last registration wins).
     * @param handler - called with each complete message
     */
    onMessage(handler: (message: Uint8Array) => void): void;

}