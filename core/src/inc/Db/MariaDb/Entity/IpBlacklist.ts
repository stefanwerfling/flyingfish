import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

@Entity({name: 'ip_blacklist'})
export class IpBlacklist extends DBBaseEntityId {

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
     * is imported
     */
    @Index()
    @Column({
        default: false
    })
    public is_imported!: boolean;

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
    public last_block!: number;

    /**
     * count block
     */
    @Index()
    @Column({
        default: 0
    })
    public count_block!: number;

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
        nullable: true,
        default: null,
        transformer: {
            to: (n) => {
                return n === '' ? null : n;
            },
            from: (n) => {
                return n;
            }
        }
    })
    public description!: string | null;

}