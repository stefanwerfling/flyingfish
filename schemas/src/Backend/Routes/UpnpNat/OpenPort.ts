import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaUpnpNatCacheMapping} from '../../Cache/UpnpNatCache.js';

/**
 * SchemaUpnpNatDevice
 */
export const SchemaUpnpNatDevice = Vts.object({
    deviceId: Vts.string(),
    mappings: Vts.array(SchemaUpnpNatCacheMapping)
});

/**
 * UpnpNatDevice
 */
export type UpnpNatDevice = ExtractSchemaResultType<typeof SchemaUpnpNatDevice>;

/**
 * SchemaUpnpNatOpenPortResponse
 */
export const SchemaUpnpNatOpenPortResponse = SchemaDefaultReturn.extend({
    data: Vts.array(SchemaUpnpNatDevice)
});

/**
 * UpnpNatOpenPortResponse
 */
export type UpnpNatOpenPortResponse = ExtractSchemaResultType<typeof SchemaUpnpNatOpenPortResponse>;