import {Logger} from 'flyingfish_core';
import got from 'got';

/**
 * IpLocateData
 */
export type IpLocateData = {
    ip: string|null;
    country: string|null;
    country_code: string|null;
    city: string|null;
    continent: string|null;
    latitude: string|null;
    longitude: string|null;
    time_zone: string|null;
    postal_code: string|null;
    org: string|null;
    asn: string|null;
    subdivision: string|null;
    subdivision2: string|null;
};

/**
 * IpLocateIo
 */
export class IpLocateIo {

    /**
     * location
     * @param ipAddress
     */
    public static async location(ipAddress: string): Promise<IpLocateData|null> {
        try {
            const response = await got({
                url: `https://www.iplocate.io/api/lookup/${ipAddress}`,
                responseType: 'json',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (response.body) {
                return response.body as IpLocateData;
            }
        } catch (e) {
            Logger.getLogger().error('IpLocate::location:');
            Logger.getLogger().error(e);
        }

        return null;
    }

}