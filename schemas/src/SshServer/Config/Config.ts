import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsSshServer
 */
export const SchemaConfigOptionsSshServer = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions,
    flyingfish_libpath: Vts.optional(Vts.string()),
    flyingfish_sshpath: Vts.optional(Vts.string())
});

/**
 * ConfigOptionsSshServer
 */
export type ConfigOptionsSshServer = ExtractSchemaResultType<typeof SchemaConfigOptionsSshServer>;