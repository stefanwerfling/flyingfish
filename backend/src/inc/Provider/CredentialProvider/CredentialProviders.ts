import {ICredentialProvider, ICredentialProviders} from 'flyingfish_core';
import {ProviderEntry} from 'flyingfish_schemas';

export class CredentialProviders implements ICredentialProviders {

    public async getCredentialProvider(
        name: string,
        sourceCredentialId: number
    ): Promise<ICredentialProvider | null> {
        return null;
    }

    public async getProvider(name: string): Promise<ICredentialProvider | null> {
        return null;
    }

    public getProviders(): Promise<ProviderEntry[]> {
        return Promise.resolve([]);
    }

}