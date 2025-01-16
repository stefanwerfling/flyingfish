import {Logger, RedisChannel, RedisChannels} from 'flyingfish_core';
import {HimHIPData, SchemaHimHIPData} from 'flyingfish_schemas';

export type onEventDataUpdate = (data: HimHIPData|null) => void;

/**
 * HimHIP - how is my host ip
 */
export class HimHIP extends RedisChannel<HimHIPData> {

    /**
     * data
     * @private
     */
    private static _data: HimHIPData|null = null;

    /**
     * events
     * @private
     */
    private static _events: onEventDataUpdate[] = [];

    /**
     * getData
     */
    public static getData(): HimHIPData|null {
        return HimHIP._data;
    }

    /**
     * setData
     * @param data
     */
    public static setData(data: HimHIPData|null): void {
        HimHIP._data = data;

        for (const event of HimHIP._events) {
            event(HimHIP._data);
        }
    }

    /**
     * Register an event
     * @param {onEventDataUpdate} event
     */
    public static registerEvent(event: onEventDataUpdate): void {
        HimHIP._events.push(event);
    }

    /**
     * Constructor
     */
    public constructor() {
        super(RedisChannels.HIMHIP_UPDATE_RES);
    }

    /**
     * Listen
     * @param {HimHIPData} data
     */
    public async listen(data: HimHIPData): Promise<void> {
        Logger.getLogger().silly(
            'HimHIP::listen: receive data -> Gateway-Mac: "%s", Network: "%s", Gateway: "%s, Interface: "%s", Host-IP: "%s"',
            data.gatewaymac,
            data.network,
            data.gateway,
            data.interface,
            data.hostip
        );

        if (SchemaHimHIPData.validate(data, [])) {
            HimHIP.setData(data);
        }
    }

}