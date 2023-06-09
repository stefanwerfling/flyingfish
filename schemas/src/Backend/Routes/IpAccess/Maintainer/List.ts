import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';

/**
 * IpAccessMaintainer
 */
export const SchemaIpAccessMaintainer = Vts.object({
    id: Vts.number(),
    maintainer_name: Vts.string(),
    maintainer_url: Vts.string(),
    list_source_url: Vts.string()
});

/**
 * IpAccessMaintainer
 */
export type IpAccessMaintainer = ExtractSchemaResultType<typeof SchemaIpAccessMaintainer>;

/**
 * IpAccessMaintainerResponse
 */
export const SchemaIpAccessMaintainerResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaIpAccessMaintainer))
});

/**
 * IpAccessMaintainerResponse
 */
export type IpAccessMaintainerResponse = ExtractSchemaResultType<typeof SchemaIpAccessMaintainerResponse>;