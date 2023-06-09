import {ExtractSchemaResultType} from 'vts';
import {SchemaConfigDbOptions, SchemaConfigOptions} from '../../Core/Config/Config.js';

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