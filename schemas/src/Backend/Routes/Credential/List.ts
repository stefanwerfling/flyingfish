import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';
import {SchemaCredential} from '../../Credential/Credential.js';

export const SchemaCredentialResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaCredential))
});

/**
 * Type of credential response
 */
export type CredentialResponse = ExtractSchemaResultType<typeof SchemaCredentialResponse>;