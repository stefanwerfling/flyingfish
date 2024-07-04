import * as bcrypt from 'bcrypt';
import {CredentialUserServiceDB, Logger, ICredential, ICredentialAuthBasic} from 'flyingfish_core';
import {CredentialSchemaTypes} from 'flyingfish_schemas';

/**
 * CredentialDatabase provider
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
    public constructor(credentialId: number) {
        this._credentialId = credentialId;
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

}