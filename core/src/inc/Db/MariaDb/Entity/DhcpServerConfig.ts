import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DhcpServerConfig — a LAN DHCP/RA server configuration (Pi-router epic). Node-LOCAL,
 * ONE ROW PER LAN INTERFACE (keyed by `network_interface_id`), so multiple LAN NICs can
 * each run their own DHCP server on their own subnet. Applied by the netdevice part
 * (one dnsmasq per LAN NIC: DHCPv4 leases + IPv6 RA). DNS is NOT served by dnsmasq —
 * LAN clients are handed `dns_server` (the FlyingFish dnsserver as the LAN resolver).
 */
@Entity({name: 'dhcp_server_config'})
export class DhcpServerConfig extends DBBaseEntityId {

    /**
     * The LAN NetworkInterface this DHCP config belongs to (node-local int id). One
     * DHCP server per LAN NIC.
     */
    @Column({
        default: 0
    })
    public network_interface_id!: number;

    /**
     * Enable the LAN DHCP server.
     */
    @Column({
        type: 'bool',
        default: false
    })
    public enable!: boolean;

    /**
     * First address of the DHCPv4 lease range.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public range_start!: string;

    /**
     * Last address of the DHCPv4 lease range.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public range_end!: string;

    /**
     * Lease time in seconds.
     */
    @Column({
        default: 3600
    })
    public lease_time!: number;

    /**
     * The gateway handed to clients (normally the LAN interface's static IPv4 address).
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public gateway!: string;

    /**
     * The DNS resolver handed to clients — the FlyingFish dnsserver's LAN address.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public dns_server!: string;

    /**
     * Optional local domain suffix advertised to clients.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public domain!: string;

    /**
     * Enable IPv6 router advertisements (SLAAC/DHCPv6) on the LAN.
     */
    @Column({
        type: 'bool',
        default: false
    })
    public ra_enable!: boolean;

}