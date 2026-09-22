import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * DomainRecord
 */
export const SchemaDomainRecord = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    class: Vts.number(),
    ttl: Vts.number(),
    value: Vts.string(),
    update_by_dnsclient: Vts.boolean(),
    follow_node: Vts.optional(Vts.boolean()),
    last_update: Vts.number()
});

/**
 * DomainRecord
 */
export type DomainRecord = ExtractSchemaResultType<typeof SchemaDomainRecord>;

/**
 * DomainData
 */
export const SchemaDomainData = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    fix: Vts.boolean(),
    recordless: Vts.boolean(),
    records: Vts.array(SchemaDomainRecord),
    disable: Vts.boolean(),
    parent_id: Vts.number(),
    // Cluster failover priority for this domain on this node (9.5.14): lower =
    // primary. Optional so existing clients stay compatible until the UI sets it.
    cluster_priority: Vts.optional(Vts.number())
});

/**
 * DomainData
 */
export type DomainData = ExtractSchemaResultType<typeof SchemaDomainData>;

/**
 * DomainResponse
 */
export const SchemaDomainResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaDomainData)
});

/**
 * DomainResponse
 */
export type DomainResponse = ExtractSchemaResultType<typeof SchemaDomainResponse>;