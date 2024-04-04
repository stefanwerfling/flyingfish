import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaHimHIPUpdate
 */
export const SchemaHimHIPUpdate = Vts.object({
    update: Vts.boolean()
});

/**
 * HimHIPUpdate
 */
export type HimHIPUpdate = ExtractSchemaResultType<typeof SchemaHimHIPUpdate>;