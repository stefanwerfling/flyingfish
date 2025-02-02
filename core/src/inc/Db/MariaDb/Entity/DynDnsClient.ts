import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DynDnsClient
 */
@Entity({name: 'dyndns_client'})
export class DynDnsClient extends DBBaseEntityId {

    /**
     * provider
     */
    @Column()
    public provider!: string;

    /**
     * username
     */
    @Column()
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * main domain id
     */
    @Column({
        default: 0
    })
    public main_domain_id!: number;

    /**
     * update domain
     */
    @Column({
        default: false
    })
    public update_domain!: boolean;

    /**
     * gateway identifier id
     */
    @Column({
        default: 0
    })
    public gateway_identifier_id!: number;

    /**
     * last status
     */
    @Column({
        default: 0
    })
    public last_status!: number;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}