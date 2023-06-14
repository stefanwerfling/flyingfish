import {DBHelper} from 'flyingfish_core';
import {DefaultReturn, StatusCodes, UpnpNatSaveRequest} from 'flyingfish_schemas';
import {NatPort as NatPortDB} from '../../../inc/Db/MariaDb/Entity/NatPort.js';

/**
 * Save
 */
export class Save {

    /**
     * save
     * @param data
     */
    public static async save(data: UpnpNatSaveRequest): Promise<DefaultReturn> {
        const natportRepository = DBHelper.getRepository(NatPortDB);

        let aNatPort: NatPortDB|null = null;

        if (data.id !== 0) {
            const tNatPort = await natportRepository.findOne({
                where: {
                    id: data.id
                }
            });

            if (tNatPort) {
                aNatPort = tNatPort;
            }
        }

        if (aNatPort === null) {
            aNatPort = new NatPortDB();
        }

        aNatPort.public_port = data.public_port;
        aNatPort.gateway_identifier_id = data.gateway_identifier_id;
        aNatPort.gateway_address = data.gateway_address;
        aNatPort.private_port = data.private_port;
        aNatPort.client_address = data.client_address;
        aNatPort.use_himhip_host_address = data.use_himhip_host_address;
        aNatPort.ttl = data.ttl;
        aNatPort.protocol = data.protocol;
        aNatPort.listen_id = data.listen_id;
        aNatPort.description = data.description;

        const result = await DBHelper.getDataSource().manager.save(aNatPort);

        if (result) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR
        };
    }

}