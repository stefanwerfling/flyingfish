import {CredentialResponse, SchemaCredentialResponse} from 'flyingfish_schemas/dist/src';
import {NetFetch} from '../Net/NetFetch';

export class Credential {

    public static async getList(): Promise<CredentialResponse> {
        return NetFetch.getData('/json/credential/list', SchemaCredentialResponse);
    }

}