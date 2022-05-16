import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'dyndns_client'})
export class DynDnsClient extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    domain_id: number;

    @Column()
        // @ts-ignore
    provider: string;

    @Column()
        // @ts-ignore
    username: string;

    @Column()
        // @ts-ignore
    password: string;

}