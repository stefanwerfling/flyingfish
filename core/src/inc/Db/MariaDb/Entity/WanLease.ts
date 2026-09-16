import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * WanLease — the DHCP lease the WAN interface currently holds (Pi-router epic, Phase 3).
 * Node-LOCAL, a READ model: `ff-wan` runs the WAN DHCP client and reports the obtained
 * lease (IPv4 address/gateway/DNS + any delegated IPv6 prefix) so the WebUI can show the
 * uplink and the IPv6-PD prefix is known for the LAN. One row per node (the WAN).
 */
@Entity({name: 'wan_lease'})
export class WanLease extends DBBaseEntityId {

    /**
     * The WAN interface the lease is on.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public interface!: string;

    /**
     * The leased IPv4 address.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public ipv4_address!: string;

    /**
     * The IPv4 CIDR prefix length (e.g. 24).
     */
    @Column({
        default: 0
    })
    public ipv4_prefix!: number;

    /**
     * The default gateway.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public gateway!: string;

    /**
     * The DNS servers, comma-separated (as the DHCP offer lists them).
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public dns_servers!: string;

    /**
     * The delegated IPv6 prefix (DHCPv6-PD), e.g. `2003:...::/64`; empty if none.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public ipv6_prefix!: string;

    /**
     * The lease time in seconds (0 if unknown).
     */
    @Column({
        default: 0
    })
    public lease_seconds!: number;

    /**
     * When the lease was obtained/reported (epoch seconds).
     */
    @Column({
        default: 0
    })
    public obtained!: number;

}