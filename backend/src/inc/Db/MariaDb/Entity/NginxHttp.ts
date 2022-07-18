import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxHttp
 */
@Entity({name: 'nginx_http'})
export class NginxHttp extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    domain_id: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_id: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    index: number;

    @Column({
        default: false
    })
        // @ts-ignore
    ssl_enable: boolean;

    @Column({
        default: false
    })
        // @ts-ignore
    http2_enable: boolean;

    @Column({
        default: ''
    })
        // @ts-ignore
    cert_provider: string;

    @Column({
        default: ''
    })
        // @ts-ignore
    cert_email: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    cert_lastupdate: number;

}