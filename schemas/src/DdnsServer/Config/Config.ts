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
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest. Both required to attempt
    // registration; absent means the part does not announce itself yet.
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * DdnsServerConfigOptions
 */
export type DdnsServerConfigOptions = ExtractSchemaResultType<typeof SchemaDdnsServerConfigOptions>;