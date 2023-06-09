import {ExtractSchemaResultType, Vts} from 'vts';

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

/**
 * IpAccessLocation
 */
export type IpAccessLocation = ExtractSchemaResultType<typeof SchemaIpAccessLocation>;