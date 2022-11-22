import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'ssh_user'})
export class SshUser extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    @Column()
    public password!: string;

    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}