import {
    ClusterJoinPackageResponse,
    ClusterJoinRequest,
    ClusterNodesResponse,
    DefaultReturn,
    RegistryPartsResponse,
    RegistryUiContributionsResponse,
    SchemaClusterJoinPackageResponse,
    SchemaClusterNodesResponse,
    SchemaDefaultReturn,
    SchemaRegistryPartsResponse,
    SchemaRegistryUiContributionsResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Registry (Hub) API client.
 */
export class Registry {

    /**
     * Return the registered parts and their health status.
     */
    public static async getParts(): Promise<RegistryPartsResponse> {
        return NetFetch.getData('/json/registry/parts', SchemaRegistryPartsResponse);
    }

    /**
     * Return the aggregated UI contributions of the online parts.
     */
    public static async getUiContributions(): Promise<RegistryUiContributionsResponse> {
        return NetFetch.getData('/json/registry/ui-contributions', SchemaRegistryUiContributionsResponse);
    }

    /**
     * Return the cluster-wide node roster (Cluster/Mesh epic 9.5.12, Proxmox-style
     * management): every federated node with its online/offline state, plus which
     * entry is this node (`selfNodeUid`). Read-only projection of the gossip aggregate.
     */
    public static async getClusterNodes(): Promise<ClusterNodesResponse> {
        return NetFetch.getData('/json/registry/cluster/nodes', SchemaClusterNodesResponse);
    }

    /**
     * Mint a cluster join package (Cluster/Mesh epic 9.5.12.2): a single-use bootstrap
     * token + the pkiserver URL and Root CA fingerprint another node needs to enroll
     * into this cluster. Requires the `cluster.manage` permission.
     */
    public static async generateJoinPackage(): Promise<ClusterJoinPackageResponse> {
        return NetFetch.postData('/json/registry/cluster/join-package', {}, SchemaClusterJoinPackageResponse);
    }

    /**
     * Apply a join package on THIS node to join another cluster (Cluster/Mesh epic
     * 9.5.12.2): the target's mesh endpoint, bootstrap token and CA pin. Requires the
     * `cluster.manage` permission. Proxied to the co-located clusterserver.
     */
    public static async applyClusterJoin(request: ClusterJoinRequest): Promise<DefaultReturn> {
        return NetFetch.postData('/json/registry/cluster/join', request, SchemaDefaultReturn);
    }

}