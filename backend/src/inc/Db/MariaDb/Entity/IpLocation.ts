import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * IpLocation
 */
@Entity({name: 'ip_location'})
export class IpLocation extends BaseEntity {

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
     * country
     */
    @Column({
        default: ''
    })
    public country!: string;

    /**
     * country code
     */
    @Column({
        default: ''
    })
    public country_code!: string;

    /**
     * city
     */
    @Column({
        default: ''
    })
    public city!: string;

    /**
     * continent
     */
    @Column({
        default: ''
    })
    public continent!: string;

    /**
     * latitude
     */
    @Column({
        default: ''
    })
    public latitude!: string;

    /**
     * longitude
     */
    @Column({
        default: ''
    })
    public longitude!: string;

    /**
     * time zone
     */
    @Column({
        default: ''
    })
    public time_zone!: string;

    /**
     * postal code
     */
    @Column({
        default: ''
    })
    public postal_code!: string;

    /**
     * org
     */
    @Column({
        default: ''
    })
    public org!: string;

    /**
     * asn
     */
    @Column({
        default: ''
    })
    public asn!: string;

}