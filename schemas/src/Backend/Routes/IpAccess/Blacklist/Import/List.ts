import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaIpAccessLocation} from '../../UtilsLocation.js';

/**
 * IpAccessBlackListImport
 */
export const SchemaIpAccessBlackListImport = Vts.object({
    id: Vts.number(),
    ip: Vts.string(),
    last_update: Vts.number(),
    disable: Vts.boolean(),
    last_block: Vts.number(),
    count_block: Vts.number(),
    categorys: Vts.array(Vts.number()),
    maintainers: Vts.array(Vts.number()),
    ip_location_id: Vts.optional(Vts.number())
});

/**
 * IpAccessBlackListImport
 */
export type IpAccessBlackListImport = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImport>;

/**
 * IpAccessBlackListImportsResponse
 */
export const SchemaIpAccessBlackListImportsResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessBlackListImport)),
    locations: Vts.optional(Vts.array(SchemaIpAccessLocation))
});

/**
 * IpAccessBlackListImportsResponse
 */
export type IpAccessBlackListImportsResponse = ExtractSchemaResultType<typeof SchemaIpAccessBlackListImportsResponse>;