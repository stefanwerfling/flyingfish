import {DBSetupHook} from 'figtree';
import {DBEntitiesLoader, DBHelper} from 'flyingfish_core';
import {EntitySchema, MixedList} from 'typeorm';
import {InitialSchema1787961600000} from '../../../inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';
import {FlyingFishConfig} from '../../Config/FlyingFishConfig.js';

/**
 * CoreDBInitHook
 *
 * Strangler bridge for the DBHelper split: figtree's `MariaDBService`
 * initializes figtree's own `DBHelper` (its DataSource + migrations), but every
 * FlyingFish DB service (flyingfish_core `UserService`, `DomainServiceDB`, … and
 * `DBSetup.firstInit`) reads from flyingfish_core's SEPARATE `DBHelper`
 * singleton, which would otherwise stay uninitialized (`Datasource is empty`).
 *
 * This hook runs first among the MariaDBService setup hooks (before
 * `FirstInitSetupHook`) and connects the flyingfish_core `DBHelper` to the same
 * database. The schema/migrations are already applied by figtree's DataSource,
 * so this connection runs no migrations and no synchronize — it only makes the
 * core repositories usable. It opens a second pooled connection; that is the
 * accepted trade-off until the core DB layer is migrated onto figtree's
 * DBHelper directly.
 */
export class CoreDBInitHook implements DBSetupHook {

    /**
     * Hook identifier.
     */
    public readonly id = 'flyingfish-core-db-init';

    /**
     * Run on every boot (idempotent per process — DBHelper holds one source).
     */
    public readonly mode = 'always' as const;

    /**
     * Initialize the flyingfish_core DBHelper from the loaded configuration.
     */
    public async run(): Promise<void> {
        const mysql = FlyingFishConfig.getInstance().get()?.db.mysql;

        if (!mysql) {
            throw new Error('CoreDBInitHook::run: mysql config is missing.');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- TypeORM's MixedList entity list uses the Function constructor type
        const entities: MixedList<Function | string | EntitySchema> = await DBEntitiesLoader.loadEntities() as [];

        await DBHelper.init({
            type: 'mysql',
            host: mysql.host,
            port: mysql.port,
            username: mysql.username,
            password: mysql.password,
            database: mysql.database,
            entities: entities,
            migrations: [InitialSchema1787961600000],
            migrationsRun: false,
            synchronize: false
        });
    }

}