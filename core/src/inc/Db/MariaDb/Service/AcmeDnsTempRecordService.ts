import {DeleteResult} from 'typeorm';
import {DBService} from '../DBService.js';
import {AcmeDnsTempRecord} from '../Entity/AcmeDnsTempRecord.js';

/**
 * ACME DNS-01 temporary record service object.
 */
export class AcmeDnsTempRecordService extends DBService<AcmeDnsTempRecord> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'acme_dns_temp_record';

    /**
     * Return an intance from acme dns temp record service.
     * @returns {AcmeDnsTempRecordService}
     */
    public static getInstance(): AcmeDnsTempRecordService {
        return DBService.getSingleInstance(
            AcmeDnsTempRecordService,
            AcmeDnsTempRecord,
            AcmeDnsTempRecordService.REGISTER_NAME
        );
    }

    /**
     * Find all temporary records by name.
     * @param {string} name
     * @returns {Promise<AcmeDnsTempRecord[]>}
     */
    public async findByName(name: string): Promise<AcmeDnsTempRecord[]> {
        return this._repository.find({
            where: {
                name: name
            }
        });
    }

    /**
     * Remove all temporary records by name.
     * @param {string} name
     * @returns {Promise<DeleteResult>}
     */
    public async removeByName(name: string): Promise<DeleteResult> {
        return this._repository.delete({
            name: name
        });
    }

}