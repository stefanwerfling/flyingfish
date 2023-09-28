import {NginxListenAddressCheckType, NginxListenCategory, NginxListenProtocol} from 'flyingfish_schemas';
import {Column, Entity, Index} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Nginx listen to the table.
 */
@Entity({name: 'nginx_listen'})
export class NginxListen extends DBBaseEntityId {

    /**
     * listen type
     */
    @Column()
    public listen_type!: number;

    /**
     * listen category
     */
    @Column({
        default: NginxListenCategory.default_stream_nonessl
    })
    public listen_category!: number;

    /**
     * listen port
     */
    @Index()
    @Column()
    public listen_port!: number;

    /**
     * listen protocol
     */
    @Index()
    @Column({
        default: NginxListenProtocol.tcp
    })
    public listen_protocol!: number;

    /**
     * enable ipv6
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_ipv6!: boolean;

    /**
     * name
     */
    @Column({
        type: 'varchar',
        length: 512
    })
    public name!: string;

    /**
     * description
     */
    @Column({
        type: 'text'
    })
    public description!: string;

    /**
     * enable upnp nat
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_upnp_nat!: boolean;

    /**
     * declarate (true/false) all incoming connection send to address check
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable_address_check!: boolean;

    /**
     * type of use the address check (by blacklist or whitelist)
     */
    @Column({
        default: NginxListenAddressCheckType.black
    })
    public address_check_type!: number;

    /**
     * declarate (true/false) a user can delete this listen
     */
    @Column({
        type: 'bool',
        default: false
    })
    public fixlisten!: boolean;

    /**
     * declarate (true/false) a user can add a route (ui) to this listen or not
     */
    @Column({
        type: 'bool',
        default: false
    })
    public routeless!: boolean;

    /**
     * disable the listen
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

    /**
     * activate proxy protocol
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public proxy_protocol!: boolean;

    /**
     * activate proxy protocol incoming
     */
    @Index()
    @Column({
        type: 'bool',
        default: false
    })
    public proxy_protocol_in!: boolean;

}