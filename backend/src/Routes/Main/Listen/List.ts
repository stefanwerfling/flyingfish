import {DBHelper} from 'flyingfish_core';
import {ListenData, ListenResponse, StatusCodes} from 'flyingfish_schemas';
import {NginxListen as NginxListenDB} from '../../../inc/Db/MariaDb/Entity/NginxListen.js';

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