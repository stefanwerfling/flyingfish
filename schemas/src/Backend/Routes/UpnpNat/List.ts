import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaUpnpNatPort
 */
export const SchemaUpnpNatPort = Vts.object({
    id: Vts.number(),
    postion: Vts.number(),
    public_port: Vts.number(),
    gateway_identifier_id: Vts.number(),
    gateway_address: Vts.string(),
    private_port: Vts.number(),
    client_address: Vts.string(),
    use_himhip_host_address: Vts.boolean(),
    ttl: Vts.number(),
    protocol: Vts.string(),
    last_ttl_update: Vts.number(),
    listen_id: Vts.number(),
    description: Vts.string(),
    last_status: Vts.number(),
    last_update: Vts.number()
});

/**
 * UpnpNatPort
 */
export type UpnpNatPort = ExtractSchemaResultType<typeof SchemaUpnpNatPort>;

/**
 * SchemaUpnpNatResponse
 */
export const SchemaUpnpNatResponse = SchemaDefaultReturn.extend({
    data: Vts.array(SchemaUpnpNatPort)
});

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = ExtractSchemaResultType<typeof SchemaUpnpNatResponse>;