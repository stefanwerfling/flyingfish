import {SchemaSshPortListResponse, SshPortListResponse} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Ssh
 */
export class Ssh {

    /**
     * getList
     */
    public static async getList(): Promise<SshPortListResponse> {
        return NetFetch.getData('/json/ssh/list', SchemaSshPortListResponse);
    }

}