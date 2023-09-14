import {DBBaseEntityId} from '../DBBaseEntityId.js';
import {Column, Entity, Index} from 'typeorm';

@Entity({name: 'nat_port'})
export class Settings extends DBBaseEntityId {

    /**
     * name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    /**
     * value
     */
    @Column({
        type: 'text',
        default: ''
    })
    public value!: string;

}