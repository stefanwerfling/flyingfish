import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'ssh_port'})
export class SshPort extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    ssh_user_id: number;

    @Column()
        // @ts-ignore
    port: number;

}