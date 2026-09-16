/**
 * The version of a gossip entry (Cluster/Mesh epic 9.5.12): a Lamport clock with
 * the writer's nodeUid as a deterministic tiebreak, so any two versions of the same
 * key have a total order and every node converges to the same last-writer-wins value
 * without a leader.
 */
export type ClusterGossipVersion = {
    lamport: number;
    nodeUid: string;
};

/**
 * One replicated entry: a key, its value (arbitrary JSON), its version, and whether
 * it is a tombstone (a propagated delete).
 */
export type ClusterGossipEntry = {
    key: string;
    value: unknown;
    version: ClusterGossipVersion;
    deleted: boolean;
};

/**
 * Whether version `a` is strictly newer than `b`: a higher Lamport wins, ties break
 * on the greater nodeUid.
 * @param a - one version
 * @param b - the other version
 */
export const clusterGossipVersionNewer = (a: ClusterGossipVersion, b: ClusterGossipVersion): boolean => {
    if (a.lamport !== b.lamport) {
        return a.lamport > b.lamport;
    }

    return a.nodeUid > b.nodeUid;
};

/**
 * A versioned, last-writer-wins state store gossiped across the cluster (Cluster/Mesh
 * epic 9.5.12, gossip-core). Each node holds the whole replicated map; local writes
 * bump a Lamport clock and stamp the entry with {lamport, selfNodeUid}. {@link
 * ClusterGossipStore.merge} folds in an entry heard from a peer, keeping the newer
 * version and advancing the Lamport clock, so independent nodes converge to the same
 * state regardless of message order or concurrent writes (ties break deterministically
 * on nodeUid). Deletes are tombstones so they propagate. Pure in-memory, no I/O — the
 * gossip engine drives the anti-entropy exchange on top.
 */
export class ClusterGossipStore {

    private readonly _selfNodeUid: string;

    private readonly _entries: Map<string, ClusterGossipEntry> = new Map();

    private _lamport = 0;

    /**
     * @param selfNodeUid - this node's cluster nodeUid (stamped on local writes)
     */
    public constructor(selfNodeUid: string) {
        this._selfNodeUid = selfNodeUid;
    }

    /**
     * Write (or overwrite) a key with a fresh local version.
     * @param key - the entry key
     * @param value - the value (must be JSON-serialisable for gossip)
     */
    public set(key: string, value: unknown): ClusterGossipEntry {
        return this._stamp(key, value, false);
    }

    /**
     * Tombstone a key (a delete that propagates). Idempotent: always produces a fresh
     * tombstone version so the delete wins over an older value on every node.
     * @param key - the entry key
     */
    public remove(key: string): ClusterGossipEntry {
        return this._stamp(key, null, true);
    }

    /**
     * The live value of a key, or undefined if absent or tombstoned.
     * @param key - the entry key
     */
    public get(key: string): unknown {
        const entry = this._entries.get(key);

        return entry === undefined || entry.deleted ? undefined : entry.value;
    }

    /**
     * Whether a live (non-tombstoned) entry exists for a key.
     * @param key - the entry key
     */
    public has(key: string): boolean {
        const entry = this._entries.get(key);

        return entry !== undefined && !entry.deleted;
    }

    /**
     * Every entry, tombstones included — what the gossip engine exchanges.
     */
    public entries(): ClusterGossipEntry[] {
        return Array.from(this._entries.values());
    }

    /**
     * The live entries (tombstones excluded) — the effective cluster state.
     */
    public liveEntries(): ClusterGossipEntry[] {
        return this.entries().filter((entry) => !entry.deleted);
    }

    /**
     * A digest of key → version for anti-entropy (no values).
     */
    public summary(): Map<string, ClusterGossipVersion> {
        const digest = new Map<string, ClusterGossipVersion>();

        for (const [key, entry] of this._entries) {
            digest.set(key, entry.version);
        }

        return digest;
    }

    /**
     * Fold in an entry heard from a peer. Adopts it if strictly newer than the local
     * one (or the key is new), and always advances the Lamport clock past what it has
     * observed. Returns whether local state changed.
     * @param remote - the entry received from a peer
     */
    public merge(remote: ClusterGossipEntry): boolean {
        this._lamport = Math.max(this._lamport, remote.version.lamport);

        const local = this._entries.get(remote.key);

        if (local !== undefined && !clusterGossipVersionNewer(remote.version, local.version)) {
            return false;
        }

        this._entries.set(remote.key, remote);

        return true;
    }

    /**
     * The current Lamport clock (observability / tests).
     */
    public lamport(): number {
        return this._lamport;
    }

    /**
     * Stamp a local write/tombstone with the next Lamport version and store it.
     * @param key - the entry key
     * @param value - the value (null for a tombstone)
     * @param deleted - whether this is a tombstone
     */
    private _stamp(key: string, value: unknown, deleted: boolean): ClusterGossipEntry {
        this._lamport += 1;

        const entry: ClusterGossipEntry = {
            key: key,
            value: value,
            version: {lamport: this._lamport, nodeUid: this._selfNodeUid},
            deleted: deleted
        };

        this._entries.set(key, entry);

        return entry;
    }

}