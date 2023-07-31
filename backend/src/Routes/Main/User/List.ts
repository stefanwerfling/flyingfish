import {UserServiceDB} from 'flyingfish_core';
import {StatusCodes, UserEntry, UserListResponse} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getUserList
     */
    public static async getUserList(): Promise<UserListResponse> {
        const entries = await UserServiceDB.getInstance().findAll();

        const userList: UserEntry[] = [];

        for (const entry of entries) {
            userList.push({
                id: entry.id,
                username: entry.username,
                email: entry.email,
                disable: entry.disable
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: userList
        };
    }

}