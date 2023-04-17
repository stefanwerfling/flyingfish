import arp from '@network-utils/arp-lookup';
import got from 'got';
import {IpRoute} from './IpRoute.js';

/**
 * HimHIP
 */
export class HimHIP {

    /**
     * update
     * @param reciverUrl
     * @param secure
     */
    public static async update(reciverUrl: string, secure: string): Promise<void> {
        const ipRouteInfo = await IpRoute.get();

        if (ipRouteInfo) {
            const gatewaymac = await arp.toMAC(ipRouteInfo.gateway);

            if (gatewaymac) {
                try {
                    const response = await got({
                        url: reciverUrl,
                        headers: {
                            secure,
                            gatewaymac,
                            network: ipRouteInfo.network,
                            gateway: ipRouteInfo.gateway,
                            interface: ipRouteInfo.interface,
                            hostip: ipRouteInfo.hostip
                        },
                        https: {
                            rejectUnauthorized: false
                        }
                    });

                    if (response.statusCode !== 200) {
                        console.error('HimHip::update: response return failed');

                        if (response.body) {
                            console.error(response.body);
                        }
                    }
                } catch (e) {
                    console.error(`HimHip::update: error can not send information to server: '${reciverUrl}'.`);
                }
            } else {
                console.error('HimHip::update: arp mac request is empty!');
            }
        } else {
            console.error('HimHip::update: ip route information not return.');
        }
    }

}