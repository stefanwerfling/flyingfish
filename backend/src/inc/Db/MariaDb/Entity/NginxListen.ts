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
    https
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
        // @ts-ignore
    id: number;

    @Column()
        // @ts-ignore
    listen_type: number;

    @Column({
        default: ListenCategory.default_stream_nonessl
    })
        // @ts-ignore
    listen_category: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_port: number;

    @Index()
    @Column({
        default: ListenProtocol.tcp
    })
        // @ts-ignore
    listen_protocol: number;

    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    enable_ipv6: boolean;

    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    name: string;

    @Column({
        type: 'text'
    })
        // @ts-ignore
    description: string;

    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    enable_upnp_nat: boolean;

    /**
     * declarate (true/false) all incoming connection send to address check
     */
    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    enable_address_check: boolean;

    /**
     * declarate (true/false) a user can delete this listen
     */
    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    fixlisten: boolean;

    /**
     * declarate (true/false) a user can add a route (ui) to this listen or not
     */
    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    routeless: boolean;

}