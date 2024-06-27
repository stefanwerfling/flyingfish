import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaCredentialUser} from './User.js';

/**
 * Schema for credential users request
 */
export const SchemaCredentialUsersRequest = Vts.object({
    credential_id: Vts.number()
});

/**
 * Type of credential users request
 */
export type CredentialUsersRequest = ExtractSchemaResultType<typeof SchemaCredentialUsersRequest>;

/**
 * Schema for credential users response
 */
export const SchemaCredentialUsersResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaCredentialUser))
});

/**
 * Type of credential users response
 */
export type CredentialUsersResponse = ExtractSchemaResultType<typeof SchemaCredentialUsersResponse>;