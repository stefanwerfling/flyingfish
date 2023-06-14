import {StatusCodes, UpnpNatDevice, UpnpNatOpenPortResponse} from 'flyingfish_schemas';
import {UpnpNatCache} from '../../../inc/Cache/UpnpNatCache.js';

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