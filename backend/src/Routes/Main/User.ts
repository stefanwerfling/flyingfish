import * as bcrypt from 'bcrypt';
import {Request, Router} from 'express';
import {DefaultReturn, DefaultRoute, StatusCodes} from 'flyingfish_core';
import {Not} from 'typeorm';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../inc/Db/DBHelper.js';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User.js';

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
 * UserEntry
 */
export const SchemaUserEntry = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    password: Vts.optional(Vts.string()),
    password_repeat: Vts.optional(Vts.string()),
    email: Vts.string(),
    disable: Vts.boolean()
});

export type UserEntry = ExtractSchemaResultType<typeof SchemaUserEntry>;

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
export const SchemaUserDeleteRequest = Vts.object({
    id: Vts.number()
});

export type UserDeleteRequest = ExtractSchemaResultType<typeof SchemaUserDeleteRequest>;

/**
 * UserDeleteResponse
 */
export type UserDeleteResponse = DefaultReturn;

/**
 * User
 */
export class User extends DefaultRoute {

    /**
     * constructor
     */
    public constructor() {
        super();
    }

    /**
     * getUserInfo
     */
    public async getUserInfo(req: Request): Promise<UserInfoResponse> {
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

    /**
     * getUserList
     */
    public async getUserList(): Promise<UserListResponse> {
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

    /**
     * saveUser
     * @param data
     */
    public async saveUser(data: UserEntry): Promise<UserSaveResponse> {
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

    /**
     * deleteUser
     * @param data
     */
    public async deleteUser(data: UserDeleteRequest): Promise<UserDeleteResponse> {
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
            id: data.id
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

    /**
     * getExpressRouter
     */
    public getExpressRouter(): Router {
        this._routes.get(
            '/json/user/info',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getUserInfo(req));
                }
            }
        );

        this._routes.get(
            '/json/user/list',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    res.status(200).json(await this.getUserList());
                }
            }
        );

        this._routes.post(
            '/json/user/save',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUserEntry, req.body, res)) {
                        res.status(200).json(await this.saveUser(req.body));
                    }
                }
            }
        );

        this._routes.post(
            '/json/user/delete',
            async(req, res) => {
                if (this.isUserLogin(req, res)) {
                    if (this.isSchemaValidate(SchemaUserDeleteRequest, req.body, res)) {
                        res.status(200).json(await this.deleteUser(req.body));
                    }
                }
            }
        );

        return super.getExpressRouter();
    }

}