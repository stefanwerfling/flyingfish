import * as bcrypt from 'bcrypt';
import {MariaDbHelper} from '../Db/MariaDb/MariaDbHelper';
import {CredentialSchemes} from './Credential';
import {Credential as CredentialDB} from '../Db/MariaDb/Entity/Credential';
import {CredentialUser as CredentialUserDB} from '../Db/MariaDb/Entity/CredentialUser';
import {ICredential, ICredentialAuthBasic} from './ICredential';

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
    constructor(credential: CredentialDB) {
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
        const credentialUserRepository = MariaDbHelper.getRepository(CredentialUserDB);
        const user = await credentialUserRepository.findOne({
            where: {
                credential_id: this._credentialId,
                username,
                disabled: false
            }
        });

        if (user) {
            console.log(`CredentialDatabase->authBasic user found: ${username}`);

            const bresult = await bcrypt.compare(password, user.password);

            console.log(`CredentialDatabase->authBasic password-result: ${bresult}`);

            if (bresult) {
                return true;
            }
        } else {
            console.log(`CredentialDatabase->authBasic user not found: ${username}`);
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