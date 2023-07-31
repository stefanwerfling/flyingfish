import {UserServiceDB} from 'flyingfish_core';
import {SessionData, StatusCodes, UserInfoResponse} from 'flyingfish_schemas';

/**
 * Info
 */
export class Info {

    /**
     * getUserInfo
     */
    public static async getUserInfo(session: SessionData): Promise<UserInfoResponse> {
        if (session.user) {
            const user = await UserServiceDB.getInstance().findOne(session.user.userid);

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
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'User not found!'
        };
    }

}