import {IpLocationServiceDB} from 'flyingfish_core';
import {IpAccessLocation} from 'flyingfish_schemas';

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
        const locations: IpAccessLocation[] = [];

        const tlocations = await IpLocationServiceDB.getInstance().findAllByIds(locationIds);

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