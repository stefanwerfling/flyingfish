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

    @Column()
        // @ts-ignore
    index: number;

    @Column()
        // @ts-ignore
    ssl_enable: boolean;

    @Column()
        // @ts-ignore
    http2_enable: boolean;

    @Column()
        // @ts-ignore
    certbot_email: string;

    @Column()
        // @ts-ignore
    certbot_lastupdate: number;

}