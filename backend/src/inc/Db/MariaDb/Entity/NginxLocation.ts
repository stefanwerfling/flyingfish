import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxLocation
 */
@Entity({name: 'nginx_location'})
export class NginxLocation extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    http_id: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    redirect_code: number;

    /**
     * redirect to url
     */
    @Column({
        default: ''
    })
        // @ts-ignore
    redirect: string;

    @Column({
        default: '/'
    })
        // @ts-ignore
    match: string;

    @Column({
        default: ''
    })
        // @ts-ignore
    modifier: string;

    @Column({
        default: ''
    })
        // @ts-ignore
    proxy_pass: string;

    @Column({
        default: false
    })
        // @ts-ignore
    auth_enable: boolean;

    @Column({
        default: ''
    })
        // @ts-ignore
    auth_relam: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    sshport_out_id: number;

    @Column({
        default: ''
    })
        // @ts-ignore
    sshport_schema: string;

    @Column({
        default: false
    })
        // @ts-ignore
    websocket_enable: boolean;

    @Column({
        default: true
    })
        // @ts-ignore
    host_enable: boolean;

    @Column({
        default: ''
    })
        // @ts-ignore
    host_name: string;

    @Column({
        default: true
    })
        // @ts-ignore
    xforwarded_scheme_enable: boolean;

    @Column({
        default: true
    })
        // @ts-ignore
    xforwarded_proto_enable: boolean;

    @Column({
        default: true
    })
        // @ts-ignore
    xforwarded_for_enable: boolean;

    @Column({
        default: true
    })
        // @ts-ignore
    xrealip_enable: boolean;

}