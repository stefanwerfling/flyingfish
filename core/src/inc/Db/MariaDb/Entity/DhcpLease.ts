import {Column, Entity} from 'typeorm';
import {DBBaseEntityId} from '../DBBaseEntityId.js';

/**
 * DhcpLease — an active LAN DHCP lease (Pi-router epic). Node-LOCAL, a READ model:
 * `ff-lan` reports the current dnsmasq leases so the WebUI can show connected clients.
 * Not authored in the UI.
 */
@Entity({name: 'dhcp_lease'})
export class DhcpLease extends DBBaseEntityId {

    /**
     * The leased client's MAC address.
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public mac_address!: string;

    /**
     * The leased IP address.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public ip_address!: string;

    /**
     * The client hostname, if it announced one.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public hostname!: string;

    /**
     * Lease expiry as an epoch timestamp (seconds); 0 if unknown.
     */
    @Column({
        default: 0
    })
    public expires!: number;

    /**
     * The interface the lease was served on.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public interface!: string;

}