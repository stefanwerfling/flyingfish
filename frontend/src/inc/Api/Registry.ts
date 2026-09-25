import {
    ClusterEffectiveAccessResponse,
    ClusterJoinPackageResponse,
    ClusterJoinRequest,
    ClusterNodeGroupDeleteRequest,
    ClusterNodeGroupMembershipRequest,
    ClusterNodeGroupSaveRequest,
    ClusterNodeGroupSaveResponse,
    ClusterNodeGroupShareDeleteRequest,
    ClusterNodeGroupShareRequest,
    ClusterNodeGroupsResponse,
    ClusterNodesResponse,
    DefaultReturn,
    DomainResponse,
    ListenResponse,
    RegistryPartsResponse,
    RegistryUiContributionsResponse,
    SchemaClusterEffectiveAccessResponse,
    SchemaClusterJoinPackageResponse,
    SchemaClusterNodeGroupSaveResponse,
    SchemaClusterNodeGroupsResponse,
    SchemaClusterNodesResponse,
    SchemaDefaultReturn,
    SchemaDomainResponse,
    SchemaListenResponse,
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

    /**
     * Return the cluster-wide node groups + memberships (Cluster/Mesh epic 9.5.12.3):
     * the shared grouping of nodes aggregated from the gossip. Read-only.
     */
    public static async getClusterNodeGroups(): Promise<ClusterNodeGroupsResponse> {
        return NetFetch.getData('/json/registry/cluster/node-groups', SchemaClusterNodeGroupsResponse);
    }

    /**
     * Create (no id) or edit (id set) a cluster node group (9.5.12.3). Requires the
     * `cluster.manage` permission. The change gossips cluster-wide.
     */
    public static async saveClusterNodeGroup(request: ClusterNodeGroupSaveRequest): Promise<ClusterNodeGroupSaveResponse> {
        return NetFetch.postData('/json/registry/cluster/node-group', request, SchemaClusterNodeGroupSaveResponse);
    }

    /**
     * Delete a cluster node group and its memberships (9.5.12.3). Requires the
     * `cluster.manage` permission.
     */
    public static async deleteClusterNodeGroup(request: ClusterNodeGroupDeleteRequest): Promise<DefaultReturn> {
        return NetFetch.postData('/json/registry/cluster/node-group/delete', request, SchemaDefaultReturn);
    }

    /**
     * Add or remove a node from a cluster node group (9.5.12.3). Requires the
     * `cluster.manage` permission.
     */
    public static async setClusterNodeGroupMembership(request: ClusterNodeGroupMembershipRequest): Promise<DefaultReturn> {
        return NetFetch.postData('/json/registry/cluster/node-group/membership', request, SchemaDefaultReturn);
    }

    /**
     * Grant or change a node-group sharing rule (9.5.12.4): node `nodeUid` shares its
     * `resourceType` resources with group `groupUuid` at `level`. Requires the
     * `cluster.manage` permission.
     */
    public static async setClusterNodeGroupShare(request: ClusterNodeGroupShareRequest): Promise<DefaultReturn> {
        return NetFetch.postData('/json/registry/cluster/node-group/share', request, SchemaDefaultReturn);
    }

    /**
     * Revoke a node-group sharing rule (9.5.12.4, back to default-deny). Requires the
     * `cluster.manage` permission.
     */
    public static async deleteClusterNodeGroupShare(request: ClusterNodeGroupShareDeleteRequest): Promise<DefaultReturn> {
        return NetFetch.postData('/json/registry/cluster/node-group/share/delete', request, SchemaDefaultReturn);
    }

    /**
     * Return the effective-access preview (9.5.12.5): every node-group sharing rule
     * joined with the RBAC roles granted on that group, resolved to permission keys —
     * "what does sharing + RBAC actually combine to grant, right now". Read-only.
     */
    public static async getClusterEffectiveAccess(): Promise<ClusterEffectiveAccessResponse> {
        return NetFetch.getData('/json/registry/cluster/effective-access', SchemaClusterEffectiveAccessResponse);
    }

    /**
     * Return a REMOTE node's domains (9.5.12.6, the first cross-node resource op):
     * gated by node-group sharing + an RBAC grant scoped to that group — see
     * `canAccessRemoteResource`. `statusCode` is `UNAUTHORIZED` when not authorized,
     * `INTERNAL_ERROR` when the mesh call itself failed (mesh inactive, peer
     * unreachable/timed out, or the peer declined).
     */
    public static async getClusterRemoteDomains(nodeUid: string): Promise<DomainResponse> {
        return NetFetch.getData(`/json/registry/cluster/remote-domains?nodeUid=${encodeURIComponent(nodeUid)}`, SchemaDomainResponse);
    }

    /**
     * Return a REMOTE node's nginx listens (9.5.12.6 follow-up, second cross-node
     * resource type after domains) — same gating/error-shape as
     * {@link getClusterRemoteDomains}.
     */
    public static async getClusterRemoteListens(nodeUid: string): Promise<ListenResponse> {
        return NetFetch.getData(`/json/registry/cluster/remote-listens?nodeUid=${encodeURIComponent(nodeUid)}`, SchemaListenResponse);
    }

}