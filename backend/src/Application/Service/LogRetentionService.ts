import {Logger, ServiceJobAbstract} from '@stefanwerfling/figtree';
import {LogEntryServiceDB} from 'flyingfish_core';
import {FlyingFishConfig} from '../Config/FlyingFishConfig.js';

/**
 * LogRetentionService
 *
 * Disk guard for the central Log-Center (observability epic): periodically prunes the
 * `log_entry` table so logs can NEVER fill the disk. Enforces two bounds, both configurable
 * via `config.log` (safe defaults here, 0 disables either):
 * - **age**: delete records older than `retentionDays`,
 * - **count**: hard-cap the table at `maxRows` (newest kept) — the real backstop against a
 *   traffic spike (e.g. nginx access logs) outrunning the age window.
 *
 * Runs on figtree's `ServiceJobAbstract` cron (every 15 min), dependent on `mariadb` so it
 * only ticks once the database is up. The row-cap delete is a single indexed range delete,
 * so it stays cheap no matter how large the table grew between ticks.
 */
export class LogRetentionService extends ServiceJobAbstract {

    /**
     * Name of the service.
     */
    public static readonly NAME = 'log-retention';

    /**
     * Default age retention when `config.log.retentionDays` is unset.
     */
    public static readonly DEFAULT_RETENTION_DAYS = 14;

    /**
     * Default hard row cap when `config.log.maxRows` is unset.
     */
    public static readonly DEFAULT_MAX_ROWS = 500000;

    /**
     * Constructor.
     */
    public constructor() {
        super(LogRetentionService.NAME, [ 'mariadb' ]);
        this._cron = '*/15 * * * *';
    }

    /**
     * Prune the log store to the configured age + row-count bounds.
     */
    protected async _execute(): Promise<void> {
        const config = FlyingFishConfig.getInstance().get()?.log;
        const retentionDays = config?.retentionDays ?? LogRetentionService.DEFAULT_RETENTION_DAYS;
        const maxRows = config?.maxRows ?? LogRetentionService.DEFAULT_MAX_ROWS;
        const service = LogEntryServiceDB.getInstance();

        let removed = 0;

        if (retentionDays > 0) {
            const cutoff = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
            removed += await service.deleteOlderThan(cutoff);
        }

        removed += await service.enforceMaxRows(maxRows);

        if (removed > 0) {
            Logger.getLogger().info(
                `LogRetentionService: pruned ${removed} log record(s) ` +
                `(retentionDays=${retentionDays}, maxRows=${maxRows})`
            );
        }
    }

}
