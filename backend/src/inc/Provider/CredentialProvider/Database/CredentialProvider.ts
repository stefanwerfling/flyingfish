import {ICredential, ICredentialProvider} from 'flyingfish_core';
import {CredentialDatabase} from './CredentialDatabase.js';

/**
 * Credential provider for Database
 */
export class CredentialProvider implements ICredentialProvider {

    public static NAME = 'intern_database';

    /**
     * Return credential
     * @param {number} credentialId
     * @returns {ICredential}
     */
    public getCredential(credentialId: number): ICredential {
        return new CredentialDatabase(credentialId);
    }

    /**
     *
     */
    public getName(): string {
        return CredentialProvider.NAME;
    }

    public getTitle(): string {
        return 'Intern database';
    }

}