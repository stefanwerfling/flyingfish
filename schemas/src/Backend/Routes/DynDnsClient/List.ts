import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaProviderEntry} from '../../Provider/ProviderEntry.js';
/**
 * DynDnsClientDomain
 */
export const SchemaDynDnsClientDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

/**
 * DynDnsClientDomain
 */
export type DynDnsClientDomain = ExtractSchemaResultType<typeof SchemaDynDnsClientDomain>;

/**
 * DynDnsClientData
 */
export const SchemaDynDnsClientData = Vts.object({
    id: Vts.number(),
    domains: Vts.array(SchemaDynDnsClientDomain),
    main_domain: Vts.number(),
    provider: SchemaProviderEntry,
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    update_domain: Vts.boolean(),
    last_status: Vts.number(),
    last_status_msg: Vts.string(),
    last_update: Vts.number()
});

/**
 * DynDnsClientData
 */
export type DynDnsClientData = ExtractSchemaResultType<typeof SchemaDynDnsClientData>;

/**
 * SchemaDynDnsClientListResponse
 */
export const SchemaDynDnsClientListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsClientData)
});

/**
 * DynDnsClientListResponse
 */
export type DynDnsClientListResponse = ExtractSchemaResultType<typeof SchemaDynDnsClientListResponse>;