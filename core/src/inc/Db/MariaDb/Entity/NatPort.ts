import {NatStatus} from 'flyingfish_schemas';
import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

@Entity({name: 'nat_port'})
export class NatPort extends DBBaseEntityId {

    /**
     * postion
     */
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

    /**
     * ttl
     */
    @Column()
    public ttl!: number;

    /**
     * protocol
     */
    @Column({
        default: ''
    })
    public protocol!: string;

    /**
     * last ttl update
     */
    @Column({
        default: 0
    })
    public last_ttl_update!: number;

    /**
     * listen id
     */
    @Index()
    @Column({
        default: 0
    })
    public listen_id!: number;

    /**
     * description
     */
    @Column()
    public description!: string;

    /**
     * last status
     */
    @Column({
        default: NatStatus.inactive
    })
    public last_status!: number;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}