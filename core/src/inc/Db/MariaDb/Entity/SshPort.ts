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