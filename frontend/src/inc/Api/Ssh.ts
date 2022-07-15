import {NetFetch} from '../Net/NetFetch';

/**
 * SshPortEntry
 */
export type SshPortEntry = {
    id: number;
    port: number;
};

/**
 * SshPortListResponse
 */
export type SshPortListResponse = {
    status: string;
    msg?: string;
    list: SshPortEntry[];
};

/**
 * Ssh
 */
export class Ssh {

    /**
     * getList
     */
    public static async getList(): Promise<SshPortListResponse| null> {
        const result = await NetFetch.getData('/json/ssh/list');

        if (result) {
            if (result.status === 'ok') {
                return result as SshPortListResponse;
            }
        }

        return null;
    }
}