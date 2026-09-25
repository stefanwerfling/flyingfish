import {PermissionService} from '../Rbac/PermissionService.js';

/**
 * A minimal share shape this check needs — matches the node-group share aggregate's
 * entry shape but kept structural so callers can pass either the aggregated view's
 * entries or the raw local DB rows without an extra mapping step.
 */
export type ClusterShareLike = {nodeUid: string; groupUuid: string; resourceType: string; level: string;};

/**
 * Whether `level` covers `required` — `write` covers both `read` and `write` checks,
 * `read` covers only a `read` check.
 * @param level - the share's granted level
 * @param required - the level the action needs
 */
const levelCovers = (level: string, required: 'read' | 'write'): boolean =>
    level === 'write' || (level === 'read' && required === 'read');

/**
 * Whether `userId` may perform `permission` against `resourceType` resources owned by a
 * REMOTE node `targetNodeUid` (Cluster/Mesh epic 9.5.12.4/.6 — cross-node resource
 * access). Two gates must both pass: (1) `targetNodeUid` has published a share exposing
 * `resourceType` to some node group at a level that covers `requiredLevel`, AND (2) the
 * user holds `permission` via an RBAC grant scoped to that SAME node group ({@link
 * PermissionService.can} with a `{type: 'node-group', uuid}` resource). "Node group =
 * boundary, RBAC grant = who may do what inside it" — this is exactly that join,
 * evaluated for one concrete (user, action) pair rather than the whole cluster-wide
 * preview {@link computeClusterEffectiveAccess} produces.
 *
 * Evaluated entirely against locally-converged data: shares and the RBAC policy are both
 * gossiped to (and converged into the local DB of) every node, so this needs NO mesh
 * round-trip — the requesting node can decide authorization on its own before ever
 * dialing the target. A superadmin's global wildcard grant still passes, the same as any
 * other {@link PermissionService.can} check.
 * @param permissionService - the local RBAC permission service (reads the local, converged policy)
 * @param userId - the acting (local) user
 * @param targetNodeUid - the remote node whose resources are being accessed
 * @param resourceType - the resource type being accessed (e.g. `domain`)
 * @param permission - the permission key required (e.g. `domain.write`)
 * @param requiredLevel - `read` or `write`, matched against the share's granted level
 * @param shares - the locally-converged node-group shares (e.g. from `aggregateClusterNodeGroups(...).shares`)
 */
export const canAccessRemoteResource = async(
    permissionService: PermissionService,
    userId: number,
    targetNodeUid: string,
    resourceType: string,
    permission: string,
    requiredLevel: 'read' | 'write',
    shares: readonly ClusterShareLike[]
): Promise<boolean> => {
    const candidateGroupUuids = shares
    .filter((share) => share.nodeUid === targetNodeUid && share.resourceType === resourceType && levelCovers(share.level, requiredLevel))
    .map((share) => share.groupUuid);

    for (const groupUuid of candidateGroupUuids) {
        // eslint-disable-next-line no-await-in-loop -- short-circuits on the first grant that applies; candidate lists are small
        if (await permissionService.can(userId, permission, {type: 'node-group', uuid: groupUuid})) {
            return true;
        }
    }

    return false;
};

/**
 * Whether `nodeUid` currently shares `resourceType` with ANY node group (Cluster/Mesh
 * epic 9.5.12.6). The RESPONDING side's defense-in-depth check: the real authorization
 * (does the requester's user hold a matching grant) already happened node-locally on
 * the REQUESTING side before it ever dialed us — "no cross-node SSO, B trusts A's mesh
 * peer" — so this only re-confirms WE still currently publish a share for the type at
 * all, guarding against acting on a stale/cached decision after a share was revoked.
 * @param shares - the locally-converged node-group shares
 * @param nodeUid - this node's own mesh uid
 * @param resourceType - the resource type being requested
 */
export const nodeStillSharesResource = (shares: readonly ClusterShareLike[], nodeUid: string, resourceType: string): boolean =>
    shares.some((share) => share.nodeUid === nodeUid && share.resourceType === resourceType);
