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

}