import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'ssh_user'})
export class SshUser extends BaseEntity {

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
    @Column({
        default: ''
    })
    public password!: string;

    /**
     * disable
     */
    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}