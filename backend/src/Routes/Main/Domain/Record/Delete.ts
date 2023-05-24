import {DefaultReturn, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../../inc/Db/MariaDb/DBHelper.js';
import {DomainRecord as DomainRecordDB} from '../../../../inc/Db/MariaDb/Entity/DomainRecord.js';

/**
 * DomainRecordDelete
 */
export const SchemaDomainRecordDelete = Vts.object({
    id: Vts.number()
});

export type DomainRecordDelete = ExtractSchemaResultType<typeof SchemaDomainRecordDelete>;

/**
 * DomainRecordDeleteResponse
 */
export type DomainRecordDeleteResponse = DefaultReturn;

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