import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * SSH port Entity
 */
@Entity({name: 'ssh_port'})
export class SshPort extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public ssh_user_id!: number;

    @Column()
    public port!: number;

}