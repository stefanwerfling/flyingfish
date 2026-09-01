import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigOptions} from '../../Core/Config/Config.js';
import {SchemaConfigDbOptionsRedis} from '../../Core/Config/ConfigDb.js';

/**
 * SchemaConfigOptionsHimHip
 */
export const SchemaConfigOptionsHimHip = SchemaConfigOptions.extend({
    redis: Vts.optional(SchemaConfigDbOptionsRedis),
    // Hub registry (v2 modular architecture): where and with which shared secret
    // this part self-registers its capability manifest.
    registry: Vts.optional(Vts.object({
        url: Vts.string(),
        secret: Vts.string()
    }))
});

/**
 * ConfigOptionsHimHip
 */
export type ConfigOptionsHimHip = ExtractSchemaResultType<typeof SchemaConfigOptionsHimHip>;