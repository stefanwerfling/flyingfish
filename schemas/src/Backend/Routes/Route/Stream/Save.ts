import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaRouteStream} from '../List.js';

/**
 * SchemaRouteStreamSave
 */
export const SchemaRouteStreamSave = Vts.object({
    domainid: Vts.number(),
    stream: SchemaRouteStream
});

/**
 * RouteStreamSave
 */
export type RouteStreamSave = ExtractSchemaResultType<typeof SchemaRouteStreamSave>;