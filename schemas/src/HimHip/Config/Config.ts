import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptionsRedis} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsHimHip
 */
export const SchemaConfigOptionsHimHip = SchemaConfigOptions.extend({
    redis: Vts.optional(SchemaConfigDbOptionsRedis)
});

/**
 * ConfigOptionsHimHip
 */
export type ConfigOptionsHimHip = ExtractSchemaResultType<typeof SchemaConfigOptionsHimHip>;