import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';
import {epochMsColumnTransformer} from '../Transformer/EpochMsColumn.js';

/**
 * ClusterGossipTombstone — a pending delete this Hub needs to keep announcing into the
 * gossip until it has durably propagated (Cluster/Mesh epic 9.5.12.8 fix): deleting a
 * cluster-global row (a node-group, membership, share, or RBAC policy row) only removes
 * it from THIS node's local table, which is not by itself a signal any other node can
 * act on — a node that already converged a copy into its own DB would otherwise keep
 * re-publishing its still-intact copy forever, resurrecting the "deleted" row (see
 * [[cluster-cross-node-write-e2e-proven]] for how this was found). {@link
 * ClusterLocalStateProvider.entries} re-announces every row here as a gossip tombstone
 * on every sync until it is pruned, so the delete keeps winning the LWW comparison
 * against any stale re-publish until every node has converged the delete into its own
 * local DB (at which point nothing re-publishes the old value any more either).
 */
@Entity({name: 'cluster_gossip_tombstone'})
export class ClusterGossipTombstone extends DBBaseEntityId {

    /**
     * the gossip key that was deleted, e.g. `node_group_share:<uuid>`
     */
    @Column({
        type: 'varchar',
        length: 255,
        unique: true
    })
    public gossip_key!: string;

    /**
     * when the delete happened (epoch ms) — tombstones older than a generous window are
     * pruned, see {@link ClusterLocalStateProvider}
     */
    @Column({
        type: 'bigint',
        default: 0,
        transformer: epochMsColumnTransformer
    })
    public deleted_at!: number;

}
