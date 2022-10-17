import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nat port Entity
 */
@Entity({name: 'nat_port'})
export class NatPort extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    postion: number;

    /**
     * public port
     */
    @Column()
        // @ts-ignore
    public_port: number;

    /**
     * gateway identifier id
     */
    @Index()
    @Column()
        // @ts-ignore
    gateway_identifier_id: number;

    /**
     * ip address
     */
    @Column()
        // @ts-ignore
    gateway_address: string;

    /**
     * privat port
     */
    @Column()
        // @ts-ignore
    private_port: number;

    /**
     * client address
     */
    @Column()
        // @ts-ignore
    client_address: string;

    /**
     * use himhip host address
     */
    @Column({
        default: false
    })
        // @ts-ignore
    use_himhip_host_address: boolean;

    @Column()
        // @ts-ignore
    ttl: number;

    @Column({
        default: ''
    })
        // @ts-ignore
    protocol: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    last_ttl_update: number;

    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    listen_id: number;

    @Column()
        // @ts-ignore
    description: string;

}