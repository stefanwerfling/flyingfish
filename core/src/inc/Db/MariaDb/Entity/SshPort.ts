import {Entity, Column, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * SSH port Entity
 */
@Entity({name: 'ssh_port'})
export class SshPort extends DBBaseEntityId {

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