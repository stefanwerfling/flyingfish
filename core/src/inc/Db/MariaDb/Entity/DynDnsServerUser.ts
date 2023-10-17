import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DynDnsServerUser
 */
@Entity({name: 'dyndns_server_user'})
export class DynDnsServerUser extends DBBaseEntityId {

    /**
     * username
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}