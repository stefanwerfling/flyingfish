import {Credential as CredentialDB} from '../Db/MariaDb/Entity/Credential.js';
import {CredentialDatabase} from './CredentialDatabase.js';
import {ICredential} from './ICredential.js';

/**
 * CredentialProvider
 */
export class CredentialProvider {

    /**
     * getCredential
     * @param name
     * @param dbentry
     */
    public static getCredential(name: string, dbentry: CredentialDB): ICredential|null {
        switch (name) {
            case CredentialDatabase.getName():
                return new CredentialDatabase(dbentry);
        }

        return null;
    }

}