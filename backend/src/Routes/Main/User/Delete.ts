import {UserServiceDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UserDeleteRequest} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteUser
     * @param data
     */
    public static async deleteUser(data: UserDeleteRequest): Promise<DefaultReturn> {
        // check is the last user ----------------------------------------------------------------------------------

        const cUsers = await UserServiceDB.getInstance().countDisable(false);

        if (cUsers < 2) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'The last one has to work!'
            };
        }

        // delete --------------------------------------------------------------------------------------------------

        const result = await UserServiceDB.getInstance().remove(data.id);

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