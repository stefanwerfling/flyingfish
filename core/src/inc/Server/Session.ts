import {SessionData} from 'flyingfish_schemas';

/**
 * Session
 */
export class Session {

    /**
     * isUserLogin
     * @param userSession
     */
    public static isUserLogin(session: SessionData): boolean {
        if (session.user) {
            return session.user.isLogin;
        }

        return false;
    }

}