import {
    LogAreasResponse,
    LogQueryRequest,
    LogQueryResponse,
    SchemaLogAreasResponse,
    SchemaLogQueryResponse
} from 'flyingfish_schemas';
import {NetFetch} from '../Net/NetFetch.js';

/**
 * Log — frontend client for the central Log-Center (observability epic): query the stored
 * records (filtered) and list the component areas for the filter UI.
 */
export class Log {

    /**
     * Query a page of log records (newest first), filtered by area/level/text/time.
     * @param request - the query filter
     */
    public static async query(request: LogQueryRequest): Promise<LogQueryResponse> {
        return NetFetch.postData('/json/logs/query', request, SchemaLogQueryResponse);
    }

    /**
     * List the distinct component areas present in the store (for the area filter).
     */
    public static async getAreas(): Promise<LogAreasResponse> {
        return NetFetch.getData('/json/logs/areas', SchemaLogAreasResponse);
    }
}
