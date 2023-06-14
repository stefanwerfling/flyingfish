import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaListenData
 */
export const SchemaListenData = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    port: Vts.number(),
    protocol: Vts.number(),
    enable_ipv6: Vts.boolean(),
    check_address: Vts.boolean(),
    check_address_type: Vts.number(),
    name: Vts.string(),
    routeless: Vts.boolean(),
    description: Vts.string(),
    fix: Vts.optional(Vts.boolean()),
    disable: Vts.boolean(),
    listen_category: Vts.optional(Vts.number()),
    proxy_protocol: Vts.boolean(),
    proxy_protocol_in: Vts.boolean()
});

/**
 * ListenData
 */
export type ListenData = ExtractSchemaResultType<typeof SchemaListenData>;

/**
 * SchemaListenResponse
 */
export const SchemaListenResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaListenData)
});

/**
 * ListenResponse
 */
export type ListenResponse = ExtractSchemaResultType<typeof SchemaListenResponse>;