import {IPv4} from './IPv4.js';
import {IPv6} from './IPv6.js';

/**
 * IP
 */
export class IP {

    /**
     * getIPVersion
     * @param rawPacket
     * @param offset
     */
    public static getIPVersion(rawPacket: Buffer, offset: number = 0): number {
        // eslint-disable-next-line no-bitwise
        return (rawPacket[offset] & 0xf0) >> 4;
    }

    public static decodeIP(rawPacket: Buffer, offset: number = 0): IPv4|null {
        const version = IP.getIPVersion(rawPacket, offset);
        let ip: IPv4|null = null;

        switch (version) {
            case 4:
                ip = new IPv4();
                break;

            case 6:
                // ip = new IP6();
                break;
        }

        if (ip) {
            ip.decode(rawPacket, offset);
        }

        return ip;
    }

}