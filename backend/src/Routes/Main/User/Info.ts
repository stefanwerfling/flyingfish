import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {User as UserDB} from '../../../inc/Db/MariaDb/Entity/User.js';
import {Request} from 'express';

/**
 * UserData
 */
export const SchemaUserData = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    email: Vts.string()
});

/**
 * UserInfo
 */
export const SchemaUserInfo = Vts.object({
    islogin: Vts.boolean(),
    user: Vts.optional(SchemaUserData)
});

export type UserInfo = ExtractSchemaResultType<typeof SchemaUserInfo>;

/**
 * UserInfoResponse
 */
export type UserInfoResponse = DefaultReturn & {
    data?: UserInfo;
};

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