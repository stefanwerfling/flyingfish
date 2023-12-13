import {NginxListenServiceDB, NginxListenVariableServiceDB} from 'flyingfish_core';
import {
    ListenData,
    ListenResponse,
    ListenVariable,
    NginxListenVariableContextType,
    StatusCodes
} from 'flyingfish_schemas';

/**
 * List
 */
export class List {

    /**
     * getListens
     */
    public static async getListens(): Promise<ListenResponse> {
        const list: ListenData[] = [];

        const listens = await NginxListenServiceDB.getInstance().findAll();

        if (listens) {
            for await (const listen of listens) {
                const variableStreamServerList: ListenVariable[] = [];

                const variables = await NginxListenVariableServiceDB.getInstance().findAllBy(
                    listen.id,
                    NginxListenVariableContextType.stream_server
                );

                for (const tvar of variables) {
                    variableStreamServerList.push({
                        name: tvar.var_name,
                        value: tvar.var_value
                    });
                }

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
                    proxy_protocol_in: listen.proxy_protocol_in,
                    stream_server_variables: variableStreamServerList
                });
            }
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}