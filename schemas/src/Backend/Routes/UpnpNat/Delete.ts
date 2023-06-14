import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaUpnpNatDeleteRequest
 */
export const SchemaUpnpNatDeleteRequest = Vts.object({
    id: Vts.number()
});

/**
 * UpnpNatDeleteRequest
 */
export type UpnpNatDeleteRequest = ExtractSchemaResultType<typeof SchemaUpnpNatDeleteRequest>;