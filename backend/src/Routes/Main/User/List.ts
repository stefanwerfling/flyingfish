import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';

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
export type UserListResponse = DefaultReturn & {
    list: UserEntry[];
};

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