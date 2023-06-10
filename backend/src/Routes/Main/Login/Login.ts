import {DBHelper, Logger, SessionUserData} from 'flyingfish_core';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {Request} from 'express';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';
import * as bcrypt from 'bcrypt';

/**
 * LoginRequest
 */
export const SchemaLoginRequest = Vts.object({
    email: Vts.string(),
    password: Vts.string()
});

export type LoginRequest = ExtractSchemaResultType<typeof SchemaLoginRequest>;

/**
 * LoginResponse
 */
export type LoginResponse = DefaultReturn;

/**
 * Login
 */
export class Login {

    /**
     * login
     * @param req
     * @param login
     */
    public static async login(req: Request, login: LoginRequest): Promise<LoginResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email
            }
        });

        // @ts-ignore
        req.session.user = {
            isLogin: false,
            userid: 0
        } as SessionUserData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                // @ts-ignore
                req.session.user.userid = user.id;
                // @ts-ignore
                req.session.user.isLogin = true;

                // @ts-ignore
                Logger.getLogger().info(`Login success by session: ${req.session.id}`);

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