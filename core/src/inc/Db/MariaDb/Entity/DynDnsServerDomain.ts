import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DynDnsServerDomain
 */
@Entity({name: 'dyndns_server_domain'})
export class DynDnsServerDomain extends DBBaseEntityId {

    /**
     * user id by DynDnsServerUser
     */
    @Index()
    @Column()
    public user_id!: number;

    /**
     * domain id
     */
    @Index()
    @Column()
    public domain_id!: number;

}