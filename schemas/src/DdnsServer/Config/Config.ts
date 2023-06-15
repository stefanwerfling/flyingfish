import {ExtractSchemaResultType} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptions} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaDdnsServerConfigOptions
 */
export const SchemaDdnsServerConfigOptions = SchemaConfigOptions.extend({
    db: SchemaConfigDbOptions
});

/**
 * DdnsServerConfigOptions
 */
export type DdnsServerConfigOptions = ExtractSchemaResultType<typeof SchemaDdnsServerConfigOptions>;