import arp from '@network-utils/arp-lookup';
import {Ets} from 'ets';
import {Logger, RedisChannel, RedisClient} from 'figtree';
import {RedisChannels} from 'flyingfish_core';
import {HimHIPData, HimHIPUpdate, SchemaHimHIPUpdate} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {IpRoute} from './IpRoute.js';

/**
 * HimHIP
 */
export class HimHIP extends RedisChannel<HimHIPUpdate> {

    /**
     * Constructor
     */
    public constructor() {
        super(RedisChannels.HIMHIP_UPDATE_REQ);
    }

    /**
     * Channel listen
     * @param {HimHIPUpdate} update
     */
    public async listen(update: HimHIPUpdate): Promise<void> {
        if (SchemaHimHIPUpdate.validate(update, [])) {
            if (update.update) {
                try {
                    const data = await HimHIP._collectData();

                    if (Vts.isNull(data)) {
                        return;
                    }

                    await HimHIP._sendDataToChannel(data);
                } catch (e) {
                    Logger.getLogger().error('HimHip::listen: error can not send information to channel.');
                    Logger.getLogger().error(Ets.formate(e, true, true));
                }
            }
        }
    }

    /**
     * Collect all data
     * @returns {HimHIPData|null}
     * @protected
     */
    protected static async _collectData(): Promise<HimHIPData|null> {
        const ipRouteInfo = await IpRoute.get();

        if (ipRouteInfo) {
            const gatewaymac = await arp.toMAC(ipRouteInfo.gateway);

            if (gatewaymac) {
                return  {
                    network: ipRouteInfo.network,
                    gateway: ipRouteInfo.gateway,
                    interface: ipRouteInfo.interface,
                    hostip: ipRouteInfo.hostip,
                    gatewaymac: gatewaymac
                };
            }

            Logger.getLogger().error('HimHip::_collectData: arp mac request is empty!');
        }

        Logger.getLogger().error('HimHip::_collectData: ip route information not return.');

        return null;
    }

    /**
     * Send the data over a channel
     * @param {HimHIPData} data
     * @returns {boolean}
     * @protected
     */
    protected static async _sendDataToChannel(data: HimHIPData): Promise<boolean> {
        if (RedisClient.hasInstance()) {
            const rclient = RedisClient.getInstance();
            await rclient.sendChannel(RedisChannels.HIMHIP_UPDATE_RES, JSON.stringify(data));

            return true;
        }

        Logger.getLogger().silly('HimHip::_sendDataToChannel: none instance has found.');
        return false;
    }

    /**
     * update
     * Collect the host/gateway data and publish it to the backend over the Redis
     * channel. Redis is the only transport (the legacy HTTP endpoint was removed
     * in phase 3); without a Redis instance this is a logged no-op.
     */
    public static async update(): Promise<void> {
        // eslint-disable-next-line no-useless-assignment
        let data: HimHIPData|null = null;

        try {
            data = await HimHIP._collectData();
        } catch (e) {
            Logger.getLogger().error('HimHip::update: error can not collect information.');
            Logger.getLogger().error(Ets.formate(e, true, true));
            return;
        }

        if (Vts.isNull(data)) {
            Logger.getLogger().silly('HimHip::update: data empty.');
            return;
        }

        try {
            if (!await HimHIP._sendDataToChannel(data)) {
                Logger.getLogger().error('HimHip::update: no redis instance, host information not sent.');
            }
        } catch (e) {
            Logger.getLogger().error('HimHip::update: error can not send information over channel to server.');
            Logger.getLogger().error(Ets.formate(e, true, true));
        }
    }

}