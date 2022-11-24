import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ListenTypes
 */
export enum ListenTypes {
    stream,
    http
}

/**
 * ListenCategory
 */
export enum ListenCategory {
    default_stream_nonessl,
    default_stream_ssl,
    default_http,
    default_https,
    stream,
    http,
    https,
    status
}

/**
 * ListenProtocol
 */
export enum ListenProtocol {
    tcp,
    udp,
    tcp_udp
}

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_listen'})
export class NginxListen extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * listen type
     */
    @Column()
    public listen_type!: number;

    /**
     * listen category
     */
    @Column({
        default: ListenCategory.default_stream_nonessl
    })
    public listen_category!: number;

    /**
     * listen port
     */
    @Index()
    @Column()
    public listen_port!: number;

    /**
     * listen protocol
     */
    @Index()
    @Column({
        default: ListenProtocol.tcp
    })
    public listen_protocol!: number;

    /**
     * enable ipv6
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_ipv6!: boolean;

    /**
     * name
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    /**
     * description
     */
    @Column({
        type: 'text'
    })
    public description!: string;

    /**
     * enable upnp nat
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_upnp_nat!: boolean;

    /**
     * declarate (true/false) all incoming connection send to address check
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_address_check!: boolean;

    /**
     * declarate (true/false) a user can delete this listen
     */
    @Column({
        type: 'bool',
        default: false
    })
    public fixlisten!: boolean;

    /**
     * declarate (true/false) a user can add a route (ui) to this listen or not
     */
    @Column({
        type: 'bool',
        default: false
    })
    public routeless!: boolean;

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