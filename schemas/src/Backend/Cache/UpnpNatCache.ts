import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaUpnpNatCacheMapping
 */
export const SchemaUpnpNatCacheMapping = Vts.object({
    public: Vts.object({
        gateway: Vts.string(),
        host: Vts.string(),
        port: Vts.number()
    }),
    private: Vts.object({
        host: Vts.string(),
        port: Vts.number()
    }),
    protocol: Vts.string(),
    enabled: Vts.boolean(),
    description: Vts.string(),
    ttl: Vts.number(),
    local: Vts.boolean()
});

/**
 * UpnpNatCacheMapping
 */
export type UpnpNatCacheMapping = ExtractSchemaResultType<typeof SchemaUpnpNatCacheMapping>;