import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
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

    /**
     * forward type, R or L
     */
    @Column({
        default: 'R'
    })
    public forwardType!: string;

    /**
     * destination address, only for forward type L
     */
    @Column({
        default: ''
    })
    public destinationAddress!: string;

}