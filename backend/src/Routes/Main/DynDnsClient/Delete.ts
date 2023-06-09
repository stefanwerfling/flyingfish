import {DefaultReturn, DynDnsClientDelete, StatusCodes} from 'flyingfish_schemas';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {DynDnsClient as DynDnsClientDB} from '../../../inc/Db/MariaDb/Entity/DynDnsClient.js';
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
        const dyndnsclientRepository = DBHelper.getRepository(DynDnsClientDB);
        const dyndnsclientDomainRepository = DBHelper.getRepository(DynDnsClientDomainDB);

        const tclient = await dyndnsclientRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (tclient) {
            await dyndnsclientDomainRepository.delete({
                dyndnsclient_id: tclient.id
            });

            const result = await dyndnsclientRepository.delete({
                id: tclient.id
            });

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