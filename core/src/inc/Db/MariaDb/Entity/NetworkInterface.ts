import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * NetworkInterface — a physical NIC of this node and its router role (Pi-router epic).
 * Node-LOCAL (not gossiped cluster-wide, like nginx routes): it describes THIS node's
 * hardware. Interfaces are identified by their MAC address, not their OS name, because
 * a USB ethernet may enumerate as `enx<mac>`/`eth1` unpredictably.
 */
@Entity({name: 'network_interface'})
export class NetworkInterface extends DBBaseEntityId {

    /**
     * The MAC address — the stable identity of the NIC across reboots / renames.
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public mac_address!: string;

    /**
     * The current OS interface name (e.g. `eth0`, `enxdca6...`), informational only.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public name!: string;

    /**
     * The router role: `wan` (uplink, DHCP client), `lan` (downlink, DHCP server), or
     * `unassigned`.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'unassigned'
    })
    public role!: string;

    /**
     * IPv4 addressing mode: `dhcp` (WAN client), `static` (LAN gateway), or `none`.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'none'
    })
    public ipv4_mode!: string;

    /**
     * The static IPv4 address (the gateway address for a LAN interface); empty otherwise.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public ipv4_address!: string;

    /**
     * The static IPv4 CIDR prefix length (e.g. 24); 0 when not static.
     */
    @Column({
        default: 0
    })
    public ipv4_prefix!: number;

    /**
     * Disable the interface (leave it unmanaged).
     */
    @Column({
        type: 'bool',
        default: false
    })
    public disable!: boolean;

}