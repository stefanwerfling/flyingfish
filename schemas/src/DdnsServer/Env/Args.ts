import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaFlyingFishArgsDdnsServer
 */
export const SchemaFlyingFishArgsDdnsServer = Vts.object({
    config: Vts.optional(Vts.string()),
    envargs: Vts.optional(Vts.string())
});

/**
 * FlyingFishArgsDdnsServer
 */
export type FlyingFishArgsDdnsServer = ExtractSchemaResultType<typeof SchemaFlyingFishArgsDdnsServer>;