/**
 * SessionUserData
 */
export type SessionUserData = {
    isLogin: boolean;
    userid: number;
};

/**
 * SessionData
 */
export type SessionData = {
    user?: SessionUserData;
};

/**
 * Session
 */
export class Session {

    /**
     * isUserLogin
     * @param session
     */
    public static isUserLogin(session: any): boolean {
        return (session.user !== undefined) && session.user.isLogin;
    }

}