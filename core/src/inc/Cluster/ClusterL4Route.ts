import {ClusterL4Proto} from './ClusterL4Frame.js';

/**
 * A cluster-wide L4 route (Cluster/Mesh epic 9.5.4): the declarative desired state
 * for exposing a TCP/UDP service across the mesh. `ingressNodeUid` is the node that
 * binds the ingress listener ({@link CLUSTER_L4_ROUTE_ANY} = every datapath node);
 * `egressNodeUid` is the node that dials `targetHost:targetPort`. When
 * `proxyProtocol` is set the egress preserves the client IP (9.5.3). This is the
 * unit the route model is synced as, replacing per-node static tunnel config.
 */
export type ClusterL4Route = {
    id: string;
    proto: ClusterL4Proto;
    ingressNodeUid: string;
    listenHost?: string;
    listenPort: number;
    egressNodeUid: string;
    targetHost: string;
    targetPort: number;
    proxyProtocol?: boolean;
};

/**
 * The wildcard `ingressNodeUid` that makes every datapath node bind a route's
 * ingress listener (anycast-style edge exposure).
 */
export const CLUSTER_L4_ROUTE_ANY = '*';

/**
 * Whether a route's ingress is assigned to the given node (its nodeUid, or the
 * wildcard).
 * @param route - the route
 * @param selfNodeUid - this node's cluster nodeUid
 */
export const clusterL4RouteAssignedTo = (route: ClusterL4Route, selfNodeUid: string): boolean =>
    route.ingressNodeUid === selfNodeUid || route.ingressNodeUid === CLUSTER_L4_ROUTE_ANY;

/**
 * Whether two routes are materially equal — i.e. rebinding the listener is
 * unnecessary. The id is assumed already equal; only the fields that shape the
 * bound listener / forwarding are compared.
 * @param first - one route
 * @param second - the other route
 */
export const clusterL4RouteEqual = (first: ClusterL4Route, second: ClusterL4Route): boolean =>
    first.proto === second.proto &&
    first.ingressNodeUid === second.ingressNodeUid &&
    (first.listenHost ?? '') === (second.listenHost ?? '') &&
    first.listenPort === second.listenPort &&
    first.egressNodeUid === second.egressNodeUid &&
    first.targetHost === second.targetHost &&
    first.targetPort === second.targetPort &&
    (first.proxyProtocol ?? false) === (second.proxyProtocol ?? false);