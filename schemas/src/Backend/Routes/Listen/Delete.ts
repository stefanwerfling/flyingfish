import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * ListenDelete
 */
export const SchemaListenDelete = Vts.object({
    id: Vts.number()
});

/**
 * ListenDelete
 */
export type ListenDelete = ExtractSchemaResultType<typeof SchemaListenDelete>;