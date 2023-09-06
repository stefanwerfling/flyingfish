import {Entity, Column, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * User Entity
 */
@Entity({name: 'ssh_user'})
export class SshUser extends DBBaseEntityId {

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