import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaRouteHttp} from '../List.js';

/**
 * SchemaRouteHttpSave
 */
export const SchemaRouteHttpSave = Vts.object({
    domainid: Vts.number(),
    http: SchemaRouteHttp
});

/**
 * RouteHttpSave
 */
export type RouteHttpSave = ExtractSchemaResultType<typeof SchemaRouteHttpSave>;