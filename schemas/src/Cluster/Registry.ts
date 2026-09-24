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
    value: Vts.unknown(),
    // When true the key is already cluster-unique (a shared resource keyed by a
    // cluster-stable UUID, e.g. the RBAC policy) and the owning clusterserver must NOT
    // namespace it by nodeUid — so every node converges on the same gossip key
    // (Cluster/Mesh epic 9.5.12, A+C). Absent = per-node (namespaced).
    global: Vts.optional(Vts.boolean())
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
    // This node's A-record IP for the domain (what the DNS A record answers with when
    // this node is active); optional if the node has no A record for it.
    ip: Vts.optional(Vts.string()),
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
    nodes: Vts.array(SchemaClusterDomainNode),
    // The node whose IP the domain's DNS A record currently resolves to — the
    // highest-priority LIVE node — or null if none is live (9.5.14 failover).
    activeNodeUid: Vts.or([Vts.string(), Vts.null()]),
    // That active node's A-record IP — what the domain's DNS A record should answer
    // with right now — or null if there is no active node / no IP.
    activeIp: Vts.or([Vts.string(), Vts.null()])
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

/**
 * SchemaClusterNode — one node seen across the cluster (Cluster/Mesh epic 9.5.12,
 * Proxmox-style node dashboard): its self-descriptor from the gossip node roster
 * (reachable peer-transport endpoint) plus a derived online flag from its heartbeat.
 */
export const SchemaClusterNode = Vts.object({
    nodeUid: Vts.string(),
    host: Vts.string(),
    port: Vts.number(),
    // Epoch ms of this node's last gossip heartbeat.
    lastHeartbeat: Vts.number(),
    // True when the last heartbeat is within the stale window — the node dashboard's
    // online/offline signal (same liveness that drives 9.5.14 DNS failover).
    online: Vts.boolean(),
    // Cluster identity + transport (9.5.12.2), seeded by each node into its own gossip
    // descriptor — optional so older nodes / a control-only node without them still parse.
    // The node cert's common name (e.g. `cluster@host`).
    commonName: Vts.optional(Vts.string()),
    // The peer transport this node speaks: 'quic' | 'wss' | 'tls'.
    transport: Vts.optional(Vts.string()),
    // SHA-256 fingerprint of the node's leaf certificate (mesh identity).
    certFingerprint: Vts.optional(Vts.string()),
    // Whether the node holds a PKI node certificate (enrolled into the cluster CA).
    enrolled: Vts.optional(Vts.boolean())
});

/**
 * ClusterNode
 */
export type ClusterNode = ExtractSchemaResultType<typeof SchemaClusterNode>;

/**
 * SchemaClusterNodesResponse — the cluster-wide node roster the Hub returns for the
 * Proxmox-style node dashboard, each with its online/offline state.
 */
export const SchemaClusterNodesResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaClusterNode),
    // The uid of the node serving this request ("this node"), so the UI can mark it in
    // the roster; null until the local clusterserver has pushed its first aggregate.
    selfNodeUid: Vts.or([Vts.string(), Vts.null()])
});

/**
 * ClusterNodesResponse
 */
export type ClusterNodesResponse = ExtractSchemaResultType<typeof SchemaClusterNodesResponse>;

/**
 * SchemaClusterJoinPackageResponse — a join package this node hands to another
 * node so it can enroll into this cluster (Cluster/Mesh epic 9.5.12.2). It bundles
 * the pkiserver URL the joining node enrolls against, the Root CA fingerprint it
 * pins, and a freshly minted single-use bootstrap token. `configured` is false when
 * token minting is not set up (no `pki.tokenSecret`), in which case `bootstrapToken`
 * is empty and only the pinning info is returned.
 */
export const SchemaClusterJoinPackageResponse = SchemaDefaultReturn.extend({
    // Whether token minting is configured (the Hub holds a pki.tokenSecret and can
    // reach the pkiserver mint route). When false, only pkiUrl/caFingerprint are set.
    configured: Vts.boolean(),
    // The pkiserver base URL the joining node enrolls against.
    pkiUrl: Vts.string(),
    // SHA-256 fingerprint of the cluster Root CA the joining node pins.
    caFingerprint: Vts.string(),
    // The minted single-use bootstrap token (empty string when not configured).
    bootstrapToken: Vts.string(),
    // Token expiry (epoch ms; 0 when not configured).
    expiresAt: Vts.number(),
    // Whether the enrolled node is auto-approved; false = its request queues for
    // admin approval in Datacenter → Enrollment.
    autoApprove: Vts.boolean(),
    // This node's mesh peer endpoint (advertise host + peer port) the joining node
    // dials as a seed to bootstrap into the mesh across separate Hubs (9.5.12.2 model
    // (b)). Empty host / 0 port when this node is not meshed (no roster self entry).
    meshHost: Vts.string(),
    meshPort: Vts.number()
});

/**
 * ClusterJoinPackageResponse
 */
