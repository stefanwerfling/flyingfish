import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClient
 */
@Entity({name: 'dyndns_client'})
export class DynDnsClient extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Column()
    public provider!: string;

    @Column()
    public username!: string;

    @Column()
    public password!: string;

    @Column({
        default: false
    })
    public update_domain!: boolean;

    @Column({
        default: 0
    })
    public last_status!: number;

    @Column({
        default: 0
    })
    public last_update!: number;

}