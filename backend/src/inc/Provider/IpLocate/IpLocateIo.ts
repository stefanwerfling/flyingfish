import {Logger} from 'flyingfish_core';
import got from 'got';
import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema for IP locate data
 */
export const SchemaIpLocateData = Vts.object({
    ip: Vts.or([Vts.string(), Vts.null()]),
    country: Vts.or([Vts.string(), Vts.null()]),
    country_code: Vts.or([Vts.string(), Vts.null()]),
    is_eu: Vts.or([Vts.boolean(), Vts.null()]),
    city: Vts.or([Vts.string(), Vts.null()]),
    continent: Vts.or([Vts.string(), Vts.null()]),
    latitude: Vts.or([Vts.number(), Vts.null()]),
    longitude: Vts.or([Vts.number(), Vts.null()]),
    time_zone: Vts.or([Vts.string(), Vts.null()]),
    postal_code: Vts.or([Vts.string(), Vts.null()]),
    subdivision: Vts.or([Vts.string(), Vts.null()]),
    currency_code: Vts.or([Vts.string(), Vts.null()]),
    calling_code: Vts.or([Vts.string(), Vts.null()]),
    is_anycast: Vts.or([Vts.boolean(), Vts.null()]),
    is_satellite: Vts.or([Vts.boolean(), Vts.null()]),
    asn: Vts.or([
        Vts.null(),
        Vts.object({
            asn: Vts.optional(Vts.string()),
            route: Vts.optional(Vts.string()),
            netname: Vts.optional(Vts.string()),
            name: Vts.optional(Vts.string()),
            country_code: Vts.optional(Vts.string()),
            domain: Vts.optional(Vts.string()),
            type: Vts.optional(Vts.string()),
            rir: Vts.optional(Vts.string())
        })
    ]),
    privacy: Vts.or([
        Vts.null(),
        Vts.object({
            is_abuser: Vts.or([Vts.boolean(), Vts.null()]),
            is_anonymous: Vts.or([Vts.boolean(), Vts.null()]),
            is_bogon: Vts.or([Vts.boolean(), Vts.null()]),
            is_hosting: Vts.or([Vts.boolean(), Vts.null()]),
            is_icloud_relay: Vts.or([Vts.boolean(), Vts.null()]),
            is_proxy: Vts.or([Vts.boolean(), Vts.null()]),
            is_tor: Vts.or([Vts.boolean(), Vts.null()]),
            is_vpn: Vts.or([Vts.boolean(), Vts.null()])
        })
    ]),
    company: Vts.or([
        Vts.null(),
        Vts.object({
            name: Vts.or([Vts.string(), Vts.null()]),
            domain: Vts.or([Vts.string(), Vts.null()]),
            country_code: Vts.or([Vts.string(), Vts.null()]),
            type: Vts.or([Vts.string(), Vts.null()])
        })
    ]),
    abuse: Vts.or([
        Vts.null(),
        Vts.object({
            address: Vts.or([Vts.string(), Vts.null()]),
            country_code: Vts.or([Vts.string(), Vts.null()]),
            email: Vts.or([Vts.string(), Vts.null()]),
            name: Vts.or([Vts.string(), Vts.null()]),
            network: Vts.or([Vts.string(), Vts.null()]),
            phone: Vts.or([Vts.string(), Vts.null()])
        })
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
                if (SchemaIpLocateData.validate(response.body, [])) {
                    return response.body
                } else {
                    Logger.getLogger().warn(`IpLocate::location: response is not validate schema by ip: ${ipAddress}!`);
                }
            }
        } catch (e) {
            Logger.getLogger().error('IpLocate::location:', e);
        }

        return null;
    }

}