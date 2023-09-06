import {DBHelper} from 'flyingfish_core';
import {DynDnsClientService} from 'flyingfish_core/dist/inc/Db/MariaDb/DynDnsClientService.js';
import {DefaultReturn, DynDnsClientDelete, StatusCodes} from 'flyingfish_schemas';
import {DynDnsClientDomain as DynDnsClientDomainDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClientDomain.js';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteClient
     * @param data
     */
    public static async deleteClient(data: DynDnsClientDelete): Promise<DefaultReturn> {
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        const tclient = await DynDnsClientService.getInstance().findOne(data.id);

        if (tclient) {
            await dyndnsclientDomainRepository.delete({
                dyndnsclient_id: tclient.id
            });

            const result = await DynDnsClientService.getInstance().remove(tclient.id);

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Client can not delete!'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Client not found!'
        };
    }

}