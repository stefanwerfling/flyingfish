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

    @Column()
        // @ts-ignore
    listen_category: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_port: number;

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

}