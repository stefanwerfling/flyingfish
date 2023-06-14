import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaUserDeleteRequest
 */
export const SchemaUserDeleteRequest = Vts.object({
    id: Vts.number()
});

/**
 * UserDeleteRequest
 */
export type UserDeleteRequest = ExtractSchemaResultType<typeof SchemaUserDeleteRequest>;