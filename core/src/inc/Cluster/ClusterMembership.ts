import {ClusterPeerChannel} from './ClusterPeerChannel.js';
import {IClusterPeerTransport} from './ClusterPeerTransport.js';

/**
 * One discoverable cluster peer: its stable nodeUid and where to reach its peer
 * transport.
 */
export type ClusterPeerInfo = {
    nodeUid: string;
    host: string;
    port: number;
};

/**
 * The source of the cluster peer roster (Cluster/Mesh epic 9.5.1). Injectable so
 * membership is testable without a Hub; the production implementation fetches the
 * roster from the Hub registry.
 */
export type ClusterPeerRoster = {
    list(): Promise<ClusterPeerInfo[]>;
};

/**
 * Maintains this node's live set of connected cluster peers (Cluster/Mesh epic
 * 9.5.1, peer discovery). It owns an {@link IClusterPeerTransport} (TCP-TLS or
 * WSS/443): inbound
 * authenticated peers are tracked, and on {@link ClusterMembership.sync} the
 * roster is fetched and outbound connections are opened. To avoid two channels
 * per pair (both nodes dialing each other), a node only dials peers whose nodeUid
 * is greater than its own; the lower-nodeUid side accepts the inbound connection.
 * Peers are keyed by nodeUid, so a duplicate connection is dropped and a closed
 * channel is removed.
 */
export class ClusterMembership {

    private readonly _transport: IClusterPeerTransport;

    private readonly _selfNodeUid: string;

    private readonly _peers: Map<string, ClusterPeerChannel> = new Map();

    /**
     * @param transport - this node's peer transport
     * @param selfNodeUid - this node's own cluster nodeUid
     */
    public constructor(transport: IClusterPeerTransport, selfNodeUid: string) {
        this._transport = transport;
        this._selfNodeUid = selfNodeUid;
    }

    /**
     * Start listening for inbound peers. Returns the bound port (pass 0 for an
     * OS-assigned one).
     * @param port - the port to bind (0 = OS-assigned)
     */
    public async start(port: number): Promise<number> {
        return this._transport.listen(port, (channel: ClusterPeerChannel): void => this._addPeer(channel));
    }

    /**
     * Fetch the roster and dial peers not yet connected (only those with a greater
     * nodeUid, so each pair connects once). Best-effort: an unreachable peer is
     * skipped, not fatal.
     * @param roster - the peer roster source
     */
    public async sync(roster: ClusterPeerRoster): Promise<void> {
        const peers = await roster.list();

        await Promise.all(peers.map(async(peer: ClusterPeerInfo): Promise<void> => {
            if (peer.nodeUid === this._selfNodeUid || this._peers.has(peer.nodeUid) || this._selfNodeUid >= peer.nodeUid) {
                return;
            }

            try {
                this._addPeer(await this._transport.connect(peer.host, peer.port));
            } catch {
                // best-effort: an unreachable peer is retried on the next sync
            }
        }));
    }

    /**
     * The nodeUids of the currently connected peers.
     */
    public peers(): string[] {
        return Array.from(this._peers.keys());
    }

    /**
     * The channel to a connected peer, or undefined.
     * @param nodeUid - the peer's nodeUid
     */
    public getChannel(nodeUid: string): ClusterPeerChannel | undefined {
        return this._peers.get(nodeUid);
    }

    /**
     * Close all peer channels and stop the transport.
     */
    public async stop(): Promise<void> {
        for (const channel of this._peers.values()) {
            channel.close();
        }

        this._peers.clear();

        await this._transport.close();
    }

    /**
     * Track a newly-connected peer channel, keyed by its verified nodeUid. A
     * duplicate for an already-connected peer is closed; a closed channel is
     * removed from the set.
     * @param channel - the authenticated peer channel
     */
    private _addPeer(channel: ClusterPeerChannel): void {
        const nodeUid = channel.identity.nodeUid;

        if (this._peers.has(nodeUid)) {
            channel.close();
            return;
        }

        this._peers.set(nodeUid, channel);

        channel.onClose((): void => {
            if (this._peers.get(nodeUid) === channel) {
                this._peers.delete(nodeUid);
            }
        });
    }

}