import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaFlyingFishArgs
 */
export const SchemaFlyingFishArgs = Vts.object({
    config: Vts.optional(Vts.string()),
    envargs: Vts.optional(Vts.string())
});

export type FlyingFishArgs = ExtractSchemaResultType<typeof SchemaFlyingFishArgs>;