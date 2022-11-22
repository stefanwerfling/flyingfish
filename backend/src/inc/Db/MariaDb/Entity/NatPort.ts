import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nat port Entity
 */
@Entity({name: 'nat_port'})
export class NatPort extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        default: 0
    })
    public postion!: number;

    /**
     * public port
     */
    @Column()
    public public_port!: number;

    /**
     * gateway identifier id
     */
    @Index()
    @Column()
    public gateway_identifier_id!: number;

    /**
     * ip address
     */
    @Column()
    public gateway_address!: string;

    /**
     * privat port
     */
    @Column()
    public private_port!: number;

    /**
     * client address
     */
    @Column()
    public client_address!: string;

    /**
     * use himhip host address
     */
    @Column({
        default: false
    })
    public use_himhip_host_address!: boolean;

    @Column()
    public ttl!: number;

    @Column({
        default: ''
    })
    public protocol!: string;

    @Column({
        default: 0
    })
    public last_ttl_update!: number;

    @Index()
    @Column({
        default: 0
    })
    public listen_id!: number;

    @Column()
    public description!: string;

}