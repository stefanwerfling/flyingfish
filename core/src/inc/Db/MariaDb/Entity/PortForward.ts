import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * PortForward — one inbound firewall/port-forwarding rule for the Pi-router (Phase 2).
 * Builds on the WAN input firewall (Phase 1): each rule punches a controlled hole for
 * unsolicited inbound on the WAN, either DNAT'd to a LAN host or accepted to the router
 * itself. Node-LOCAL (not gossiped cluster-wide), like the other router config.
 */
@Entity({name: 'port_forward'})
export class PortForward extends DBBaseEntityId {

    /**
     * The transport protocol the rule matches: `tcp`, `udp` or `both`.
     */
    @Column({
        type: 'varchar',
        length: 8,
        default: 'tcp'
    })
    public proto!: string;

    /**
     * The WAN (incoming) port. With `wan_port_end` > 0 this is the start of a range.
     */
    @Column({
        type: 'int'
    })
    public wan_port!: number;

    /**
     * End of the WAN port range (inclusive); 0 = a single port. A range only makes sense
     * for a 1:1 forward (host port range = WAN port range) or a router allow.
     */
    @Column({
        type: 'int',
        default: 0
    })
    public wan_port_end!: number;

    /**
     * The address family the rule applies to: `ipv4`, `ipv6` or `both`.
     */
    @Column({
        type: 'varchar',
        length: 8,
        default: 'ipv4'
    })
    public family!: string;

    /**
     * Where the inbound traffic goes: `host` (DNAT to a LAN host) or `router` (accept to a
     * service on the Pi itself).
     */
    @Column({
        type: 'varchar',
        length: 8,
        default: 'host'
    })
    public target_type!: string;

    /**
     * The destination host IP for a `host` forward (a LAN IPv4 or a LAN IPv6/ULA); empty
     * for a `router` rule.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public target_host!: string;

    /**
     * The destination port on the host; 0 = same as the WAN port.
     */
    @Column({
        type: 'int',
        default: 0
    })
    public target_port!: number;

    /**
     * Whether the rule is active.
     */
    @Column({
        type: 'bool',
        default: true
    })
    public enabled!: boolean;

    /**
     * A human-readable description (e.g. "NAS / web").
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public description!: string;

}
