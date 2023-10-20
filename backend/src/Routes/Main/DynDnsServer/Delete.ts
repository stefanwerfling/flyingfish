import {DynDnsServerDomainServiceDB, DynDnsServerUserServiceDB} from 'flyingfish_core';
import {DefaultReturn, DynDnsServerData, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete object for DynDns Server.
 */
export class Delete {

    /**
     * Delete a dyn dns server user.
     * @param {DynDnsServerData} data
     * @returns {DefaultReturn}
     */
    public static async deleteUser(data: DynDnsServerData): Promise<DefaultReturn> {
        const tuser = await DynDnsServerUserServiceDB.getInstance().findOne(data.user.id);

        if (tuser) {
            await DynDnsServerDomainServiceDB.getInstance().removeByUserId(tuser.id);

            const result = await DynDnsServerUserServiceDB.getInstance().remove(tuser.id);

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'User can not delete!'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Client not found!'
        };
    }

}