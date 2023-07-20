import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaDynDnsServerUser
 */
export const SchemaDynDnsServerUser = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    last_update: Vts.number()
});

/**
 * DynDnsServerUser
 */
export type DynDnsServerUser = ExtractSchemaResultType<typeof SchemaDynDnsServerUser>;

/**
 * SchemaDynDnsServerData
 */
export const SchemaDynDnsServerData = Vts.object({
    user: SchemaDynDnsServerUser,
    domain_ids: Vts.array(Vts.number())
});

/**
 * DynDnsServerData
 */
export type DynDnsServerData = ExtractSchemaResultType<typeof SchemaDynDnsServerData>;

/**
 * SchemaDynDnsServerListResponse
 */
export const SchemaDynDnsServerListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsServerData)
});

/**
 * DynDnsServerListResponse
 */
export type DynDnsServerListResponse = ExtractSchemaResultType<typeof SchemaDynDnsServerListResponse>;