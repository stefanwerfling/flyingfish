import {ExtractSchemaResultType, Vts} from 'vts';
import {CredentialSchemaTypes} from './CredentialSchemaTypes.js';

/**
 * Schema of credential
 */
export const SchemaCredential = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    authSchemaType: Vts.enum(CredentialSchemaTypes),
    provider: Vts.string(),
    settings: Vts.string()
});

/**
 * Type of credential
 */
export type Credential = ExtractSchemaResultType<typeof SchemaCredential>;