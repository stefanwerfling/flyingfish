import arp from '@network-utils/arp-lookup';
import {Ets} from 'ets';
import {Logger, RedisChannel, RedisChannels, RedisClient} from 'flyingfish_core';
import {HimHIPData, HimHIPUpdate, SchemaHimHIPUpdate} from 'flyingfish_schemas';
import got from 'got';
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
     * @param update
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
                    gatewaymac
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
     * Send the data over http Endpoint
     * @param {string} reciverUrl
     * @param {string} secret
     * @param {HimHIPData} data
     * @returns {boolean}
     * @protected
     */
    protected static async _sendHttpEndpoint(reciverUrl: string, secret: string, data: HimHIPData): Promise<boolean> {
        const response = await got({
            url: reciverUrl,
            headers: {
                secret,
                gatewaymac: data.gatewaymac,
                network: data.network,
                gateway: data.gateway,
                interface: data.interface,
                hostip: data.hostip
            },
            https: {
                rejectUnauthorized: false
            }
        });

        if (response.statusCode !== 200) {
            Logger.getLogger().error('HimHip::_sendHttpEndpoint: response return failed');

            if (response.body) {
                Logger.getLogger().error(response.body);
            }

            return false;
        }

        return true;
    }

    /**
     * update
     * @param reciverUrl
     * @param secret
     */
    public static async update(reciverUrl: string, secret: string): Promise<void> {
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

        // when redis instance work use new commincation way -----------------------------------------------------------
        try {
            if (await HimHIP._sendDataToChannel(data)) {
                return;
            }
        } catch (e) {
            Logger.getLogger().error('HimHip::update: error can not send information over channel to server.');
            Logger.getLogger().error(Ets.formate(e, true, true));
        }

        // send data over old way (https express) ----------------------------------------------------------------------

        try {
            await HimHIP._sendHttpEndpoint(reciverUrl, secret, data);
        } catch (e) {
            Logger.getLogger().error(`HimHip::update: error can not send information to server: '${reciverUrl}'.`);
            Logger.getLogger().error(Ets.formate(e, true, true));
        }

    }

}