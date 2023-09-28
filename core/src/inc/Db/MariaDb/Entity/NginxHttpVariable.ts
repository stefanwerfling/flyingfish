import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Nginx http variable table.
 */
@Entity({name: 'nginx_http_variable'})
export class NginxHttpVariable extends DBBaseEntityId {

    /**
     * domain id
     */
    @Index()
    @Column()
    public http_id!: number;

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