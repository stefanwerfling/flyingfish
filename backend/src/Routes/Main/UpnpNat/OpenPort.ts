import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaUpnpNatCacheMapping, UpnpNatCache} from '../../../inc/Cache/UpnpNatCache.js';

/**
 * UpnpNatDevice
 */
export const SchemaUpnpNatDevice = Vts.object({
    deviceId: Vts.string(),
    mappings: Vts.array(SchemaUpnpNatCacheMapping)
});

export type UpnpNatDevice = ExtractSchemaResultType<typeof SchemaUpnpNatDevice>;

/**
 * UpnpNatOpenPortResponse
 */
export type UpnpNatOpenPortResponse = DefaultReturn & {
    data: UpnpNatDevice[];
};

/**
 * OpenPort
 */
export class OpenPort {

    /**
     * getUserInfo
     */
    public static async getOpenPortList(): Promise<UpnpNatOpenPortResponse> {
        const data: UpnpNatDevice[] = [];
        const lists = UpnpNatCache.getInstance().getLists();

        if (lists) {
            lists.forEach((value, key) => {
                data.push({
                    deviceId: key,
                    mappings: value
                });
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: data
        };
    }

}