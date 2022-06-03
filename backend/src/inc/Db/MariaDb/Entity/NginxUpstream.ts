import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_upstream'})
export class NginxUpstream extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    stream_id: number;

    @Column()
        // @ts-ignore
    index: number;

    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    destination_address: string;

    @Column()
        // @ts-ignore
    destination_port: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    weight: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    max_fails: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    fail_timeout: number;

}