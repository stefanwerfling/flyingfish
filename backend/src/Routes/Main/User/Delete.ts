import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';

/**
 * UserDeleteRequest
 */
export const SchemaUserDeleteRequest = Vts.object({
    id: Vts.number()
});

export type UserDeleteRequest = ExtractSchemaResultType<typeof SchemaUserDeleteRequest>;

/**
 * UserDeleteResponse
 */
export type UserDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * deleteUser
     * @param data
     */
    public static async deleteUser(data: UserDeleteRequest): Promise<UserDeleteResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        // check is the last user ----------------------------------------------------------------------------------

        const cUsers = await userRepository.countBy({
            disable: false
        });

        if (cUsers < 2) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'The last one has to work!'
            };
        }

        // delete --------------------------------------------------------------------------------------------------

        const result = await userRepository.delete({
            id: data.id
        });

        if (result) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

}