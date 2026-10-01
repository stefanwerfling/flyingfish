import TransportStream from 'winston-transport';

/**
 * One log record as shipped to the Hub's ingest endpoint. Mirrors the backend ingest
 * schema (flyingfish_schemas LogRecord).
 */
export type HubLogRecord = {

    /**
     * The originating component/area (e.g. `netdevice`, `dns`, `pki`). Fixed per transport.
     */
    area: string;

    /**
     * The log level (`error` | `warn` | `info` | `debug` | `silly` | …).
     */
    level: string;

    /**
     * The rendered log message.
     */
    message: string;

    /**
     * Epoch milliseconds the record was produced.
     */
    ts: number;

    /**
     * Any remaining structured fields (winston meta/splat), JSON-serialisable.
     */
    meta?: Record<string, unknown>;
};

/**
 * Options for {@link HubLogTransport}.
 */
export type HubLogTransportOptions = {

    /**
     * The Hub (backend) base url (the registry url), e.g. `https://hub:3000`.
     */
    hubUrl: string;

    /**
     * The registry shared secret (same header the other service parts authenticate with).
     */
    secret: string;

    /**
     * The component/area name stamped on every record from this process.
     */
    area: string;

    /**
     * Max records to buffer before dropping the OLDEST (back-pressure guard). Default 2000.
     */
    maxQueue?: number;

    /**
     * Flush when this many records are queued, without waiting for the interval. Default 50.
     */
    batchSize?: number;

    /**
     * Max milliseconds between flushes. Default 2000.
     */
    flushIntervalMs?: number;

    /**
     * Injectable fetch (tests). Defaults to the global `fetch`.
     */
    fetchImpl?: typeof fetch;
};

/**
 * The registry secret header the Hub authenticates service parts with (matches the
 * clusterserver / netfilter clients).
 */
const HEADER_REGISTRY_SECRET = 'x-flyingfish-registry-secret';

/**
 * A winston transport that batches log records and ships them to the Hub's log-ingest
 * endpoint (`POST /json/logs/ingest`) for the central Log-Center (Pi-router / observability
 * epic). Each FlyingFish part adds one of these to its logger so ALL component logs land in
 * one filterable place.
 *
 * Safety by construction — logging must never destabilise the process it observes:
 * - **Non-blocking**: `log()` only enqueues and returns; shipping happens on a timer/batch.
 * - **Bounded**: the queue is capped and drops the OLDEST on overflow (never grows without
 *   bound when the Hub is slow/down).
 * - **No recursion**: it NEVER logs through the figtree/winston Logger (that would feed
 *   itself); transport failures are swallowed (an occasional `console` note at most), so a
 *   Hub outage can't crash or spam the part.
 */
export class HubLogTransport extends TransportStream {

    private readonly _hubUrl: string;

    private readonly _secret: string;

    private readonly _area: string;

    private readonly _maxQueue: number;

    private readonly _batchSize: number;

    private readonly _fetch: typeof fetch;

    private _queue: HubLogRecord[] = [];

    private _timer: NodeJS.Timeout | null = null;

    private _sending = false;

    /**
     * @param options - the transport options
     */
    public constructor(options: HubLogTransportOptions) {
        super();

        this._hubUrl = options.hubUrl.replace(/\/+$/u, '');
        this._secret = options.secret;
        this._area = options.area;
        this._maxQueue = options.maxQueue ?? 2000;
        this._batchSize = options.batchSize ?? 50;
        this._fetch = options.fetchImpl ?? fetch;

        const flushIntervalMs = options.flushIntervalMs ?? 2000;

        // unref'd: the flush timer must NOT keep the process alive on its own.
        this._timer = setInterval((): void => {
            void this._flush();
        }, flushIntervalMs);
        this._timer.unref();
    }

    /**
     * winston transport hook: enqueue the record (never blocks, never throws upward).
     * @param info - the winston log info object (level, message, timestamp, meta)
     * @param callback - winston completion callback
     */
    public log(info: Record<string, unknown>, callback: () => void): void {
        setImmediate((): void => {
            this.emit('logged', info);
        });

        try {
            const {level, message, timestamp, ...rest} = info;
            const ts = typeof timestamp === 'string' ? Date.parse(timestamp) : Date.now();

            // winston adds Symbol-keyed internals; `...rest` only copies string keys, so meta
            // is already free of them. Drop it entirely when empty to keep records small.
            const meta = Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : undefined;

            this._queue.push({
                area: this._area,
                level: typeof level === 'string' ? level : 'info',
                message: typeof message === 'string' ? message : String(message),
                ts: Number.isNaN(ts) ? Date.now() : ts,
                meta: meta
            });

            // Overflow: drop the OLDEST so recent context survives a Hub outage.
            if (this._queue.length > this._maxQueue) {
                this._queue.splice(0, this._queue.length - this._maxQueue);
            }

            if (this._queue.length >= this._batchSize) {
                void this._flush();
            }
        } catch {
            // Never let the observer break the observed process.
        }

        callback();
    }

    /**
     * Ship the queued records to the Hub. Best-effort: on any failure the batch is RE-QUEUED
     * (front) so nothing is silently lost, bounded by the same overflow guard. Serialised so
     * batches never overlap.
     */
    private async _flush(): Promise<void> {
        if (this._sending || this._queue.length === 0) {
            return;
        }

        this._sending = true;
        const batch = this._queue.splice(0, this._batchSize);

        try {
            await this._fetch(`${this._hubUrl}/json/logs/ingest`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    [HEADER_REGISTRY_SECRET]: this._secret
                },
                body: JSON.stringify({records: batch})
            });
        } catch {
            // Re-queue at the front and let the overflow guard cap it; never throw.
            this._queue = batch.concat(this._queue);

            if (this._queue.length > this._maxQueue) {
                this._queue.splice(0, this._queue.length - this._maxQueue);
            }
        } finally {
            this._sending = false;
        }
    }

    /**
     * Stop the flush timer (clean shutdown). winston calls this when the transport is removed.
     */
    public close(): void {
        if (this._timer !== null) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

}
