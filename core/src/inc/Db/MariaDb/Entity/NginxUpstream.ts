import {DBBaseEntityId} from '../DBBaseEntityId.js';
import {Column, Entity, Index} from 'typeorm';

@Entity({name: 'nginx_upstream'})
export class NginxUpstream extends DBBaseEntityId {

    /**
     * stream id
     */
    @Index()
    @Column()
    public stream_id!: number;

    /**
     * index
     */
    @Column({
        default: 0
    })
    public index!: number;

    /**
     * destination address
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public destination_address!: string;

    /**
     * destination port
     */
    @Column()
    public destination_port!: number;

    /**
     * weight
     */
    @Column({
        default: 0
    })
    public weight!: number;

    /**
     * max fails
     */
    @Column({
        default: 0
    })
    public max_fails!: number;

    /**
     * fail timeout
     */
    @Column({
        default: 0
    })
    public fail_timeout!: number;

    /**
     * proxy protocol out
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public proxy_protocol_out!: boolean;

}