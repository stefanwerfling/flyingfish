import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema Hook cleanup request
 */
export const SchemaHookCleanupReq = Vts.object({
    domain: Vts.string()
});

/**
 * Type Hook cleanup request
 */
export type HookCleanupReq = ExtractSchemaResultType<typeof SchemaHookCleanupReq>;