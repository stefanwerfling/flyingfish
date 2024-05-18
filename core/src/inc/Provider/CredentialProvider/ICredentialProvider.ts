import {ICredential} from '../../Credential/ICredential.js';
import {IProvider} from '../IProvider.js';

/**
 * Interface of a Credential provider
 */
export interface ICredentialProvider extends IProvider {

    /**
     * Return the credential
     */
    getCredential(): ICredential;

}