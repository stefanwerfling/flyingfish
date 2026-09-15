import {ClusterPeer} from 'flyingfish_schemas';

/**
 * One announced cluster peer plus when it last announced (for TTL eviction).
 */
export type ClusterPeerRecord = ClusterPeer & {
    announcedAt: number;
};

/**
 * A cluster peer is dropped from the roster if it has not re-announced within
 * this window (~3 missed heartbeats).
 */
const DEFAULT_TTL_MS = 90000;

/**
 * The Hub's in-memory directory of cluster peer transport endpoints (Cluster/Mesh
 * epic 9.5.1, peer discovery). A cluster node announces where its peer transport
 * listens; other nodes read the roster to dial them. Purely in-memory (no DB) and
 * TTL-evicted, so a node that stops re-announcing falls off. This is the initial
 * Hub-bootstrapped discovery; a later gossip layer can replace it for the fully
 * federated (Proxmox-style, 9.5.12) model.
 */
export class ClusterPeerDirectory {

    private readonly _ttlMs: number;

    private readonly _peers: Map<string, ClusterPeerRecord> = new Map();

    /**
     * @param ttlMs - how long an announcement stays valid
     */
    public constructor(ttlMs: number = DEFAULT_TTL_MS) {
        this._ttlMs = ttlMs;
    }

    /**
     * Announce (or refresh) a cluster peer's endpoint.
     * @param nodeUid - the peer's stable nodeUid
     * @param host - the peer transport host
     * @param port - the peer transport port
     * @param now - the current time (epoch ms)
     */
    public announce(nodeUid: string, host: string, port: number, now: number = Date.now()): void {
        this._peers.set(nodeUid, {nodeUid: nodeUid, host: host, port: port, announcedAt: now});
    }

    /**
     * The currently fresh cluster peers, evicting any that have gone stale.
     * @param now - the current time (epoch ms)
     */
    public peers(now: number = Date.now()): ClusterPeer[] {
        const fresh: ClusterPeer[] = [];

        for (const [nodeUid, record] of this._peers) {
            if (now - record.announcedAt > this._ttlMs) {
                this._peers.delete(nodeUid);
            } else {
                fresh.push({nodeUid: record.nodeUid, host: record.host, port: record.port});
            }
        }

        return fresh;
    }

    /**
     * Remove a cluster peer (graceful shutdown).
     * @param nodeUid - the peer's nodeUid
     */
    public remove(nodeUid: string): boolean {
        return this._peers.delete(nodeUid);
    }

    /**
     * Remove all cluster peers (test isolation).
     */
    public clear(): void {
        this._peers.clear();
    }

}