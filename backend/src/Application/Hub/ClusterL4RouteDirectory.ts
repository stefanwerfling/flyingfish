import {ClusterL4Route} from 'flyingfish_schemas';

/**
 * One publisher's route set plus when it last published (for TTL eviction).
 */
export type ClusterL4RouteRecord = {
    routes: ClusterL4Route[];
    publishedAt: number;
};

/**
 * A publisher's route set is dropped if it has not re-published within this window
 * (~3 missed heartbeats).
 */
const DEFAULT_TTL_MS = 90000;

/**
 * The Hub's in-memory directory of cluster-wide L4 routes (Cluster/Mesh epic 9.5.4).
 * Each datapath node publishes the routes it owns; every node reads the flattened
 * set and reconciles its ingress listeners against it. Keyed by publisher nodeUid
 * and TTL-evicted (purely in-memory, no DB), so a publisher that stops re-publishing
 * has its routes fall off — mirroring the peer directory. This is the initial
 * Hub-bootstrapped route sync; a later gossip layer can replace it for the fully
 * federated (9.5.12) model.
 */
export class ClusterL4RouteDirectory {

    private readonly _ttlMs: number;

    private readonly _byPublisher: Map<string, ClusterL4RouteRecord> = new Map();

    /**
     * @param ttlMs - how long a publisher's route set stays valid
     */
    public constructor(ttlMs: number = DEFAULT_TTL_MS) {
        this._ttlMs = ttlMs;
    }

    /**
     * Publish (or refresh) the route set a node owns.
     * @param nodeUid - the publishing node's nodeUid
     * @param routes - the routes it owns
     * @param now - the current time (epoch ms)
     */
    public publish(nodeUid: string, routes: ClusterL4Route[], now: number = Date.now()): void {
        this._byPublisher.set(nodeUid, {routes: routes, publishedAt: now});
    }

    /**
     * The full, flattened set of currently-fresh routes, evicting stale publishers.
     * @param now - the current time (epoch ms)
     */
    public routes(now: number = Date.now()): ClusterL4Route[] {
        const fresh: ClusterL4Route[] = [];

        for (const [nodeUid, record] of this._byPublisher) {
            if (now - record.publishedAt > this._ttlMs) {
                this._byPublisher.delete(nodeUid);
            } else {
                fresh.push(...record.routes);
            }
        }

        return fresh;
    }

    /**
     * Remove a publisher's route set (graceful shutdown).
     * @param nodeUid - the publisher's nodeUid
     */
    public remove(nodeUid: string): boolean {
        return this._byPublisher.delete(nodeUid);
    }

    /**
     * Remove all routes (test isolation).
     */
    public clear(): void {
        this._byPublisher.clear();
    }

}