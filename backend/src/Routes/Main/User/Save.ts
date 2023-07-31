import {UserDB, UserServiceDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UserEntry} from 'flyingfish_schemas';
import * as bcrypt from 'bcrypt';

/**
 * Save
 */
export class Save {

    /**
     * saveUser
     * @param data
     */
    public static async saveUser(data: UserEntry): Promise<DefaultReturn> {
        const us = UserServiceDB.getInstance();

        // check is the last user ----------------------------------------------------------------------------------

        if (data.disable) {
            const cUsers = await us.countDisable(false);

            if (cUsers < 2) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'The last one has to work!'
                };
            }
        }

        // check username ------------------------------------------------------------------------------------------

        const existUsername = await us.existUsername(data.username, data.id);

        if (existUsername) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Username already in use!'
            };
        }

        // check email ---------------------------------------------------------------------------------------------

        const existEmail = await us.existEmail(data.email, data.id);

        if (existEmail) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'EMail already in use!'
            };
        }

        // exist userid --------------------------------------------------------------------------------------------

        let aUser: UserDB|null = null;

        if (data.id !== 0) {
            aUser = await us.findOne(data.id);
        }

        if (aUser === null) {
            aUser = new UserDB();

            if (!data.password && !data.password_repeat) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Please set password and password repeat for a new user!'
                };
            }
        }

        if (data.password && data.password_repeat && data.password !== data.password_repeat) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Please check password and password repeat for equal!'
            };
        }

        if (data.password && data.password_repeat) {
            aUser.password = await bcrypt.hash(data.password, 10);
        }

        aUser.username = data.username;
        aUser.email = data.email;
        aUser.disable = data.disable;

        await us.save(aUser);

        return {
            statusCode: StatusCodes.OK
        };
    }

}