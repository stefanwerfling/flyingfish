import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * SSH port Entity
 */
@Entity({name: 'ssh_port'})
export class SshPort extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * ssh user id
     */
    @Index()
    @Column()
    public ssh_user_id!: number;

    /**
     * port
     */
    @Column()
    public port!: number;

}