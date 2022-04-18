import {Get, JsonController, Session} from 'routing-controllers';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * UserData
 */
export type UserData = {
    id: number;
    username: string;
    email: string;
};

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
    user?: UserData;
};

/**
 * UserInfoResponse
 */
export type UserInfoResponse = {
    status: string;
    msg?: string;
    data?: UserInfo;
};

@JsonController()
export class User {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/json/user/info')
    public async getUserInfo(@Session() session: any): Promise<UserInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

            const user = await userRepository.findOne({
                where: {
                    id: session.user.userid
                }
            });

            if (user) {
                return {
                    status: 'ok',
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
            status: 'ok',
            data: {
                islogin: false
            }
        };
    }

}