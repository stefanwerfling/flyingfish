import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * BlacklistCategory
 */
export enum BlacklistCategory {
    reputation = 1,
    malware = 2,
    attacks = 3,
    abuse = 4,
    spam = 5,
    organizations = 6,
    geolocation = 7
}

/**
 * ip blacklist categorys
 */
@Entity({name: 'ip_blacklist_category'})
export class IpBlacklistCategory extends BaseEntity {

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
     * category number
     */
    @Index()
    @Column()
    public cat_num!: number;

}