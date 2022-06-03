import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import * as bcrypt from 'bcrypt';
import {Logger} from '../../inc/Logger/Logger';
import {SessionUserData} from '../../inc/Server/Session';

/**
 * LoginRequest
 */
export type LoginRequest = {
    email: string;
    password: string;
};

/**
 * LoginResponse
 */
export type LoginResponse = {
    success: boolean;
    error: string | null;
};

/**
 * LoginIsLoginResponse
 */
export type LoginIsLoginResponse = {
    status: boolean;
};

/**
 * Login
 */
@JsonController()
export class Login {

    /**
     * islogin
     * @param session
     */
    @Get('/json/islogin')
    public islogin(@Session() session: any): LoginIsLoginResponse {
        if ((session.user !== undefined) && session.user.isLogin) {
            return {status: true};
        }

        return {status: false};
    }

    /**
     * login
     * @param login
     * @param session
     */
    @Post('/json/login')
    public async login(
        @Body() login: LoginRequest,
        @Session() session: any
    ): Promise<LoginResponse> {
        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email
            }
        });

        const userData: SessionUserData = {
            isLogin: false,
            userid: 0
        };

        session.user = userData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                session.user.userid = user.id;
                session.user.isLogin = true;

                Logger.getLogger().info(`Login success by session: ${session.id}`);

                return {
                    success: true,
                    error: ''
                };
            }

            Logger.getLogger().warn(`Login faild: wrong password by email: ${login.email}`);

            return {
                success: false,
                error: 'Wrong password!'
            };
        }

        return {
            success: false,
            error: 'User not found.'
        };
    }

}