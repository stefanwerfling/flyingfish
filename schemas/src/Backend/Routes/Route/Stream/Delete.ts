import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaRouteStreamDelete
 */
export const SchemaRouteStreamDelete = Vts.object({
    id: Vts.number()
});

/**
 * RouteStreamDelete
 */
export type RouteStreamDelete = ExtractSchemaResultType<typeof SchemaRouteStreamDelete>;