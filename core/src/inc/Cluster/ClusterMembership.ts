import {ClusterDialBootstrap, IClusterPeerTransport} from './ClusterPeerTransport.js';
import {ClusterPeerChannel} from './ClusterPeerChannel.js';

/**
 * One discoverable cluster peer: its stable nodeUid, where to reach its peer
 * transport, and (for datapath nodes) its overlay IP inside the mesh.
 */
export type ClusterPeerInfo = {
    nodeUid: string;
    host: string;
    port: number;
    overlayIp?: string;
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

    private _peerListener: ((channel: ClusterPeerChannel) => void) | null = null;

    private readonly _seedPeers: {host: string; port: number; nodeUid?: string; bootstrap?: ClusterDialBootstrap; bootstrapped?: boolean;}[] = [];

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
        let peers: ClusterPeerInfo[] = [];

        try {
            peers = await roster.list();
        } catch {
            // best-effort: the Hub roster may be transiently unreachable (or, in a
            // fresh cluster, present a not-yet-valid cert). Seed peers (the bootstrap
            // join) are dialed regardless below, so a node can still join a cluster
            // whose roster it is not in yet — the mesh does not depend on the Hub.
        }

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

        await this._dialSeeds();
    }

    /**
     * Register a bootstrap seed peer to dial by address (Cluster/Mesh epic 9.5.12.2,
     * cross-Hub join). Unlike a roster peer, a seed is dialed UNCONDITIONALLY — the
     * lower-dials-higher rule is bypassed — because the seed's Hub does not know this
     * node yet: the join package carries the seed's mesh endpoint so a node can
     * bootstrap into a cluster whose roster it is not in. Idempotent by host:port; the
     * dial is (re)attempted on each {@link ClusterMembership.sync} until connected.
     * @param host - the seed peer host
     * @param port - the seed peer port
     * @param bootstrap - optional one-port bootstrap params (join token + CA pin); when
     *        given, the seed is first bootstrapped (CA/token exchange) so that both
     *        sides trust each other before the normal dial forms the mesh channel.
     */
    public addSeedPeer(host: string, port: number, bootstrap?: ClusterDialBootstrap): void {
        if (!this._seedPeers.some((seed): boolean => seed.host === host && seed.port === port)) {
            this._seedPeers.push({host: host, port: port, bootstrap: bootstrap});
        }
    }

    /**
     * Dial each seed peer not currently connected. Best-effort and unconditional
     * (bootstrap): once a seed connects, its learned nodeUid keeps it from being
     * re-dialed while the channel is live.
     * @protected
     */
    protected async _dialSeeds(): Promise<void> {
        await Promise.all(this._seedPeers.map(async(seed): Promise<void> => {
            if (seed.nodeUid !== undefined && this._peers.has(seed.nodeUid)) {
                return;
            }

            // One-port join: run the bootstrap pre-flight ONCE before any normal dial so
            // both sides exchange + trust each other's CA; the next sync's normal connect
            // then authenticates and forms the mesh channel.
            if (seed.bootstrap !== undefined && seed.bootstrapped !== true && this._transport.bootstrap !== undefined) {
                try {
                    if (await this._transport.bootstrap(seed.host, seed.port, seed.bootstrap)) {
                        seed.bootstrapped = true;
                    }
                } catch {
                    // best-effort: retry the bootstrap on the next sync
                }

                return;
            }

            try {
                const channel = await this._transport.connect(seed.host, seed.port);

                seed.nodeUid = channel.identity.nodeUid;
                this._addPeer(channel);
            } catch {
                // best-effort: retry on the next sync
            }
        }));
    }

    /**
     * Observe each newly-connected peer channel (inbound or outbound). Set this
     * before {@link ClusterMembership.start} so no peer is missed; the L3 datapath
     * ({@link ClusterDatapath}) uses it to attach its inbound message handler.
     * @param listener - called with each accepted peer channel
     */
    public onPeer(listener: (channel: ClusterPeerChannel) => void): void {
        this._peerListener = listener;
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

        if (this._peerListener !== null) {
            this._peerListener(channel);
        }
    }

}