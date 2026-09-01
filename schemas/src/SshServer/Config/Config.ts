import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsSshServer
 */
export const SchemaConfigOptionsSshServer = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest.
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    })),
    flyingfish_libpath: Vts.optional(Vts.string()),
    flyingfish_sshpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsSshServer
 */
export type ConfigOptionsSshServer = ExtractSchemaResultType<typeof SchemaConfigOptionsSshServer>;