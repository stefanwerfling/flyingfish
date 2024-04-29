import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Credential location a N to N
 */
@Entity({name: 'credential_location'})
export class CredentialLocation extends DBBaseEntityId {

    /**
     * Id from credential
     */
    @Index()
    @Column()
    public credential_id!: number;

    /**
     * Id from location
     */
    @Index()
    @Column()
    public location_id!: number;

    /**
     * Position for fallback
     */
    @Column()
    public position!: number;

}