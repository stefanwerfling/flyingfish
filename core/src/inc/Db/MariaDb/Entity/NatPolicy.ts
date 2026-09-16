import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * NatPolicy — this node's routing/NAT policy (Pi-router epic). Node-LOCAL, effectively
 * a singleton per node (one row). The WAN/LAN interfaces are derived from
 * {@link NetworkInterface} roles, not referenced here. `ff-netfilter` applies this as
 * the host nftables ruleset + forwarding sysctls.
 */
@Entity({name: 'nat_policy'})
export class NatPolicy extends DBBaseEntityId {

    /**
     * Enable IPv4 NAT (masquerade LAN → WAN).
     */
    @Column({
        type: 'bool',
        default: false
    })
    public nat44_enabled!: boolean;

    /**
     * IPv6 mode: `off` (no IPv6 routing), `nat66` (masquerade a LAN ULA → the WAN
     * IPv6, works even with only a single delegated /64), or `pd` (route the
     * DHCPv6-PD-delegated prefix to the LAN — real end-to-end IPv6).
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'off'
    })
    public ipv6_mode!: string;

    /**
     * Enable kernel IP forwarding (net.ipv4.ip_forward / net.ipv6…forwarding). Required
     * for any routing between WAN and LAN.
     */
    @Column({
        type: 'bool',
        default: false
    })
    public forward_enabled!: boolean;

}