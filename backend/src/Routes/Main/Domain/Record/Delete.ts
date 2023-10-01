import {DomainRecordServiceDB} from 'flyingfish_core';
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
        const arecord = await DomainRecordServiceDB.getInstance().findOne(data.id);

        if (arecord) {
            const result = await DomainRecordServiceDB.getInstance().remove(data.id);

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