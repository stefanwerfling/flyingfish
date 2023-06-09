import {DefaultReturn, StatusCodes} from 'flyingfish_schemas';
import {ExtractSchemaResultType, Vts} from 'vts';
import {DBHelper} from '../../../inc/Db/MariaDb/DBHelper.js';
import {NginxHttp as NginxHttpDB} from '../../../inc/Db/MariaDb/Entity/NginxHttp.js';
import {NginxListen as NginxListenDB} from '../../../inc/Db/MariaDb/Entity/NginxListen.js';
import {NginxStream as NginxStreamDB} from '../../../inc/Db/MariaDb/Entity/NginxStream.js';

/**
 * ListenDelete
 */
export const SchemaListenDelete = Vts.object({
    id: Vts.number()
});

export type ListenDelete = ExtractSchemaResultType<typeof SchemaListenDelete>;

/**
 * ListenDeleteResponse
 */
export type ListenDeleteResponse = DefaultReturn;

/**
 * Delete
 */
export class Delete {

    /**
     * deleteListen
     * @param data
     */
    public static async deleteListen(data: ListenDelete): Promise<ListenDeleteResponse> {
        const listenRepository = DBHelper.getRepository(NginxListenDB);
        const streamRepository = DBHelper.getRepository(NginxStreamDB);
        const httpRepository = DBHelper.getRepository(NginxHttpDB);

        const tListen = await listenRepository.findOne({
            where: {
                id: data.id
            }
        });

        if (tListen) {
            if (tListen.fixlisten) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'This Listen can not deleted!'
                };
            }

            const countStream = await streamRepository.count({
                where: {
                    listen_id: tListen.id
                }
            });

            const countHttp = await httpRepository.count({
                where: {
                    listen_id: tListen.id
                }
            });

            if ((countStream > 0) || (countHttp > 0)) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Listen can not deleted, please remove all routes!'
                };
            }

            const result = await listenRepository.delete({
                id: tListen.id
            });

            if (result) {
                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Listen can not deleted, db error by operation.'
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Listen not found by Id!'
        };
    }

}