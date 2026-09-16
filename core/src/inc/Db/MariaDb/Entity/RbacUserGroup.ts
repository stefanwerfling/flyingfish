import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacUserGroup — the many-to-many membership of a user in a group (RBAC epic
 * 9.5.13). A plain id-column join, matching the rest of the schema (no DB foreign
 * keys, no indexes on the small RBAC tables). This binding is NODE-LOCAL (int PK):
 * it maps a local `user` (int user_id, per node) into a cluster-global group
 * (group_id = the group's cluster-stable UUID). So each node binds its own users into
 * the shared groups; users are not gossiped (9.5.12, A+C — no cross-node SSO).
 */
@Entity({name: 'rbac_user_group'})
export class RbacUserGroup extends DBBaseEntityId {

    /**
     * the local user (int id of the node-local `user` table)
     */
    @Column({
        default: 0
    })
    public user_id!: number;

    /**
     * the group the user belongs to (UUID of a cluster-global rbac_group)
     */
    @Column({
        type: 'varchar',
        length: 36,
        default: ''
    })
    public group_id!: string;

}