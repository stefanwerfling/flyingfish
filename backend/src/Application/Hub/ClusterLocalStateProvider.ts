import {
    ClusterNodeGroupMemberServiceDB,
    ClusterNodeGroupServiceDB,
    ClusterNodeGroupShareServiceDB,
    DomainRecordServiceDB,
    DomainServiceDB,
    RbacGroupServiceDB,
    RbacPermissionServiceDB,
    RbacRoleAssignmentServiceDB,
    RbacRolePermissionServiceDB,
    RbacRoleServiceDB
} from 'flyingfish_core';
import {ClusterStateEntry} from 'flyingfish_schemas';
import os from 'os';

/**
 * The DNS record type for an A record (IPv4). The A record's value is this node's
 * answerable IP for the domain, published so the cluster can fail the domain over.
 */
const DNS_TYPE_A = 1;

/**
 * The domain fields this Hub publishes into the cluster view.
 */
export type ClusterDomainLike = {
    id: number;
    domainname: string;
    disable: boolean;
    fixdomain: boolean;
    recordless: boolean;
    parent_id: number;
    cluster_priority: number;
};

/**
 * Reads the Hub's domains; injectable so the provider is testable without a database.
 */
export type ClusterDomainSource = () => Promise<ClusterDomainLike[]>;

/**
 * Reads a domain's A-record IP on this node (undefined if none); injectable for tests.
 */
export type ClusterDomainIpSource = (domainId: number) => Promise<string | undefined>;

/**
 * A snapshot of this Hub's RBAC POLICY tables (Cluster/Mesh epic 9.5.12, A+C shared
 * rights DB). These five tables are cluster-global and keyed by cluster-stable UUIDs;
 * `rbac_user_group` is deliberately absent — it is node-local (binds a local user to a
 * global group) and is never gossiped. `resource_id` stays a node-local int.
 */
export type ClusterRbacPolicySnapshot = {
    groups: {id: string; name: string; description: string; disable: boolean;}[];
    roles: {id: string; name: string; description: string;}[];
    permissions: {id: string; permission_key: string; description: string;}[];
    rolePermissions: {id: string; role_id: string; permission_id: string;}[];
    assignments: {id: string; group_id: string; role_id: string; resource_type: string; resource_id: number; resource_uuid: string;}[];
};

/**
 * Reads this Hub's RBAC policy tables; injectable so the provider is testable without
 * a database.
 */
export type ClusterRbacPolicySource = () => Promise<ClusterRbacPolicySnapshot>;

/**
 * A snapshot of this Hub's cluster NODE-GROUP tables (Cluster/Mesh epic 9.5.12.3/.4). All
 * three are cluster-global and keyed by cluster-stable UUIDs, published so every node
 * converges on the same grouping + sharing rules — `shares` is the exposure boundary
 * (9.5.12.4) a resource type must cross before an RBAC grant scoped to the group can
 * apply. `nodeUid` is the member/sharing node's mesh UUID.
 */
export type ClusterNodeGroupSnapshot = {
    groups: {id: string; name: string; description: string; color: string;}[];
    members: {id: string; nodeUid: string; groupUuid: string;}[];
    shares: {id: string; nodeUid: string; groupUuid: string; resourceType: string; level: string;}[];
};

/**
 * Reads this Hub's node-group tables; injectable so the provider is testable without a
 * database.
 */
export type ClusterNodeGroupSource = () => Promise<ClusterNodeGroupSnapshot>;

/**
 * Produces the resources this Hub publishes into the cluster gossip (Cluster/Mesh
 * epic 9.5.12): its local clusterserver pulls these, owns them (namespacing the keys
 * by its nodeUid) and gossips them so every node sees a federated view. Keys are
 * Hub-relative. It publishes a hub descriptor and — the first real globally-shared
 * resource (phase 3) — the Hub's domains as `domain:<id>` summaries: name, flags,
 * parent, failover priority, and this node's A-record IP (`ip`) so the cluster can
 * answer a domain's DNS A record with the active node's IP on failover (9.5.14).
 * Records and the other resource types follow in later phases. Kept as its own
 * provider so that extension is one place.
 */
export class ClusterLocalStateProvider {

    private readonly _domains: ClusterDomainSource;

    private readonly _domainIp: ClusterDomainIpSource;

    private readonly _rbacPolicy: ClusterRbacPolicySource;

    private readonly _nodeGroups: ClusterNodeGroupSource;

    /**
     * @param domains - the domain source (defaults to the Hub's domain DB)
     * @param domainIp - the domain A-record IP source (defaults to the Hub's record DB)
     * @param rbacPolicy - the RBAC policy source (defaults to the Hub's rbac_* DB)
     * @param nodeGroups - the node-group source (defaults to the Hub's cluster_node_group* DB)
     */
    public constructor(
        domains?: ClusterDomainSource,
        domainIp?: ClusterDomainIpSource,
        rbacPolicy?: ClusterRbacPolicySource,
        nodeGroups?: ClusterNodeGroupSource
    ) {
        this._domains = domains ?? ((): Promise<ClusterDomainLike[]> => DomainServiceDB.getInstance().findAll());
        this._domainIp = domainIp ?? ClusterLocalStateProvider._defaultDomainIp;
        this._rbacPolicy = rbacPolicy ?? ClusterLocalStateProvider._defaultRbacPolicy;
        this._nodeGroups = nodeGroups ?? ClusterLocalStateProvider._defaultNodeGroups;
    }

