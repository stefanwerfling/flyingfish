/**
 * Integration-test database harness.
 *
 * Connects to a MariaDB instance (configured via FF_TEST_DB_* env vars, with
 * localhost defaults), applies the TypeORM migrations, and offers helpers to
 * reset and close the connection. Requires a running MariaDB - used only by the
 * *.integration.test.ts files that run in the dedicated CI integration job.
 *
 * Each jest worker gets its OWN database (`<FF_TEST_DB_NAME>_<JEST_WORKER_ID>`),
 * created on demand, so the integration suites can run in parallel without
 * sharing state. Within a worker the files run serially and reuse the same
 * database (reset between tests keeps them isolated).
 */
import {DataSource} from 'typeorm';
import {DBHelper} from 'figtree';
import {DBEntitiesLoader, DBService, PluginManager} from 'flyingfish_core';
import {AddAcmeDnsTempRecord1788400000000} from '../../src/inc/Db/MariaDb/migrations/1788400000000-AddAcmeDnsTempRecord.js';
import {InitialSchema1787961600000} from '../../src/inc/Db/MariaDb/migrations/1787961600000-InitialSchema.js';

const connectionOptions = (): {type: 'mysql'; host: string; port: number; username: string; password: string;} => {
    return {
        type: 'mysql',
        host: process.env.FF_TEST_DB_HOST ?? '127.0.0.1',
        port: Number(process.env.FF_TEST_DB_PORT ?? 13306),
        username: process.env.FF_TEST_DB_USER ?? 'root',
        password: process.env.FF_TEST_DB_PASSWORD ?? 'test'
    };
};

// A per-worker database name so parallel jest workers don't collide.
const testDbName = `${process.env.FF_TEST_DB_NAME ?? 'flyingfish'}_${process.env.JEST_WORKER_ID ?? '1'}`;

let initialized = false;

/**
 * The database name used by this worker's integration tests.
 * @returns {string}
 */
export const getTestDbName = (): string => testDbName;

/**
 * Create this worker's database if it does not exist yet (via a short-lived
 * bootstrap connection to information_schema).
 */
const ensureDatabase = async(): Promise<void> => {
    const bootstrap = new DataSource({...connectionOptions(), database: 'information_schema'});
    await bootstrap.initialize();
    await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\``);
    await bootstrap.destroy();
};

/**
 * Initialise the test database: connect and run migrations.
 */
export const initTestDb = async(): Promise<void> => {
    if (initialized) {
        return;
    }

    await ensureDatabase();

    // The constructor registers the singleton; with no plugins started,
    // DBEntitiesLoader.loadEntities() returns just the core entities.
    // eslint-disable-next-line no-new -- the constructor registers the PluginManager singleton used by loadEntities
    new PluginManager('backend');
    const entities = await DBEntitiesLoader.loadEntities();

    await DBHelper.init({
        ...connectionOptions(),
        database: testDbName,
        entities: entities,
        migrations: [InitialSchema1787961600000, AddAcmeDnsTempRecord1788400000000],
        migrationsRun: false,
        synchronize: false
    });

    // Auto-baseline keeps this robust regardless of the worker DB's prior state
    // (fresh -> runs InitialSchema; legacy schema without a migrations table ->
    // stamps it; already migrated -> no-op).
    await DBHelper.runMigrations(undefined, {
        legacyTable: 'user',
        migrationName: 'InitialSchema1787961600000',
        timestamp: 1787961600000
    });

    // Cache the figtree DataSource on flyingfish_core's DBService, exactly as the
    // real boot does via CoreDBConnectHook. Without this every *ServiceDB throws
    // "DataSource not connected".
    await DBService.connect();

    // eslint-disable-next-line require-atomic-updates -- module-level init guard for tests, no real race
    initialized = true;
};

/**
 * Truncate all data tables (keeps the schema and the migrations record).
 */
export const resetTestDb = async(): Promise<void> => {
    const dataSource = await DBHelper.getDataSource();

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables: {t: string;}[] = await dataSource.query(
        'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()'
    );

    for (const table of tables) {
        if (table.t !== 'migrations') {
            // eslint-disable-next-line no-await-in-loop -- truncate sequentially, order is irrelevant here
            await dataSource.query(`TRUNCATE TABLE \`${table.t}\``);
        }
    }

    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
};

/**
 * Close the test database connection.
 */
export const closeTestDb = async(): Promise<void> => {
    if (!initialized) {
        return;
    }

    await (await DBHelper.getDataSource()).destroy();
    // eslint-disable-next-line require-atomic-updates -- module-level init guard for tests, no real race
    initialized = false;
};