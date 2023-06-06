import {DefaultReturn, Logger, StatusCodes} from 'flyingfish_core';
import {ExtractSchemaResultType, Vts} from 'vts';
import {NginxStreamAccess} from '../../../inc/Db/InfluxDb/Entity/NginxStreamAccess.js';

/**
 * SchemaStreamRequestPoint
 */
export const SchemaStreamRequestPoint = Vts.object({
    counts: Vts.number(),
    time: Vts.string()
});

export type StreamRequestPoint = ExtractSchemaResultType<typeof SchemaStreamRequestPoint>;

export type StreamRequestResponse = DefaultReturn & {
    list: StreamRequestPoint[];
};

/**
 * StreamRequests
 */
export class StreamRequests {

    /**
     * getList
     */
    public static async getList(): Promise<StreamRequestResponse> {
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