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
    port: Vts.number()
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