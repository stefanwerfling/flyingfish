import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacUserGroup — the many-to-many membership of a user in a group (RBAC epic
 * 9.5.13). A plain id-column join, matching the rest of the schema (no DB foreign
 * keys, no indexes on the small RBAC tables).
 */
@Entity({name: 'rbac_user_group'})
export class RbacUserGroup extends DBBaseEntityId {

    /**
     * the user
     */
    @Column({
        default: 0
    })
    public user_id!: number;

    /**
     * the group the user belongs to
     */
    @Column({
        default: 0
    })
    public group_id!: number;

}