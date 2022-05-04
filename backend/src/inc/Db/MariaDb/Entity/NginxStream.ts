import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

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
        type: 'varchar',
        length: 512
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
    sshport_id: number;

}