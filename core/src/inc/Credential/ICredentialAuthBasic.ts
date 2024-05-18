import {ICredential} from './ICredential.js';

/**
 * Interface of credential auth basic
 */
export interface ICredentialAuthBasic extends ICredential {

    /**
     * Check an auth by username and password
     * @param {string} username
     * @param {string} password
     * @returns {boolean}
     */
    authBasic(username: string, password: string): Promise<boolean>;

}