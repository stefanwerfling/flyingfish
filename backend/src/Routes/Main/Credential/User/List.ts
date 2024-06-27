import {CredentialUserServiceDB} from 'flyingfish_core/dist/src/index.js';
import {CredentialUser, CredentialUsersRequest, CredentialUsersResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List of credential user
 */
export class List {

    /**
     * Return all user by credential id
     * @param {CredentialUsersRequest} req
     * @returns {CredentialUsersResponse}
     */
    public static async getUsers(req: CredentialUsersRequest): Promise<CredentialUsersResponse> {
        const users = await CredentialUserServiceDB.getInstance().findUsers(req.credential_id);
        const list: CredentialUser[] = [];

        for (const user of users) {
            list.push({
                id: user.id,
                credential_id: user.credential_id,
                username: user.username,
                password: '',
                password_repeat: '',
                disabled: user.disabled
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}