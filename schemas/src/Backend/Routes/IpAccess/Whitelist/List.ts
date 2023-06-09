import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaIpAccessLocation} from '../UtilsLocation.js';

/**
 * SchemaIpAccessWhiteList
 */
export const SchemaIpAccessWhiteList = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_access: Vts.number(),
    count_access: Vts.number(),
    ip_location_id: Vts.optional(Vts.number()),
    description: Vts.string()
});

/**
 * IpAccessWhiteList
 */
export type IpAccessWhiteList = ExtractSchemaResultType<typeof SchemaIpAccessWhiteList>;

/**
 * SchemaIpAccessWhiteListResponse
 */
export const SchemaIpAccessWhiteListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessWhiteList)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

/**
 * IpAccessWhiteListResponse
 */
export type IpAccessWhiteListResponse = ExtractSchemaResultType<typeof SchemaIpAccessWhiteListResponse>;