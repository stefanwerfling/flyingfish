import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaFlyingFishArgs
 */
export const SchemaFlyingFishArgs = Vts.object({
    envargs: Vts.optional(Vts.string()),
    secret: Vts.optional(Vts.string()),
    url_path: Vts.optional(Vts.string()),
    server_host: Vts.optional(Vts.string()),
    server_port: Vts.optional(Vts.string()),
    server_protocol: Vts.optional(Vts.string())
});

export type FlyingFishArgs = ExtractSchemaResultType<typeof SchemaFlyingFishArgs>;