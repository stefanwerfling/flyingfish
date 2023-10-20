import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaDynDnsServerNotInDomain
 */
export const SchemaDynDnsServerNotInDomain = Vts.object({
    id: Vts.number(),
    name: Vts.string()
});

/**
 * DynDnsServerNotInDomain
 */
export type DynDnsServerNotInDomain = ExtractSchemaResultType<typeof SchemaDynDnsServerNotInDomain>;

/**
 * SchemaDynDnsServerNotInDomainResponse
 */
export const SchemaDynDnsServerNotInDomainResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDynDnsServerNotInDomain)
});

/**
 * DynDnsServerNotInDomainResponse
 */
export type DynDnsServerNotInDomainResponse = ExtractSchemaResultType<typeof SchemaDynDnsServerNotInDomainResponse>;