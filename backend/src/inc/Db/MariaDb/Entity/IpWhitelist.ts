import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * IpWhitelist
 */
@Entity({name: 'ip_whitelist'})
export class IpWhitelist extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

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
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

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