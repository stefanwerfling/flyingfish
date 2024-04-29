import {CredentialServiceDB} from 'flyingfish_core';
import {Credential, CredentialResponse, StatusCodes} from 'flyingfish_schemas';

export class List {

    public static async getCredentials(): Promise<CredentialResponse> {
        const credentials = await CredentialServiceDB.getInstance().findAll();
        const list: Credential[] = [];

        for (const credential of credentials) {
            list.push({
                id: credential.id,
                name: credential.name,
                provider: credential.provider,
                authSchemaType: credential.scheme,
                settings: credential.settings
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}