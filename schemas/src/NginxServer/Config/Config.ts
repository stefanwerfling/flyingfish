import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsNginxServer
 *
 * Config for the standalone nginx container's Node control service: it needs the
 * shared database (for the njs access/auth checks it answers), the nginx paths,
 * and Hub registry info. The DNS-server extraction (9.2.3) is the template.
 */
export const SchemaConfigOptionsNginxServer = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    nginx: Vts.optional(Vts.object({
        config: Vts.string(),
        prefix: Vts.string(),
        dhparamfile: Vts.optional(Vts.string()),
        module_mode_dyn: Vts.optional(Vts.boolean()),
        secret: Vts.optional(Vts.string())
    })),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest (wired in a later slice).
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    flyingfish_libpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsNginxServer
 */
export type ConfigOptionsNginxServer = ExtractSchemaResultType<typeof SchemaConfigOptionsNginxServer>;