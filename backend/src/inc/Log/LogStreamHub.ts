import {LogRecord} from 'flyingfish_schemas';

/**
 * A live-log subscriber: invoked once per published record. The subscriber itself decides
 * whether to forward it (filtering) and must never throw.
 */
export type LogStreamSubscriber = (record: LogRecord) => void;

/**
 * LogStreamHub
 *
 * In-process fan-out for the live log stream (Log-Center P3). The ingest route publishes
 * every accepted record here; each connected WebSocket registers a subscriber that filters
 * and forwards. Deliberately tiny and synchronous — it holds NO per-record buffer (back-
 * pressure is each socket's own concern via its bufferedAmount guard), so it can never grow
 * memory. The subscriber count is capped so a flood of connections can't exhaust resources.
 */
export class LogStreamHub {

    /**
     * Singleton instance.
     */
    private static _instance: LogStreamHub | null = null;

    /**
     * Max concurrent live subscribers (resource guard); further subscriptions are refused.
     */
    public static readonly MAX_SUBSCRIBERS = 200;

    /**
     * The registered subscribers.
     */
    private readonly _subscribers = new Set<LogStreamSubscriber>();

    /**
     * Get the singleton.
     */
    public static getInstance(): LogStreamHub {
        if (LogStreamHub._instance === null) {
            LogStreamHub._instance = new LogStreamHub();
        }

        return LogStreamHub._instance;
    }

    /**
     * Register a subscriber. Returns false (refused) when the cap is reached.
     * @param subscriber - the subscriber callback
     */
    public subscribe(subscriber: LogStreamSubscriber): boolean {
        if (this._subscribers.size >= LogStreamHub.MAX_SUBSCRIBERS) {
            return false;
        }

        this._subscribers.add(subscriber);

        return true;
    }

    /**
     * Remove a subscriber.
     * @param subscriber - the subscriber callback
     */
    public unsubscribe(subscriber: LogStreamSubscriber): void {
        this._subscribers.delete(subscriber);
    }

    /**
     * Fan a batch of just-ingested records out to all subscribers. Subscriber errors are
     * swallowed so one bad socket can't break the others or the ingest path.
     * @param records - the records to broadcast
     */
    public publish(records: LogRecord[]): void {
        if (this._subscribers.size === 0) {
            return;
        }

        for (const subscriber of this._subscribers) {
            for (const record of records) {
                try {
                    subscriber(record);
                } catch {
                    // a broken subscriber must not affect the others / the ingest path
                }
            }
        }
    }

    /**
     * Current subscriber count.
     */
    public subscriberCount(): number {
        return this._subscribers.size;
    }

}
