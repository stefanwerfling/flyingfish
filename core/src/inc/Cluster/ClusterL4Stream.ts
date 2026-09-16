import {ClusterL4ClientInfo, ClusterL4Target} from './ClusterL4Frame.js';

/**
 * A local L4 endpoint the tunnel pumps bytes through (Cluster/Mesh epic 9.5.2):
 * either a socket accepted by the ingress listener or a socket the egress dialed to
 * the target. The tunnel engine ({@link ClusterL4Session}) is written entirely
 * against this interface so it is socket-agnostic — a real net.Socket adapter in
 * production, a fake in tests.
 */
export interface IClusterL4Stream {

    /**
     * Write payload bytes to the local endpoint.
     * @param data - the bytes
     */
    write(data: Uint8Array): void;

    /**
     * Register the inbound-data handler (bytes read from the local endpoint, to be
     * tunnelled to the peer).
     * @param handler - called with each chunk
     */
    onData(handler: (data: Uint8Array) => void): void;

    /**
     * Register the close handler (the local endpoint ended or errored).
     * @param handler - called once when the endpoint closes
     */
    onClose(handler: () => void): void;

    /**
     * Close the local endpoint.
     */
    close(): void;

}

/**
 * Dials the egress-side target of a tunnelled stream (Cluster/Mesh epic 9.5.2). The
 * egress role of {@link ClusterL4Session} calls this on each inbound Open; the
 * production implementation opens a TCP/UDP socket, a fake resolves a fake stream.
 */
export interface IClusterL4Dialer {

    /**
     * Connect to the target and resolve a stream over it, or reject if the connect
     * fails (the session then answers OpenAck(fail)). When `clientInfo` is given, the
     * dialer preserves the original client endpoint on the backend connection (e.g. a
     * PROXY protocol v2 header), Cluster/Mesh epic 9.5.3.
     * @param target - where to connect
     * @param clientInfo - the original client endpoint to preserve, optional
     */
    dial(target: ClusterL4Target, clientInfo?: ClusterL4ClientInfo): Promise<IClusterL4Stream>;

}