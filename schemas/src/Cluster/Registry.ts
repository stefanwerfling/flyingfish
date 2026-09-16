import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaClusterPeer — one cluster node's reachable peer-transport endpoint
 * (Cluster/Mesh epic 9.5.1): its stable nodeUid and where its peer transport
 * listens.
 */
export const SchemaClusterPeer = Vts.object({
    nodeUid: Vts.string(),
    host: Vts.string(),
    port: Vts.number(),
    // The node's overlay IP inside the mesh (datapath nodes only); the route table
    // maps it to the nodeUid so packets are forwarded to the owning peer.
    overlayIp: Vts.optional(Vts.string())
});

/**
 * ClusterPeer
 */
export type ClusterPeer = ExtractSchemaResultType<typeof SchemaClusterPeer>;

/**
 * SchemaClusterAnnounceRequest — a cluster node announces its peer-transport
 * endpoint to the Hub so other nodes can discover and connect to it.
 */
export const SchemaClusterAnnounceRequest = SchemaClusterPeer;

/**
 * ClusterAnnounceRequest
 */
export type ClusterAnnounceRequest = ExtractSchemaResultType<typeof SchemaClusterAnnounceRequest>;

/**
 * SchemaClusterPeersResponse — the cluster peer roster the Hub returns; a node
 * feeds it to its membership to dial the other peers.
 */
export const SchemaClusterPeersResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaClusterPeer)
});

/**
 * ClusterPeersResponse
 */
export type ClusterPeersResponse = ExtractSchemaResultType<typeof SchemaClusterPeersResponse>;

/**
 * SchemaClusterL4Route — one cluster-wide L4 route (Cluster/Mesh epic 9.5.4): the
 * declarative desired state for exposing a TCP/UDP service across the mesh.
 * `ingressNodeUid` is the node that binds the listener (`*` = every datapath node);
 * `egressNodeUid` dials `targetHost:targetPort`. `proxyProtocol` preserves the
 * client IP (9.5.3).
 */
export const SchemaClusterL4Route = Vts.object({
    id: Vts.string(),
    proto: Vts.optional(Vts.string()),
    ingressNodeUid: Vts.string(),
    listenHost: Vts.optional(Vts.string()),
    listenPort: Vts.number(),
    egressNodeUid: Vts.string(),
    targetHost: Vts.string(),
    targetPort: Vts.number(),
    proxyProtocol: Vts.optional(Vts.boolean())
});

/**
 * ClusterL4Route
 */
export type ClusterL4Route = ExtractSchemaResultType<typeof SchemaClusterL4Route>;

/**
 * SchemaClusterRoutesPublishRequest — a node publishes the L4 routes it owns to the
 * Hub; the publisher's set is TTL-refreshed, so its routes fall off if it stops
 * publishing (like the peer roster).
 */
export const SchemaClusterRoutesPublishRequest = Vts.object({
    nodeUid: Vts.string(),
    routes: Vts.array(SchemaClusterL4Route)
});

/**
 * ClusterRoutesPublishRequest
 */
export type ClusterRoutesPublishRequest = ExtractSchemaResultType<typeof SchemaClusterRoutesPublishRequest>;

/**
 * SchemaClusterRoutesResponse — the full cluster-wide L4 route set the Hub returns;
 * every datapath node reconciles its ingress listeners against it.
 */
export const SchemaClusterRoutesResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaClusterL4Route)
});

/**
 * ClusterRoutesResponse
 */
export type ClusterRoutesResponse = ExtractSchemaResultType<typeof SchemaClusterRoutesResponse>;