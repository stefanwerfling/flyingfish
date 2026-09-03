import * as bcrypt from 'bcrypt';
import {CredentialUserServiceDB} from 'flyingfish_core';
import {Logger} from 'figtree';

/**
 * CredentialDatabase
 *
 * The built-in ('intern_database') credential check: username/password
 * against `CredentialUserServiceDB`, bcrypt-compared. Mirrors backend's
 * CredentialProvider/Database (backend/src/inc/Provider/CredentialProvider/Database).
 */
export class CredentialDatabase {

    /**
     * authBasic
     * @param {number} credentialId
     * @param {string} username
     * @param {string} password
     * @returns {Promise<boolean>}
     */
    public static async authBasic(credentialId: number, username: string, password: string): Promise<boolean> {
        const user = await CredentialUserServiceDB.getInstance().findUser(credentialId, username, false);

        if (user) {
            Logger.getLogger().info('CredentialDatabase::authBasic user found: %s', username);

            const result = await bcrypt.compare(password, user.password);

            Logger.getLogger().info('CredentialDatabase::authBasic password-result: %d', result);

            return result;
        }

        Logger.getLogger().warn('CredentialDatabase::authBasic user not found: %s', username);

        return false;
    }

}