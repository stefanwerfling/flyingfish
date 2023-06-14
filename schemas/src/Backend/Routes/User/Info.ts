import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../../Core/Server/Routes/DefaultReturn.js';

/**
 * SchemaUserData
 */
export const SchemaUserData = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    email: Vts.string()
});

/**
 * UserData
 */
export type UserData = ExtractSchemaResultType<typeof SchemaUserData>;

/**
 * SchemaUserInfo
 */
export const SchemaUserInfo = Vts.object({
    islogin: Vts.boolean(),
    user: Vts.optional(SchemaUserData)
});

/**
 * UserInfo
 */
export type UserInfo = ExtractSchemaResultType<typeof SchemaUserInfo>;

/**
 * SchemaUserInfoResponse
 */
export const SchemaUserInfoResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaUserInfo)
});

/**
 * UserInfoResponse
 */
export type UserInfoResponse = ExtractSchemaResultType<typeof SchemaUserInfoResponse>;