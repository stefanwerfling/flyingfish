import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers-extended';
import {Not} from 'typeorm';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User.js';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn.js';
import {StatusCodes} from '../../inc/Routes/StatusCodes.js';

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

/**
 * UserEntry
 */
export type UserEntry = {
    id: number;
    username: string;
    password?: string;
    password_repeat?: string;
    email: string;
    disable: boolean;
};

/**
 * UserListResponse
 */
export type UserListResponse = DefaultReturn & {
    list: UserEntry[];
};

/**
 * UserSaveResponse
 */
export type UserSaveResponse = DefaultReturn;

/**
 * UserDeleteRequest
 */
export type UserDeleteRequest = {
    id: number;
};

/**
 * UserDeleteResponse
 */
export type UserDeleteResponse = DefaultReturn;

/**
 * User
 */
@JsonController()
export class User {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/json/user/info')
    public async getUserInfo(@Session() session: any): Promise<UserInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = DBHelper.getDataSource().getRepository(UserDB);

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

    /**
     * getUserList
     * @param session
     */
    @Get('/json/user/list')
    public async getUserList(@Session() session: any): Promise<UserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = DBHelper.getDataSource().getRepository(UserDB);

            const entries = await userRepository.find();

            const userList: UserEntry[] = [];

            for (const entry of entries) {
                userList.push({
                    id: entry.id,
                    username: entry.username,
                    email: entry.email,
                    disable: entry.disable
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list: userList
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            list: []
        };
    }

    /**
     * saveUser
     * @param session
     * @param request
     */
    @Post('/json/user/save')
    public async saveUser(
        @Session() session: any,
        @Body() request: UserEntry
    ): Promise<UserSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = DBHelper.getDataSource().getRepository(UserDB);

            // check is the last user ----------------------------------------------------------------------------------

            if (request.disable) {
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
                username: request.username,
                id: Not(request.id)
            });

            if (cUsername > 0) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Username already in use!'
                };
            }

            // check email ---------------------------------------------------------------------------------------------

            const cEmail = await userRepository.countBy({
                email: request.email,
                id: Not(request.id)
            });

            if (cEmail > 0) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'EMail already in use!'
                };
            }

            // exist userid --------------------------------------------------------------------------------------------

            let aUser: UserDB|null = null;

            if (request.id !== 0) {
                aUser = await userRepository.findOne({
                    where: {
                        id: request.id
                    }
                });
            }

            if (aUser === null) {
                aUser = new UserDB();

                if (!request.password && !request.password_repeat) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Please set password and password repeat for a new user!'
                    };
                }
            }

            if (request.password && request.password_repeat && request.password !== request.password_repeat) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Please check password and password repeat for equal!'
                };
            }

            if (request.password && request.password_repeat) {
                aUser.password = await bcrypt.hash(request.password, 10);
            }

            aUser.username = request.username;
            aUser.email = request.email;
            aUser.disable = request.disable;

            await DBHelper.getDataSource().manager.save(aUser);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * deleteUser
     * @param session
     * @param request
     */
    @Post('/json/user/delete')
    public async deleteUser(
        @Session() session: any,
        @Body() request: UserDeleteRequest
    ): Promise<UserDeleteResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = DBHelper.getDataSource().getRepository(UserDB);

            // check is the last user ----------------------------------------------------------------------------------

            const cUsers = await userRepository.countBy({
                disable: false
            });

            if (cUsers < 2) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'The last one has to work!'
                };
            }

            // delete --------------------------------------------------------------------------------------------------

            const result = await userRepository.delete({
                id: request.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}