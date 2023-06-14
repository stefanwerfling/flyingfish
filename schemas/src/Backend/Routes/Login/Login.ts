import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaLoginRequest
 */
export const SchemaLoginRequest = Vts.object({
    email: Vts.string(),
    password: Vts.string()
});

/**
 * LoginRequest
 */
export type LoginRequest = ExtractSchemaResultType<typeof SchemaLoginRequest>;

/**
 * IsLogin
 */
export const SchemaIsLogin = SchemaDefaultReturn.extend({
    status: Vts.boolean()
});

/**
 * IsLogin
 */
export type IsLogin = ExtractSchemaResultType<typeof SchemaIsLogin>;