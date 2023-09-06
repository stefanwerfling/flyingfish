import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DynDnsClientDomain
 */
@Entity({name: 'dyndns_client_domain'})
export class DynDnsClientDomain extends DBBaseEntityId {

    /**
     * dyndns client id
     */
    @Index()
    @Column()
    public dyndnsclient_id!: number;

    /**
     * domain id
     */
    @Index()
    @Column()
    public domain_id!: number;

}