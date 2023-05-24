import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {IpLocation as IpLocationDB} from '../../../inc/Db/MariaDb/Entity/IpLocation.js';
import {In} from 'typeorm';

/**
 * IpAccessLocation
 */
export const SchemaIpAccessLocation = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    country: Vts.string(),
    country_code: Vts.string(),
    city: Vts.string(),
    continent: Vts.string(),
    latitude: Vts.string(),
    longitude: Vts.string(),
    time_zone: Vts.string(),
    postal_code: Vts.string(),
    org: Vts.string(),
    asn: Vts.string()
});

export type IpAccessLocation = ExtractSchemaResultType<typeof SchemaIpAccessLocation>;

/**
 * UtilsLocation
 */
export class UtilsLocation {

    /**
     * getLocations
     * @param locationIds
     * @protected
     */
    public static async getLocations(locationIds: number[]): Promise<IpAccessLocation[]> {
        const ipLocationRepository = DBHelper.getRepository(IpLocationDB);

        const locations: IpAccessLocation[] = [];

        const tlocations = await ipLocationRepository.find({
            where: {
                id: In(locationIds)
            }
        });

        if (tlocations) {
            for (const tlocation of tlocations) {
                locations.push({
                    id: tlocation.id,
                    ip: tlocation.ip,
                    country: tlocation.country,
                    country_code: tlocation.country_code,
                    city: tlocation.city,
                    continent: tlocation.continent,
                    latitude: tlocation.latitude,
                    longitude: tlocation.longitude,
                    time_zone: tlocation.time_zone,
                    postal_code: tlocation.postal_code,
                    org: tlocation.org,
                    asn: tlocation.asn
                });
            }
        }

        return locations;
    }

}