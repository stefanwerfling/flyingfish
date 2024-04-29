import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

@Entity({name: 'credential'})
export class Credential extends DBBaseEntityId {

    /**
     * Name of credential
     */
    @Column()
    public name!: string;

    /**
     * scheme
     */
    @Column()
    public scheme!: number;

    /**
     * provider
     */
    @Column()
    public provider!: string;

    /**
     * position
     */
    @Column()
    public position!: number;

    /**
     * settings
     */
    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

}