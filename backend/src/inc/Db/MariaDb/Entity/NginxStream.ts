import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';
import {UpstreamLoadBalancingAlgorithm} from '../../../Nginx/Config/Upstream.js';

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_stream'})
export class NginxStream extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public domain_id!: number;

    @Index()
    @Column()
    public listen_id!: number;

    @Index()
    @Column({
        default: 0
    })
    public destination_listen_id!: number;

    @Column({
        default: 0
    })
    public index!: number;

    @Column({
        type: 'varchar',
        length: 128,
        default: UpstreamLoadBalancingAlgorithm.none
    })
    public load_balancing_algorithm!: string;

    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public alias_name!: string;

    @Column({
        default: false
    })
    public isdefault!: boolean;

    @Column({
        default: 0
    })
    public sshport_in_id!: number;

    @Column({
        default: 0
    })
    public sshport_out_id!: number;

}