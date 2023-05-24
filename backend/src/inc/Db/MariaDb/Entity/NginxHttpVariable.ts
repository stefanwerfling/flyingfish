import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * NginxHttpVariableContextType
 */
export enum NginxHttpVariableContextType {
    http = 0,
    server = 1,
    location = 2
}

/**
 * NginxHttpVariable
 */
@Entity({name: 'nginx_http_variable'})
export class NginxHttpVariable extends BaseEntity {

    /**
     * id
     */
    @PrimaryGeneratedColumn()
    public id!: number;

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