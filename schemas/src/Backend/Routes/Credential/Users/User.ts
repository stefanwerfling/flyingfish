import {ExtractSchemaResultType, Vts} from 'vts';

export const SchemaCredentialUser = Vts.object({
    id: Vts.number(),
    credential_id: Vts.number(),
    username: Vts.string(),
    password: Vts.string(),
    password_repeat: Vts.string(),
    disabled: Vts.boolean()
});

export type CredentialUser = ExtractSchemaResultType<typeof SchemaCredentialUser>;