import {Entity, Column, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Domain Entity
 */
@Entity({name: 'domain'})
export class Domain extends DBBaseEntityId {

    /**
     * domain name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public domainname!: string;

    /**
     * fix domain
     */
    @Column({
        default: false
    })
    public fixdomain!: boolean;

    /**
     * recordless
     */
    @Column({
        default: false
    })
    public recordless!: boolean;

    /**
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

    @Index()
    @Column({
        default: 0
    })
    public parent_id!: number;

    /**
     * Cluster failover priority for this domain on this node (Cluster/Mesh epic
     * 9.5.14): lower = higher priority (the primary). The cluster's DNS A record
     * follows the lowest-priority live node, so a domain fails over to the next node
     * when its primary is down.
     */
    @Column({
        default: 0
    })
    public cluster_priority!: number;

}