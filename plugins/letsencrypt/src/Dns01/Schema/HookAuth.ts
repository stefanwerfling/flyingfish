import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema Hook auth request
 */
export const SchemaHookAuthReq = Vts.object({
    domain: Vts.string(),
    value: Vts.string()
});

/**
 * Type of Hook auth request
 */
export type HookAuthReq = ExtractSchemaResultType<typeof SchemaHookAuthReq>;