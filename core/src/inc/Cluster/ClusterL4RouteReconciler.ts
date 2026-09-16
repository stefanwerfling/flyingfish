import {ClusterL4Route, clusterL4RouteAssignedTo, clusterL4RouteEqual} from './ClusterL4Route.js';

/**
 * A handle to a bound ingress listener, closed when its route goes away or changes.
 */
export type ClusterL4RouteHandle = {
    close(): Promise<void>;
};

/**
 * Binds one route's ingress listener and returns a handle to close it, or null if
 * the bind failed (e.g. the port is taken) — a failed bind is retried on the next
 * reconcile. Supplied by the node wiring, which knows the tunnel coordinator.
 */
export type ClusterL4RouteBinder = (route: ClusterL4Route) => Promise<ClusterL4RouteHandle | null>;

/**
 * Reconciles this node's bound ingress listeners against the cluster-wide L4 route
 * set (Cluster/Mesh epic 9.5.4). On each sync the node fetches the current routes
 * and calls {@link ClusterL4RouteReconciler.reconcile}: routes assigned to this node
 * (its nodeUid or the wildcard) that are not yet bound are bound; bound listeners
 * whose route disappeared or materially changed are closed (a change closes then
 * rebinds); unchanged routes are left running. This turns static per-node tunnel
 * config into cluster-managed, dynamically-applied routing — no restart to add or
 * remove a service. Keyed by route id, so an unchanged set is a no-op.
 */
export class ClusterL4RouteReconciler {

    private readonly _selfNodeUid: string;

    private readonly _binder: ClusterL4RouteBinder;

    private readonly _active: Map<string, {route: ClusterL4Route; handle: ClusterL4RouteHandle;}> = new Map();

    /**
     * @param selfNodeUid - this node's cluster nodeUid
     * @param binder - binds a route's ingress listener
     */
    public constructor(selfNodeUid: string, binder: ClusterL4RouteBinder) {
        this._selfNodeUid = selfNodeUid;
        this._binder = binder;
    }

    /**
     * Apply a route set: close listeners that are gone or changed, then bind the
     * routes assigned to this node that are not already bound.
     * @param routes - the current cluster-wide route set
     */
    public async reconcile(routes: readonly ClusterL4Route[]): Promise<void> {
        const desired = new Map<string, ClusterL4Route>();

        for (const route of routes) {
            if (clusterL4RouteAssignedTo(route, this._selfNodeUid)) {
                desired.set(route.id, route);
            }
        }

        await this._closeStale(desired);
        await this._bindMissing(desired);
    }

    /**
     * The number of currently bound ingress listeners.
     */
    public activeCount(): number {
        return this._active.size;
    }

    /**
     * Close every bound listener (node shutdown).
     */
    public async closeAll(): Promise<void> {
        const handles = Array.from(this._active.values(), (entry) => entry.handle);
        this._active.clear();

        await Promise.all(handles.map((handle) => handle.close()));
    }

    /**
     * Close listeners whose route disappeared from, or changed in, the desired set.
     * @param desired - the routes this node should have bound
     */
    private async _closeStale(desired: Map<string, ClusterL4Route>): Promise<void> {
        const stale: {id: string; handle: ClusterL4RouteHandle;}[] = [];

        for (const [id, entry] of this._active) {
            const want = desired.get(id);

            if (want === undefined || !clusterL4RouteEqual(want, entry.route)) {
                stale.push({id: id, handle: entry.handle});
            }
        }

        for (const entry of stale) {
            this._active.delete(entry.id);
        }

        await Promise.all(stale.map((entry) => entry.handle.close()));
    }

    /**
     * Bind the desired routes that are not currently bound.
     * @param desired - the routes this node should have bound
     */
    private async _bindMissing(desired: Map<string, ClusterL4Route>): Promise<void> {
        const missing: ClusterL4Route[] = [];

        for (const [id, route] of desired) {
            if (!this._active.has(id)) {
                missing.push(route);
            }
        }

        await Promise.all(missing.map(async(route): Promise<void> => {
            const handle = await this._binder(route);

            if (handle !== null) {
                this._active.set(route.id, {route: route, handle: handle});
            }
        }));
    }

}