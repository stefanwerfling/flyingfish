import {DBHelper} from 'flyingfish_core';
import {DomainDelete, DomainDeleteResponse, StatusCodes} from 'flyingfish_schemas';
import {DomainService} from '../../../inc/Db/MariaDb/DomainService.js';
import {NginxHttp as NginxHttpDB} from '../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxStream as NginxStreamDB} from '../../../inc/Db/MariaDb/Entity/NginxStream.js';
import {DomainRecord as DomainRecordDB} from '../../../inc/Db/MariaDb/Entity/DomainRecord.js';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteDomain
     * @param data
     */
    public static async deleteDomain(data: DomainDelete): Promise<DomainDeleteResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

        const domain = await DomainService.findOne(data.id);

        if (domain) {
            if (domain.fixdomain) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain is fix and can not delete by id: ${data.id}`
                };
            }

            const countStreams = await streamRepository.count({
                where: {
                    domain_id: domain.id
                }
            });

            const countHttps = await httpRepository.count({
                where: {
                    domain_id: domain.id
                }
            });

            if ((countStreams > 0) || (countHttps > 0)) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: `domain in use, can not delete by id: ${domain.id}`
                };
            }

            await domainRecordRepository.delete({
                domain_id: data.id
            });

            const result = await DomainService.remove(domain.id);

            if (result) {
                if (domain.parent_id !== 0) {
                    const parent = await DomainService.findOne(domain.parent_id);

                    if (parent) {
                        await DomainService.updateChildrenToNewParent(parent);
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