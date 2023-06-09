import {StatusCodes, StreamRequestPoint, StreamRequestsResponse} from 'flyingfish_schemas';
import {Logger} from 'flyingfish_core';
import {NginxStreamAccess} from '../../../inc/Db/InfluxDb/Entity/NginxStreamAccess.js';

/**
 * StreamRequests
 */
export class StreamRequests {

    /**
     * getList
     */
    public static async getList(): Promise<StreamRequestsResponse> {
        const points = await NginxStreamAccess.getRangeLastRequestCounts(1);

        const requestPoint: StreamRequestPoint[] = [];

        for (const point of points) {
            Logger.getLogger().info(point);

            requestPoint.push({
                counts: point.counts,
                time: point.time
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: requestPoint
        };
    }

}