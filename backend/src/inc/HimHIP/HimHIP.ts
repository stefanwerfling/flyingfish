import {RedisChannel, RedisChannels} from 'flyingfish_core';
import {HimHIPData, SchemaHimHIPData} from 'flyingfish_schemas';

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
    }

    public constructor() {
        super(RedisChannels.HIMHIP_UPDATE_RES);
    }

    /**
     * Listen
     * @param {HimHIPData} data
     */
    public async listen(data: HimHIPData): Promise<void> {
        if (SchemaHimHIPData.validate(data, [])) {
            HimHIP.setData(data);
        }
    }

}