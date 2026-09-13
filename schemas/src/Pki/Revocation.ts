import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaPkiRevokeRequest — revoke a node identity by its stable nodeUid (own-PKI
 * epic 9.4, revocation 9.4.4). Revocation is keyed by nodeUid so it covers every
 * certificate the node holds across renewals. The optional reason is recorded
 * for audit.
 */
export const SchemaPkiRevokeRequest = Vts.object({
    nodeUid: Vts.string(),
    reason: Vts.optional(Vts.string())
});

/**
 * PkiRevokeRequest
 */
export type PkiRevokeRequest = ExtractSchemaResultType<typeof SchemaPkiRevokeRequest>;

/**
 * SchemaPkiRevocationEntry — one revoked node identity plus when it was revoked.
 */
export const SchemaPkiRevocationEntry = Vts.object({
    nodeUid: Vts.string(),
    revokedAt: Vts.number()
});

/**
 * PkiRevocationEntryWire
 */
export type PkiRevocationEntryWire = ExtractSchemaResultType<typeof SchemaPkiRevocationEntry>;

/**
 * SchemaPkiRevocationListResponse — the revoked node identities, deduplicated by
 * nodeUid. The real-time Hub allowlist is rebuilt from this list.
 */
export const SchemaPkiRevocationListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaPkiRevocationEntry)
});

/**
 * PkiRevocationListResponse
 */
export type PkiRevocationListResponse = ExtractSchemaResultType<typeof SchemaPkiRevocationListResponse>;