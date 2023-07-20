import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaDdnsServerConfigOptions
 */
export const SchemaDdnsServerConfigOptions = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    httpserver: Vts.object({
        port: Vts.optional(Vts.number()),
        sslpath: Vts.optional(Vts.string())
    }),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * DdnsServerConfigOptions
 */
export type DdnsServerConfigOptions = ExtractSchemaResultType<typeof SchemaDdnsServerConfigOptions>;