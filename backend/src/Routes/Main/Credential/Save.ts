import {CredentialDB, CredentialServiceDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, Credential, CredentialSchemaTypes} from 'flyingfish_schemas';
import {Vts} from 'vts';

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

        if (Vts.isString(data.authSchemaType)) {
            data.authSchemaType = parseInt(data.authSchemaType, 10) || CredentialSchemaTypes.Basic;
        }

        if(Vts.isInteger(data.authSchemaType)) {
            switch (data.authSchemaType) {
                case CredentialSchemaTypes.Basic:
                case CredentialSchemaTypes.Digest:
                    credential.scheme = data.authSchemaType;
                    break;

                default:
                    credential.scheme = CredentialSchemaTypes.Basic;
            }
        } else {
            credential.scheme = CredentialSchemaTypes.Basic;
        }

        credential.settings = data.settings;

        await CredentialServiceDB.getInstance().save(credential);

        return {
            statusCode: StatusCodes.OK
        };
    }

}