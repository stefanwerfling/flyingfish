import {LoginRequest, SchemaDefaultReturn, SchemaIsLogin} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * Login
 */
export class Login {

    /**
     * login
     * @param _email
     * @param _password
     */
    public static async login(_email: string, _password: string): Promise<boolean> {
        await NetFetch.postData('/json/login', {
            email: _email,
            password: _password
        } as LoginRequest, SchemaDefaultReturn);

        return true;
    }

    /**
     * isLogin
     */
    public static async isLogin(): Promise<boolean> {
        const result = await NetFetch.getData('/json/islogin', SchemaIsLogin);
        return result.status;
    }

    /**
     * logout
     */
    public static async logout(): Promise<boolean> {
        await NetFetch.getData('/json/logout', SchemaDefaultReturn);
        return true;
    }

}