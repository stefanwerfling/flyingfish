import arp from '@network-utils/arp-lookup';
import {Logger} from 'flyingfish_core';
import got from 'got';
import {IpRoute} from './IpRoute.js';

/**
 * HimHIP
 */
export class HimHIP {

    /**
     * update
     * @param reciverUrl
     * @param secret
     */
    public static async update(reciverUrl: string, secret: string): Promise<void> {
        const ipRouteInfo = await IpRoute.get();

        if (ipRouteInfo) {
            const gatewaymac = await arp.toMAC(ipRouteInfo.gateway);

            if (gatewaymac) {
                try {
                    const response = await got({
                        url: reciverUrl,
                        headers: {
                            secret,
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
                        Logger.getLogger().error('HimHip::update: response return failed');

                        if (response.body) {
                            Logger.getLogger().error(response.body);
                        }
                    }
                } catch (e) {
                    Logger.getLogger().error(`HimHip::update: error can not send information to server: '${reciverUrl}'.`);
                }
            } else {
                Logger.getLogger().error('HimHip::update: arp mac request is empty!');
            }
        } else {
            Logger.getLogger().error('HimHip::update: ip route information not return.');
        }
    }

}