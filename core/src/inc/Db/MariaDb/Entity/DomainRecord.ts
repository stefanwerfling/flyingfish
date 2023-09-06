import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Domain record Entity
 */
@Entity({name: 'domain_record'})
export class DomainRecord extends DBBaseEntityId {

    /**
     * domain id
     */
    @Index()
    @Column()
    public domain_id!: number;

    /**
     * dtype
     */
    @Index()
    @Column()
    public dtype!: number;

    /**
     * dclass
     */
    @Index()
    @Column()
    public dclass!: number;

    /**
     * ttl
     */
    @Column()
    public ttl!: number;

    /**
     * dvalue
     */
    @Column({
        type: 'text',
        default: ''
    })
    public dvalue!: string;

    /**
     * settings
     * for a record, save the data as json
     */
    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

    /**
     * update by dnsclient
     */
    @Index()
    @Column()
    public update_by_dnsclient!: boolean;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}