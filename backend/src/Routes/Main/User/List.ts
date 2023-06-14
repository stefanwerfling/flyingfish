import {DBHelper} from 'flyingfish_core';
import {StatusCodes, UserEntry, UserListResponse} from 'flyingfish_schemas';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';

/**
 * List
 */
export class List {

    /**
     * getUserList
     */
    public static async getUserList(): Promise<UserListResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        const entries = await userRepository.find();

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