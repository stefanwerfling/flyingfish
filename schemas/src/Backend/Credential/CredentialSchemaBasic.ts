import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema credential schema basic
 */
export const SchemaCredentialSchemaBasic = Vts.object({
    username: Vts.string(),
    password: Vts.string()
});

/**
 * Type of credential schema basic
 */
export type CredentialSchemaBasic = ExtractSchemaResultType<typeof SchemaCredentialSchemaBasic>;