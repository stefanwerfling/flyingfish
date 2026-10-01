import {LogEntryServiceDB, LogIngestRecord} from 'flyingfish_core';
import {FlyingFishConfig} from '../../Application/Config/FlyingFishConfig.js';
import {LogStreamHub} from './LogStreamHub.js';

/**
 * NginxAccessLogSink
 *
 * Feeds nginx access-log lines (received over UDP syslog by {@link NginxAccessLog}) into the
 * central Log-Center — WITHOUT ever risking the system under heavy traffic:
 *
 * - **nginx can't block**: delivery is UDP (fire-and-forget); the OS drops packets when the
 *   backend is busy, so nginx never back-pressures regardless of this sink.
 * - **backend can't be flooded**: {@link offer} is O(1) and enqueues at most `maxPerSec`
 *   lines per 1s window (a simple rate cap) into a small bounded buffer; everything beyond
 *   that is DROPPED (counted, and summarised into the log periodically so sampling is
 *   visible). A single batched INSERT per second caps the DB write rate; the Log-Center row
 *   cap (LogRetentionService) is the ultimate disk backstop.
 *
 * Disabled via `config.log.nginxAccess.enabled = false` or `maxPerSec = 0`.
 */
export class NginxAccessLogSink {

    private static _instance: NginxAccessLogSink | null = null;

    /**
     * Default max access-log lines persisted per second (excess dropped).
     */
    public static readonly DEFAULT_MAX_PER_SEC = 50;

    /**
     * Max stored message length (a defensive cap on row size).
     */
    private static readonly MAX_MESSAGE_LEN = 4000;

    private _queue: string[] = [];

    private _acceptedThisWindow = 0;

    private _dropped = 0;

    private _ticks = 0;

    private _timer: NodeJS.Timeout | null = null;

    /**
     * Get the singleton.
     */
    public static getInstance(): NginxAccessLogSink {
        if (NginxAccessLogSink._instance === null) {
            NginxAccessLogSink._instance = new NginxAccessLogSink();
        }

        return NginxAccessLogSink._instance;
    }

    /**
     * Constructor — starts the 1s batched flush timer (unref'd: never keeps the process alive).
     */
    public constructor() {
        this._timer = setInterval((): void => {
            void this._flush();
        }, 1000);
        this._timer.unref();
    }

    /**
     * The configured per-second cap (0 = disabled).
     */
    private _maxPerSec(): number {
        const config = FlyingFishConfig.getInstance().get()?.log?.nginxAccess;

        if (config?.enabled === false) {
            return 0;
        }

        const value = config?.maxPerSec ?? NginxAccessLogSink.DEFAULT_MAX_PER_SEC;

        return value > 0 ? value : 0;
    }

    /**
     * Offer one raw access-log line. Non-blocking: accepted up to the per-second cap, else
     * dropped (counted). Hot path — no timestamp/DB work here.
     * @param line - the raw syslog line
     */
    public offer(line: string): void {
        const budget = this._maxPerSec();

        if (budget <= 0) {
            return;
        }

        // Window cap + a small hard buffer ceiling (2x) guard both rate and memory.
        if (this._acceptedThisWindow >= budget || this._queue.length >= budget * 2) {
            this._dropped++;

            return;
        }

        this._queue.push(line);
        this._acceptedThisWindow++;
    }

    /**
     * Strip the leading `<PRI>` syslog priority and clamp the length.
     * @param line - the raw line
     */
    private static _clean(line: string): string {
        const cleaned = line.replace(/^<\d+>/u, '').trim();

        return cleaned.length > NginxAccessLogSink.MAX_MESSAGE_LEN
            ? cleaned.slice(0, NginxAccessLogSink.MAX_MESSAGE_LEN)
            : cleaned;
    }

    /**
     * Flush the window: persist the accepted batch as `nginx-access` records + fan out to the
     * live stream, reset the rate window, and ~every 30s emit a one-line drop summary. On a DB
     * error the batch is DROPPED (access logs are lossy by nature) so nothing accumulates.
     */
    private async _flush(): Promise<void> {
        this._acceptedThisWindow = 0;
        this._ticks++;

        const batch = this._queue;
        this._queue = [];

        const records: LogIngestRecord[] = batch.map((line): LogIngestRecord => ({
            area: 'nginx-access',
            level: 'info',
            message: NginxAccessLogSink._clean(line),
            ts: Date.now()
        }));

        if (this._ticks % 30 === 0 && this._dropped > 0) {
            records.push({
                area: 'nginx-access',
                level: 'warn',
                message: `rate limit: dropped ${this._dropped} access-log line(s) in the last ~30s (cap ${this._maxPerSec()}/s)`,
                ts: Date.now()
            });
            this._dropped = 0;
        }

        if (records.length === 0) {
            return;
        }

        try {
            await LogEntryServiceDB.getInstance().ingestMany(records);
            LogStreamHub.getInstance().publish(records);
        } catch {
            // lossy on purpose: never re-queue / grow memory on a DB hiccup
        }
    }

}
