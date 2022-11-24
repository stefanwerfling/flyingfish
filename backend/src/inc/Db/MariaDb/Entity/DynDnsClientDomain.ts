import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClientDomain
 */
@Entity({name: 'dyndns_client_domain'})
export class DynDnsClientDomain extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

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