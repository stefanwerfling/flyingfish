import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * DynDnsClientDelete
 */
export const SchemaDynDnsClientDelete = Vts.object({
    id: Vts.number()
});

/**
 * DynDnsClientDelete
 */
export type DynDnsClientDelete = ExtractSchemaResultType<typeof SchemaDynDnsClientDelete>;