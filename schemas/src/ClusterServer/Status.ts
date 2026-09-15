import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaClusterStatusResponse — the read-only status of this cluster node
 * (Cluster/Mesh epic 9.5): its stable PKI cluster identity and whether it has
 * enrolled yet. Peer/mesh state is added in later slices.
 */
export const SchemaClusterStatusResponse = SchemaDefaultReturn.extend({
    nodeUid: Vts.string(),
    purpose: Vts.string(),
    commonName: Vts.string(),
    enrolled: Vts.boolean()
});

/**
 * ClusterStatusResponse
 */
export type ClusterStatusResponse = ExtractSchemaResultType<typeof SchemaClusterStatusResponse>;