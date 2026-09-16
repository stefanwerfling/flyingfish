/**
 * A tiny TTL cache for the dnsserver's caching resolver (Pi-router epic, Phase 5):
 * stores upstream answers keyed by `<name>|<type>` and expires them by TTL. Generic
 * over the cached value; `now` is injectable so it is deterministically testable. A
 * `maxEntries` bound evicts the oldest key to keep memory bounded. Pure logic (no I/O).
 */
export class DnsCache<T> {

    private readonly _entries: Map<string, {value: T; expiresAt: number;}> = new Map();

    private readonly _maxEntries: number;

    /**
     * @param maxEntries - the maximum number of cached keys (oldest evicted past it)
     */
    public constructor(maxEntries: number = 1000) {
        this._maxEntries = maxEntries;
    }

    /**
     * The cache key for a DNS question.
     * @param name - the queried name
     * @param type - the record type
     */
    public static key(name: string, type: number): string {
        return `${name.toLowerCase()}|${type}`;
    }

    /**
     * Get a live cached value, or null if absent or expired (expired entries are
     * dropped on read).
     * @param key - the cache key
     * @param now - the current time (epoch ms; defaults to Date.now())
     */
    public get(key: string, now: number = Date.now()): T | null {
        const entry = this._entries.get(key);

        if (entry === undefined) {
            return null;
        }

        if (entry.expiresAt <= now) {
            this._entries.delete(key);

            return null;
        }

        return entry.value;
    }

    /**
     * Store a value for `ttlSeconds`. A non-positive TTL is not cached. Evicts the
     * oldest key when the size bound is exceeded.
     * @param key - the cache key
     * @param value - the value to cache
     * @param ttlSeconds - the TTL in seconds
     * @param now - the current time (epoch ms; defaults to Date.now())
     */
    public set(key: string, value: T, ttlSeconds: number, now: number = Date.now()): void {
        if (ttlSeconds <= 0) {
            return;
        }

        // refresh insertion order
        this._entries.delete(key);
        this._entries.set(key, {value: value, expiresAt: now + (ttlSeconds * 1000)});

        if (this._entries.size > this._maxEntries) {
            const oldest = this._entries.keys().next().value;

            if (oldest !== undefined) {
                this._entries.delete(oldest);
            }
        }
    }

    /**
     * The current number of cached entries (incl. not-yet-evicted expired ones).
     */
    public size(): number {
        return this._entries.size;
    }

}