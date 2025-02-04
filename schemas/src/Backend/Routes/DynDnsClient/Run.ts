import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema DynDns client domain run
 */
export const SchemaDynDnsClientDomainRun = Vts.object({
    id: Vts.number()
});

/**
 * Type DynDns client domain run
 */
export type DynDnsClientDomainRun = ExtractSchemaResultType<typeof SchemaDynDnsClientDomainRun>;

/**
 * Schema DynDns client domain run request
 */
export const SchemaDynDnsClientDomainRunRequest = Vts.object({
    client: SchemaDynDnsClientDomainRun
});

/**
 * Type DynDns client domain run request
 */
export type DynDnsClientDomainRunRequest = ExtractSchemaResultType<typeof SchemaDynDnsClientDomainRunRequest>;