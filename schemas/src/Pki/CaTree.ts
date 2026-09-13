import {ExtractSchemaResultType, Vts} from 'vts';
import {PkiCaPurposeVts} from './Enrollment.js';
import {SchemaDefaultReturn} from '../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaPkiCaNodeEntry — one node of the CA tree read model (own-PKI epic 9.4,
 * 9.4.6 frontend tree view). Public fields only: the tree structure (id +
 * parentCaId edge), what the CA is (type/purpose/subject/algorithm) and when it
 * was created. Never carries the private key PEM.
 */
export const SchemaPkiCaNodeEntry = Vts.object({
    id: Vts.number(),
    parentCaId: Vts.number(),
    caType: Vts.string(),
    purpose: Vts.string(),
    subject: Vts.string(),
    algorithm: Vts.string(),
    createdAt: Vts.number()
});

/**
 * PkiCaNodeEntry
 */
export type PkiCaNodeEntry = ExtractSchemaResultType<typeof SchemaPkiCaNodeEntry>;

/**
 * SchemaPkiCaTreeResponse — the CA tree read model: the flat node list, the
 * parentCaId values forming the tree edges (0 = the Root, no parent).
 */
export const SchemaPkiCaTreeResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaPkiCaNodeEntry)
});

/**
 * PkiCaTreeResponse
 */
export type PkiCaTreeResponse = ExtractSchemaResultType<typeof SchemaPkiCaTreeResponse>;

/**
 * SchemaPkiRotateRequest — an admin trigger to rotate (roll) a purpose's
 * intermediate CA (own-PKI epic 9.4.3-E3): mint a new intermediate under the
 * root, adopt it for new issuance, and re-export the CA pool.
 */
export const SchemaPkiRotateRequest = Vts.object({
    purpose: Vts.enum(PkiCaPurposeVts)
});

/**
 * PkiRotateRequest
 */
export type PkiRotateRequest = ExtractSchemaResultType<typeof SchemaPkiRotateRequest>;