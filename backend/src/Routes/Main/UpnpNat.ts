import {Get, JsonController, Session} from 'routing-controllers';
import {UpnpNatCache, UpnpNatCacheMapping} from '../../inc/Cache/UpnpNatCache';

/**
 * UpnpNatDevice
 */
export type UpnpNatDevice = {
    deviceId: string;
    mappings: UpnpNatCacheMapping[];
};

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = {
    status: string;
    error?: string;
    data: UpnpNatDevice[];
};

/**
 * UpnpNat
 */
@JsonController()
export class UpnpNat {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/json/upnpnat/list')
    public async getList(@Session() session: any): Promise<UpnpNatResponse> {
        const data: UpnpNatDevice[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const lists = UpnpNatCache.getInstance().getLists();

            if (lists) {
                lists.forEach((value, key) => {
                    data.push({
                        deviceId: key,
                        mappings: value
                    });
                });
            }
        } else {
            return {
                status: 'error',
                data: []
            };
        }

        return {
            status: 'ok',
            data
        };
    }

}