    /**
     * This Hub's publishable state entries.
     */
    public async entries(): Promise<ClusterStateEntry[]> {
        const entries: ClusterStateEntry[] = [
            {key: 'hub', value: {host: os.hostname()}}
        ];

        const domains = await this._domains();
        const withIp = await Promise.all(domains.map(async(domain) => ({domain: domain, ip: await this._domainIp(domain.id)})));

        for (const {domain, ip} of withIp) {
            entries.push({
                key: `domain:${domain.id}`,
                value: {
                    id: domain.id,
                    name: domain.domainname,
                    // Failover priority for this domain on this node (lower = primary),
                    // 9.5.14; the cluster domain view orders nodes by it for DNS failover.
                    priority: domain.cluster_priority,
                    // This node's A-record IP for the domain — the value the cluster's
                    // DNS A record answers with when this node is the active one.
                    ip: ip,
                    disable: domain.disable,
                    fix: domain.fixdomain,
                    recordless: domain.recordless,
                    parentId: domain.parent_id
                }
            });
        }

        // The RBAC POLICY tables (Cluster/Mesh epic 9.5.12, A+C shared rights DB):
        // published GLOBAL (not namespaced by node) so their cluster-stable UUID keys
        // converge across the cluster into one shared policy. `rbac_user_group` is NOT
        // published — it is node-local (binds local users to global groups).
        const policy = await this._rbacPolicy();

        for (const group of policy.groups) {
            entries.push({key: `rbac_group:${group.id}`, value: group, global: true});
        }

        for (const role of policy.roles) {
            entries.push({key: `rbac_role:${role.id}`, value: role, global: true});
        }

        for (const permission of policy.permissions) {
            entries.push({key: `rbac_permission:${permission.id}`, value: permission, global: true});
        }

        for (const rolePermission of policy.rolePermissions) {
            entries.push({key: `rbac_role_permission:${rolePermission.id}`, value: rolePermission, global: true});
        }

        for (const assignment of policy.assignments) {
            entries.push({key: `rbac_role_assignment:${assignment.id}`, value: assignment, global: true});
        }

        // The cluster NODE GROUPS (Cluster/Mesh epic 9.5.12.3): also published GLOBAL so
        // their cluster-stable UUID keys converge into one shared grouping every node sees.
        const nodeGroups = await this._nodeGroups();

        for (const group of nodeGroups.groups) {
            entries.push({key: `node_group:${group.id}`, value: group, global: true});
        }

        for (const member of nodeGroups.members) {
            entries.push({key: `node_group_member:${member.id}`, value: member, global: true});
        }

        // The node-group SHARES (9.5.12.4): the exposure boundary a resource type must
        // cross before an RBAC grant scoped to the group can apply.
        for (const share of nodeGroups.shares) {
            entries.push({key: `node_group_share:${share.id}`, value: share, global: true});
        }

        return entries;
    }

    /**
     * Read a domain's first A-record value from the Hub's record DB.
     * @param domainId - the domain id
     */
    private static async _defaultDomainIp(domainId: number): Promise<string | undefined> {
        const records = await DomainRecordServiceDB.getInstance().findAllByDomain(domainId);

        return records.find((record) => record.dtype === DNS_TYPE_A)?.dvalue;
    }

    /**
     * Read this Hub's RBAC policy tables from the rbac_* DB services (mapped to plain
     * summaries so no ORM state leaks into the gossip value).
     */
    private static async _defaultRbacPolicy(): Promise<ClusterRbacPolicySnapshot> {
        const [groups, roles, permissions, rolePermissions, assignments] = await Promise.all([
            RbacGroupServiceDB.getInstance().findAll(),
            RbacRoleServiceDB.getInstance().findAll(),
            RbacPermissionServiceDB.getInstance().findAll(),
            RbacRolePermissionServiceDB.getInstance().findAll(),
            RbacRoleAssignmentServiceDB.getInstance().findAll()
        ]);

        return {
            groups: groups.map((group) => ({id: group.id, name: group.name, description: group.description, disable: group.disable})),
            roles: roles.map((role) => ({id: role.id, name: role.name, description: role.description})),
            permissions: permissions.map((permission) => ({id: permission.id, permission_key: permission.permission_key, description: permission.description})),
            rolePermissions: rolePermissions.map((rolePermission) => ({id: rolePermission.id, role_id: rolePermission.role_id, permission_id: rolePermission.permission_id})),
            assignments: assignments.map((assignment) => ({
                id: assignment.id,
                group_id: assignment.group_id,
                role_id: assignment.role_id,
                resource_type: assignment.resource_type,
                resource_id: assignment.resource_id,
                resource_uuid: assignment.resource_uuid
            }))
        };
    }

    /**
     * Read this Hub's cluster node-group tables from the DB services (mapped to plain
     * summaries so no ORM state leaks into the gossip value).
     */
    private static async _defaultNodeGroups(): Promise<ClusterNodeGroupSnapshot> {
        const [groups, members, shares] = await Promise.all([
            ClusterNodeGroupServiceDB.getInstance().findAll(),
            ClusterNodeGroupMemberServiceDB.getInstance().findAll(),
            ClusterNodeGroupShareServiceDB.getInstance().findAll()
        ]);

        return {
            groups: groups.map((group) => ({id: group.id, name: group.name, description: group.description, color: group.color})),
            members: members.map((member) => ({id: member.id, nodeUid: member.node_uid, groupUuid: member.group_uuid})),
            shares: shares.map((share) => ({
                id: share.id,
                nodeUid: share.node_uid,
                groupUuid: share.group_uuid,
                resourceType: share.resource_type,
                level: share.level
            }))
        };
    }

}