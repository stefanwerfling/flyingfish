import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClientDomain
 */
@Entity({name: 'dyndns_client_domain'})
export class DynDnsClientDomain extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public dyndnsclient_id!: number;

    @Index()
    @Column()
    public domain_id!: number;

}