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

/**
 * SchemaClusterStateEntry — one key→value pair of the gossiped cluster state
 * (Cluster/Mesh epic 9.5.12). The value is arbitrary JSON (a hub descriptor, later a
 * domain, …). Versions live only inside the gossip layer, not on the wire here.
 */
export const SchemaClusterStateEntry = Vts.object({
    key: Vts.string(),
    value: Vts.unknown()
});

/**
 * ClusterStateEntry
 */
export type ClusterStateEntry = ExtractSchemaResultType<typeof SchemaClusterStateEntry>;

/**
 * SchemaClusterLocalStateResponse — the resources a Hub wants published into the
 * cluster gossip; its local clusterserver pulls this and owns the entries (9.5.12
 * phase 2b). Keys are Hub-relative; the clusterserver namespaces them by its nodeUid.
 */
export const SchemaClusterLocalStateResponse = SchemaDefaultReturn.extend({
    entries: Vts.array(SchemaClusterStateEntry)
});

/**
 * ClusterLocalStateResponse
 */
export type ClusterLocalStateResponse = ExtractSchemaResultType<typeof SchemaClusterLocalStateResponse>;

/**
 * SchemaClusterAggregatePublishRequest — a clusterserver pushes the converged
 * cluster-wide gossip state back to its local Hub so the frontend can read it.
 */
export const SchemaClusterAggregatePublishRequest = Vts.object({
    nodeUid: Vts.string(),
    entries: Vts.array(SchemaClusterStateEntry)
});

/**
 * ClusterAggregatePublishRequest
 */
export type ClusterAggregatePublishRequest = ExtractSchemaResultType<typeof SchemaClusterAggregatePublishRequest>;

/**
 * SchemaClusterStateResponse — the cluster-wide aggregate the Hub returns to the
 * frontend (the federated view every node sees).
 */
export const SchemaClusterStateResponse = SchemaDefaultReturn.extend({
    entries: Vts.array(SchemaClusterStateEntry)
});

/**
 * ClusterStateResponse
 */
export type ClusterStateResponse = ExtractSchemaResultType<typeof SchemaClusterStateResponse>;

/**
 * SchemaClusterDomainNode — one node's involvement with a domain (Cluster/Mesh epic
 * 9.5.12): which node holds it and at what failover priority (lower = primary), for
 * DNS-based high availability.
 */
export const SchemaClusterDomainNode = Vts.object({
    nodeUid: Vts.string(),
    id: Vts.number(),
    priority: Vts.number(),
    disable: Vts.boolean(),
    fix: Vts.boolean(),
    recordless: Vts.boolean(),
    parentId: Vts.number()
});

/**
 * SchemaClusterDomainView — a domain seen across the cluster: its name and every node
 * that manages it, in failover priority order.
 */
export const SchemaClusterDomainView = Vts.object({
    name: Vts.string(),
    nodes: Vts.array(SchemaClusterDomainNode)
});

/**
 * SchemaClusterDomainsResponse — which nodes manage each domain cluster-wide (for
 * high-availability / DNS failover visibility).
 */
export const SchemaClusterDomainsResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaClusterDomainView)
});

/**
 * ClusterDomainsResponse
 */
export type ClusterDomainsResponse = ExtractSchemaResultType<typeof SchemaClusterDomainsResponse>;