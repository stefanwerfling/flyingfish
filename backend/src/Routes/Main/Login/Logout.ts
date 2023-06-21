import {Logger} from 'flyingfish_core';
import {DefaultReturn, SessionData, StatusCodes} from 'flyingfish_schemas';

/**
 * Logout
 */
export class Logout {

    /**
     * logout
     * @param session
     */
    public static async logout(session: SessionData): Promise<DefaultReturn> {
        if (session.user) {
            session.user.userid = 0;
            session.user.isLogin = false;
        }

        Logger.getLogger().info(`Logout success by session: ${session.id}`);

        return {
            statusCode: StatusCodes.OK
        };
    }

}