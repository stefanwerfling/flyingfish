import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxLocationDestinationTypes
 */
export enum NginxLocationDestinationTypes {
    none = 0,
    proxypass = 1,
    redirect = 2,
    ssh = 3,
    dyndns = 4,
    vpn = 5
}

/**
 * NginxLocation
 */
@Entity({name: 'nginx_location'})
export class NginxLocation extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * http id
     */
    @Index()
    @Column()
    public http_id!: number;

    /**
     * destination type
     */
    @Column()
    public destination_type!: number;

    /**
     * redirect code
     */
    @Column({
        default: 0
    })
    public redirect_code!: number;

    /**
     * redirect to url
     */
    @Column({
        default: ''
    })
    public redirect!: string;

    /**
     * match
     */
    @Column({
        default: '/'
    })
    public match!: string;

    /**
     * modifier
     */
    @Column({
        default: ''
    })
    public modifier!: string;

    /**
     * proxy pass
     */
    @Column({
        default: ''
    })
    public proxy_pass!: string;

    /**
     * auth enable
     */
    @Column({
        default: false
    })
    public auth_enable!: boolean;

    /**
     * auth relam
     */
    @Column({
        default: ''
    })
    public auth_relam!: string;

    /**
     * ssh port out id
     */
    @Column({
        default: 0
    })
    public sshport_out_id!: number;

    /**
     * ssh port schema
     */
    @Column({
        default: ''
    })
    public sshport_schema!: string;

    /**
     * websocket enable
     */
    @Column({
        default: false
    })
    public websocket_enable!: boolean;

    /**
     * host enable
     */
    @Column({
        default: true
    })
    public host_enable!: boolean;

    /**
     * host name
     */
    @Column({
        default: ''
    })
    public host_name!: string;

    /**
     * host name port
     */
    @Column({
        default: 0
    })
    public host_name_port!: number;

    /**
     * xforwarded scheme enable
     */
    @Column({
        default: true
    })
    public xforwarded_scheme_enable!: boolean;

    /**
     * xforwarded proto enable
     */
    @Column({
        default: true
    })
    public xforwarded_proto_enable!: boolean;

    /**
     * xforwarded for enable
     */
    @Column({
        default: true
    })
    public xforwarded_for_enable!: boolean;

    /**
     * xrealip enable
     */
    @Column({
        default: true
    })
    public xrealip_enable!: boolean;

}