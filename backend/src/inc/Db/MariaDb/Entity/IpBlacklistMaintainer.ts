import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ip blacklist maintainer
 */
@Entity({name: 'ip_blacklist_maintainer'})
export class IpBlacklistMaintainer extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * ip id
     */
    @Index()
    @Column()
    public ip_id!: number;

    /**
     * ip maintainer id
     */
    @Index()
    @Column()
    public ip_maintainer_id!: number;

}