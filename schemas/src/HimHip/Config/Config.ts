import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';

/**
 * SchemaConfigOptionsHimHip
 */
export const SchemaConfigOptionsHimHip = SchemaConfigOptions.extend({
    secret: Vts.string(),
    url_path: Vts.string(),
    server_host: Vts.string(),
    server_port: Vts.number(),
    server_protocol: Vts.string()
});

/**
 * ConfigOptionsHimHip
 */
export type ConfigOptionsHimHip = ExtractSchemaResultType<typeof SchemaConfigOptionsHimHip>;