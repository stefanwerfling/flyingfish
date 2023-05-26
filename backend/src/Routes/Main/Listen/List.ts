import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {NginxListen as NginxListenDB} from '../../../inc/Db/MariaDb/Entity/NginxListen.js';

/**
 * ListenData
 */
export const SchemaListenData = Vts.object({
    id: Vts.number(),
    type: Vts.number(),
    port: Vts.number(),
    protocol: Vts.number(),
    enable_ipv6: Vts.boolean(),
    check_address: Vts.boolean(),
    check_address_type: Vts.number(),
    name: Vts.string(),
    routeless: Vts.boolean(),
    description: Vts.string(),
    fix: Vts.optional(Vts.boolean()),
    disable: Vts.boolean(),
    listen_category: Vts.optional(Vts.number()),
    proxy_protocol: Vts.boolean(),
    proxy_protocol_in: Vts.boolean()
});

export type ListenData = ExtractSchemaResultType<typeof SchemaListenData>;

/**
 * ListenResponse
 */
export type ListenResponse = DefaultReturn & {
    list: ListenData[];
};

/**
 * List
 */
export class List {

    /**
     * getListens
     */
    public static async getListens(): Promise<ListenResponse> {
        const list: ListenData[] = [];
        const listenRepository = DBHelper.getRepository(NginxListenDB);

        const listens = await listenRepository.find();

        if (listens) {
            for (const listen of listens) {
                list.push({
                    id: listen.id,
                    type: listen.listen_type,
                    port: listen.listen_port,
                    protocol: listen.listen_protocol,
                    enable_ipv6: listen.enable_ipv6,
                    check_address: listen.enable_address_check,
                    check_address_type: listen.address_check_type,
                    name: listen.name,
                    routeless: listen.routeless,
                    description: listen.description,
                    fix: listen.fixlisten,
                    disable: listen.disable,
                    listen_category: listen.listen_category,
                    proxy_protocol: listen.proxy_protocol,
                    proxy_protocol_in: listen.proxy_protocol_in
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}