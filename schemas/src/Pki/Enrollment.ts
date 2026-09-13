import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';

/**
 * SAN type on the enrollment wire. Mirrors the core `PkiSanType` union; kept as
 * an own enum here because the schemas package must not depend on flyingfish_core.
 */
export enum PkiSanTypeVts {
    dns = 'dns',
    ip = 'ip',
    url = 'url',
    email = 'email'
}

/**
 * Lifecycle state of an enrollment request. Mirrors the core
 * `PkiEnrollmentStatus`.
 */
export enum PkiEnrollmentStatusVts {
    pending = 'pending',
    issued = 'issued',
    rejected = 'rejected'
}

/**
 * CA purpose on the wire. Mirrors the core `PkiCaPurpose`; kept as an own enum
 * because the schemas package must not depend on flyingfish_core.
 */
export enum PkiCaPurposeVts {
    cluster = 'cluster',
    service = 'service',
    device = 'device'
}

/**
 * SchemaPkiSanEntry — a single subject-alternative-name entry a node requests
 * beyond its assigned identity URI.
 */
export const SchemaPkiSanEntry = Vts.object({
    type: Vts.enum(PkiSanTypeVts),
    value: Vts.string()
});

/**
 * PkiSanEntryWire
 */
export type PkiSanEntryWire = ExtractSchemaResultType<typeof SchemaPkiSanEntry>;

/**
 * SchemaPkiEnrollRequest — the EST-style enrollment body: the PKCS#10 CSR PEM
 * (proof of possession), the bootstrap token, and the requested identity.
 */
export const SchemaPkiEnrollRequest = Vts.object({
    csr: Vts.string(),
    bootstrapToken: Vts.string(),
    commonName: Vts.string(),
    sans: Vts.optional(Vts.array(SchemaPkiSanEntry)),
    validityDays: Vts.optional(Vts.number())
});

/**
 * PkiEnrollRequest
 */
export type PkiEnrollRequest = ExtractSchemaResultType<typeof SchemaPkiEnrollRequest>;

/**
 * SchemaPkiIssuedCertificate — an issued leaf plus its chain and the stable node
 * identity assigned to it.
 */
export const SchemaPkiIssuedCertificate = Vts.object({
    nodeUid: Vts.string(),
    certificate: Vts.string(),
    chain: Vts.array(Vts.string())
});

/**
 * PkiIssuedCertificateWire
 */
export type PkiIssuedCertificateWire = ExtractSchemaResultType<typeof SchemaPkiIssuedCertificate>;

/**
 * SchemaPkiEnrollResponse — the tracked enrollment request returned to the node:
 * its id and status; `issued` is present once the certificate has been issued
 * (auto-approve or admin approve), absent while pending.
 */
export const SchemaPkiEnrollResponse = SchemaDefaultReturn.extend({
    id: Vts.string(),
    status: Vts.enum(PkiEnrollmentStatusVts),
    nodeUid: Vts.string(),
    commonName: Vts.string(),
    issued: Vts.optional(SchemaPkiIssuedCertificate)
});

/**
 * PkiEnrollResponse
 */
export type PkiEnrollResponse = ExtractSchemaResultType<typeof SchemaPkiEnrollResponse>;

/**
 * SchemaPkiRenewRequest — the EST simple-reenroll body: the stable node identity
 * (nodeUid + purpose) plus a fresh CSR (new key = rotation). Re-enrollment is
 * authenticated by the current certificate at the transport, so it carries no
 * bootstrap token. The response reuses SchemaPkiEnrollResponse (an issued
 * request keeping the same nodeUid).
 */
export const SchemaPkiRenewRequest = Vts.object({
    nodeUid: Vts.string(),
    purpose: Vts.enum(PkiCaPurposeVts),
    csr: Vts.string(),
    commonName: Vts.string(),
    sans: Vts.optional(Vts.array(SchemaPkiSanEntry)),
    validityDays: Vts.optional(Vts.number())
});

/**
 * PkiRenewRequest
 */
export type PkiRenewRequest = ExtractSchemaResultType<typeof SchemaPkiRenewRequest>;

/**
 * SchemaPkiEnrollDecision — an admin approve/reject decision referencing a
 * pending enrollment request by id.
 */
export const SchemaPkiEnrollDecision = Vts.object({
    requestId: Vts.string()
});

/**
 * PkiEnrollDecision
 */
export type PkiEnrollDecision = ExtractSchemaResultType<typeof SchemaPkiEnrollDecision>;

/**
 * SchemaPkiCaCertsResponse — the EST cacerts response: the CA chain for a
 * purpose as [intermediate, root] PEMs.
 */
export const SchemaPkiCaCertsResponse = SchemaDefaultReturn.extend({
    chain: Vts.array(Vts.string())
});

/**
 * PkiCaCertsResponse
 */
export type PkiCaCertsResponse = ExtractSchemaResultType<typeof SchemaPkiCaCertsResponse>;