import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Nat port Entity
 */
@Entity({name: 'nat_port'})
export class NatPort extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    postion: number;

    @Column()
        // @ts-ignore
    public_port: number;

    @Column()
        // @ts-ignore
    gateway_id: string;

    @Column()
        // @ts-ignore
    gateway_address: string;

    @Column()
        // @ts-ignore
    private_port: number;

    @Column()
        // @ts-ignore
    client_address: string;

    @Column()
        // @ts-ignore
    ttl: number;

    @Column()
        // @ts-ignore
    last_ttl_update: number;

    @Index()
    @Column()
        // @ts-ignore
    listen_id: number;

    @Index()
    @Column()
        // @ts-ignore
    nat_port_id: number;

    @Column()
        // @ts-ignore
    description: string;

}