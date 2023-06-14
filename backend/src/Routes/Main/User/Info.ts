import {DBHelper} from 'flyingfish_core';
import {StatusCodes, UserInfoResponse} from 'flyingfish_schemas';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';
import {Request} from 'express';

/**
 * Info
 */
export class Info {

    /**
     * getUserInfo
     */
    public static async getUserInfo(req: Request): Promise<UserInfoResponse> {
        const userRepository = DBHelper.getDataSource().getRepository(UserDB);
        // @ts-ignore
        const userid = req.session.user.userid;

        const user = await userRepository.findOne({
            where: {
                id: userid
            }
        });

        if (user) {
            return {
                statusCode: StatusCodes.OK,
                data: {
                    islogin: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                }
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'User not found!'
        };
    }

}