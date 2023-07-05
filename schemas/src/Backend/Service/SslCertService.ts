import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * SchemaDomainCheckReachability
 */
export const SchemaDomainCheckReachability = Vts.object({
    secureKey: Vts.string(),
    domain: Vts.string()
});

/**
 * DomainCheckReachability
 */
export type DomainCheckReachability = ExtractSchemaResultType<typeof SchemaDomainCheckReachability>;