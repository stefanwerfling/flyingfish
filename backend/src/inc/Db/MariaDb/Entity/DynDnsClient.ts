import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClient
 */
@Entity({name: 'dyndns_client'})
export class DynDnsClient extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column()
        // @ts-ignore
    provider: string;

    @Column()
        // @ts-ignore
    username: string;

    @Column()
        // @ts-ignore
    password: string;

    @Column({
        default: false
    })
        // @ts-ignore
    update_domain: boolean;

    @Column({
        default: 0
    })
        // @ts-ignore
    last_status: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    last_update: number;

}