import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaRouteHttpDelete
 */
export const SchemaRouteHttpDelete = Vts.object({
    id: Vts.number()
});

/**
 * RouteHttpDelete
 */
export type RouteHttpDelete = ExtractSchemaResultType<typeof SchemaRouteHttpDelete>;