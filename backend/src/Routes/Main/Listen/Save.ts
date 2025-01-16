import {
    DefaultReturn,
    ListenData,
    NginxListenVariableContextType,
    StatusCodes
} from 'flyingfish_schemas';
import {
    Logger,
    NginxListenDB,
    NginxListenServiceDB, NginxListenVariableDB, NginxListenVariableServiceDB
} from 'flyingfish_core';
import {NginxStreamServerVariables} from '../../../inc/Nginx/NginxStreamServerVariables.js';

/**
 * AllowedRouteVariableServer
 */
export const AllowedListenStreamServerVariables = [
    NginxStreamServerVariables.proxy_timeout,
    NginxStreamServerVariables.proxy_connect_timeout
];

/**
 * Save
 */
export class Save {

    /**
     * looked ports
     * @protected
     */
    protected static _lookedPorts = [53];

    /**
     * saveListen
     * @param data
     */
    public static async saveListen(data: ListenData): Promise<DefaultReturn> {
        let aListen: NginxListenDB|null = null;

        if (data.id !== 0) {
            const tListen = await NginxListenServiceDB.getInstance().findOne(data.id);

            if (tListen) {
                aListen = tListen;

                if (aListen) {
                    Logger.getLogger().silly('Listen::saveListen: Found listen by id: %d', aListen.id);
                } else {
                    Logger.getLogger().error('Listen::saveListen: Not found listen by id: %d', data.id);
                }
            } else {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `entry not found by id: ${data.id}`
                };
            }
        }

        if (aListen === null) {
            aListen = new NginxListenDB();

            if (Save._lookedPorts.indexOf(data.port) !== -1) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `port is already used for system: ${data.port}`
                };
            }
        }

        if (aListen.listen_port !== data.port) {
            Logger.getLogger().silly('Listen::saveListen: Port diff by: DB Port: %d and request: %d', aListen.listen_port, data.port);

            const count = await NginxListenServiceDB.getInstance().countByPort(data.port);

            if (count > 0) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `port is already used for listen: ${data.port}`
                };
            }
        }

        aListen.name = data.name;
        aListen.listen_type = data.type;
        aListen.listen_port = data.port;
        aListen.listen_protocol = data.protocol;
        aListen.description = data.description;
        aListen.enable_ipv6 = data.enable_ipv6;
        aListen.enable_address_check = data.check_address;
        aListen.address_check_type = data.check_address_type;
        aListen.disable = data.disable;
        aListen.proxy_protocol = data.proxy_protocol;
        aListen.proxy_protocol_in = data.proxy_protocol_in;

        aListen = await NginxListenServiceDB.getInstance().save(aListen);

        // save stream server variables --------------------------------------------------------------------------------

        for await (const variable of data.stream_server_variables) {
            if (AllowedListenStreamServerVariables.indexOf(variable.name) === -1) {
                continue;
            }

            let variableDb = await NginxListenVariableServiceDB.getInstance().findOneByName(
                aListen.id,
                variable.name,
                NginxListenVariableContextType.stream_server
            );

            if (!variableDb) {
                variableDb = new NginxListenVariableDB();
                variableDb.listen_id = aListen.id;
                variableDb.var_name = variable.name;
                variableDb.context_type = NginxListenVariableContextType.stream_server;
            }

            variableDb.var_value = variable.value;

            await NginxListenVariableServiceDB.getInstance().save(variableDb);
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

}