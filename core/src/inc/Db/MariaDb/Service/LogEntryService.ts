import {LessThan} from 'typeorm';
import {DBService} from '../DBService.js';
import {LogEntry} from '../Entity/LogEntry.js';

/**
 * One log record to ingest (the wire shape parts push to the Hub). `ts` is epoch
 * milliseconds; `meta` is any JSON-serialisable context (stored as a JSON string).
 */
export type LogIngestRecord = {
    area: string;
    level: string;
    message: string;
    ts: number;
    meta?: unknown;
};

/**
 * Filter for {@link LogEntryService.query}. All fields optional (AND-combined).
 */
export type LogQueryFilter = {
    areas?: string[];
    levels?: string[];
    text?: string;
    from?: number;
    to?: number;
    limit?: number;
    offset?: number;
};

/**
 * The hard upper bound on rows a single {@link LogEntryService.query} returns, so a UI
 * request can never pull an unbounded result into memory.
 */
export const LOG_QUERY_MAX_LIMIT = 1000;

/**
 * The hard upper bound on records persisted from ONE ingest call, so a buggy/hostile push
 * can never blow up memory or a single INSERT. Excess is dropped (parts batch small anyway).
 */
export const LOG_INGEST_MAX_BATCH = 1000;

/**
 * DB service for the central Log-Center {@link LogEntry} store (observability epic):
 * bulk-ingest pushed records and prune by age for retention.
 */
export class LogEntryService extends DBService<LogEntry> {

    public static REGISTER_NAME = 'log_entry';

    /**
     * Singleton instance.
     */
    public static getInstance(): LogEntryService {
        return DBService.getSingleInstance(LogEntryService, LogEntry, LogEntryService.REGISTER_NAME);
    }

    /**
     * Bulk-insert a batch of pushed log records (one INSERT, no per-row select). Values are
     * clamped to the column widths so a malformed push can't error the whole batch.
     * @param records - the records to persist
     * @return the number of rows written
     */
    public async ingestMany(records: LogIngestRecord[]): Promise<number> {
        if (records.length === 0) {
            return 0;
        }

        // Hard cap per call (RAM / single-INSERT guard) — drop the excess.
        const capped = records.length > LOG_INGEST_MAX_BATCH ? records.slice(0, LOG_INGEST_MAX_BATCH) : records;

        const rows = capped.map((record): LogEntry => {
            const entry = new LogEntry();

            entry.ts = new Date(typeof record.ts === 'number' && Number.isFinite(record.ts) ? record.ts : Date.now());
            entry.area = String(record.area ?? '').slice(0, 32);
            entry.level = String(record.level ?? 'info').slice(0, 16);
            entry.message = typeof record.message === 'string' ? record.message : String(record.message);
            entry.meta = record.meta === undefined || record.meta === null ? null : JSON.stringify(record.meta);

            return entry;
        });

        await this._repository.insert(rows);

        return rows.length;
    }

    /**
     * Query a page of records (newest first) for the log UI. The limit is clamped to
     * {@link LOG_QUERY_MAX_LIMIT} so a single request can never pull an unbounded set into
     * memory. Text is matched as a case-insensitive substring (parameterised — injection-safe).
     * @param filter - the query filter
     * @return the matching page + the total match count
     */
    public async query(filter: LogQueryFilter): Promise<{items: LogEntry[]; total: number;}> {
        const qb = this._repository.createQueryBuilder('log');

        if (filter.areas && filter.areas.length > 0) {
            qb.andWhere('log.area IN (:...areas)', {areas: filter.areas});
        }

        if (filter.levels && filter.levels.length > 0) {
            qb.andWhere('log.level IN (:...levels)', {levels: filter.levels});
        }

        if (filter.text && filter.text !== '') {
            qb.andWhere('log.message LIKE :text', {text: `%${filter.text}%`});
        }

        if (filter.from !== undefined) {
            qb.andWhere('log.ts >= :from', {from: new Date(filter.from)});
        }

        if (filter.to !== undefined) {
            qb.andWhere('log.ts <= :to', {to: new Date(filter.to)});
        }

        const take = Math.min(Math.max(filter.limit ?? 200, 1), LOG_QUERY_MAX_LIMIT);
        const skip = Math.max(filter.offset ?? 0, 0);

        qb.orderBy('log.ts', 'DESC').addOrderBy('log.id', 'DESC').take(take).skip(skip);

        const [items, total] = await qb.getManyAndCount();

        return {items: items, total: total};
    }

    /**
     * The distinct component areas currently in the store (to populate the UI's area filter).
     */
    public async distinctAreas(): Promise<string[]> {
        const rows = await this._repository
            .createQueryBuilder('log')
            .select('DISTINCT log.area', 'area')
            .getRawMany<{area: string;}>();

        return rows.map((row) => row.area).filter((area) => area !== '').sort();
    }

    /**
     * Delete all records older than the cutoff (age retention). Returns the number removed.
     * @param cutoff - records with `ts` strictly before this are deleted
     */
    public async deleteOlderThan(cutoff: Date): Promise<number> {
        const result = await this._repository.delete({ts: LessThan(cutoff)});

        return result.affected ?? 0;
    }

    /**
     * Hard row-count cap (disk guard): keep only the newest `maxRows` records, delete the
     * rest. Uses the autoincrement id (monotonic ≈ insertion order) to find the threshold,
     * so it is a single indexed range delete regardless of table size. Returns rows removed.
     * @param maxRows - the maximum number of records to retain (<= 0 disables the cap)
     */
    public async enforceMaxRows(maxRows: number): Promise<number> {
        if (maxRows <= 0) {
            return 0;
        }

        // The id of the newest record just BEYOND the cap window; everything older than it goes.
        const threshold = await this._repository
            .createQueryBuilder('log')
            .select('log.id', 'id')
            .orderBy('log.id', 'DESC')
            .skip(maxRows)
            .take(1)
            .getRawOne<{id: number;}>();

        if (!threshold) {
            return 0;
        }

        const result = await this._repository
            .createQueryBuilder()
            .delete()
            .from(LogEntry)
            .where('id < :id', {id: threshold.id})
            .execute();

        return result.affected ?? 0;
    }
}
