import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * GatewayIdentifierDelete
 */
export const SchemaGatewayIdentifierDelete = Vts.object({
    id: Vts.number()
});

/**
 * GatewayIdentifierDelete
 */
export type GatewayIdentifierDelete = ExtractSchemaResultType<typeof SchemaGatewayIdentifierDelete>;