export type ClusterJoinPackageResponse = ExtractSchemaResultType<typeof SchemaClusterJoinPackageResponse>;

/**
 * SchemaClusterJoinRequest — apply a join package on THIS node to join another
 * cluster (Cluster/Mesh epic 9.5.12.2, model (b) "one-port" join): the target node's
 * mesh endpoint to seed-dial, the single-use bootstrap token to present, and the
 * Root CA fingerprint to pin the target's CA against during the bootstrap exchange.
 */
export const SchemaClusterJoinRequest = Vts.object({
    meshHost: Vts.string(),
    meshPort: Vts.number(),
    bootstrapToken: Vts.string(),
    caFingerprint: Vts.string()
});

/**
 * ClusterJoinRequest
 */
export type ClusterJoinRequest = ExtractSchemaResultType<typeof SchemaClusterJoinRequest>;

/**
 * The cluster-global RBAC POLICY tables (Cluster/Mesh epic 9.5.12, A+C shared rights
 * DB): each keyed by a cluster-stable UUID, gossiped under a global key so the whole
 * cluster shares one policy. `rbac_user_group` is node-local and not included.
 */
export const SchemaClusterRbacGroup = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    description: Vts.string(),
    disable: Vts.boolean()
});

/**
 * SchemaClusterRbacRole
 */
export const SchemaClusterRbacRole = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    description: Vts.string()
});

/**
 * SchemaClusterRbacPermission
 */
export const SchemaClusterRbacPermission = Vts.object({
    id: Vts.string(),
    permission_key: Vts.string(),
    description: Vts.string()
});

/**
 * SchemaClusterRbacRolePermission
 */
export const SchemaClusterRbacRolePermission = Vts.object({
    id: Vts.string(),
    role_id: Vts.string(),
    permission_id: Vts.string()
});

/**
 * SchemaClusterRbacAssignment — the group→role grant; resource_id stays a node-local int.
 */
export const SchemaClusterRbacAssignment = Vts.object({
    id: Vts.string(),
    group_id: Vts.string(),
    role_id: Vts.string(),
    resource_type: Vts.string(),
    resource_id: Vts.number()
});

/**
 * SchemaClusterRbacResponse — the whole cluster-wide RBAC policy for the management UI.
 */
export const SchemaClusterRbacResponse = SchemaDefaultReturn.extend({
    groups: Vts.array(SchemaClusterRbacGroup),
    roles: Vts.array(SchemaClusterRbacRole),
    permissions: Vts.array(SchemaClusterRbacPermission),
    rolePermissions: Vts.array(SchemaClusterRbacRolePermission),
    assignments: Vts.array(SchemaClusterRbacAssignment)
});

/**
 * ClusterRbacResponse
 */
export type ClusterRbacResponse = ExtractSchemaResultType<typeof SchemaClusterRbacResponse>;

/**
 * The cluster-global NODE GROUPS (Cluster/Mesh epic 9.5.12.3): a grouping of nodes
 * ("zone"/"pool"), each keyed by a cluster-stable UUID and gossiped under a global key so
 * every node converges on the same set. Distinct from the RBAC user groups above.
 */
export const SchemaClusterNodeGroup = Vts.object({
    id: Vts.string(),
    name: Vts.string(),
    description: Vts.string(),
    color: Vts.string()
});

/**
 * ClusterNodeGroup
 */
export type ClusterNodeGroup = ExtractSchemaResultType<typeof SchemaClusterNodeGroup>;

/**
 * SchemaClusterNodeGroupMember — one node's membership in one group (n:m). `nodeUid` is the
 * member node's mesh UUID.
 */
export const SchemaClusterNodeGroupMember = Vts.object({
    id: Vts.string(),
    nodeUid: Vts.string(),
    groupUuid: Vts.string()
});

/**
 * ClusterNodeGroupMember
 */
export type ClusterNodeGroupMember = ExtractSchemaResultType<typeof SchemaClusterNodeGroupMember>;

/**
 * SchemaClusterNodeGroupShare — one node's sharing rule for a group (Cluster/Mesh epic
 * 9.5.12.4): node `nodeUid` shares its `resourceType` resources with group `groupUuid` at
 * `level` (`read` or `write`). Default-deny: a resource type is invisible to the group
 * until a share row grants it.
 */
export const SchemaClusterNodeGroupShare = Vts.object({
    id: Vts.string(),
    nodeUid: Vts.string(),
    groupUuid: Vts.string(),
    resourceType: Vts.string(),
    level: Vts.string()
});

/**
 * ClusterNodeGroupShare
 */
export type ClusterNodeGroupShare = ExtractSchemaResultType<typeof SchemaClusterNodeGroupShare>;

/**
 * SchemaClusterNodeGroupsResponse — the whole cluster-wide node-group view for the
 * management UI (groups + memberships + sharing rules aggregated from the gossip).
 */
