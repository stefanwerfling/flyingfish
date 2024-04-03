import arp from '@network-utils/arp-lookup';
import {Logger, RedisChannels, RedisClient} from 'flyingfish_core';
import {HimHIPData} from 'flyingfish_schemas/dist/src/index.js';
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
                    // when redis instance work use new commincation way -----------------------------------------------
                    if (RedisClient.hasInstance()) {
                        const rclient = RedisClient.getInstance();
                        const data: HimHIPData = {
                            network: ipRouteInfo.network,
                            gateway: ipRouteInfo.gateway,
                            interface: ipRouteInfo.interface,
                            hostip: ipRouteInfo.hostip,
                            gatewaymac
                        };

                        await rclient.sendChannel(RedisChannels.HIMHIP_UPDATE_RES, JSON.stringify(data));
                        return;
                    }

                    // send data over old way (https express) ----------------------------------------------------------
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