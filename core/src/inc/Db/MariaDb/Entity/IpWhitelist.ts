import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * IpWhitelist
 */
@Entity({name: 'ip_whitelist'})
export class IpWhitelist extends DBBaseEntityId {

    /**
     * ip
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 50
    })
    public ip!: string;

    /**
     * last update
     */
    @Index()
    @Column({
        default: 0
    })
    public last_update!: number;

    /**
     * disabled the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disabled!: boolean;

    /**
     * last block
     */
    @Index()
    @Column({
        default: 0
    })
    public last_access!: number;

    /**
     * count block
     */
    @Index()
    @Column({
        default: 0
    })
    public count_access!: number;

    /**
     * ip location id
     */
    @Index()
    @Column({
        default: 0
    })
    public ip_location_id!: number;

    /**
     * description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

}