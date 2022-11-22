import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ip blacklist Entity
 */
@Entity({name: 'ip_blacklist'})
export class IpBlacklist extends BaseEntity {

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
    @Column({
        default: 0
    })
    public last_update!: number;

    /**
     * is imported
     */
    @Index()
    @Column()
    public is_imported!: boolean;

    /**
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

}