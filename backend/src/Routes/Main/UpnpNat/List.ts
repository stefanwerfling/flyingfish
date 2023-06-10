import {DBHelper} from 'flyingfish_core';
import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {NatPort as NatPortDB} from '../../../inc/Db/MariaDb/Entity/NatPort.js';

/**
 * UpnpNatPort
 */
export const SchemaUpnpNatPort = Vts.object({
    id: Vts.number(),
    postion: Vts.number(),
    public_port: Vts.number(),
    gateway_identifier_id: Vts.number(),
    gateway_address: Vts.string(),
    private_port: Vts.number(),
    client_address: Vts.string(),
    use_himhip_host_address: Vts.boolean(),
    ttl: Vts.number(),
    protocol: Vts.string(),
    last_ttl_update: Vts.number(),
    listen_id: Vts.number(),
    description: Vts.string(),
    last_status: Vts.number(),
    last_update: Vts.number()
});

export type UpnpNatPort = ExtractSchemaResultType<typeof SchemaUpnpNatPort>;

/**
 * UpnpNatResponse
 */
export type UpnpNatResponse = DefaultReturn & {
    data: UpnpNatPort[];
};

/**
 * List
 */
export class List {

    /**
     * getList
     */
    public static async getList(): Promise<UpnpNatResponse> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        const list: UpnpNatPort[] = [];
        const entries = await natportRepository.find();

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