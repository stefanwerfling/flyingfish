import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaLoggerConfig} from '../Logger/Logger.js';

/**
 * Config options schema
 */
export const SchemaConfigOptions = Vts.object({
    logging: Vts.optional(SchemaLoggerConfig)
});

/**
 * Config options type
 */
export type ConfigOptions = ExtractSchemaResultType<typeof SchemaConfigOptions>;