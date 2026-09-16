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
     * Drop the aggregate (test isolation).
     */
    public clear(): void {
        this._entries = [];
    }

}