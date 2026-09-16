import {Entity, Column} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * RbacPermission — one atomic right (RBAC epic 9.5.13), identified by a string key
 * (e.g. `domain.write`, `cluster.manage`). The special key `*` is the superadmin
 * wildcard the permission service treats as every permission.
 */
@Entity({name: 'rbac_permission'})
export class RbacPermission extends DBBaseEntityId {

    /**
     * permission key (e.g. `domain.write`, or `*` for all)
     */
    @Column({
        type: 'varchar',
        length: 128
    })
    public permission_key!: string;

    /**
     * description
     */
    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public description!: string;

}