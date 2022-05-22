import {CredentialSchemes} from './Credential';

/**
 * ICredential
 */
export interface ICredential {
    getSupports(): CredentialSchemes[];

    getName(): string;
}

/**
 * ICredentialAuthBasic
 */
export interface ICredentialAuthBasic extends ICredential {
    authBasic(username: string, password: string): Promise<boolean>;
}