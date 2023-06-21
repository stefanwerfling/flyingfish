import {DBHelper, Logger} from 'flyingfish_core';
import {DefaultReturn, LoginRequest, SessionData, StatusCodes} from 'flyingfish_schemas';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';
import * as bcrypt from 'bcrypt';

/**
 * Login
 */
export class Login {

    /**
     * login
     * @param req
     * @param login
     */
    public static async login(session: SessionData, login: LoginRequest): Promise<DefaultReturn> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email
            }
        });

        session.user = {
            isLogin: false,
            userid: 0
        };

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                session.user.userid = user.id;
                session.user.isLogin = true;

                Logger.getLogger().info(`Login success by session: ${session.id}`);

                return {
                    statusCode: StatusCodes.OK
                };
            }

            Logger.getLogger().warn(`Login faild: wrong password by email: ${login.email}`);

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Wrong password!'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'User not found.'
        };
    }

}