import {SessionData} from 'flyingfish_schemas';

/**
 * Session
 */
export class Session {

    /**
     * isUserLogin
     * @param session
     */
    public static isUserLogin(session: SessionData): boolean {
        if (session.user) {
            return session.user.isLogin;
        }

        return false;
    }

}