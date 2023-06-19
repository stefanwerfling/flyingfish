import {DBHelper, DomainRecordDB} from 'flyingfish_core';
import {DomainRecordDelete, DomainRecordDeleteResponse, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteDomainRecord
     * @param data
     */
    public static async deleteDomainRecord(data: DomainRecordDelete): Promise<DomainRecordDeleteResponse> {
        const domainRecordRepository = DBHelper.getRepository(DomainRecordDB);

        const arecord = await domainRecordRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (arecord) {
            const result = await domainRecordRepository.delete({
                id: data.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: `domain record not found by id: ${data.id}`
        };
    }

}