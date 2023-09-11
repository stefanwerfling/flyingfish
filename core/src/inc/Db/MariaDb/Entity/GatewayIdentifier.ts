import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * Gateway identifier table.
 */
@Entity({name: 'gateway_identifier'})
export class GatewayIdentifier extends DBBaseEntityId {

    /**
     * networkname
     */
    @Column()
    public networkname!: string;

    /**
     * mac address
     */
    @Column()
    public mac_address!: string;

    /**
     * address
     */
    @Column({
        default: ''
    })
    public address!: string;

    /**
     * color
     */
    @Column({
        default: ''
    })
    public color!: string;

}