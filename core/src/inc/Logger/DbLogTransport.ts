import TransportStream from 'winston-transport';
import {LogEntryService, LogIngestRecord} from '../Db/MariaDb/Service/LogEntryService.js';

/**
 * Options for {@link DbLogTransport}.
 */
export type DbLogTransportOptions = {

    /**
     * The component/area name stamped on every record (e.g. `backend`).
     */
    area: string;

    /**
     * Max records to buffer before dropping the OLDEST. Default 2000.
     */
    maxQueue?: number;

    /**
     * Flush when this many records are queued. Default 50.
     */
    batchSize?: number;

    /**
     * Max milliseconds between flushes. Default 2000.
     */
    flushIntervalMs?: number;
};

/**
 * A winston transport that writes the Hub's OWN process logs straight into the central
 * Log-Center store ({@link LogEntryService}) — no HTTP hop, since the backend already owns
 * the database. Used by the backend so its logs (and anything it logs on behalf of nginx,
 * retention, etc.) appear in the log UI alongside the pushed part logs.
 *
 * Safety by construction (same contract as HubLogTransport):
 * - **Non-blocking**: `log()` only enqueues.
 * - **Bounded**: the queue is capped, drops the OLDEST on overflow.
 * - **No recursion**: while a DB flush is in flight, incoming records are DROPPED (a flush
 *   runs TypeORM which may itself log — those logs must not feed back in and loop). It never
 *   logs through winston itself; all errors are swallowed.
 */
export class DbLogTransport extends TransportStream {

    private readonly _area: string;

    private readonly _maxQueue: number;

    private readonly _batchSize: number;

    private _queue: LogIngestRecord[] = [];

    private _timer: NodeJS.Timeout | null = null;

    private _flushing = false;

    /**
     * @param options - the transport options
     */
    public constructor(options: DbLogTransportOptions) {
        super();

        this._area = options.area;
        this._maxQueue = options.maxQueue ?? 2000;
        this._batchSize = options.batchSize ?? 50;

        this._timer = setInterval((): void => {
            void this._flush();
        }, options.flushIntervalMs ?? 2000);
        this._timer.unref();
    }

    /**
     * winston transport hook: enqueue the record (never blocks, never throws upward).
     * @param info - the winston log info object
     * @param callback - winston completion callback
     */
    public log(info: Record<string, unknown>, callback: () => void): void {
        setImmediate((): void => {
            this.emit('logged', info);
        });

        // Drop anything logged DURING a DB flush — that is the recursion a DB-backed log
        // transport must guard against (the flush's own queries/errors would re-enter).
        if (!this._flushing) {
            try {
                const {level, message, timestamp, ...rest} = info;
                const ts = typeof timestamp === 'string' ? Date.parse(timestamp) : Date.now();
                const meta = Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : undefined;

                this._queue.push({
                    area: this._area,
                    level: typeof level === 'string' ? level : 'info',
                    message: typeof message === 'string' ? message : String(message),
                    ts: Number.isNaN(ts) ? Date.now() : ts,
                    meta: meta
                });

                if (this._queue.length > this._maxQueue) {
                    this._queue.splice(0, this._queue.length - this._maxQueue);
                }
            } catch {
                // Never let the observer break the observed process.
            }
        }

        callback();
    }

    /**
     * Persist the queued records via the log service. Best-effort: on failure the batch is
     * re-queued (bounded by the overflow guard); the `_flushing` flag suppresses recursion.
     */
    private async _flush(): Promise<void> {
        if (this._flushing || this._queue.length === 0) {
            return;
        }

        this._flushing = true;
        const batch = this._queue.splice(0, this._batchSize);

        try {
            await LogEntryService.getInstance().ingestMany(batch);
        } catch {
            this._queue = batch.concat(this._queue);

            if (this._queue.length > this._maxQueue) {
                this._queue.splice(0, this._queue.length - this._maxQueue);
            }
        } finally {
            this._flushing = false;
        }
    }

    /**
     * Stop the flush timer (clean shutdown).
     */
    public close(): void {
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

}
