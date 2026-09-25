import {ClusterGossipTombstoneDB, ClusterGossipTombstoneServiceDB} from 'flyingfish_core';

/**
 * Records a pending gossip tombstone whenever a cluster-global row (a node-group,
 * membership, share, or RBAC policy row) is deleted (Cluster/Mesh epic 9.5.12.8 fix).
 * {@link ClusterLocalStateProvider} re-announces every recorded key as a delete on every
 * sync until every node has converged it — without this, deleting a row only removes it
 * from the acting node's own local DB; any OTHER node that already had a converged copy
 * would keep re-publishing its still-intact copy forever, resurrecting the "deleted" row.
 */
export class ClusterTombstoneRecorder {

    /**
     * Record (or refresh) a tombstone for a gossip key, e.g. `node_group_share:<uuid>`.
     * Upserts on the key so repeated deletes of the same key (however unlikely) don't
     * pile up duplicate rows.
     * @param gossipKey - the deleted entry's gossip key
     */
    public static async record(gossipKey: string): Promise<void> {
        const repo = ClusterGossipTombstoneServiceDB.getInstance().getRepository();
        const existing = await repo.findOne({where: {gossip_key: gossipKey}});
        const row = existing ?? new ClusterGossipTombstoneDB();

        row.gossip_key = gossipKey;
        row.deleted_at = Date.now();

        await repo.save(row);
    }

}
