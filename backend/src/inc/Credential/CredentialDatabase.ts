import * as bcrypt from 'bcrypt';
import {Logger} from 'flyingfish_core';
import {DBHelper} from '../Db/MariaDb/DBHelper.js';
import {CredentialSchemes} from './Credential.js';
import {Credential as CredentialDB} from '../Db/MariaDb/Entity/Credential.js';
import {CredentialUser as CredentialUserDB} from '../Db/MariaDb/Entity/CredentialUser.js';
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
        const credentialUserRepository = DBHelper.getRepository(CredentialUserDB);
        const user = await credentialUserRepository.findOne({
            where: {
                credential_id: this._credentialId,
                username: username,
                disabled: false
            }
        });

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
    public getSupports(): CredentialSchemes[] {
        return [CredentialSchemes.Basic];
    }

    /**
     * getName
     */
    public getName(): string {
        return CredentialDatabase.getName();
    }

}