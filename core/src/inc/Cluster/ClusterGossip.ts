import {IClusterMessageChannel} from './ClusterMessageChannel.js';
import {ClusterGossipCodec, ClusterGossipDigestItem, ClusterGossipMessageType} from './ClusterGossipMessage.js';
import {ClusterGossipEntry, ClusterGossipStore, ClusterGossipVersion, clusterGossipVersionNewer} from './ClusterGossipStore.js';

/**
 * The anti-entropy gossip engine (Cluster/Mesh epic 9.5.12): drives a
 * {@link ClusterGossipStore} to convergence across the cluster over the peer links'
 * {@link ClusterMuxKind.Gossip} sub-channels. On {@link ClusterGossip.sync} the node
 * offers each peer a digest (key→version); the peer answers with the entries it is
 * newer on and requests the keys the digest is newer on, and that request is answered
 * with entries — so one exchange reconciles a pair in both directions, and repeated
 * sync rounds propagate state transitively across the whole mesh (no leader). A local
 * write can also be pushed eagerly with {@link ClusterGossip.broadcast}. Malformed
 * messages are dropped.
 */
export class ClusterGossip {

    private readonly _store: ClusterGossipStore;

    private readonly _peers: Map<string, IClusterMessageChannel> = new Map();

    /**
     * @param store - the replicated store this engine converges
     */
    public constructor(store: ClusterGossipStore) {
        this._store = store;
    }

    /**
     * Register a peer's gossip sub-channel. Idempotent per nodeUid.
     * @param nodeUid - the peer's cluster nodeUid
     * @param channel - the peer's gossip mux sub-channel
     */
    public addPeer(nodeUid: string, channel: IClusterMessageChannel): void {
        if (this._peers.has(nodeUid)) {
            return;
        }

        this._peers.set(nodeUid, channel);
        channel.onMessage((message: Uint8Array): void => this._onMessage(channel, message));
    }

    /**
     * Forget a peer.
     * @param nodeUid - the peer's cluster nodeUid
     */
    public removePeer(nodeUid: string): void {
        this._peers.delete(nodeUid);
    }

    /**
     * Offer every peer this node's digest, starting an anti-entropy round.
     */
    public sync(): void {
        if (this._peers.size === 0) {
            return;
        }

        const digest = ClusterGossipCodec.encode({type: ClusterGossipMessageType.Digest, digest: this._digest()});

        for (const channel of this._peers.values()) {
            channel.send(digest);
        }
    }

    /**
     * Eagerly push one entry (e.g. a fresh local write) to every peer.
     * @param entry - the entry to push
     */
    public broadcast(entry: ClusterGossipEntry): void {
        const message = ClusterGossipCodec.encode({type: ClusterGossipMessageType.Entries, entries: [entry]});

        for (const channel of this._peers.values()) {
            channel.send(message);
        }
    }

    /**
     * The number of registered peers.
     */
    public peerCount(): number {
        return this._peers.size;
    }

    /**
     * Handle one inbound gossip message from a peer.
     * @param channel - the peer's channel (to answer on)
     * @param bytes - the raw message
     */
    private _onMessage(channel: IClusterMessageChannel, bytes: Uint8Array): void {
        const message = ClusterGossipCodec.decode(bytes);

        if (message === null) {
            return;
        }

        switch (message.type) {
            case ClusterGossipMessageType.Digest:
                this._onDigest(channel, message.digest);
                break;

            case ClusterGossipMessageType.Entries:
                this._onEntries(message);
                break;

            case ClusterGossipMessageType.Request:
                this._onRequest(channel, message.keys);
                break;

            default:
                break;
        }
    }

    /**
     * Answer a peer's digest: push the entries this node is newer on (or the peer
     * lacks), and request the keys the peer is newer on (or this node lacks).
     * @param channel - the peer's channel
     * @param digest - the peer's key→version digest
     */
    private _onDigest(channel: IClusterMessageChannel, digest: ClusterGossipDigestItem[]): void {
        const peerVersions = new Map<string, ClusterGossipVersion>();

        for (const item of digest) {
            peerVersions.set(item.key, item.version);
        }

        const toPush: ClusterGossipEntry[] = [];

        for (const entry of this._store.entries()) {
            const peerVersion = peerVersions.get(entry.key);

            if (peerVersion === undefined || clusterGossipVersionNewer(entry.version, peerVersion)) {
                toPush.push(entry);
            }
        }

        const toRequest: string[] = [];
        const mine = this._store.summary();

        for (const item of digest) {
            const myVersion = mine.get(item.key);

            if (myVersion === undefined || clusterGossipVersionNewer(item.version, myVersion)) {
                toRequest.push(item.key);
            }
        }

        if (toPush.length > 0) {
            channel.send(ClusterGossipCodec.encode({type: ClusterGossipMessageType.Entries, entries: toPush}));
        }

        if (toRequest.length > 0) {
            channel.send(ClusterGossipCodec.encode({type: ClusterGossipMessageType.Request, keys: toRequest}));
        }
    }

    /**
     * Merge received entries into the store.
     * @param message - the Entries message
     */
    private _onEntries(message: {entries: ClusterGossipEntry[];}): void {
        for (const entry of message.entries) {
            this._store.merge(entry);
        }
    }

    /**
     * Answer a peer's request with the full entries it asked for (those this node has).
     * @param channel - the peer's channel
     * @param keys - the requested keys
     */
    private _onRequest(channel: IClusterMessageChannel, keys: string[]): void {
        const entries: ClusterGossipEntry[] = [];

        for (const key of keys) {
            const entry = this._store.entry(key);

            if (entry !== undefined) {
                entries.push(entry);
            }
        }

        if (entries.length > 0) {
            channel.send(ClusterGossipCodec.encode({type: ClusterGossipMessageType.Entries, entries: entries}));
        }
    }

    /**
     * This node's digest (key→version for every entry).
     */
    private _digest(): ClusterGossipDigestItem[] {
        return this._store.entries().map((entry) => ({key: entry.key, version: entry.version}));
    }

}