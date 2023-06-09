import {SchemaDefaultReturn} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';

/**
 * UserData
 */
export const SchemaUserData = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    email: Vts.string()
});

export type UserData = ExtractSchemaResultType<typeof SchemaUserData>;

/**
 * UserInfo
 */
export const SchemaUserInfo = Vts.object({
    islogin: Vts.boolean(),
    user: Vts.optional(SchemaUserData)
});

export type UserInfo = ExtractSchemaResultType<typeof SchemaUserInfo>;

/**
 * SchemaUserInfoResponse
 */
export const SchemaUserInfoResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaUserInfo)
});

/**
 * UserEntry
 */
export const SchemaUserEntry = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    password_repeat: Vts.optional(Vts.string()),
    email: Vts.string(),
    disable: Vts.boolean()
});

export type UserEntry = ExtractSchemaResultType<typeof SchemaUserEntry>;

/**
 * UserListResponse
 */
export const SchemaUserListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaUserEntry)
});

export type UserListResponse = ExtractSchemaResultType<typeof SchemaUserListResponse>;

/**
 * UserDeleteRequest
 */
export type UserDeleteRequest = {
    id: number;
};

/**
 * UserDeleteResponse
 */
export const SchemaUserDeleteResponse = SchemaDefaultReturn;
export type UserDeleteResponse = ExtractSchemaResultType<typeof SchemaUserDeleteResponse>;

/**
 * User
 */
export class User {

    /**
     * getUserInfo
     */
    public static async getUserInfo(): Promise<UserInfo> {
        const result = await NetFetch.getData('/json/user/info', SchemaUserInfoResponse);
        return result.data;
    }

    /**
     * getUserList
     */
    public static async getUserList(): Promise<UserEntry[] | null> {
        const result = await NetFetch.getData('/json/user/list', SchemaUserListResponse);
        return result.list;
    }

    /**
     * saveUser
     * @param user
     */
    public static async saveUser(user: UserEntry): Promise<boolean> {
        await NetFetch.postData('/json/user/save', user, SchemaDefaultReturn);
        return true;
    }

    /**
     * deleteUser
     * @param user
     */
    public static async deleteUser(user: UserDeleteRequest): Promise<boolean> {
        await NetFetch.postData('/json/user/delete', user, SchemaUserDeleteResponse);
        return true;
    }

}