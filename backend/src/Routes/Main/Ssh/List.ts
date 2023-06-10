import {DBHelper, SshPortDB} from 'flyingfish_core';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';

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
export type SshPortListResponse = DefaultReturn & {
    list: SshPortEntry[];
};

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<SshPortListResponse> {
        const list: SshPortEntry[] = [];

        const sshPortRepository = DBHelper.getRepository(SshPortDB);
        const sshports = await sshPortRepository.find();

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