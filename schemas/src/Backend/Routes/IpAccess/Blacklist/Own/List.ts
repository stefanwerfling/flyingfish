import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaIpAccessLocation} from '../../UtilsLocation.js';

/**
 * IpAccessBlackListOwn
 */
export const SchemaIpAccessBlackListOwn = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disabled: Vts.boolean(),
    last_block: Vts.number(),
    count_block: Vts.number(),
    ip_location_id: Vts.optional(Vts.number()),
    description: Vts.string()
});

/**
 * IpAccessBlackListOwn
 */
export type IpAccessBlackListOwn = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwn>;

/**
 * IpAccessBlackListOwnsResponse
 */
export const SchemaIpAccessBlackListOwnsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessBlackListOwn)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

/**
 * IpAccessBlackListOwnsResponse
 */
export type IpAccessBlackListOwnsResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListOwnsResponse>;