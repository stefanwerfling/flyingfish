import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxHttp
 */
@Entity({name: 'nginx_http'})
export class NginxHttp extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public domain_id!: number;

    @Index()
    @Column()
    public listen_id!: number;

    @Column({
        default: 0
    })
    public index!: number;

    @Column({
        default: false
    })
    public ssl_enable!: boolean;

    @Column({
        default: false
    })
    public http2_enable!: boolean;

    @Column({
        default: ''
    })
    public cert_provider!: string;

    @Column({
        default: ''
    })
    public cert_email!: string;

    @Column({
        default: 0
    })
    public cert_lastupdate!: number;

    @Column({
        default: 0
    })
    public cert_createtry!: number;

}