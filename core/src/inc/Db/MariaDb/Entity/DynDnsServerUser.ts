import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * DynDnsServerUser
 */
@Entity({name: 'ddns_user'})
export class DynDnsServerUser extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * username
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * last update
     */
    @Column({
        default: 0
    })
    public last_update!: number;

}