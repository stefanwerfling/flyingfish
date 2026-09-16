import {ClusterL4Proto} from './ClusterL4Frame.js';
import {ClusterL4Route} from './ClusterL4Route.js';
import {ClusterFetch} from './HubClusterPeerRoster.js';

/**
 * Options for {@link HubClusterL4RouteProvider}.
 */
export type HubClusterL4RouteProviderOptions = {
    hubUrl: string;
    selfNodeUid: string;
    secret?: string;
    fetchImpl?: ClusterFetch;
};

const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * The wire form of a route (proto as a string) as published to / read from the Hub.
 */
type ClusterL4RouteWire = {
    id: string;
    proto?: string;
    ingressNodeUid: string;
    listenHost?: string;
    listenPort: number;
    egressNodeUid: string;
    targetHost: string;
    targetPort: number;
    proxyProtocol?: boolean;
};

/**
 * The Hub-backed cluster L4 route source (Cluster/Mesh epic 9.5.4): publishes the
 * routes this node owns to the Hub (TTL-refreshed) and reads back the full
 * cluster-wide route set a {@link ClusterL4RouteReconciler} applies. Mirrors
 * {@link HubClusterPeerRoster}: same registry-secret auth, same injectable fetch,
 * and it converts between the wire form (proto as a string) and the core
 * {@link ClusterL4Route} (proto as {@link ClusterL4Proto}). Malformed entries are
 * skipped so one bad route can never break the sync.
 */
export class HubClusterL4RouteProvider {

    private readonly _hubUrl: string;

    private readonly _selfNodeUid: string;

    private readonly _secret: string;

    private readonly _fetch: ClusterFetch;

    /**
     * @param options - the Hub URL, this node's nodeUid, the registry secret and an
     *                  optional fetch implementation
     */
    public constructor(options: HubClusterL4RouteProviderOptions) {
        this._hubUrl = options.hubUrl.replace(/\/+$/u, '');
        this._selfNodeUid = options.selfNodeUid;
        this._secret = options.secret ?? '';
        this._fetch = options.fetchImpl ?? (fetch as unknown as ClusterFetch);
    }

    /**
     * Publish the routes this node owns to the Hub (refreshes its TTL).
     * @param routes - the routes this node owns
     */
    public async publish(routes: readonly ClusterL4Route[]): Promise<void> {
        await this._fetch(`${this._hubUrl}/json/registry/cluster/routes/publish`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                [HEADER_REGISTRY_SECRET]: this._secret
            },
            body: JSON.stringify({nodeUid: this._selfNodeUid, routes: routes.map(HubClusterL4RouteProvider._toWire)})
        });
    }

    /**
     * The full cluster-wide route set (malformed entries skipped).
     */
    public async list(): Promise<ClusterL4Route[]> {
        const response = await this._fetch(`${this._hubUrl}/json/registry/cluster/routes`, {
            headers: {[HEADER_REGISTRY_SECRET]: this._secret}
        });

        const data = await response.json() as {list?: ClusterL4RouteWire[];};
        const routes: ClusterL4Route[] = [];

        for (const wire of data.list ?? []) {
            const route = HubClusterL4RouteProvider._fromWire(wire);

            if (route !== null) {
                routes.push(route);
            }
        }

        return routes;
    }

    /**
     * Convert a core route to its wire form.
     * @param route - the core route
     */
    private static _toWire(route: ClusterL4Route): ClusterL4RouteWire {
        return {
            id: route.id,
            proto: route.proto === ClusterL4Proto.Udp ? 'udp' : 'tcp',
            ingressNodeUid: route.ingressNodeUid,
            listenHost: route.listenHost,
            listenPort: route.listenPort,
            egressNodeUid: route.egressNodeUid,
            targetHost: route.targetHost,
            targetPort: route.targetPort,
            proxyProtocol: route.proxyProtocol
        };
    }

    /**
     * Convert a wire route to its core form, or null if it is missing required
     * fields.
     * @param wire - the wire route
     */
    private static _fromWire(wire: ClusterL4RouteWire): ClusterL4Route | null {
        if (typeof wire.id !== 'string' || typeof wire.listenPort !== 'number' ||
            typeof wire.egressNodeUid !== 'string' || typeof wire.ingressNodeUid !== 'string' ||
            typeof wire.targetHost !== 'string' || typeof wire.targetPort !== 'number') {
            return null;
        }

        return {
            id: wire.id,
            proto: wire.proto === 'udp' ? ClusterL4Proto.Udp : ClusterL4Proto.Tcp,
            ingressNodeUid: wire.ingressNodeUid,
            listenHost: wire.listenHost,
            listenPort: wire.listenPort,
            egressNodeUid: wire.egressNodeUid,
            targetHost: wire.targetHost,
            targetPort: wire.targetPort,
            proxyProtocol: wire.proxyProtocol
        };
    }

}