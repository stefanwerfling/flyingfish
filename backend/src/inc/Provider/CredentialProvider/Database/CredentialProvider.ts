import {ICredential, ICredentialProvider, ProviderType} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';
import {CredentialDatabase} from './CredentialDatabase.js';

/**
 * Credential provider for Database
 */
export class CredentialProvider implements ICredentialProvider {

    public static NAME = 'intern_database';
    public static TITLE = 'Intern database';

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
        return CredentialProvider.TITLE;
    }

    /**
     * Return the type of provider
     * @returns {ProviderType}
     */
    public getType(): ProviderType {
        return ProviderType.credential;
    }

    /**
     * Return the provider entry
     * @returns {ProviderEntry}
     */
    public getProviderEntry(): ProviderEntry {
        return {
            name: CredentialProvider.NAME,
            title: CredentialProvider.TITLE
        };
    }

}