import {ClusterStateEntry} from 'flyingfish_schemas';

/**
 * Holds the latest converged cluster-wide gossip aggregate a local clusterserver
 * pushed to this Hub (Cluster/Mesh epic 9.5.12 phase 2b). The Hub is DB-authoritative
 * for its OWN resources but has no mesh connectivity itself; its clusterserver gossips
 * and hands the whole-cluster view back here so the frontend can read it. Purely
 * in-memory and last-write-wins per push — the gossip layer already did the merging.
 */
export class ClusterAggregateStore {

    private _entries: ClusterStateEntry[] = [];

    /**
     * The uid of THIS node — the local clusterserver sends its own nodeUid with every
     * aggregate push. It is the only self-authoritative node identity that reaches the
     * Hub (the Hub has no mesh identity of its own), so the frontend can tell which
     * roster entry is "this node". Null until the local clusterserver has pushed once.
     */
    private _selfNodeUid: string | null = null;

    /**
     * Replace the aggregate with the latest pushed set.
     * @param entries - the converged cluster-wide entries
     */
    public set(entries: ClusterStateEntry[]): void {
        this._entries = entries;
    }

    /**
     * The latest cluster-wide aggregate (empty until a clusterserver pushes one).
     */
    public entries(): ClusterStateEntry[] {
        return this._entries;
    }

    /**
     * Record this node's own uid, as reported by the local clusterserver on an
     * aggregate push.
     * @param nodeUid - the local node's uid
     */
    public setSelfNodeUid(nodeUid: string): void {
        this._selfNodeUid = nodeUid;
    }

    /**
     * This node's own uid, or null if the local clusterserver has not pushed yet.
     */
    public selfNodeUid(): string | null {
        return this._selfNodeUid;
    }

    /**
     * Drop the aggregate (test isolation).
     */
    public clear(): void {
        this._entries = [];
        this._selfNodeUid = null;
    }

}