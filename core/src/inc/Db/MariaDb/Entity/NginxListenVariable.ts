import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Nginx listen variable table.
 */
@Entity({name: 'nginx_listen_variable'})
export class NginxListenVariable extends DBBaseEntityId {

    /**
     * listen id
     */
    @Index()
    @Column()
    public listen_id!: number;

    /**
     * context type
     */
    @Index()
    @Column()
    public context_type!: number;

    /**
     * var name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 200
    })
    public var_name!: string;

    /**
     * var value
     */
    @Column({
        type: 'text'
    })
    public var_value!: string;

}