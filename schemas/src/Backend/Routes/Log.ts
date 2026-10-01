import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from '../../Core/Server/Routes/DefaultReturn.js';

/**
 * One log record pushed to the Hub's ingest endpoint by a FlyingFish part (via the
 * HubLogTransport). `ts` is epoch milliseconds; `meta` is any JSON-serialisable context.
 */
export const SchemaLogRecord = Vts.object({
    area: Vts.string(),
    level: Vts.string(),
    message: Vts.string(),
    ts: Vts.number(),
    meta: Vts.optional(Vts.unknown())
});

export type LogRecord = ExtractSchemaResultType<typeof SchemaLogRecord>;

/**
 * The ingest request body: a batch of log records (parts batch their logs before pushing).
 */
export const SchemaLogIngestRequest = Vts.object({
    records: Vts.array(SchemaLogRecord)
});

export type LogIngestRequest = ExtractSchemaResultType<typeof SchemaLogIngestRequest>;

/**
 * The ingest response: how many records were accepted/persisted.
 */
export const SchemaLogIngestResponse = SchemaDefaultReturn.extend({
    accepted: Vts.number()
});

export type LogIngestResponse = ExtractSchemaResultType<typeof SchemaLogIngestResponse>;

/**
 * Query filter for the log UI. All fields optional (AND-combined): `areas`/`levels` are
 * include-lists; `text` is a case-insensitive substring of the message; `from`/`to` bound
 * the time range (epoch ms); `limit`/`offset` page the result (newest first).
 */
export const SchemaLogQueryRequest = Vts.object({
    areas: Vts.optional(Vts.array(Vts.string())),
    levels: Vts.optional(Vts.array(Vts.string())),
    text: Vts.optional(Vts.string()),
    from: Vts.optional(Vts.number()),
    to: Vts.optional(Vts.number()),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number())
});

export type LogQueryRequest = ExtractSchemaResultType<typeof SchemaLogQueryRequest>;

/**
 * One log record as returned to the UI: `ts` is epoch ms, `meta` is the parsed context
 * object (or absent).
 */
export const SchemaLogEntryItem = Vts.object({
    id: Vts.number(),
    ts: Vts.number(),
    area: Vts.string(),
    level: Vts.string(),
    message: Vts.string(),
    meta: Vts.optional(Vts.unknown())
});

export type LogEntryItem = ExtractSchemaResultType<typeof SchemaLogEntryItem>;

/**
 * The query response: the matching page of records (newest first) + the total match count.
 */
export const SchemaLogQueryResponse = SchemaDefaultReturn.extend({
    items: Vts.array(SchemaLogEntryItem),
    total: Vts.number()
});

export type LogQueryResponse = ExtractSchemaResultType<typeof SchemaLogQueryResponse>;

/**
 * The distinct areas currently present in the store (to populate the UI's area filter).
 */
export const SchemaLogAreasResponse = SchemaDefaultReturn.extend({
    areas: Vts.array(Vts.string())
});

export type LogAreasResponse = ExtractSchemaResultType<typeof SchemaLogAreasResponse>;