export const SchemaClusterNodeGroupsResponse = SchemaDefaultReturn.extend({
    groups: Vts.array(SchemaClusterNodeGroup),
    members: Vts.array(SchemaClusterNodeGroupMember),
    shares: Vts.array(SchemaClusterNodeGroupShare)
});

/**
 * ClusterNodeGroupsResponse
 */
export type ClusterNodeGroupsResponse = ExtractSchemaResultType<typeof SchemaClusterNodeGroupsResponse>;

/**
 * SchemaClusterNodeGroupSaveRequest — create (no id) or edit (id set) a node group. The
 * server generates the UUID on create.
 */
export const SchemaClusterNodeGroupSaveRequest = Vts.object({
    id: Vts.optional(Vts.string()),
    name: Vts.string(),
    description: Vts.optional(Vts.string()),
    color: Vts.optional(Vts.string())
});

/**
 * ClusterNodeGroupSaveRequest
 */
export type ClusterNodeGroupSaveRequest = ExtractSchemaResultType<typeof SchemaClusterNodeGroupSaveRequest>;

/**
 * SchemaClusterNodeGroupSaveResponse — the saved group's id (the generated UUID on create).
 */
export const SchemaClusterNodeGroupSaveResponse = SchemaDefaultReturn.extend({
    id: Vts.string()
});

/**
 * ClusterNodeGroupSaveResponse
 */
export type ClusterNodeGroupSaveResponse = ExtractSchemaResultType<typeof SchemaClusterNodeGroupSaveResponse>;

/**
 * SchemaClusterNodeGroupDeleteRequest — delete a node group by id.
 */
export const SchemaClusterNodeGroupDeleteRequest = Vts.object({
    id: Vts.string()
});

/**
 * ClusterNodeGroupDeleteRequest
 */
export type ClusterNodeGroupDeleteRequest = ExtractSchemaResultType<typeof SchemaClusterNodeGroupDeleteRequest>;

/**
 * SchemaClusterNodeGroupMembershipRequest — add (`member: true`) or remove
 * (`member: false`) a node from a group.
 */
export const SchemaClusterNodeGroupMembershipRequest = Vts.object({
    nodeUid: Vts.string(),
    groupUuid: Vts.string(),
    member: Vts.boolean()
});

/**
 * ClusterNodeGroupMembershipRequest
 */
export type ClusterNodeGroupMembershipRequest = ExtractSchemaResultType<typeof SchemaClusterNodeGroupMembershipRequest>;

/**
 * SchemaClusterNodeGroupShareRequest — grant (or change) a sharing rule: node `nodeUid`
 * shares its `resourceType` resources with group `groupUuid` at `level`.
 */
export const SchemaClusterNodeGroupShareRequest = Vts.object({
    nodeUid: Vts.string(),
    groupUuid: Vts.string(),
    resourceType: Vts.string(),
    level: Vts.string()
});

/**
 * ClusterNodeGroupShareRequest
 */
export type ClusterNodeGroupShareRequest = ExtractSchemaResultType<typeof SchemaClusterNodeGroupShareRequest>;

/**
 * SchemaClusterNodeGroupShareDeleteRequest — revoke a sharing rule (back to default-deny).
 */
export const SchemaClusterNodeGroupShareDeleteRequest = Vts.object({
    nodeUid: Vts.string(),
    groupUuid: Vts.string(),
    resourceType: Vts.string()
});

/**
 * ClusterNodeGroupShareDeleteRequest
 */
export type ClusterNodeGroupShareDeleteRequest = ExtractSchemaResultType<typeof SchemaClusterNodeGroupShareDeleteRequest>;

/**
 * SchemaClusterEffectiveAccessEntry — one combined "what does this actually grant" row
 * (Cluster/Mesh epic 9.5.12.5): a node's sharing rule crossed with an RBAC role granted on
 * the same node group, resolved to that role's permission keys.
 */
export const SchemaClusterEffectiveAccessEntry = Vts.object({
    nodeUid: Vts.string(),
    resourceType: Vts.string(),
    level: Vts.string(),
    groupUuid: Vts.string(),
    groupName: Vts.string(),
    roleId: Vts.string(),
    roleName: Vts.string(),
    permissionKeys: Vts.array(Vts.string())
});

/**
 * ClusterEffectiveAccessEntry
 */
export type ClusterEffectiveAccessEntry = ExtractSchemaResultType<typeof SchemaClusterEffectiveAccessEntry>;

/**
 * SchemaClusterEffectiveAccessResponse — the whole effective-access preview: every
 * share × node-group-scoped-role join, cluster-wide.
 */
export const SchemaClusterEffectiveAccessResponse = SchemaDefaultReturn.extend({
    entries: Vts.array(SchemaClusterEffectiveAccessEntry)
});

/**
 * ClusterEffectiveAccessResponse
 */
export type ClusterEffectiveAccessResponse = ExtractSchemaResultType<typeof SchemaClusterEffectiveAccessResponse>;