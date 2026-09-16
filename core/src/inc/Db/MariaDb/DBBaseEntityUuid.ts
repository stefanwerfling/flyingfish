import {BaseEntity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DBBaseEntityUuid — base entity with a cluster-stable UUID primary key named `id`
 * (unlike {@link DBBaseEntityUnid}, which names the column `unid`). Used by the RBAC
 * POLICY entities (Cluster/Mesh epic 9.5.12, A+C shared rights DB): a UUID id is
 * node-independent, so the same logical policy row is identical across the cluster and
 * the gossip LWW store converges — leaderless-safe, since concurrent creations on
 * different nodes never collide the way autoincrement int ids would.
 */
export class DBBaseEntityUuid extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

}