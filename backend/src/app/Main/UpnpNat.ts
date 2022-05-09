import {Get, JsonController} from 'routing-controllers';
import {UpnpNatCacheMapping} from '../../inc/Cache/UpnpNatCache';

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
    public getList(): void {

    }

}