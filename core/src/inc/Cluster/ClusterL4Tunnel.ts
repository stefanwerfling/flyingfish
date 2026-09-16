import {IClusterMessageChannel} from './ClusterMessageChannel.js';
import {ClusterL4Target} from './ClusterL4Frame.js';
import {ClusterL4Session} from './ClusterL4Session.js';
import {IClusterL4Dialer, IClusterL4Stream} from './ClusterL4Stream.js';

/**
 * Coordinates the L4 tunnel across all connected peers (Cluster/Mesh epic 9.5.2).
 * It holds one {@link ClusterL4Session} per peer, keyed by nodeUid, and is the entry
 * point the node wiring uses: {@link ClusterL4Tunnel.addPeer} on each new peer (its
 * L4 mux sub-channel), {@link ClusterL4Tunnel.removePeer} when the link drops, and
 * {@link ClusterL4Tunnel.open} to start a tunnelled stream to a chosen egress peer
 * (an ingress listener calls this per accepted connection).
 *
 * The per-peer streamId parity a session needs is derived here from the stable
 * nodeUid ordering (this node's nodeUid vs the peer's), so both ends agree without
 * any negotiation. The tunnel needs no TUN device or privilege — it works purely
 * over the authenticated peer link, so L4 forwarding runs even where L3 does not.
 */
export class ClusterL4Tunnel {

    private readonly _selfNodeUid: string;

    private readonly _dialer: IClusterL4Dialer;

    private readonly _sessions: Map<string, ClusterL4Session> = new Map();

    /**
     * @param selfNodeUid - this node's own cluster nodeUid
     * @param dialer - dials egress targets for inbound streams (TCP in production)
     */
    public constructor(selfNodeUid: string, dialer: IClusterL4Dialer) {
        this._selfNodeUid = selfNodeUid;
        this._dialer = dialer;
    }

    /**
     * Register a newly-connected peer by its L4 mux sub-channel. Idempotent per
     * nodeUid (a duplicate is ignored).
     * @param nodeUid - the peer's cluster nodeUid
     * @param channel - the peer's L4 mux sub-channel
     */
    public addPeer(nodeUid: string, channel: IClusterMessageChannel): void {
        if (this._sessions.has(nodeUid)) {
            return;
        }

        this._sessions.set(nodeUid, new ClusterL4Session(channel, this._dialer, this._selfNodeUid < nodeUid));
    }

    /**
     * Drop a peer: close its session (tearing down its streams) and forget it.
     * @param nodeUid - the peer's cluster nodeUid
     */
    public removePeer(nodeUid: string): void {
        const session = this._sessions.get(nodeUid);

        if (session !== undefined) {
            session.close();
            this._sessions.delete(nodeUid);
        }
    }

    /**
     * Open a tunnelled stream from a local (ingress) endpoint to an egress peer. If
     * that peer is not currently connected, the local endpoint is closed and false is
     * returned.
     * @param nodeUid - the egress peer's cluster nodeUid
     * @param target - where the egress should connect
     * @param local - the local (ingress) endpoint
     */
    public open(nodeUid: string, target: ClusterL4Target, local: IClusterL4Stream): boolean {
        const session = this._sessions.get(nodeUid);

        if (session === undefined) {
            local.close();

            return false;
        }

        session.openStream(target, local);

        return true;
    }

    /**
     * Whether a peer is currently connected.
     * @param nodeUid - the peer's cluster nodeUid
     */
    public hasPeer(nodeUid: string): boolean {
        return this._sessions.has(nodeUid);
    }

    /**
     * The number of connected peers with a session.
     */
    public peerCount(): number {
        return this._sessions.size;
    }

}