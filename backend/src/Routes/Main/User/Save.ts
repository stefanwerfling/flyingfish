import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {UserEntry} from './List.js';
import {Not} from 'typeorm';
import * as bcrypt from 'bcrypt';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';

/**
 * UserSaveResponse
 */
export type UserSaveResponse = DefaultReturn;

/**
 * Save
 */
export class Save {

    /**
     * saveUser
     * @param data
     */
    public static async saveUser(data: UserEntry): Promise<UserSaveResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        // check is the last user ----------------------------------------------------------------------------------

        if (data.disable) {
            const cUsers = await userRepository.countBy({
                disable: false
            });

            if (cUsers < 2) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'The last one has to work!'
                };
            }
        }

        // check username ------------------------------------------------------------------------------------------

        const cUsername = await userRepository.countBy({
            username: data.username,
            id: Not(data.id)
        });

        if (cUsername > 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Username already in use!'
            };
        }

        // check email ---------------------------------------------------------------------------------------------

        const cEmail = await userRepository.countBy({
            email: data.email,
            id: Not(data.id)
        });

        if (cEmail > 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'EMail already in use!'
            };
        }

        // exist userid --------------------------------------------------------------------------------------------

        let aUser: UserDB|null = null;

        if (data.id !== 0) {
            aUser = await userRepository.findOne({
                where: {
                    id: data.id
                }
            });
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

        await DBHelper.getDataSource().manager.save(aUser);

        return {
            statusCode: StatusCodes.OK
        };
    }

}