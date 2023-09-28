import {NginxHttpServiceDB, NginxListenServiceDB, NginxStreamServiceDB} from 'flyingfish_core';
import {DefaultReturn, ListenDelete, StatusCodes} from 'flyingfish_schemas';

/**
 * Delete
 */
export class Delete {

    /**
     * deleteListen
     * @param data
     */
    public static async deleteListen(data: ListenDelete): Promise<DefaultReturn> {
        const tListen = await NginxListenServiceDB.getInstance().findOne(data.id);

        if (tListen) {
            if (tListen.fixlisten) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'This Listen can not deleted!'
                };
            }

            const countStream = await NginxStreamServiceDB.getInstance().countByListen(tListen.id);
            const countHttp = await NginxHttpServiceDB.getInstance().countByListen(tListen.id);

            if ((countStream > 0) || (countHttp > 0)) {
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Listen can not deleted, please remove all routes!'
                };
            }

            const result = await NginxListenServiceDB.getInstance().remove(tListen.id);

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