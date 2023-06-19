import session from 'express-session';

declare module 'express-session' {
    interface SessionData {
        user?: SessionUserData;
    }
}

/**
 * SessionUserData
 */
export type SessionUserData = {
    isLogin: boolean;
    userid: number;
};

/**
 * Session
 */
export class Session {

    /**
     * isUserLogin
     * @param userSession
     */
    public static isUserLogin(userSession: session.SessionData): boolean {
        return (userSession.user !== undefined) && userSession.user.isLogin;
    }

}