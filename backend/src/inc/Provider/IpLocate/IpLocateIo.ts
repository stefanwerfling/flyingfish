import {Logger} from 'flyingfish_core';
import got from 'got';
import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema for IP locate data
 */
export const SchemaIpLocateData = Vts.object({
    ip: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    country: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    country_code: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    city: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    continent: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    latitude: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    longitude: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    time_zone: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    postal_code: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    org: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    asn: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    subdivision: Vts.or([
        Vts.string(),
        Vts.null()
    ]),
    subdivision2: Vts.or([
        Vts.string(),
        Vts.null()
    ])
});

/**
 * IpLocateData
 */
export type IpLocateData = ExtractSchemaResultType<typeof SchemaIpLocateData>;

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
            Logger.getLogger().error('IpLocate::location:', e);
        }

        return null;
    }

}