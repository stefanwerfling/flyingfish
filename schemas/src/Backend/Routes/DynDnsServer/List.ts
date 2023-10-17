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
 * SchemaDynDnsServerDomain
 */
export const SchemaDynDnsServerDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

/**
 * DynDnsServerDomain
 */
export type DynDnsServerDomain = ExtractSchemaResultType<typeof SchemaDynDnsServerDomain>;

/**
 * SchemaDynDnsServerData
 */
export const SchemaDynDnsServerData = Vts.object({
    user: SchemaDynDnsServerUser,
    domains: Vts.array(SchemaDynDnsServerDomain)
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