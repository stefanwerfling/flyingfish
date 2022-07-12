import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';
import {UpstreamLoadBalancingAlgorithm} from '../../../Nginx/Config/Upstream';

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_stream'})
export class NginxStream extends BaseEntity {

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

    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    destination_listen_id: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    index: number;

    @Column({
        type: 'varchar',
        length: 128,
        default: UpstreamLoadBalancingAlgorithm.none
    })
        // @ts-ignore
    load_balancing_algorithm: string;

    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
        // @ts-ignore
    alias_name: string;

    @Column({
        default: false
    })
        // @ts-ignore
    isdefault: boolean;

    @Column({
        default: 0
    })
        // @ts-ignore
    sshport_in_id: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    sshport_out_id: number;

}