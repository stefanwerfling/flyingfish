import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * CredentialUser
 */
@Entity({name: 'credential_user'})
export class CredentialUser extends DBBaseEntityId {

    /**
     * credential id
     */
    @Index()
    @Column()
    public credential_id!: number;

    /**
     * username
     */
    @Column()
    public username!: string;

    /**
     * password
     */
    @Column()
    public password!: string;

    /**
     * disabled
     */
    @Index()
    @Column()
    public disabled!: boolean;

}