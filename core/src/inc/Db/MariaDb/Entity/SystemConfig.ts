import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * SystemConfig — this node's operating mode and derived-target settings. Node-LOCAL,
 * effectively a singleton per node (one row).
 *
 * `mode`:
 *  - `attach`: single interface — gateway and targets share the host's NIC; the Router
 *    area is not used.
 *  - `router`: WAN on one interface, routes to a LAN interface (NAT / DHCP / forwarding).
 *
 * `target_ip` is an optional override for the node's reachable address that downstream
 * services (DNS auto-records, the HTTP-redirect host, self-referential nginx targets) use;
 * empty means "derive automatically" (attach → the host default-route IP; router → the
 * relevant interface address). `attach_interface` names the NIC used in attach mode
 * (empty = the host default route).
 */
@Entity({name: 'system_config'})
export class SystemConfig extends DBBaseEntityId {

    /**
     * Operating mode: `attach` (single interface) or `router` (WAN + LAN routing).
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'attach'
    })
    public mode!: string;

    /**
     * Optional override for the node's reachable target IP (empty = auto-derive).
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public target_ip!: string;

    /**
     * The interface used in attach mode (empty = the host default-route interface).
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public attach_interface!: string;

}
