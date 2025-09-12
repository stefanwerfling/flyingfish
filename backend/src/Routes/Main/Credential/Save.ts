import {CredentialDB, CredentialServiceDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, Credential, CredentialSchemaTypes} from 'flyingfish_schemas';
/**
 * Save credential route
 */
export class Save {

    /**
     * Save the credential
     * @param {Credential} data
     */
    public static async saveCredential(data: Credential): Promise<DefaultReturn> {
        let credential: CredentialDB | null = null;

        if (data.id !== 0) {
            const tCredential = await CredentialServiceDB.getInstance().findOne(data.id);

            if (tCredential) {
                credential = tCredential;
            }
        }

        if (credential === null) {
            credential = new  CredentialDB();
        }

        credential.position = 0;
        credential.name = data.name;
        credential.provider = data.provider;

        switch (data.authSchemaType) {
            case CredentialSchemaTypes.Basic:
            case CredentialSchemaTypes.Digest:
                credential.scheme = parseInt(data.authSchemaType, 10);
                break;

            default:
                credential.scheme = parseInt(CredentialSchemaTypes.Basic, 10);
        }

        credential.settings = data.settings;

        await CredentialServiceDB.getInstance().save(credential);

        return {
            statusCode: StatusCodes.OK
        };
    }

}