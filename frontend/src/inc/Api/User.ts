import {
    SchemaDefaultReturn,
    SchemaUserInfoResponse,
    SchemaUserListResponse,
    UserDeleteRequest,
    UserEntry,
    UserInfo
} from 'flyingfish_schemas';
import {Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch.js';
import {UnknownResponse} from './Error/UnknownResponse.js';

/**
 * User
 */
export class User {

    /**
     * getUserInfo
     */
    public static async getUserInfo(): Promise<UserInfo> {
        const result = await NetFetch.getData('/json/user/info', SchemaUserInfoResponse);

        if (Vts.isUndefined(result.data)) {
            throw new UnknownResponse('User return empty info!');
        }

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
        await NetFetch.postData('/json/user/delete', user, SchemaDefaultReturn);
        return true;
    }

}