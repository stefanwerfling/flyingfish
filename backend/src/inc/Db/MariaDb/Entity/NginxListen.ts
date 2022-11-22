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

    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public listen_type!: number;

    @Column({
        default: ListenCategory.default_stream_nonessl
    })
    public listen_category!: number;

    @Index()
    @Column()
    public listen_port!: number;

    @Index()
    @Column({
        default: ListenProtocol.tcp
    })
    public listen_protocol!: number;

    @Column({
        type: 'bool',
        default: false
    })
    public enable_ipv6!: boolean;

    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    @Column({
        type: 'text'
    })
    public description!: string;

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