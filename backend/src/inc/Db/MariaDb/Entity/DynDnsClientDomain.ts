import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClientDomain
 */
@Entity({name: 'dyndns_client_domain'})
export class DynDnsClientDomain extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    dyndnsclient_id: number;

    @Index()
    @Column()
        // @ts-ignore
    domain_id: number;

}