import {DBHelper} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UserDeleteRequest} from 'flyingfish_schemas';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteUser
     * @param data
     */
    public static async deleteUser(data: UserDeleteRequest): Promise<DefaultReturn> {
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