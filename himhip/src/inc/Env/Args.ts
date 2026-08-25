import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaFlyingFishArgs
 */
export const SchemaFlyingFishArgs = Vts.object({
    envargs: Vts.optional(Vts.string())
});

export type FlyingFishArgs = ExtractSchemaResultType<typeof SchemaFlyingFishArgs>;