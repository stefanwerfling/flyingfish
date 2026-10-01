import {Router} from 'express';
import {DefaultRoute, Logger} from '@stefanwerfling/figtree';
import {LogEntryDB, LogEntryServiceDB} from 'flyingfish_core';
import {
    LogAreasResponse,
    LogEntryItem,
    LogIngestResponse,
    LogQueryResponse,
    SchemaLogAreasResponse,
    SchemaLogIngestRequest,
    SchemaLogIngestResponse,
    SchemaLogQueryRequest,
    SchemaLogQueryResponse,
    StatusCodes
} from 'flyingfish_schemas';
import {FlyingFishRouteCheckServiceOrUserLogin} from '../../Application/Server/FlyingFishRouteCheckServiceOrUserLogin.js';
import {FlyingFishRouteCheckUserLogin} from '../../Application/Server/FlyingFishRouteCheckUserLogin.js';
import {LogStreamHub} from '../../inc/Log/LogStreamHub.js';

/**
 * Map a stored {@link LogEntryDB} to the UI wire shape: `ts` as epoch ms, `meta` parsed back
 * to its object (or left out when absent / unparseable → the raw string is kept so nothing
 * is lost).
 * @param entry - the stored record
 */
const toItem = (entry: LogEntryDB): LogEntryItem => {
    let meta: unknown;

    if (entry.meta !== null && entry.meta !== '') {
        try {
            meta = JSON.parse(entry.meta);
        } catch {
            meta = entry.meta;
        }
    }

    return {
        id: entry.id,
        ts: entry.ts.getTime(),
        area: entry.area,
        level: entry.level,
        message: entry.message,
        meta: meta
    };
};

/**
 * Log — the central Log-Center ingest (observability epic). FlyingFish parts push their
 * batched winston logs here (via the HubLogTransport, registry-secret / mTLS authenticated),
 * and the Hub persists them to the `log_entry` store for the filterable log UI. Query + live
 * stream land here in later phases.
 */
export class Log extends DefaultRoute {

    /**
     * getExpressRouter
     */
    public override getExpressRouter(): Router {
        this._post(
            '/json/logs/ingest',
            FlyingFishRouteCheckServiceOrUserLogin,
            async(_req, _res, data): Promise<LogIngestResponse> => {
                const body = data.body!;

                try {
                    const accepted = await LogEntryServiceDB.getInstance().ingestMany(body.records);

                    // Fan the batch out to any live-stream (WebSocket) subscribers.
                    LogStreamHub.getInstance().publish(body.records);

                    return {statusCode: StatusCodes.OK, accepted: accepted};
                } catch (error) {
                    // Never let a bad batch take down the ingest path; report it as a server
                    // error so the pushing part re-queues and retries.
                    Logger.getLogger().warn('Log ingest failed to persist a batch', error);

                    return {statusCode: StatusCodes.INTERNAL_ERROR, accepted: 0};
                }
            },
            {
                description: 'Ingest a batch of log records from a FlyingFish part (central Log-Center)',
                bodySchema: SchemaLogIngestRequest,
                responseBodySchema: SchemaLogIngestResponse
            }
        );

        this._post(
            '/json/logs/query',
            FlyingFishRouteCheckUserLogin,
            async(_req, _res, data): Promise<LogQueryResponse> => {
                const body = data.body!;
                const result = await LogEntryServiceDB.getInstance().query({
                    areas: body.areas,
                    levels: body.levels,
                    text: body.text,
                    from: body.from,
                    to: body.to,
                    limit: body.limit,
                    offset: body.offset
                });

                return {
                    statusCode: StatusCodes.OK,
                    items: result.items.map(toItem),
                    total: result.total
                };
            },
            {
                description: 'Query the central log store (filter by area/level/text/time, newest first)',
                bodySchema: SchemaLogQueryRequest,
                responseBodySchema: SchemaLogQueryResponse
            }
        );

        this._get(
            '/json/logs/areas',
            FlyingFishRouteCheckUserLogin,
            async(): Promise<LogAreasResponse> => {
                const areas = await LogEntryServiceDB.getInstance().distinctAreas();

                return {statusCode: StatusCodes.OK, areas: areas};
            },
            {
                description: 'List the distinct component areas present in the log store (for the UI filter)',
                responseBodySchema: SchemaLogAreasResponse
            }
        );

        return super.getExpressRouter();
    }

}
