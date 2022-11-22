import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxLocation
 */
@Entity({name: 'nginx_location'})
export class NginxLocation extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public http_id!: number;

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

    @Column({
        default: '/'
    })
    public match!: string;

    @Column({
        default: ''
    })
    public modifier!: string;

    @Column({
        default: ''
    })
    public proxy_pass!: string;

    @Column({
        default: false
    })
    public auth_enable!: boolean;

    @Column({
        default: ''
    })
    public auth_relam!: string;

    @Column({
        default: 0
    })
    public sshport_out_id!: number;

    @Column({
        default: ''
    })
    public sshport_schema!: string;

    @Column({
        default: false
    })
    public websocket_enable!: boolean;

    @Column({
        default: true
    })
    public host_enable!: boolean;

    @Column({
        default: ''
    })
    public host_name!: string;

    @Column({
        default: true
    })
    public xforwarded_scheme_enable!: boolean;

    @Column({
        default: true
    })
    public xforwarded_proto_enable!: boolean;

    @Column({
        default: true
    })
    public xforwarded_for_enable!: boolean;

    @Column({
        default: true
    })
    public xrealip_enable!: boolean;

}