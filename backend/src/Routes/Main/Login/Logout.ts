import {Logger} from 'flyingfish_core';
import {Request} from 'express';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';

/**
 * Logout
 */
export class Logout {

    /**
     * logout
     * @param req
     */
    public static async logout(req: Request): Promise<DefaultReturn> {
        // @ts-ignore
        req.session.user.userid = 0;
        // @ts-ignore
        req.session.user.isLogin = false;

        // @ts-ignore
        Logger.getLogger().info(`Logout success by session: ${req.session.id}`);

        return {
            statusCode: StatusCodes.OK
        };
    }

}