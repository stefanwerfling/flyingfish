import * as bcrypt from 'bcrypt';
import {CredentialDB, CredentialUserServiceDB, Logger} from 'flyingfish_core';
import {CredentialSchemaTypes} from 'flyingfish_schemas/dist/src/index.js';
import {ICredential, ICredentialAuthBasic} from './ICredential.js';

/**
 * CredentialDB
 */
export class CredentialDatabase implements ICredential, ICredentialAuthBasic {

    /**
     * credential id
     * @protected
     */
    protected _credentialId: number;

    /**
     * constructor
     * @param credential
     */
    public constructor(credential: CredentialDB) {
        this._credentialId = credential.id;
    }

    /**
     * getName
     */
    public static getName(): string {
        return 'database';
    }

    /**
     * auth
     */
    public async authBasic(username: string, password: string): Promise<boolean> {
        const user = await CredentialUserServiceDB.getInstance().findUser(this._credentialId, username, false);

        if (user) {
            Logger.getLogger().info(`CredentialDatabase->authBasic user found: ${username}`);

            const bresult = await bcrypt.compare(password, user.password);

            Logger.getLogger().info(`CredentialDatabase->authBasic password-result: ${bresult}`);

            if (bresult) {
                return true;
            }
        } else {
            Logger.getLogger().warn(`CredentialDatabase->authBasic user not found: ${username}`);
        }

        return false;
    }

    /**
     * getSupports
     */
    public getSupports(): CredentialSchemaTypes[] {
        return [CredentialSchemaTypes.Basic];
    }

    /**
     * getName
     */
    public getName(): string {
        return CredentialDatabase.getName();
    }

}