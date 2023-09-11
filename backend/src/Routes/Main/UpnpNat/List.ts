import {NatPortServiceDB} from 'flyingfish_core';
import {StatusCodes} from 'flyingfish_schemas';
import {UpnpNatPort, UpnpNatResponse} from 'flyingfish_schemas/dist/Backend/Routes/UpnpNat/List.js';

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<UpnpNatResponse> {
        const list: UpnpNatPort[] = [];
        const entries = await NatPortServiceDB.getInstance().findAll();

        for (const entry of entries) {
            list.push({
                id: entry.id,
                postion: entry.postion,
                public_port: entry.public_port,
                gateway_identifier_id: entry.gateway_identifier_id,
                gateway_address: entry.gateway_address,
                private_port: entry.private_port,
                client_address: entry.client_address,
                use_himhip_host_address: entry.use_himhip_host_address,
                ttl: entry.ttl,
                protocol: entry.protocol,
                last_ttl_update: entry.last_ttl_update,
                listen_id: entry.listen_id,
                description: entry.description,
                last_status: entry.last_status,
                last_update: entry.last_update
            });
        }

        return {
            statusCode: StatusCodes.OK,
            data: list
        };
    }

}