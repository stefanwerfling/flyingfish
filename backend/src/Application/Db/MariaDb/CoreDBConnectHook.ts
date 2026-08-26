import {DBSetupHook} from 'figtree';
import {DBService} from 'flyingfish_core';

/**
 * CoreDBConnectHook
 *
 * figtree's `MariaDBService` initializes figtree's `DBHelper` (the DataSource +
 * migrations). Every flyingfish_core DB service (`UserService`,
 * `DomainServiceDB`, … and `DBSetup.firstInit`) reads its repository from a
 * DataSource cached on `DBService`. This hook resolves that cached DataSource
 * from the same, already-initialized figtree DBHelper, so the core services
 * share the ONE connection figtree manages.
 *
 * It replaces the former CoreDBInitHook, which opened a SEPARATE second pooled
 * connection (core had its own DBHelper singleton) — no longer needed now that
 * flyingfish_core's DBService reads figtree's DBHelper directly.
 *
 * Runs first among the MariaDBService setup hooks (before `FirstInitSetupHook`,
 * which needs the core repositories ready).
 */
export class CoreDBConnectHook implements DBSetupHook {

    /**
     * Hook identifier.
     */
    public readonly id = 'flyingfish-core-db-connect';

    /**
     * Run on every boot (idempotent — DBService caches one source).
     */
    public readonly mode = 'always' as const;

    /**
     * Cache figtree's initialized DataSource for the flyingfish_core services.
     */
    public async run(): Promise<void> {
        await DBService.connect();
    }

}