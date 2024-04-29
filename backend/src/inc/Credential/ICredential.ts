import {CredentialSchemaTypes} from 'flyingfish_schemas';

/**
 * ICredential
 */
export interface ICredential {
    getSupports(): CredentialSchemaTypes[];

    getName(): string;
}

/**
 * ICredentialAuthBasic
 */
export interface ICredentialAuthBasic extends ICredential {
    authBasic(username: string, password: string): Promise<boolean>;
}