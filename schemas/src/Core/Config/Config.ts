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

/**
 * ConfigDbOptions
 */
export const SchemaConfigDbOptions = Vts.object({
    mysql: Vts.object({
        host: Vts.string(),
        port: Vts.number(),
        username: Vts.string(),
        password: Vts.string(),
        database: Vts.string()
    }),
    influx: Vts.optional(Vts.object({
        url: Vts.string(),
        token: Vts.string(),
        org: Vts.string(),
        bucket: Vts.string(),
        username: Vts.string(),
        password: Vts.string()
    }))
});

/**
 * ConfigDbOptions
 */
export type ConfigDbOptions = ExtractSchemaResultType<typeof SchemaConfigDbOptions>;