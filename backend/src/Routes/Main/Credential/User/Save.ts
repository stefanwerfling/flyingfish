import * as bcrypt from 'bcrypt';
import {CredentialUserDB, CredentialUserServiceDB} from 'flyingfish_core';
import {CredentialUser, DefaultReturn, StatusCodes} from 'flyingfish_schemas';

/**
 * Save credential user
 */
export class Save {

    /**
     * Save a user
     * @param {CredentialUser} data
     * @returns {DefaultReturn}
     */
    public static async saveUser(data: CredentialUser): Promise<DefaultReturn> {
        let aUser: CredentialUserDB| null = null;

        if (data.id !== 0) {
            aUser = await CredentialUserServiceDB.getInstance().findOne(data.id);
        }

        if (aUser === null) {
            aUser = new CredentialUserDB();
        }

        aUser.username = data.username;
        aUser.credential_id = data.credential_id;
        aUser.disabled = data.disabled;

        if (data.password !== '') {
            if (data.password !== data.password_repeat) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Password is different!'
                };
            }

            aUser.password = await bcrypt.hash(data.password, 10);
        }

        await CredentialUserServiceDB.getInstance().save(aUser);

        return {
            statusCode: StatusCodes.OK
        };
    }

}