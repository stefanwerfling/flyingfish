import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * ListenTypes
 */
export enum ListenTypes {
    stream,
    http
}

/**
 * Nginx Stream Entity
 */
@Entity({name: 'nginx_listen'})
export class NginxListen extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column()
        // @ts-ignore
    listen_type: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_port: number;

    @Column({
        type: 'bool',
        default: false
    })
        // @ts-ignore
    enable_ipv6: boolean;

    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    name: string;

    @Column({
        type: 'text'
    })
        // @ts-ignore
    description: string;

}