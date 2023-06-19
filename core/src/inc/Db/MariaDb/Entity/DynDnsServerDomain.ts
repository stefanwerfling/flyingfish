import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsServerDomain
 */
@Entity({name: 'dyndnsserver_domain'})
export class DynDnsServerDomain extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

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