import {IProviders} from '../IProviders.js';
import {ICredentialProvider} from './ICredentialProvider.js';

/**
 * Interface of credential providers
 */
export interface ICredentialProviders extends IProviders<ICredentialProvider> {

    /**
     * Return the credential provider by name
     * @param {string} name
     * @param {number} sourceCredentialId
     * @returns {IProvider|null}
     */
    getCredentialProvider(name: string, sourceCredentialId: number): Promise<ICredentialProvider|null>;

}