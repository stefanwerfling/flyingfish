import {DynDnsClientDomainServiceDB, DynDnsClientServiceDB} from 'flyingfish_core';
import {DefaultReturn, DynDnsClientDelete, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete Route for DynDnsClient.
 */
export class Delete {

    /**
     * Delete a client and all links to a domain.
     * @param {DynDnsClientDelete} data - Delete information from UI.
     * @returns {DefaultReturn} Default return data for UI.
     */
    public static async deleteClient(data: DynDnsClientDelete): Promise<DefaultReturn> {
        const tclient = await DynDnsClientServiceDB.getInstance().findOne(data.id);

        if (tclient) {
            await DynDnsClientDomainServiceDB.getInstance().removeByClientId(tclient.id);

            const result = await DynDnsClientServiceDB.getInstance().remove(tclient.id);

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