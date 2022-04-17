import {NetFetch} from '../Net/NetFetch';

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
 * User
 */
export class User {

    /**
     * getCurrentUser
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

}