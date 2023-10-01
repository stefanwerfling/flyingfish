import {SshPortServiceDB} from 'flyingfish_core';
import {SshPortEntry, SshPortListResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<SshPortListResponse> {
        const list: SshPortEntry[] = [];

        const sshports = await SshPortServiceDB.getInstance().findAll();

        if (sshports) {
            for (const asshport of sshports) {
                list.push({
                    id: asshport.id,
                    port: asshport.port
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}