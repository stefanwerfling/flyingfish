import {ExtractSchemaResultType, Vts} from 'vts';
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