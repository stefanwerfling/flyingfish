import {SchemaDefaultReturn} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {NetFetch} from '../Net/NetFetch';

/**
 * SshPortEntry
 */
export const SchemaSshPortEntry = Vts.object({
    id: Vts.number(),
    port: Vts.number()
});

export type SshPortEntry = ExtractSchemaResultType<typeof SchemaSshPortEntry>;

/**
 * SshPortListResponse
 */
export const SchemaSshPortListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSshPortEntry)
});

export type SshPortListResponse = ExtractSchemaResultType<typeof SchemaSshPortListResponse>;

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