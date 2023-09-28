import {DefaultReturn, ListenData, StatusCodes} from 'flyingfish_schemas';
import {Logger, NginxListenDB, NginxListenServiceDB} from 'flyingfish_core';

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
                    Logger.getLogger().silly(`Listen::saveListen: Found listen by id: ${aListen.id}`);
                } else {
                    Logger.getLogger().error(`Listen::saveListen: Not found listen by id: ${data.id}`);
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
            Logger.getLogger().silly(`Listen::saveListen: Port diff by: DB Port: ${aListen.listen_port} and request: ${data.port}`);

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

        await NginxListenServiceDB.getInstance().save(aListen);

        return {
            statusCode: StatusCodes.OK
        };
    }

}