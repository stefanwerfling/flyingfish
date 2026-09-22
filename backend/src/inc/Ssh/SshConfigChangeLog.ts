import {SchemaSshConfigChanged, SshConfigChangeAction, SshConfigChangeEntry} from 'flyingfish_schemas';

/**
 * SshConfigChangeLog
 *
 * In-process log of SSH port/user configuration changes. When a route saves or
 * deletes an SSH config it records a change here; the ssh server part polls
 * {@link SshConfigChangeLog.since} over HTTP (GET-style POST /json/ssh/config-changes)
 * and reloads/closes the affected long-lived forward. This replaced the former
 * Redis pub/sub transport (SSH_CONFIG_CHANGED).
 *
 * Each change gets a monotonically increasing sequence id (per backend process).
 * The poller keeps the highest id it has seen as its cursor; only the last
 * {@link SshConfigChangeLog._maxEntries} changes are retained. If the backend
 * restarts (its sequence resets to 0) or the poller's cursor falls outside the
 * retained window, {@link SshConfigChangeLog.since} signals `reset` so the poller
 * adopts the current sequence — any missed change is covered by the ssh server
 * re-reading the shared DB when a tunnel (re)connects.
 */
export class SshConfigChangeLog {

    /**
     * Monotonic sequence counter (per process).
     * @private
     */
    private static _seq = 0;

    /**
     * Retained changes, oldest first.
     * @private
     */
    private static _entries: SshConfigChangeEntry[] = [];

    /**
     * How many recent changes to retain.
     * @private
     */
    private static readonly _maxEntries = 500;

    /**
     * Record an SSH config change. Returns the recorded entry, or null when the
     * payload is schema-invalid (nothing is recorded then).
     * @param {number} sshportId
     * @param {SshConfigChangeAction} action
     * @returns {SshConfigChangeEntry|null}
     */
    public static record(sshportId: number, action: SshConfigChangeAction): SshConfigChangeEntry|null {
        const payload = {
            sshportId: sshportId,
            action: action
        };

        if (!SchemaSshConfigChanged.validate(payload, [])) {
            return null;
        }

        const entry: SshConfigChangeEntry = {
            id: ++SshConfigChangeLog._seq,
            sshportId: sshportId,
            action: action
        };

        SshConfigChangeLog._entries.push(entry);

        if (SshConfigChangeLog._entries.length > SshConfigChangeLog._maxEntries) {
            SshConfigChangeLog._entries.splice(0, SshConfigChangeLog._entries.length - SshConfigChangeLog._maxEntries);
        }

        return entry;
    }

    /**
     * Return the changes with a sequence id greater than `sinceSeq`, the current
     * highest sequence, and whether the poller must reset its cursor.
     * @param {number} sinceSeq - the poller's last processed sequence id (0 = start)
     * @returns {{changes: SshConfigChangeEntry[], lastSeq: number, reset: boolean}}
     */
    public static since(sinceSeq: number): {changes: SshConfigChangeEntry[]; lastSeq: number; reset: boolean;} {
        const lastSeq = SshConfigChangeLog._seq;
        const oldest = SshConfigChangeLog._entries.length > 0 ? SshConfigChangeLog._entries[0].id : lastSeq;

        // Cursor ahead of us (backend restarted) or older than the retained window
        // (poller fell behind): signal a reset instead of returning a partial view.
        if (sinceSeq > lastSeq || sinceSeq < oldest - 1) {
            return {
                changes: [],
                lastSeq: lastSeq,
                reset: true
            };
        }

        return {
            changes: SshConfigChangeLog._entries.filter((entry): boolean => entry.id > sinceSeq),
            lastSeq: lastSeq,
            reset: false
        };
    }

}
