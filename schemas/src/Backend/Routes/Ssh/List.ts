import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaSshPortEntry
 */
export const SchemaSshPortEntry = Vts.object({
    id: Vts.number(),
    port: Vts.number()
});

/**
 * SshPortEntry
 */
export type SshPortEntry = ExtractSchemaResultType<typeof SchemaSshPortEntry>;

/**
 * SchemaSshPortListResponse
 */
export const SchemaSshPortListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSshPortEntry)
});

/**
 * SshPortListResponse
 */
export type SshPortListResponse = ExtractSchemaResultType<typeof SchemaSshPortListResponse>;