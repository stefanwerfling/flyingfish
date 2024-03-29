import {
    DomainRecordServiceDB,
    DomainServiceDB,
    NginxHttpServiceDB,
    NginxStreamServiceDB
} from 'flyingfish_core';
import {DomainDelete, DomainDeleteResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteDomain
     * @param data
     */
    public static async deleteDomain(data: DomainDelete): Promise<DomainDeleteResponse> {
        const domain = await DomainServiceDB.getInstance().findOne(data.id);

        if (domain) {
            if (domain.fixdomain) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain is fix and can not delete by id: ${data.id}`
                };
            }

            const countStreams = await NginxStreamServiceDB.getInstance().countByDomain(domain.id);

            const countHttps = await NginxHttpServiceDB.getInstance().countByDomain(domain.id);

            if ((countStreams > 0) || (countHttps > 0)) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain in use, can not delete by id: ${domain.id}`
                };
            }

            await DomainRecordServiceDB.getInstance().removeAllByDomain(data.id);

            const result = await DomainServiceDB.getInstance().remove(domain.id);

            if (result) {
                if (domain.parent_id !== 0) {
                    const parent = await DomainServiceDB.getInstance().findOne(domain.parent_id);

                    if (parent) {
                        await DomainServiceDB.getInstance().updateChildrenToNewParent(parent);
                    }
                }

                return {
                    statusCode: StatusCodes.OK
                };
            }
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `domain not found by id: ${data.id}`
        };
    }

}