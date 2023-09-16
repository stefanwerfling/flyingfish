import {Column, Index, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

@Entity({name: 'credential'})
export class Credential extends DBBaseEntityId {

    /**
     * location id
     */
    @Index()
    @Column()
    public location_id!: number;

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