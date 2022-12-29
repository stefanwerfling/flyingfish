import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * UserData
 */
export type UserData = {
    id: number;
    username: string;
    email: string;
};

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
    user?: UserData;
};

/**
 * UserEntry
 */
export type UserEntry = {
    id: number;
    username: string;
    password?: string;
    password_repeat?: string;
    email: string;
    disable: boolean;
};

/**
 * UserListResponse
 */
export type UserListResponse = DefaultReturn & {
    list: UserEntry[];
};

/**
 * UserDeleteRequest
 */
export type UserDeleteRequest = {
    id: number;
};

/**
 * UserDeleteResponse
 */
export type UserDeleteResponse = DefaultReturn;

/**
 * User
 */
export class User {

    /**
     * getUserInfo
     */
    public static async getUserInfo(): Promise<UserInfo | null> {
        const result = await NetFetch.getData('/json/user/info');

        if (result) {
            if (result.status === 'ok') {
                return result.data as UserInfo;
            }

            console.log(result.error);
        }

        return null;
    }

    /**
     * getUserList
     */
    public static async getUserList(): Promise<UserEntry[] | null> {
        const result = await NetFetch.getData('/json/user/list');

        if (result && result.statusCode) {
            const resultData = result as UserListResponse;

            switch (resultData.statusCode) {
                case StatusCodes.OK:
                    return resultData.list;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * saveUser
     * @param user
     */
    public static async saveUser(user: UserEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/user/save', user);

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    throw new Error(result.msg);
            }
        }

        return false;
    }

    /**
     * deleteUser
     * @param user
     */
    public static async deleteUser(user: UserDeleteRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/user/delete', user);

        if (result && result.statusCode) {
            const resultData = result as UserDeleteResponse;

            switch(resultData.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    throw new Error(resultData.msg);
            }
        }

        return false;
    }
}