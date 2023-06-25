import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaDnsGlobalServer
 */
export const SchemaDnsGlobalServer = Vts.object({
    ip: Vts.string(),
    location: Vts.string(),
    country: Vts.string(),
    provider: Vts.string(),
    latitude: Vts.string(),
    longitude: Vts.string()
});

/**
 * DnsGlobalServer
 */
export type DnsGlobalServer = ExtractSchemaResultType<typeof SchemaDnsGlobalServer>;