import {CredentialDB} from 'flyingfish_core';
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