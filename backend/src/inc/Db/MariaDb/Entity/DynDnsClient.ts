import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsClient
 */
@Entity({name: 'dyndns_client'})
export class DynDnsClient extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * provider
     */
    @Column()
    public provider!: string;

    /**
     * username
     */
    @Column()
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * update domain
     */
    @Column({
        default: false
    })
    public update_domain!: boolean;

    /**
     * last status
     */
    @Column({
        default: 0
    })
    public last_status!: number;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}